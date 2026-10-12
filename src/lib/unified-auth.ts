/** A identidade e as autorizações provêm do Supabase Auth e das tabelas RLS.
 * Nunca determinar o perfil por email, PIN local ou metadata editável pelo utilizador.
 */
import {companyApi,type CompanyMember,type CompanyTokens} from "./supabase-company-auth";
const KEY="ubuntu-pos360-unified-auth-v1";
const LEGACY_KEYS=["ubuntu-pos360-platform-auth-v1","ubuntu-pos360-company-auth-v1"] as const;
export type AppRole="platform_admin"|"company_admin"|"manager"|"supervisor"|"cashier"|"stock";
export type AppIdentity={id:string;email:string;isPlatformAdmin:boolean;memberships:CompanyMember[]};
export type AppSession={tokens:CompanyTokens;identity:AppIdentity};
export type AppAudience="platform"|"company"|"cashier"|"stock";
export type Destination={pathname:"/super-admin"|"/empresa"|"/caixa"|"/stock";tenantId?:string};

function validTokens(data:unknown):data is CompanyTokens{
 if(!data||typeof data!=="object")return false;
 const t=data as Record<string,unknown>;
 return typeof t["access_token"]==="string"&&typeof t["refresh_token"]==="string"
  &&t["access_token"].length>0&&t["refresh_token"].length>0;
}
export function storedSessionTokens():CompanyTokens|null{
 if(typeof window==="undefined")return null;
 for(const key of [KEY,...LEGACY_KEYS]){
  try{
   const candidate=JSON.parse(window.sessionStorage.getItem(key)||"null") as unknown;
   if(validTokens(candidate))return candidate;
  }catch{/* sessão antiga inválida */}
 }
 return null;
}
export function saveUnifiedTokens(tokens:CompanyTokens){
 if(typeof window==="undefined")return;
 window.sessionStorage.setItem(KEY,JSON.stringify(tokens));
 for(const key of LEGACY_KEYS)window.sessionStorage.removeItem(key);
}
export function clearUnifiedTokens(){
 if(typeof window==="undefined")return;
 window.sessionStorage.removeItem(KEY);
 for(const key of LEGACY_KEYS)window.sessionStorage.removeItem(key);
}
export function destinationFor(identity:AppIdentity):Destination|null{
 if(identity.isPlatformAdmin)return {pathname:"/super-admin"};
 const roles=["company_admin","manager","supervisor","cashier","stock"] as const;
 for(const role of roles){
  const member=identity.memberships.find(x=>x.active&&x.user_id===identity.id&&x.role===role);
  if(member)return {pathname:role==="company_admin"?"/empresa":role==="stock"?"/stock":"/caixa",tenantId:member.tenant_id};
 }
 return null;
}
export function memberFor(identity:AppIdentity,audience:AppAudience,tenantId?:string):CompanyMember|null{
 if(audience==="platform")return null;
 const roles:Record<Exclude<AppAudience,"platform">,readonly AppRole[]>={
  company:["company_admin"],
  cashier:["company_admin","manager","supervisor","cashier"],
  stock:["company_admin","manager","supervisor","stock"]
 };
 return identity.memberships.find(m=>m.active&&m.user_id===identity.id&&roles[audience].includes(m.role as AppRole)&&(!tenantId||tenantId===m.tenant_id))??null;
}
export function destinationUrl(destination:Destination):string{
 const query=new URLSearchParams();
 if(destination.tenantId)query.set("tenant",destination.tenantId);
 if(typeof window!=="undefined"){
  const preview=new URLSearchParams(window.location.search).get("__lovable_token");
  if(preview)query.set("__lovable_token",preview);
 }
 return destination.pathname+(query.size?"?"+query.toString():"");
}
export function loginUrl():string{
 return destinationUrl({pathname:"/super-admin"}).replace(/^\/super-admin/,"/login");
}
export function goTo(destination:Destination){if(typeof window!=="undefined")window.location.replace(destinationUrl(destination))}
export function goToLogin(){if(typeof window!=="undefined")window.location.replace(loginUrl())}
export function inviteTokensFromUrl():CompanyTokens|null{
 if(typeof window==="undefined")return null;
 const fragment=new URLSearchParams(window.location.hash.slice(1));
 const access_token=fragment.get("access_token");
 const refresh_token=fragment.get("refresh_token");
 if(!access_token||!refresh_token)return null;
 // Remove tokens de qualquer histórico de navegação.
 window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
 return {access_token,refresh_token};
}
async function currentIdentity(accessToken:string):Promise<AppIdentity>{
 const user=await companyApi<{id:string;email?:string}>("/auth/v1/user",accessToken);
 if(!user.id||!user.email)throw new Error("Sessão inválida.");
 const [admins,memberships]=await Promise.all([
  companyApi<{user_id:string}[]>("/rest/v1/platform_admins?select=user_id&user_id=eq."+encodeURIComponent(user.id)+"&limit=1",accessToken),
  companyApi<CompanyMember[]>("/rest/v1/tenant_memberships?select=id,tenant_id,user_id,display_name,email,role,active&user_id=eq."+encodeURIComponent(user.id)+"&active=eq.true",accessToken)
 ]);
 return {id:user.id,email:user.email,isPlatformAdmin:admins.some(x=>x.user_id===user.id),
  memberships:memberships.filter(m=>m.active&&m.user_id===user.id)};
}
async function rotate(refreshToken:string):Promise<CompanyTokens>{
 return companyApi<CompanyTokens>("/auth/v1/token?grant_type=refresh_token",undefined,{
  method:"POST",body:JSON.stringify({refresh_token:refreshToken})
 });
}
export async function authorizeTokens(tokens:CompanyTokens):Promise<AppSession>{
 let current=tokens;let identity:AppIdentity;
 try{identity=await currentIdentity(current.access_token);}
 catch(e){
  // Apenas uma tentativa de renovação; o servidor valida novamente a identidade e as permissões.
  current=await rotate(current.refresh_token);
  if(!validTokens(current))throw new Error("A sessão expirou. Entre novamente.");
  identity=await currentIdentity(current.access_token);
 }
 if(!destinationFor(identity))throw new Error("Esta conta ainda não tem um perfil autorizado no Ubuntu POS 360.");
 saveUnifiedTokens(current);
 return {tokens:current,identity};
}
export async function signInUnified(email:string,password:string):Promise<AppSession>{
 const tokens=await companyApi<CompanyTokens>("/auth/v1/token?grant_type=password",undefined,{
  method:"POST",body:JSON.stringify({email:email.trim().toLowerCase(),password})
 });
 if(!validTokens(tokens))throw new Error("A sessão não foi criada. Tente novamente.");
 try{return await authorizeTokens(tokens);}
 catch(error){clearUnifiedTokens();throw error;}
}
export async function changePasswordUnified(accessToken:string,newPassword:string){
 if(newPassword.length<12)throw new Error("Use uma palavra-passe com pelo menos 12 caracteres.");
 await companyApi("/auth/v1/user",accessToken,{method:"PUT",body:JSON.stringify({password:newPassword})});
}
export async function recoverPassword(email:string){
 // A mensagem será enviada apenas se o SMTP e os URLs de redireccionamento estiverem configurados.
 const redirect=typeof window!=="undefined"?window.location.origin+"/login":undefined;
 await companyApi("/auth/v1/recover"+(redirect?"?redirect_to="+encodeURIComponent(redirect):""),undefined,{
  method:"POST",body:JSON.stringify({email:email.trim().toLowerCase()})
 });
}
export async function signOutUnified(tokens:CompanyTokens|null){
 if(tokens){try{await companyApi("/auth/v1/logout",tokens.access_token,{method:"POST"});}catch{/* limpar sempre a sessão local */}}
 clearUnifiedTokens();
}
