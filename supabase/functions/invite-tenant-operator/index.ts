import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{autoRefreshToken:false,persistSession:false}});
const roles=["manager","supervisor","cashier","stock"];
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return respond({},204);
 if(req.method!=="POST")return respond({error:"Método inválido."},405);
 const token=req.headers.get("Authorization")?.replace(/^Bearer /i,"");
 if(!token)return respond({error:"Autenticação obrigatória."},401);
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user)return respond({error:"Sessão inválida."},401);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=="object")return respond({error:"Pedido inválido."},400);
 const tenant_id=typeof body.tenant_id==="string"?body.tenant_id:"";
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const display_name=typeof body.display_name==="string"?body.display_name.trim():"";
 const role=typeof body.role==="string"?body.role:"";
 const branch_id=typeof body.branch_id==="string"?body.branch_id:"";
 if(!/^[0-9a-f-]{36}$/i.test(tenant_id)||!roles.includes(role)||!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)||display_name.length<2||display_name.length>120)
  return respond({error:"Verifique os dados do funcionário."},422);
 const {data:membership,error:membershipError}=await db.from("tenant_memberships")
  .select("id").eq("tenant_id",tenant_id).eq("user_id",user.id).eq("role","company_admin").eq("active",true).maybeSingle();
 if(membershipError||!membership)return respond({error:"Apenas o administrador da empresa pode convidar funcionários."},403);
 const {data:tenant}=await db.from("tenants").select("id,status,license_expires_at,plan_id").eq("id",tenant_id).single();
 const today=new Date().toISOString().slice(0,10);
 if(!tenant||!["trial","active"].includes(tenant.status)||tenant.license_expires_at<today)return respond({error:"A licença não permite novos operadores."},403);
 const {data:plan}=await db.from("plans").select("max_users").eq("id",tenant.plan_id).single();
 const {count}=await db.from("tenant_memberships").select("id",{count:"exact",head:true}).eq("tenant_id",tenant_id).eq("active",true);
 if(!plan||count===null||count>=plan.max_users)return respond({error:"Foi atingido o limite de utilizadores do plano."},409);
 const {data:duplicate}=await db.from("tenant_memberships").select("id").eq("tenant_id",tenant_id).ilike("email",email).maybeSingle();
 if(duplicate)return respond({error:"Este endereço já pertence a um funcionário da empresa."},409);
 const {data:branch}=branch_id?
  await db.from("branches").select("id").eq("id",branch_id).eq("tenant_id",tenant_id).eq("active",true).maybeSingle():
  await db.from("branches").select("id").eq("tenant_id",tenant_id).eq("active",true).order("created_at",{ascending:true}).limit(1).maybeSingle();
 if(!branch)return respond({error:"Seleccione uma filial activa."},422);
 const app=Deno.env.get("POS_APP_URL");
 if(!app||!/^https:\/\//.test(app))return respond({error:"Configure POS_APP_URL com o domínio HTTPS da aplicação antes de enviar convites."},503);
 const redirectTo=new URL("/empresa",app).toString();
 const {data:invited,error:inviteError}=await db.auth.admin.inviteUserByEmail(email,{redirectTo,data:{display_name}});
 if(inviteError||!invited.user)return respond({error:"Não foi possível enviar o convite. Confirme o endereço e o SMTP.",details:inviteError?.message},409);
 const {data:member,error:saveError}=await db.from("tenant_memberships").insert({tenant_id,user_id:invited.user.id,display_name,email,role,active:true}).select("id").single();
 if(saveError||!member)return respond({error:"Convite emitido, mas a associação falhou. Contacte o suporte antes de repetir."},500);
 const {error:linkError}=await db.from("membership_branches").insert({tenant_id,membership_id:member.id,branch_id:branch.id});
 if(linkError)return respond({error:"Convite enviado, mas não foi possível associar a filial. Contacte o suporte."},500);
 await db.from("audit_events").insert({tenant_id,actor_user_id:user.id,action:"operator.invited",target_type:"membership",target_id:member.id,details:{role}});
 return respond({membership_id:member.id,email,role,invitation:"sent"},201);
});