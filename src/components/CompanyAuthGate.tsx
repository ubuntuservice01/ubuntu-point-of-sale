import {useEffect,useState,type FormEvent} from "react";
import {tokensFromInvite} from "../lib/supabase-admin-auth";
import {clearCompanyTokens,companyIdentity,companyTokens,loginCompany,logoutCompany,
 refreshCompanyTokens,saveCompanyTokens,updateCompanyPassword,type CompanyMember,type CompanyTokens} from "../lib/supabase-company-auth";
import {CompanyLive} from "./CompanyLive";
type Phase="loading"|"login"|"new-password"|"ready";
export function CompanyAuthGate({tenantId}:{tenantId?:string}){
 const [phase,setPhase]=useState<Phase>("loading");
 const [tokens,setTokens]=useState<CompanyTokens|null>(null);
 const [members,setMembers]=useState<CompanyMember[]>([]);
 const [selected,setSelected]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const openSession=async (session:CompanyTokens)=>{
  let current=session;let identity;
  try{identity=await companyIdentity(current.access_token);}
  catch{current=await refreshCompanyTokens(session);identity=await companyIdentity(current.access_token);}
  if(!identity.memberships.length)throw new Error("Esta conta ainda não está associada a uma empresa activa.");
  setTokens(current);saveCompanyTokens(current);setMembers(identity.memberships);
  const desired=tenantId&&identity.memberships.some(m=>m.tenant_id===tenantId)?tenantId:identity.memberships[0]!.tenant_id;
  setSelected(desired);setPhase("ready");
 };
 useEffect(()=>{
  const invited=tokensFromInvite();
  if(invited){setTokens(invited);setPhase("new-password");return;}
  const saved=companyTokens();if(!saved){setPhase("login");return;}
  let active=true;
  void openSession(saved).catch(e=>{if(!active)return;clearCompanyTokens();setPhase("login");setError(e instanceof Error?e.message:"A sessão terminou.");});
  return()=>{active=false;};
 },[tenantId]);
 const login=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setBusy(true);setError("");
  try{const next=await loginCompany(email,password);await openSession(next);setPassword("");}
  catch(e){clearCompanyTokens();setError(e instanceof Error?e.message:"Falha no login.");}
  finally{setBusy(false);}
 };
 const firstPassword=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!tokens)return;
  if(password!==confirm){setError("As palavras-passe não coincidem.");return;}
  setBusy(true);setError("");
  try{await updateCompanyPassword(tokens.access_token,password);await openSession(tokens);setPassword("");setConfirm("");}
  catch(e){setError(e instanceof Error?e.message:"Falha na activação.");}
  finally{setBusy(false);}
 };
 const logout=async()=>{
  setBusy(true);await logoutCompany(tokens?.access_token);setTokens(null);setMembers([]);setPhase("login");setBusy(false);
 };
 if(phase==="ready"&&tokens){
  const membership=members.find(m=>m.tenant_id===selected);
  return <><header style={{padding:"12px 24px",background:"#063f40",color:"white",display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}>
   <strong>Ubuntu POS 360 · Administração empresarial</strong>
   <span>{membership?.display_name}<button type="button" onClick={()=>void logout()} disabled={busy} style={{marginLeft:14}}>Sair</button></span>
  </header>
  {members.length>1&&<nav style={{padding:12}}><label>Empresa <select value={selected} onChange={e=>setSelected(e.target.value)}>
   {members.map(m=><option key={m.id} value={m.tenant_id}>{m.display_name} · {m.tenant_id.slice(0,8)}</option>)}
  </select></label></nav>}
  {membership?.role==="company_admin"?<CompanyLive token={tokens.access_token} tenantId={selected}/>:
   <main style={{padding:32}}><h1>Conta de operador</h1><p>O acesso ao POS real para este perfil será activado após os testes de vendas, stock e caixa.</p></main>}
  </>;
 }
 return <main className="supabase-admin-auth"><section className="supabase-admin-auth-card">
  <p className="supabase-admin-auth-label">UBUNTU SERVICE, LDA.</p><h1>Entrar na minha empresa</h1>
  <p className="supabase-admin-auth-description">Acesso individual para administradores e funcionários das empresas.</p>
  {error&&<p role="alert" className="supabase-admin-auth-error">{error}</p>}
  {phase==="loading"&&<p>A verificar conta...</p>}
  {phase==="login"&&<form className="supabase-admin-auth-form" onSubmit={login}>
   <label><span>Email</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
   <label><span>Palavra-passe</span><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>
   <button className="supabase-admin-auth-submit" type="submit" disabled={busy}>{busy?"A verificar...":"Entrar"}</button>
  </form>}
  {phase==="new-password"&&<form className="supabase-admin-auth-form" onSubmit={firstPassword}>
   <p>Convite recebido. Define a tua palavra-passe pessoal.</p>
   <label><span>Nova palavra-passe</span><input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label><span>Confirmar palavra-passe</span><input required minLength={12} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   <button className="supabase-admin-auth-submit" type="submit" disabled={busy}>{busy?"A activar...":"Activar conta"}</button>
  </form>}
 </section></main>;
}
