import {useEffect,useState} from "react";
import {LogOut,ShieldCheck} from "lucide-react";
import {CompanyLive} from "./CompanyLive";
import {CashierLive} from "./CashierLive";
import {CompanyProductManager} from "./CompanyProductManager";
import {SuperAdminLive} from "./SuperAdminLive";
import {SuperAdminApp} from "./SuperAdminApp";
import {authorizeTokens,destinationFor,destinationUrl,goTo,goToLogin,memberFor,signOutUnified,storedSessionTokens,type AppAudience,type AppSession} from "../lib/unified-auth";
import type {CompanyMember} from "../lib/supabase-company-auth";

const audPath:Record<AppAudience,"/super-admin"|"/empresa"|"/caixa"|"/stock">={
 platform:"/super-admin",company:"/empresa",cashier:"/caixa",stock:"/stock"
};
function eligible(m:CompanyMember,audience:AppAudience){
 const allowed:Record<AppAudience,string[]>={platform:[],company:["company_admin"],cashier:["company_admin","manager","supervisor","cashier"],stock:["company_admin","manager","supervisor","stock"]};
 return m.active&&allowed[audience].includes(m.role);
}
/** Protecção aplicada a cada rota, não só ao botão de login.
 * O servidor e o RLS validam as autorizações em todas as operações efectivas.
 */
export function ProtectedWorkspace({audience}:{audience:AppAudience}){
 const [session,setSession]=useState<AppSession|null>(null);
 const [selected,setSelected]=useState<CompanyMember|null>(null);
 const [phase,setPhase]=useState<"loading"|"ready"|"error">("loading");
 const [error,setError]=useState("");
 const [showDemo,setShowDemo]=useState(false);
 useEffect(()=>{
  let live=true;
  const saved=storedSessionTokens();
  if(!saved){goToLogin();return;}
  void authorizeTokens(saved).then(s=>{
   if(!live)return;
   if(audience==="platform"){
    if(!s.identity.isPlatformAdmin){
     const to=destinationFor(s.identity);if(to)goTo(to);else goToLogin();return;
    }
    setSession(s);setPhase("ready");return;
   }
   const target=new URLSearchParams(window.location.search).get("tenant")||undefined;
   const member=memberFor(s.identity,audience,target);
   if(!member){
    const to=destinationFor(s.identity);if(to)goTo(to);else goToLogin();return;
   }
   setSession(s);setSelected(member);setPhase("ready");
  }).catch(err=>{
   if(!live)return;
   setError(err instanceof Error?err.message:"A sessão não pôde ser validada.");
   setPhase("error");
  });
  return()=>{live=false};
 },[audience]);
 // Revalida em intervalos regulares também durante turnos longos.
 useEffect(()=>{
  if(phase!=="ready"||!session)return;
  let running=false;
  const refresh=async()=>{
   if(running)return;running=true;
   try{
    const updated=await authorizeTokens(session.tokens);
    if(audience==="platform"&&!updated.identity.isPlatformAdmin)throw new Error("A autorização foi revogada.");
    if(audience!=="platform"&&!memberFor(updated.identity,audience,selected?.tenant_id))throw new Error("A associação à empresa foi revogada.");
    setSession(updated);
   }catch{goToLogin();}
   finally{running=false}
  };
  const id=window.setInterval(()=>{void refresh()},10*60*1000);
  return()=>window.clearInterval(id);
 },[audience,phase,session?.tokens.refresh_token,selected?.tenant_id]);
 const logout=async()=>{
  await signOutUnified(session?.tokens??null);
  goToLogin();
 };
 if(phase==="loading")return <main className="supabase-admin-auth"><p role="status">A confirmar a sessão e as permissões...</p></main>;
 if(phase==="error")return <main className="supabase-admin-auth"><section className="supabase-admin-auth-card">
  <h1>Não foi possível validar o acesso</h1><p role="alert">{error}</p>
  <button className="supabase-admin-auth-submit" onClick={()=>void logout()}>Voltar ao login</button></section></main>;
 if(!session||audience!=="platform"&&!selected)return null;
 const available=audience==="platform"?[]:session.identity.memberships.filter(m=>eligible(m,audience));
 return <>
  <header className="supabase-admin-active" style={{justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
   <strong><ShieldCheck size={16} style={{verticalAlign:"middle"}}/> Ubuntu POS 360 · Acesso autenticado</strong>
   <span>{session.identity.email}</span>
   <button type="button" onClick={()=>void logout()}><LogOut size={15}/> Sair da conta</button>
  </header>
  {available.length>1&&<div style={{padding:"12px 24px",background:"#f0f8f6"}}>
   <label>Seleccionar empresa / função <select value={selected?.id??""}
    onChange={e=>{
     const next=available.find(m=>m.id===e.target.value);
     if(next)window.location.assign(destinationUrl({pathname:audPath[audience],tenantId:next.tenant_id}));
    }}>
    {available.map(m=><option key={m.id} value={m.id}>{m.display_name} — {m.role} ({m.tenant_id.slice(0,8)})</option>)}
   </select></label></div>}
  {audience==="platform"?<>
   <div style={{padding:"8px 24px",display:"flex",justifyContent:"flex-end",background:"#e9f4f4"}}>
    <button type="button" onClick={()=>setShowDemo(v=>!v)}>{showDemo?"Voltar às empresas reais":"Abrir demonstração local"}</button>
   </div>
   {showDemo?<SuperAdminApp/>:<SuperAdminLive token={session.tokens.access_token}/>}
  </>:audience==="company"&&selected?
   <CompanyLive token={session.tokens.access_token} tenantId={selected.tenant_id}/>:
   audience==="cashier"&&selected?
   <CashierLive token={session.tokens.access_token} tenantId={selected.tenant_id} membershipId={selected.id}
    userId={selected.user_id} role={selected.role}/>:
   audience==="stock"&&selected?
   <main style={{padding:24,maxWidth:1050,margin:"auto"}}><h1>Produtos e stock</h1>
    <CompanyProductManager token={session.tokens.access_token} tenantId={selected.tenant_id} canEdit={false}/></main>:null}
 </>;
}
