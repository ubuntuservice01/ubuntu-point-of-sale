import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const API=Deno.env.get("SUPABASE_URL")!;
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const service=createClient(API,KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const cors:Record<string,string>={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Access-Control-Max-Age":"3600",
 "Content-Type":"application/json",
 "Cache-Control":"no-store"
};
const reply=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"Método não permitido."},405);
 const auth=req.headers.get("authorization");
 const token=auth?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return reply({error:"Inicie sessão para continuar."},401);
 const {data:{user},error:authError}=await service.auth.getUser(token);
 if(authError||!user)return reply({error:"Sessão inválida. Entre novamente."},401);
 const {data:admin,error:adminError}=await service.from("platform_admins").select("user_id")
  .eq("user_id",user.id).maybeSingle();
 if(adminError)return reply({error:"Falha ao verificar o perfil administrativo."},503);
 if(!admin)return reply({error:"Apenas o Super Admin da Ubuntu Service pode consultar empresas."},403);
 const [tenants,plans]=await Promise.all([
  service.from("tenants").select("id,name,slug,sector,city,status,license_expires_at").order("name",{ascending:true}).limit(1000),
  service.from("plans").select("code,name").eq("enabled",true).order("name",{ascending:true}).limit(100)
 ]);
 if(tenants.error||plans.error){
  return reply({error:"Não foi possível carregar os dados da plataforma. Tente novamente."},503);
 }
 return reply({companies:tenants.data??[],plans:plans.data??[]});
});