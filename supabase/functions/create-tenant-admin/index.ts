import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const service = createClient(url, serviceKey, {auth:{autoRefreshToken:false,persistSession:false}});
const sectors:Record<string,string> = {loja:"",farmacia:"farmacias",restaurante:"restaurantes",bar:"bares",talho:"talhos",padaria:"padarias",grossista:"grossistas"};
const reply = (data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS"}});
const str=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
Deno.serve(async (req)=>{
 if(req.method==="OPTIONS")return reply({},204);
 if(req.method!=="POST")return reply({error:"Método não permitido."},405);
 const token=req.headers.get("Authorization")?.replace(/^Bearer /i,"");
 if(!token)return reply({error:"Inicie sessão para continuar."},401);
 const {data:{user},error:authError}=await service.auth.getUser(token);
 if(authError||!user)return reply({error:"Sessão inválida."},401);
 const {data:platform,error:platformError}=await service.from("platform_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(platformError)return reply({error:"Falha ao verificar autorização."},500);
 if(!platform)return reply({error:"Apenas o Super Admin da Ubuntu Service pode criar empresas."},403);
 let payload:Record<string,unknown>;
 try{payload=await req.json()}catch{return reply({error:"Pedido JSON inválido."},400)}
 const name=str(payload.name,160), slug=str(payload.slug,90).toLowerCase(), sector=str(payload.sector,20);
 const city=str(payload.city,120),province=str(payload.province,120), nuit=str(payload.nuit,30);
 const phone=str(payload.phone,40),email=str(payload.email,180).toLowerCase();
 const adminEmail=str(payload.admin_email,180).toLowerCase(),adminName=str(payload.admin_name,120);
 const planCode=str(payload.plan_code,40)||"piloto";
 if(name.length<3||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!(sector in sectors)||
 !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)||adminName.length<2)return reply({error:"Verifique os dados da empresa e do administrador."},422);
 const {data:plan,error:planError}=await service.from("plans").select("id,max_branches,max_users").eq("code",planCode).eq("enabled",true).single();
 if(planError||!plan)return reply({error:"Plano indisponível."},422);
 const {data:existing}=await service.from("tenants").select("id").eq("slug",slug).maybeSingle();
 if(existing)return reply({error:"Este endereço de empresa já está em uso."},409);
 const expiry=new Date();expiry.setUTCDate(expiry.getUTCDate()+14);
 const {data:tenant,error:tenantError}=await service.from("tenants").insert({
  name,slug,sector,city,province,nuit:nuit||null,phone,email,plan_id:plan.id,
  status:"trial",license_expires_at:expiry.toISOString().slice(0,10),created_by:user.id
 }).select("id,slug").single();
 if(tenantError||!tenant)return reply({error:"Não foi possível criar a empresa. Verifique o identificador."},409);
 const tenantId=tenant.id;
 const {error:branchError}=await service.from("branches").insert({tenant_id:tenantId,name:"Sede",code:"SEDE",city,active:true});
 if(branchError){await service.from("tenants").delete().eq("id",tenantId);return reply({error:"Erro ao criar filial inicial."},500)}
 if(sectors[sector]){
  const {error:moduleError}=await service.from("tenant_modules").insert({tenant_id:tenantId,module_code:sectors[sector]});
  if(moduleError){await service.from("tenants").delete().eq("id",tenantId);return reply({error:"Erro ao atribuir módulo."},500)}
 }
 const redirectBase=Deno.env.get("POS_APP_URL");
 const redirectTo=redirectBase && /^https:\/\//.test(redirectBase)?new URL("/empresa",redirectBase).toString():undefined;
 const {data:invitation,error:inviteError}=await service.auth.admin.inviteUserByEmail(adminEmail,{...(redirectTo?{redirectTo}:{}),data:{display_name:adminName}});
 if(inviteError||!invitation.user){
  await service.from("tenants").delete().eq("id",tenantId);
  return reply({error:"Empresa não activada: falhou o envio do convite. Verifique se o email já está registado ou as definições SMTP.",details:inviteError?.message},409);
 }
 const {data:headquarters}=await service.from("branches").select("id").eq("tenant_id",tenantId).eq("code","SEDE").single();
 const {data:membership,error:membershipError}=await service.from("tenant_memberships").insert({
  tenant_id:tenantId,user_id:invitation.user.id,display_name:adminName,email:adminEmail,role:"company_admin",active:true
 }).select("id").single();
 if(membershipError||!membership){
  await service.from("tenants").delete().eq("id",tenantId);
  return reply({error:"Convite enviado, mas a associação à empresa falhou. Contacte o suporte; não repita o pedido imediatamente."},500);
 }
 if(headquarters){const {error:grantError}=await service.from("membership_branches").insert({
  tenant_id:tenantId,membership_id:membership.id,branch_id:headquarters.id
 });if(grantError)return reply({error:"Empresa criada, mas a filial inicial necessita de configuração. Contacte o suporte.",tenant_id:tenantId},500);}
 await service.from("audit_events").insert({
  tenant_id:tenantId,actor_user_id:user.id,action:"tenant.created",target_type:"tenant",target_id:tenantId,
  details:{sector,admin_email:adminEmail}
 });
 return reply({tenant_id:tenantId,slug:tenant.slug,admin_email:adminEmail,invitation:"sent",status:"trial"},201);
});