import {useEffect,useMemo,useState,type FormEvent} from "react";
import {Check,CheckCircle2,Eye,EyeOff,Info,KeyRound,LockKeyhole,LogIn,LogOut,Plus,ShieldAlert,ShieldCheck,UserRoundCog,Users,X} from "lucide-react";
import {keyId} from "../lib/domain";
import {ALL_ROLES,BOOTSTRAP_OPERATOR_ID,ROLE_LABELS,canApprove,canDisableOperator,hasConfiguredPin,securePin,validPin,verifyPin,type ApprovalScope,type Operator,type OperatorRole} from "../lib/operators";

export function OperatorLogin({operators,onLogin}:{operators:Operator[];onLogin:(operator:Operator,pin:string)=>Promise<boolean>}){
 const active=operators.filter(o=>o.active);
 const [chosen,setChosen]=useState(active[0]?.id??"");
 const [pin,setPin]=useState("");
 const [show,setShow]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const selected=active.find(o=>o.id===chosen);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(!selected||busy)return;
  setBusy(true);setError("");
  try{
   if(!await onLogin(selected,pin))setError("PIN incorrecto ou acesso não autorizado.");
  }catch(err){setError(err instanceof Error?err.message:"Não foi possível entrar nesta demonstração.")}
  finally{setBusy(false);setPin("")}
 };
 return <div className="op-login-screen" role="main">
  <section className="op-login-card" aria-labelledby="op-login-title">
   <div className="op-login-mark"><LockKeyhole size={28}/></div>
   <span className="op-eyebrow">UBUNTU POS 360 · ACESSO LOCAL</span>
   <h1 id="op-login-title">Identificação do operador</h1>
   <p>Seleccione o seu perfil para continuar a demonstração neste dispositivo.</p>
   <form onSubmit={submit} className="op-login-form">
    <label>Operador<select value={chosen} onChange={e=>{setChosen(e.target.value);setPin("");setError("")}}>
      {active.map(o=><option key={o.id} value={o.id}>{o.name} — {ROLE_LABELS[o.role]}</option>)}
     </select></label>
    {selected&&<div className="op-role-preview"><ShieldCheck size={18}/><span>{ROLE_LABELS[selected.role]}</span><small>{hasConfiguredPin(selected)?"PIN necessário":"Acesso de demonstração sem PIN"}</small></div>}
    {selected&&hasConfiguredPin(selected)&&<label>PIN do operador<div className="op-password-control">
      <input autoComplete="off" inputMode="numeric" type={show?"text":"password"} pattern="[0-9]{4,8}" maxLength={8}
       minLength={4} required value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="4 a 8 algarismos" aria-label="PIN do operador"/>
      <button type="button" onClick={()=>setShow(x=>!x)} aria-label={show?"Ocultar PIN":"Mostrar PIN"}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
     </div></label>}
    {error&&<p className="op-error" role="alert">{error}</p>}
    <button type="submit" className="op-primary" disabled={!selected||busy||(selected&&hasConfiguredPin(selected)&&!validPin(pin))}>
     <LogIn size={18}/>{busy?"A verificar…":"Entrar no POS"}
    </button>
   </form>
   <div className="op-demo-notice"><Info size={18}/><span><b>Protótipo, não autenticação segura:</b> o gerente inicial entra sem PIN para manter a compatibilidade. Configure um PIN no painel de operadores. Perfis e PINs locais não substituem autenticação e permissões validadas por servidor.</span></div>
  </section>
 </div>;
}
type EditForm={id:string|null;name:string;role:OperatorRole;pin:string;active:boolean};
const blank=():EditForm=>({id:null,name:"",role:"caixa",pin:"",active:true});
export function OperatorManagement({operators,actorId,onSave,onToggle}:{operators:Operator[];actorId:string;onSave:(next:Operator)=>void;onToggle:(id:string)=>void}){
 const [editing,setEditing]=useState<EditForm|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [showPin,setShowPin]=useState(false);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(!editing||busy)return;
  setError("");setSuccess("");
  const name=editing.name.trim();
  if(name.length<3||name.length>80){setError("O nome deve ter entre 3 e 80 caracteres.");return;}
  const existing=operators.find(o=>o.id===editing.id);
  if(operators.some(o=>o.id!==editing.id&&o.name.toLowerCase()===name.toLowerCase())){setError("Já existe outro operador com este nome.");return;}
  if(!existing&&!validPin(editing.pin)){setError("O novo operador necessita de PIN entre 4 e 8 algarismos.");return;}
  if(editing.pin&&!validPin(editing.pin)){setError("O PIN deve ter 4 a 8 algarismos.");return;}
  if(existing?.role==="gerente"&&editing.role!=="gerente"&&operators.filter(o=>o.active&&o.role==="gerente").length<=1){
   setError("Não é possível retirar o único gerente activo.");return;
  }
  setBusy(true);
  try{
   const hashed=editing.pin?await securePin(editing.pin):{};
   const now=new Date().toISOString();
   onSave({...existing,...hashed,id:existing?.id??keyId(),name,role:editing.role,active:existing?.active??true,
    createdAt:existing?.createdAt??now,updatedAt:now});
   setEditing(null);setSuccess(existing?"Operador actualizado.":"Operador criado. O PIN não é guardado em texto simples.");
  }catch(err){setError(err instanceof Error?err.message:"Falhou a configuração do operador.")}
  finally{setBusy(false)}
 };
 return <div className="op-management" aria-label="Gestão de operadores">
  <div className="op-section-title"><div><span className="op-eyebrow">GESTÃO INTERNA · DEMONSTRAÇÃO</span>
   <h1><Users size={24}/> Operadores e permissões</h1>
   <p>Crie perfis, escolha as funções e controle quem utiliza o balcão. Todas as permissões nesta fase são locais ao navegador.</p></div>
   <button className="op-primary op-new" type="button" onClick={()=>{setEditing(blank());setError("");setSuccess("")}}><Plus size={18}/> Novo operador</button>
  </div>
  <div className="op-summary-grid">
   {ALL_ROLES.map(role=><article key={role}><span>{ROLE_LABELS[role]}</span><strong>{operators.filter(x=>x.role===role&&x.active).length}</strong><small>Activo(s)</small></article>)}
  </div>
  <section className="op-panel">
   <div className="op-panel-title"><h2>Equipa registada</h2><span>{operators.length} perfil(is)</span></div>
   <div className="op-operator-list">{operators.map(o=><article key={o.id} className={"op-operator-item "+(!o.active?"inactive":"")}>
    <span className="op-avatar">{o.name.slice(0,2).toLocaleUpperCase("pt")}</span>
    <div className="op-operator-data"><strong>{o.name}</strong><small>{ROLE_LABELS[o.role]} · {hasConfiguredPin(o)?"PIN definido":"Sem PIN (demonstração)"} · {o.active?"Activo":"Inactivo"}</small></div>
    <div className="op-operator-actions">
     <button type="button" className="op-outline" onClick={()=>{setEditing({id:o.id,name:o.name,role:o.role,active:o.active,pin:""});setError("");setShowPin(false)}}><UserRoundCog size={16}/> Editar</button>
     <button type="button" className="op-outline" disabled={!canDisableOperator(operators,o.id,actorId)}
      onClick={()=>{if(window.confirm((o.active?"Desactivar ":"Reactivar ")+o.name+"?"))onToggle(o.id)}}>
      {o.active?"Desactivar":"Reactivar"}</button>
    </div>
   </article>)}</div>
  </section>
  <section className="op-panel">
   <h2>Limites dos perfis</h2>
   <div className="op-permission-cards">
    <article><strong>Gerente</strong><p>Gestão geral, preços, margens, operadores, configurações e aprovações.</p></article>
    <article><strong>Supervisor</strong><p>Vendas, caixa, devoluções, stock e operações de balcão. Alterações de preços precisam de autorização do gerente.</p></article>
    <article><strong>Caixa</strong><p>Vendas, recebimentos, clientes e caixa. Não visualiza lucros nem altera produtos; devoluções precisam de aprovação.</p></article>
    <article><strong>Stock</strong><p>Consulta produtos, inventário, compras e fornecedores. Não realiza vendas nem altera preços de venda.</p></article>
   </div>
  </section>
  <p className="op-demo-notice"><Info size={18}/> <span>Os PINs são derivados por PBKDF2 no próprio dispositivo; não são enviados ao Supabase. Um utilizador com controlo do navegador pode modificar os dados locais, pelo que as restrições não devem ser consideradas segurança de produção. O gerente inicial pode configurar o seu próprio PIN através de Editar.</span></p>
  {success&&<p role="status" className="op-success">{success}</p>}
  {editing&&<div className="op-overlay"><section className="op-dialog" role="dialog" aria-label={editing.id?"Editar operador":"Novo operador"} aria-modal="true">
   <div className="op-dialog-heading"><div><h2>{editing.id?"Editar operador":"Novo operador"}</h2><p>Dados de identificação e acesso local</p></div><button type="button" aria-label="Fechar edição" onClick={()=>setEditing(null)}><X size={19}/></button></div>
   <form className="op-editor" onSubmit={submit}>
    <label>Nome do operador<input required maxLength={80} minLength={3} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="Ex.: Operador Balcão 1"/></label>
    <label>Perfil<select value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value as OperatorRole})}>
     {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
    </select></label>
    <label>{editing.id?"Novo PIN (deixar vazio para manter)":"PIN de acesso (obrigatório)"}<div className="op-password-control">
     <input value={editing.pin} type={showPin?"text":"password"} inputMode="numeric" autoComplete="new-password"
      pattern="[0-9]{4,8}" minLength={editing.id?undefined:4} maxLength={8}
      required={!editing.id} onChange={e=>setEditing({...editing,pin:e.target.value.replace(/\D/g,"").slice(0,8)})}
      placeholder="4 a 8 algarismos"/>
     <button type="button" onClick={()=>setShowPin(x=>!x)} aria-label={showPin?"Ocultar PIN":"Mostrar PIN"}>{showPin?<EyeOff size={18}/>:<Eye size={18}/>}</button>
    </div></label>
    {error&&<p role="alert" className="op-error">{error}</p>}
    <div className="op-dialog-actions"><button type="button" className="op-outline" onClick={()=>setEditing(null)}>Cancelar</button><button className="op-primary" type="submit" disabled={busy}><Check size={17}/>{busy?"A preparar…":"Guardar operador"}</button></div>
   </form>
  </section></div>}
 </div>;
}
export function OperatorApprovalDialog({scope,requesterId,description,operators,onApprove,onCancel}:{
 scope:ApprovalScope;requesterId:string;description:string;operators:Operator[];
 onApprove:(approver:Operator)=>void;onCancel:()=>void;
}){
 const eligible=operators.filter(o=>o.active&&o.id!==requesterId&&canApprove(o.role,scope)&&hasConfiguredPin(o));
 const [chosen,setChosen]=useState(eligible[0]?.id??"");
 const [pin,setPin]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const selected=eligible.find(o=>o.id===chosen);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(!selected||busy)return;
  setBusy(true);setError("");
  try{if(await verifyPin(selected,pin))onApprove(selected);else setError("PIN do responsável incorrecto.")}
  catch(err){setError(err instanceof Error?err.message:"Não foi possível validar a autorização.")}
  finally{setBusy(false);setPin("")}
 };
 return <div className="op-overlay"><section className="op-dialog" role="dialog" aria-modal="true" aria-label="Autorização do responsável">
  <div className="op-dialog-heading"><div><span className="op-eyebrow">CONFIRMAÇÃO RESTRITA</span><h2>Autorização do responsável</h2></div><button type="button" onClick={onCancel} aria-label="Cancelar autorização"><X size={20}/></button></div>
  <div className="op-approval-description"><ShieldAlert size={21}/><div><strong>{scope==="returns"?"Devolução de venda":"Alteração de preços"}</strong><p>{description}</p></div></div>
  {eligible.length===0?<p className="op-error" role="alert">Não existe outro responsável activo com PIN configurado e autorização para esta operação. Solicite ao gerente que registe um PIN em Operadores.</p>:
   <form onSubmit={submit} className="op-editor">
    <label>Responsável autorizador<select value={chosen} onChange={e=>{setChosen(e.target.value);setPin("");setError("")}}>
     {eligible.map(o=><option key={o.id} value={o.id}>{o.name} — {ROLE_LABELS[o.role]}</option>)}
    </select></label>
    <label>PIN do responsável<input required type="password" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} minLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,8))} autoComplete="off" placeholder="PIN do aprovador"/></label>
    {error&&<p role="alert" className="op-error">{error}</p>}
    <div className="op-dialog-actions"><button className="op-outline" type="button" onClick={onCancel}>Cancelar</button><button className="op-primary" type="submit" disabled={busy||!validPin(pin)}><ShieldCheck size={17}/>{busy?"A validar…":"Aprovar uma operação"}</button></div>
   </form>}
  <p className="op-approval-warning">Esta autorização é temporária e demonstrativa. Na produção, o servidor deve validar a identidade do responsável e a operação concreta antes da gravação.</p>
 </section></div>;
}
export function OperatorIdentity({operator,onSwitch,onManage}:{operator:Operator;onSwitch:()=>void;onManage:()=>void}){
 return <div className="op-identity" aria-label="Operador actual">
  <span className="op-identity-avatar">{operator.name.slice(0,2).toUpperCase()}</span>
  <div><strong>{operator.name}</strong><small>{ROLE_LABELS[operator.role]} · demonstração</small></div>
  <button type="button" onClick={onSwitch} title="Sair ou trocar de operador"><LogOut size={18}/><span>Trocar</span></button>
  {operator.role==="gerente"&&<button type="button" onClick={onManage} title="Gerir equipa" aria-label="Gerir operadores"><Users size={18}/></button>}
 </div>;
}
