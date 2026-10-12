/** Ubuntu POS 360 — sessão Super Admin via Supabase Auth REST.
 * O browser recebe apenas a publishable key. Nunca introduzir service_role aqui.
 */
const SESSION_KEY="ubuntu-pos360-platform-auth-v1";
type Tokens={access_token:string;refresh_token:string;token_type?:string};
export type AdminIdentity={id:string;email:string};
export type LoginResult={identity:AdminIdentity;tokens:Tokens};
const env=import.meta.env;
export function supabaseAdminConfig(){
 const url=(env.VITE_SUPABASE_URL||"").replace(/\/$/,"");
 const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY||"";
 return url.startsWith("https://")&&Boolean(key)?{url,key}:null;
}
function getConfig(){
 const cfg=supabaseAdminConfig();
 if(!cfg)throw new Error("Configure a ligação Supabase antes de iniciar sessão.");
 return cfg;
}
async function request<T>(path:string,init:RequestInit={},accessToken?:string):Promise<T>{
 const cfg=getConfig();
 const res=await fetch(cfg.url+path,{
  ...init,headers:{"apikey":cfg.key,"content-type":"application/json",
   ...(accessToken?{authorization:"Bearer "+accessToken}:{}),...(init.headers||{})}
 });
 let body:Record<string,unknown>={};
 try{body=await res.json()}catch{}
 if(!res.ok)throw new Error(typeof body.msg==="string"?body.msg:typeof body.message==="string"?body.message:typeof body.error_description==="string"?body.error_description:"Não foi possível efectuar esta operação.");
 return body as T;
}
export function savedTokens():Tokens|null{
 try{const v=JSON.parse(window.sessionStorage.getItem(SESSION_KEY)||"null");
 return v&&typeof v.access_token==="string"&&typeof v.refresh_token==="string"?v:null
 }catch{return null}
}
export function saveTokens(value:Tokens){
 window.sessionStorage.setItem(SESSION_KEY,JSON.stringify({
  access_token:value.access_token,refresh_token:value.refresh_token
 }));
}
export function clearTokens(){try{window.sessionStorage.removeItem(SESSION_KEY)}catch{}}
async function identityFor(token:string):Promise<AdminIdentity>{
 const user=await request<{id:string;email?:string}>("/auth/v1/user",{method:"GET"},token);
 if(!user.id||!user.email)throw new Error("Esta conta não está válida.");
 // RLS: uma conta sem autorização não consegue visualizar este registo.
 const admins=await request<{user_id:string}[]>(
 "/rest/v1/platform_admins?select=user_id&user_id=eq."+encodeURIComponent(user.id)+"&limit=1",
 {method:"GET"},token
 );
 if(!Array.isArray(admins)||admins.length!==1)throw new Error("A sua conta ainda não tem permissão de Super Admin. Confirme o email ou contacte a Ubuntu Service.");
 return {id:user.id,email:user.email};
}
export async function loginAdmin(email:string,password:string):Promise<LoginResult>{
 const tokens=await request<Tokens>("/auth/v1/token?grant_type=password",{
  method:"POST",body:JSON.stringify({email:email.trim().toLowerCase(),password})
 });
 if(!tokens.access_token||!tokens.refresh_token)throw new Error("Sessão incompleta.");
 const identity=await identityFor(tokens.access_token);
 saveTokens(tokens);
 return {identity,tokens};
}
export async function authenticateTokens(tokens:Tokens):Promise<LoginResult>{
 try{
  const identity=await identityFor(tokens.access_token);
  saveTokens(tokens);return {identity,tokens};
 }catch(err){
  // Tentar renovar quando token expirou; não contornar uma negação de perfil.
  if(err instanceof Error && err.message.includes("Super Admin"))throw err;
  const next=await request<Tokens>("/auth/v1/token?grant_type=refresh_token",{
   method:"POST",body:JSON.stringify({refresh_token:tokens.refresh_token})
  });
  const identity=await identityFor(next.access_token);
  saveTokens(next);
  return {identity,tokens:next};
 }
}
export function tokensFromInvite():Tokens|null{
 const fragment=new URLSearchParams(window.location.hash.slice(1));
 const access_token=fragment.get("access_token"),refresh_token=fragment.get("refresh_token");
 if(!access_token||!refresh_token)return null;
 // Remover os tokens do URL e do histórico do navegador.
 window.history.replaceState({},document.title,window.location.pathname+window.location.search);
 return {access_token,refresh_token};
}
export async function setFirstPassword(tokens:Tokens,password:string){
 if(password.length<12)throw new Error("A palavra-passe deve ter pelo menos 12 caracteres.");
 await request("/auth/v1/user",{method:"PUT",body:JSON.stringify({password})},tokens.access_token);
 return authenticateTokens(tokens);
}
export async function logoutAdmin(tokens:Tokens|null){
 if(tokens){try{await request("/auth/v1/logout",{method:"POST"},tokens.access_token)}catch{}}
 clearTokens();
}
