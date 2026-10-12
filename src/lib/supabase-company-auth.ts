import {supabaseAdminConfig} from "./supabase-admin-auth";
export type CompanyTokens={access_token:string;refresh_token:string};
export type CompanyMember={id:string;tenant_id:string;user_id:string;display_name:string;email:string;role:string;active:boolean};
const KEY="ubuntu-pos360-company-auth-v1";
export function companyTokens():CompanyTokens|null{
 try{const data=JSON.parse(sessionStorage.getItem(KEY)||"null");return data?.access_token&&data?.refresh_token?data:null;}catch{return null}
}
export function saveCompanyTokens(value:CompanyTokens){sessionStorage.setItem(KEY,JSON.stringify(value))}
export function clearCompanyTokens(){sessionStorage.removeItem(KEY)}
export async function companyApi<T>(path:string,token?:string,options?:RequestInit):Promise<T>{
 const config=supabaseAdminConfig();
 if(!config)throw new Error("Configuração Supabase indisponível.");
 const response=await fetch(config.url+path,{...options,headers:{"apikey":config.key,"content-type":"application/json",...(token?{"authorization":"Bearer "+token}:{}),...options?.headers}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error_description||body.error||body.message||"Não foi possível completar o pedido.");
 return body as T;
}
export async function loginCompany(email:string,password:string):Promise<CompanyTokens>{
 const tokens=await companyApi<CompanyTokens>("/auth/v1/token?grant_type=password",undefined,{method:"POST",body:JSON.stringify({email:email.trim().toLowerCase(),password})});
 saveCompanyTokens(tokens);return tokens;
}
export async function updateCompanyPassword(token:string,password:string){
 if(password.length<12)throw new Error("Use pelo menos 12 caracteres.");
 return companyApi("/auth/v1/user",token,{method:"PUT",body:JSON.stringify({password})});
}
export async function companyIdentity(token:string){
 const user=await companyApi<{id:string;email:string}>("/auth/v1/user",token);
 const rows=await companyApi<CompanyMember[]>("/rest/v1/tenant_memberships?select=id,tenant_id,user_id,display_name,email,role,active&user_id=eq."+encodeURIComponent(user.id),token);
 return {user,memberships:rows.filter(m=>m.active)};
}
export async function refreshCompanyTokens(tokens:CompanyTokens):Promise<CompanyTokens>{
 const next=await companyApi<CompanyTokens>("/auth/v1/token?grant_type=refresh_token",undefined,{method:"POST",body:JSON.stringify({refresh_token:tokens.refresh_token})});
 saveCompanyTokens(next);return next;
}
export async function logoutCompany(token?:string){
 if(token){try{await companyApi("/auth/v1/logout",token,{method:"POST"});}catch{/* best-effort */}}
 clearCompanyTokens();
}
