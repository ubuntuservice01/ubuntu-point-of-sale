import {useEffect,useState,type FormEvent} from "react";
import {LockKeyhole,LogIn,Mail,ShieldCheck,Eye,EyeOff,KeyRound,LogOut} from "lucide-react";
import {SuperAdminApp} from "./SuperAdminApp";
import {SuperAdminLive} from "./SuperAdminLive";
import {
 authenticateTokens,clearTokens,loginAdmin,logoutAdmin,savedTokens,
 setFirstPassword,supabaseAdminConfig,tokensFromInvite,
 type AdminIdentity
} from "../lib/supabase-admin-auth";
import "../styles/super-admin-login.css";

type Phase="loading"|"configuration"|"login"|"new-password"|"ready";
type Credentials={access_token:string;refresh_token:string};
export function SuperAdminAuthGate(){
 const [phase,setPhase]=useState<Phase>("loading");
 const [identity,setIdentity]=useState<AdminIdentity|null>(null);
 const [tokens,setTokens]=useState<Credentials|null>(null);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [reveal,setReveal]=useState(false);
 const [busy,setBusy]=useState(false);
 const [showDemo,setShowDemo]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  if(!supabaseAdminConfig()){setPhase("configuration");return;}
  const invite=tokensFromInvite();
  if(invite){setTokens(invite);setPhase("new-password");return;}
  const stored=savedTokens();
  if(!stored){setPhase("login");return;}
  let active=true;
  void authenticateTokens(stored).then(result=>{
   if(!active)return;
   setIdentity(result.identity);setTokens(result.tokens);setPhase("ready");
  }).catch(err=>{
   if(!active)return;
   clearTokens();setPhase("login");
   setMessage(err instanceof Error?err.message:"A sessão expirou. Entre novamente.");
  });
  return()=>{active=false};
 },[]);
 const doLogin=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(busy)return;
  setBusy(true);setMessage("");
  try{
   const result=await loginAdmin(email,password);
   setIdentity(result.identity);setTokens(result.tokens);setPassword("");setPhase("ready");
  }catch(err){setMessage(err instanceof Error?err.message:"Não foi possível iniciar sessão.");}
  finally{setBusy(false)}
 };
 const newPassword=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(busy||!tokens)return;
  if(password!==confirm){setMessage("As palavras-passe não coincidem.");return;}
  setBusy(true);setMessage("");
  try{
   const result=await setFirstPassword(tokens,password);
   setIdentity(result.identity);setTokens(result.tokens);
   setPassword("");setConfirm("");setPhase("ready");
  }catch(err){setMessage(err instanceof Error?err.message:"Não foi possível activar a conta.");}
  finally{setBusy(false)}
 };
 const exit=async()=>{
  setBusy(true);
  await logoutAdmin(tokens);
  setIdentity(null);setTokens(null);setPassword("");setMessage("");setPhase("login");
  setBusy(false);
 };
 if(phase==="ready"&&identity)return <>
  <div className="supabase-admin-active" role="status">
   <ShieldCheck size={16}/><span>Sessão Supabase: {identity.email}</span>
   <button type="button" onClick={()=>void exit()} disabled={busy}><LogOut size={15}/> Sair</button>
  </div>
  <div style={{padding:"8px 24px",display:"flex",justifyContent:"flex-end",background:"#e9f4f4"}}>
   <button type="button" onClick={()=>setShowDemo(v=>!v)}>{showDemo?"Voltar às empresas reais":"Abrir demonstração local"}</button>
  </div>
  {showDemo?<SuperAdminApp/>:<SuperAdminLive token={tokens?.access_token??""}/>}
 </>;
 return <main className="supabase-admin-auth">
  <section className="supabase-admin-auth-card">
   <div className="supabase-admin-auth-logo"><ShieldCheck size={32}/></div>
   <p className="supabase-admin-auth-label">UBUNTU SERVICE, LDA.</p>
   <h1>Administração do Ubuntu POS 360</h1>
   <p className="supabase-admin-auth-description">Acesso reservado aos administradores autorizados da plataforma.</p>
   {phase==="loading"&&<p role="status">A verificar sessão segura...</p>}
   {phase==="configuration"&&<p className="supabase-admin-auth-error" role="alert">O acesso está bloqueado até serem configuradas as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente de publicação. Nunca utilize uma chave service_role no navegador.</p>}
   {message&&<p className="supabase-admin-auth-error" role="alert">{message}</p>}
   {phase==="login"&&<form onSubmit={e=>void doLogin(e)} className="supabase-admin-auth-form">
    <label><span>Email</span><div className="supabase-admin-auth-input"><Mail size={17}/>
     <input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@empresa.co.mz" required/></div></label>
    <label><span>Palavra-passe</span><div className="supabase-admin-auth-input"><LockKeyhole size={17}/>
     <input type={reveal?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>
     <button type="button" onClick={()=>setReveal(!reveal)} aria-label={reveal?"Ocultar palavra-passe":"Mostrar palavra-passe"}>{reveal?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <button className="supabase-admin-auth-submit" type="submit" disabled={busy}>
     <LogIn size={18}/>{busy?"A verificar...":"Entrar no Super Admin"}
    </button>
    <p className="supabase-admin-auth-footnote">A primeira conta é criada por convite do Supabase e só obtém privilégios depois de confirmar o email.</p>
   </form>}
   {phase==="new-password"&&<form onSubmit={e=>void newPassword(e)} className="supabase-admin-auth-form">
    <p className="supabase-admin-auth-description">Convite recebido. Define uma palavra-passe forte para activar a tua conta.</p>
    <label><span>Nova palavra-passe (mínimo de 12 caracteres)</span><div className="supabase-admin-auth-input"><KeyRound size={17}/>
     <input type={reveal?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} required/>
     <button type="button" onClick={()=>setReveal(!reveal)} aria-label="Mostrar ou ocultar palavra-passe">{reveal?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <label><span>Confirmar palavra-passe</span><div className="supabase-admin-auth-input"><KeyRound size={17}/>
     <input type={reveal?"text":"password"} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={12} required/></div></label>
    <button className="supabase-admin-auth-submit" type="submit" disabled={busy}>
     <ShieldCheck size={18}/>{busy?"A activar...":"Definir palavra-passe"}
    </button>
   </form>}
  </section>
 </main>;
}