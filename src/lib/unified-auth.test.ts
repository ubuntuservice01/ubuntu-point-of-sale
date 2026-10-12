import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {
 authorizeTokens,clearUnifiedTokens,destinationFor,destinationUrl,inviteTokensFromUrl,
 memberFor,signInUnified,storedSessionTokens,type AppIdentity
} from "./unified-auth";
import {companyApi,type CompanyMember} from "./supabase-company-auth";

vi.mock("./supabase-company-auth",()=>({companyApi:vi.fn()}));
const COMPANY_ID="11111111-1111-4111-8111-111111111111";
const USER_ID="22222222-2222-4222-8222-222222222222";
const worker=(role:string,tenant_id=COMPANY_ID,user_id=USER_ID):CompanyMember=>({
 id:"33333333-3333-4333-8333-333333333333",tenant_id,user_id,display_name:"Colaborador de teste",
 email:"user@example.org",role,active:true
});
const identity=(role?:string,platform=false):AppIdentity=>({
 id:USER_ID,email:"user@example.org",isPlatformAdmin:platform,
 memberships:role?[worker(role)]:[]
});
beforeEach(()=>{sessionStorage.clear();vi.clearAllMocks();window.history.replaceState({},"","/login");});
afterEach(()=>{sessionStorage.clear();vi.restoreAllMocks();});
describe("Um login, destinos separados por permissões",()=>{
 it("privilegia o Super Admin comprovado na tabela e não no email",()=>{
  expect(destinationFor(identity(undefined,true))).toEqual({pathname:"/super-admin"});
  expect(destinationFor({...identity(),email:"gpalichi27@gmail.com"})).toBeNull();
 });
 it.each([
  ["company_admin","/empresa"],
  ["manager","/caixa"],["supervisor","/caixa"],["cashier","/caixa"],["stock","/stock"]
 ])("encaminha %s para %s", (role,path)=>{
  expect(destinationFor(identity(role))).toEqual({pathname:path,tenantId:COMPANY_ID});
 });
 it("impede funcionário de abrir administração ou filial alheia por manipular o URL",()=>{
  const cashier=identity("cashier");
  expect(memberFor(cashier,"company")).toBeNull();
  expect(memberFor(cashier,"stock")).toBeNull();
  expect(memberFor(cashier,"cashier","aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBeNull();
  expect(memberFor(cashier,"cashier",COMPANY_ID)?.role).toBe("cashier");
 });
 it("não concede acesso a membros inactivos ou membros de outra conta",()=>{
  const i={...identity("company_admin"),memberships:[{...worker("company_admin"),active:false},worker("stock",COMPANY_ID,"99999999-9999-4999-8999-999999999999")]};
  expect(memberFor(i,"company")).toBeNull();
  expect(destinationFor({...i,memberships:[]})).toBeNull();
 });
 it("mantém token de preview ao navegar em subrotas autorizadas",()=>{
  window.history.replaceState({},"","/login?__lovable_token=preview123");
  expect(destinationUrl({pathname:"/caixa",tenantId:COMPANY_ID})).toBe("/caixa?tenant="+COMPANY_ID+"&__lovable_token=preview123");
 });
 it("aceita tokens de convite apenas no fragmento e retira-os da URL",()=>{
  window.history.replaceState({},"","/login#access_token=abc&refresh_token=def&type=invite");
  expect(inviteTokensFromUrl()).toEqual({access_token:"abc",refresh_token:"def"});
  expect(window.location.hash).toBe("");
 });
 it("autentica com Auth e identifica o perfil por autorização devolvida pelo Supabase",async()=>{
  vi.mocked(companyApi).mockImplementation(async(path:string,token?:string)=> {
   if(path.includes("/auth/v1/token?grant_type=password"))return {access_token:"access-token",refresh_token:"refresh-token"};
   if(path==="/auth/v1/user")return {id:USER_ID,email:"user@example.org"};
   if(path.startsWith("/rest/v1/platform_admins"))return [];
   if(path.startsWith("/rest/v1/tenant_memberships"))return [worker("cashier"),worker("company_admin",COMPANY_ID,"someone-else")];
   throw Error("Unmocked API "+path+" "+token);
  });
  const result=await signInUnified("USER@EXAMPLE.ORG","password");
  expect(result.identity.isPlatformAdmin).toBe(false);
  expect(result.identity.memberships).toHaveLength(1);
  expect(destinationFor(result.identity)?.pathname).toBe("/caixa");
  expect(storedSessionTokens()?.access_token).toBe("access-token");
 });
 it("recusa login sem autorização válida, mesmo com credenciais certas",async()=>{
  vi.mocked(companyApi).mockImplementation(async(path:string)=>{
   if(path.includes("/auth/v1/token?grant_type=password"))return {access_token:"access-token",refresh_token:"refresh-token"};
   if(path==="/auth/v1/user")return {id:USER_ID,email:"user@example.org"};
   if(path.startsWith("/rest/v1/platform_admins")||path.startsWith("/rest/v1/tenant_memberships"))return [];
   throw Error("Unmocked");
  });
  await expect(signInUnified("user@example.org","password")).rejects.toThrow(/perfil autorizado/);
  expect(storedSessionTokens()).toBeNull();
  clearUnifiedTokens();
 });
 it("revalida a sessão existente sem confiar em papéis guardados no navegador",async()=>{
  vi.mocked(companyApi).mockImplementation(async(path:string)=>{
   if(path==="/auth/v1/user")return {id:USER_ID,email:"user@example.org"};
   if(path.startsWith("/rest/v1/platform_admins"))return [{user_id:USER_ID}];
   if(path.startsWith("/rest/v1/tenant_memberships"))return [];
   throw Error(path);
  });
  const s=await authorizeTokens({access_token:"token",refresh_token:"refresh"});
  expect(s.identity.isPlatformAdmin).toBe(true);
  expect(destinationFor(s.identity)?.pathname).toBe("/super-admin");
 });
});
