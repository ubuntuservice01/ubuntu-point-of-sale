import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{autoRefreshToken:false,persistSession:false}});
const result=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 "Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"
}});
const uuid=(v:unknown)=>typeof v==="string"&&/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v)?v:null;
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return result({},204);
 if(req.method!=="POST")return result({error:"Método não permitido."},405);
 const token=req.headers.get("Authorization")?.replace(/^Bearer /i,"");
 if(!token)return result({error:"Sessão obrigatória."},401);
 const {data:{user},error:authErr}=await client.auth.getUser(token);
 if(authErr||!user)return result({error:"Sessão inválida."},401);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=="object")return result({error:"Pedido inválido."},422);
 const tenant=uuid(body.tenant_id),branch=uuid(body.branch_id);
 if(!tenant||!branch)return result({error:"Empresa ou filial inválida."},422);
 const base={p_actor:user.id,p_tenant:tenant,p_branch:branch};
 let fn:string,params:Record<string,unknown>;
 if(body.action==="open"){
  fn="pos_open_cash";params={...base,p_opening:body.opening_amount};
 }else if(body.action==="close"){
  const session=uuid(body.session_id);
  if(!session)return result({error:"Caixa inválido."},422);
  fn="pos_close_cash";params={...base,p_session:session,p_actual:body.actual_amount};
 }else if(body.action==="sale"){
  const session=uuid(body.session_id),request=uuid(body.request_id);
  if(!session||!request||!Array.isArray(body.items))return result({error:"Carrinho ou caixa inválido."},422);
  fn="pos_cash_sale";params={...base,p_session:session,p_request:request,p_items:body.items,p_received:body.received_amount};
 }else return result({error:"Acção desconhecida."},422);
 const {data,error}=await client.rpc(fn,params);
 if(error)return result({error:error.message},409);
 return result({ok:true,data},200);
});