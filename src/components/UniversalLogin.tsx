import {useEffect,useState,type FormEvent} from "react";
import {ArrowRight,Eye,EyeOff,KeyRound,LockKeyhole,Mail,ShieldCheck,Store,Users,CheckCircle2,Layers3} from "lucide-react";
import {
 authorizeTokens,changePasswordUnified,clearUnifiedTokens,destinationFor,goTo,
 inviteTokensFromUrl,recoverPassword,signInUnified,storedSessionTokens,type AppSession
} from "../lib/unified-auth";
import type {CompanyTokens} from "../lib/supabase-company-auth";
import "../styles/universal-login.css";
type Mode="loading"|"login"|"setup"|"recover";
export function UniversalLogin(){
 const [mode,setMode]=useState<Mode>("loading");
 const [invite,setInvite]=useState<CompanyTokens|null>(null);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  const params=new URLSearchParams(window.location.hash.slice(1));
  const urlError=params.get("error_description");
  if(urlError){window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);setError(urlError);}
  const tokens=inviteTokensFromUrl();
  if(tokens){setInvite(tokens);setMode("setup");return ()=>{active=false};}
  const previous=storedSessionTokens();
  if(!previous){setMode("login");return ()=>{active=false};}
  void authorizeTokens(previous).then((session)=>{
   if(!active)return;
   const target=destinationFor(session.identity);
   if(target)goTo(target);
  }).catch(()=>{
   if(!active)return;
   clearUnifiedTokens();setMode("login");
  });
  return()=>{active=false};
 },[]);
 function enter(session:AppSession){
  const destination=destinationFor(session.identity);
  if(!destination)throw new Error("Este utilizador não tem acesso autorizado.");
  goTo(destination);
 }
 async function signIn(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{enter(await signInUnified(email,password));}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível iniciar sessão.");}
  finally{setBusy(false);}
 }
 async function activate(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!invite)return;
  if(password!==confirm){setError("As palavras-passe não coincidem.");return;}
  setBusy(true);setError("");
  try{
   await changePasswordUnified(invite.access_token,password);
   enter(await authorizeTokens(invite));
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível activar a conta.");}
  finally{setBusy(false);}
 }
 async function reset(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   await recoverPassword(email);
   setNotice("Se existir uma conta com este email, receberás instruções de recuperação.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível solicitar a recuperação.");}
  finally{setBusy(false);}
 }
 return <main className="universal-login-page">
  <div className="universal-login-shell">
   <aside className="universal-login-story" aria-label="Ubuntu POS 360">
    <div className="universal-brand">
     <span className="universal-brand-icon"><Layers3 size={29}/></span>
     <span><strong>UBUNTU <span>SERVICE</span></strong><small>CRIANDO PONTES ENTRE O FÍSICO E O DIGITAL</small></span>
    </div>
    <div className="universal-story-main">
     <p className="universal-kicker">GESTÃO COMERCIAL INTELIGENTE</p>
     <h1>Uma plataforma.<br/><em>Todos os negócios.</em></h1>
     <p>O Ubuntu POS 360 liga cada empresa à sua equipa, com acessos individuais e operações organizadas por sector.</p>
     <div className="universal-story-services" aria-label="Recursos da plataforma">
      <span><Store size={17}/> Empresas e filiais</span>
      <span><Users size={17}/> Equipa e permissões</span>
      <span><ShieldCheck size={17}/> Acesso protegido</span>
     </div>
    </div>
    <div className="universal-story-footer">Ubuntu Service, Lda. · O digital é para todos.</div>
   </aside>
   <section className="universal-login-panel">
    <div className="universal-login-mobile-brand"><span className="universal-brand-icon"><Layers3 size={23}/></span><strong>UBUNTU POS 360</strong></div>
    <div className="universal-login-card">
     <div className="universal-login-emblem"><LockKeyhole size={26}/></div>
     <p className="universal-login-overline">ÁREA DE ACESSO · UBUNTU POS 360</p>
     <h2>{mode==="setup"?"Activar a tua conta":mode==="recover"?"Recuperar acesso":"Bem-vindo de volta"}</h2>
     <p className="universal-login-subtitle">
      {mode==="setup"?"Define uma palavra-passe para concluir o convite e entrar no teu painel.":
       mode==="recover"?"Introduz o email da tua conta para receber instruções.":
       "Introduz as tuas credenciais. O sistema identificará o teu perfil e abrirá automaticamente o painel certo."}
     </p>
     {error&&<p className="universal-login-error" role="alert">{error}</p>}
     {notice&&<p className="universal-login-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}
     {mode==="loading"&&<p className="universal-login-loading" role="status"><span className="universal-spinner"/> A verificar a sessão...</p>}
     {mode==="login"&&<form className="universal-login-form" onSubmit={e=>void signIn(e)}>
      <label htmlFor="universal-email">Endereço de email</label>
      <div className="universal-input-row"><Mail size={19}/><input id="universal-email" type="email" autoComplete="username" required placeholder="nome@empresa.co.mz" value={email} onChange={e=>setEmail(e.target.value)}/></div>
      <div className="universal-input-heading"><label htmlFor="universal-password">Palavra-passe</label><button type="button" onClick={()=>{setMode("recover");setError("");setNotice("");}}>Esqueceste a palavra-passe?</button></div>
      <div className="universal-input-row"><KeyRound size={19}/><input id="universal-password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword?"Ocultar palavra-passe":"Mostrar palavra-passe"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
      <button type="submit" className="universal-primary-action" disabled={busy}>{busy?"A verificar credenciais...":"Entrar no sistema"}<ArrowRight size={19}/></button>
     </form>}
     {mode==="setup"&&<form className="universal-login-form" onSubmit={e=>void activate(e)}>
      <label htmlFor="universal-new-password">Nova palavra-passe (mínimo de 12 caracteres)</label>
      <div className="universal-input-row"><KeyRound size={19}/><input id="universal-new-password" type={showPassword?"text":"password"} minLength={12} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label="Mostrar ou ocultar palavra-passe" onClick={()=>setShowPassword(v=>!v)}><Eye size={18}/></button></div>
      <label htmlFor="universal-repeat-password">Confirmar palavra-passe</label>
      <div className="universal-input-row"><KeyRound size={19}/><input id="universal-repeat-password" type={showPassword?"text":"password"} minLength={12} required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>
      <button className="universal-primary-action" disabled={busy} type="submit">{busy?"A activar...":"Activar conta e entrar"}<ArrowRight size={19}/></button>
     </form>}
     {mode==="recover"&&<form className="universal-login-form" onSubmit={e=>void reset(e)}>
      <label htmlFor="universal-recovery-email">Email da conta</label>
      <div className="universal-input-row"><Mail size={19}/><input id="universal-recovery-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@empresa.co.mz" required/></div>
      <button className="universal-primary-action" type="submit" disabled={busy}>{busy?"A solicitar...":"Enviar instruções"}<ArrowRight size={19}/></button>
      <button className="universal-back-action" type="button" onClick={()=>{setMode("login");setError("");setNotice("");}}>Voltar ao login</button>
     </form>}
     <p className="universal-login-hint"><ShieldCheck size={17}/> Uma só entrada para Super Admin, empresas e funcionários. As contas são criadas por convite autorizado.</p>
    </div>
    <footer className="universal-login-panel-footer">© Ubuntu Service, Lda. · Plataforma de acesso seguro</footer>
   </section>
  </div>
 </main>;
}