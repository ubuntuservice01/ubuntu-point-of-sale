import {useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {Link} from "@tanstack/react-router";
import {
 Activity,ArrowLeft,ArrowRight,BarChart3,Bell,Building2,CalendarDays,Check,
 CheckCircle2,ChevronRight,Clock,CreditCard,Download,FileClock,FileText,
 Layers,LayoutDashboard,Menu,MoreHorizontal,Package,PauseCircle,Plus,
 RefreshCw,Search,Settings,ShieldCheck,SlidersHorizontal,Store,Users,
 Wallet,X,AlertTriangle,Edit3,PlayCircle,Receipt,Info,Filter,
} from "lucide-react";
import {useDialogFocus} from "../lib/useDialogFocus";
import {money,keyId} from "../lib/domain";
import {
 ADMIN_KEY,ADMIN_SCREENS,ADMIN_SECTORS,MODULE_CATALOG,
 initialAdminStore,safeAdminStore,dateISO,addDays,displayDate,displayTime,
 assignedModules,projectedMonthlyRevenue,tenantMonthlyPrice,tenantStage,
 uniqueSlug,remainingDays,renewalDate,validateCompanyInput,validatePlan,
 type AdminScreen,type AdminStore,type AdminTenant,type AdminPlan,
 type CompanyInput,type TenantStatus
} from "../lib/admin-demo";

type Dialog="company"|"plan"|"renew"|"tenant"|"confirm-reset"|null;
type Notice={message:string;type:"ok"|"error"};
type TenantFilter="todos"|"activa"|"teste"|"suspensa"|"expirada";
type DetailsTab="resumo"|"modulos"|"licenca";
const NAV_ICONS:Record<AdminScreen,typeof Building2>={
 "visao-geral":LayoutDashboard,empresas:Building2,planos:Layers,licencas:FileClock,
 modulos:Package,subscricoes:CreditCard,auditoria:Activity,definicoes:Settings
};
const STATUS_LABEL:Record<ReturnType<typeof tenantStage>,string>={
 activa:"Activa",teste:"Em teste",suspensa:"Suspensa",expirada:"Expirada"
};
const formatInteger=(n:number)=>new Intl.NumberFormat("pt-MZ").format(n);
function fmtTime(iso:string){return new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso))}
function SectionTitle({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:ReactNode}){
 return <header className="sa-heading"><div><p className="sa-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children&&<div className="sa-heading-actions">{children}</div>}</header>;
}
function StateBadge({tenant}:{tenant:AdminTenant}){
 const status=tenantStage(tenant);return <span className={"sa-status is-"+status}><span/>{STATUS_LABEL[status]}</span>;
}
function EmptyState({icon:Icon,title,body,action}:{icon:typeof Building2;title:string;body:string;action?:ReactNode}){
 return <div className="sa-empty"><div className="sa-empty-icon"><Icon size={23}/></div><h3>{title}</h3><p>{body}</p>{action}</div>;
}
function DialogBox({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 const dialogRef=useDialogFocus<HTMLDivElement>(onClose);
 return <div className="sa-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div ref={dialogRef} tabIndex={-1} className={"sa-modal "+(wide?"wide":"")} role="dialog" aria-modal="true" aria-label={title}>
   <div className="sa-modal-head"><h2>{title}</h2><button aria-label="Fechar" className="sa-icon-btn" onClick={onClose}><X size={19}/></button></div>
   <div className="sa-modal-body">{children}</div>
  </div>
 </div>;
}
function InputField({label,children,hint}:{label:string;children:ReactNode;hint?:string}){
 return <label className="sa-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
function SummaryCard({label,value,help,icon:Icon}:{label:string;value:string;help:string;icon:typeof Building2}){
 return <article className="sa-stat"><div className="sa-stat-heading"><span>{label}</span><span className="sa-stat-icon"><Icon size={19}/></span></div><strong>{value}</strong><small>{help}</small></article>;
}
function csvEscape(value:string){return '"'+value.replaceAll('"','""')+'"'}
function exportAudit(events:AdminStore["events"]){
 const lines=[["Data","Acção","Objecto","Detalhes"],...events.map(e=>[e.createdAt,e.action,e.target,e.details])];
 const csv="\uFEFF"+lines.map(row=>row.map(csvEscape).join(";")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="ubuntu-pos360-auditoria-demonstracao.csv";a.click();
 URL.revokeObjectURL(url);
}
function defaultInput(store:AdminStore):CompanyInput{
 return {name:"",sector:"Loja",city:"",responsible:"",email:"",phone:"",planId:store.plans.find(p=>p.enabled)?.id??"",status:"teste",expiresAt:addDays(dateISO(),14),branchCount:1,notes:""};
}
function defaultPlan():AdminPlan{
 return {id:keyId(),name:"",description:"",monthlyPrice:0,maxBranches:1,maxUsers:3,includedModules:["pos","stock","clientes","relatorios"],enabled:true};
}
export function SuperAdminApp(){
 const [store,setStore]=useState<AdminStore>(()=>initialAdminStore());
 const [loaded,setLoaded]=useState(false);
 const [screen,setScreen]=useState<AdminScreen>("visao-geral");
 const [mobileMenu,setMobileMenu]=useState(false);
 const [sidebarSmall,setSidebarSmall]=useState(false);
 const [dialog,setDialog]=useState<Dialog>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState<TenantFilter>("todos");
 const [selectedTenant,setSelectedTenant]=useState<string|null>(null);
 const [detailsTab,setDetailsTab]=useState<DetailsTab>("resumo");
 const [editingTenant,setEditingTenant]=useState<string|null>(null);
 const [companyInput,setCompanyInput]=useState<CompanyInput>(()=>defaultInput(initialAdminStore()));
 const [editingPlan,setEditingPlan]=useState<string|null>(null);
 const [planInput,setPlanInput]=useState<AdminPlan>(()=>defaultPlan());
 const [renewingTenant,setRenewingTenant]=useState<string|null>(null);
 const [renewDays,setRenewDays]=useState<7|30|365>(30);
 const [auditSearch,setAuditSearch]=useState("");
 useEffect(()=>{
  try{const raw=window.localStorage.getItem(ADMIN_KEY);if(raw)setStore(safeAdminStore(JSON.parse(raw)))}catch{/* dados em memória se o navegador bloquear armazenamento */}
  setLoaded(true);
 },[]);
 useEffect(()=>{if(!loaded)return;try{window.localStorage.setItem(ADMIN_KEY,JSON.stringify(store))}catch{/* demonstração continua em memória */}},[store,loaded]);
 const today=dateISO();
 const active=store.tenants.filter(t=>tenantStage(t,today)==="activa").length;
 const trials=store.tenants.filter(t=>tenantStage(t,today)==="teste").length;
 const suspended=store.tenants.filter(t=>tenantStage(t,today)==="suspensa").length;
 const expired=store.tenants.filter(t=>tenantStage(t,today)==="expirada").length;
 const expiring=store.tenants.filter(t=>tenantStage(t,today)!=="suspensa"&&remainingDays(t.expiresAt,today)>=0&&remainingDays(t.expiresAt,today)<=14);
 const monthly=projectedMonthlyRevenue(store,today);
 const detail=store.tenants.find(t=>t.id===selectedTenant);
 const planFor=(t:AdminTenant)=>store.plans.find(p=>p.id===t.planId);
 const filtered=useMemo(()=>store.tenants.filter(t=>{
  const q=search.toLowerCase().trim();
  return (statusFilter==="todos"||tenantStage(t,today)===statusFilter)&&
   (!q||[t.name,t.sector,t.city,t.slug,t.responsible].join(" ").toLowerCase().includes(q));
 }).sort((a,b)=>a.name.localeCompare(b.name,"pt")),[store.tenants,search,statusFilter,today]);
 const notify=(message:string,type:Notice["type"]="ok")=>setNotice({message,type});
 const go=(to:AdminScreen)=>{setScreen(to);setMobileMenu(false);setNotice(null);};
 const log=(action:string,target:string,details:string)=>({id:keyId(),createdAt:new Date().toISOString(),action,target,details});
 function openCreate(){
  setEditingTenant(null);setCompanyInput(defaultInput(store));setDialog("company");
 }
 function openEdit(t:AdminTenant){
  setEditingTenant(t.id);setCompanyInput({name:t.name,sector:t.sector,city:t.city,responsible:t.responsible,email:t.email,phone:t.phone,planId:t.planId,status:t.status,expiresAt:t.expiresAt,branchCount:t.branchCount,notes:t.notes});setDialog("company");
 }
 function saveCompany(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const error=validateCompanyInput(companyInput,store.plans,today);
  if(error){notify(error,"error");return;}
  const current=store.tenants.find(t=>t.id===editingTenant);
  const targetPlan=store.plans.find(p=>p.id===companyInput.planId);
  if(!current&&!targetPlan?.enabled){notify("Este plano não está disponível para novas empresas.","error");return;}
  const name=companyInput.name.trim(),slug=uniqueSlug(name,store.tenants,editingTenant??undefined);
  if(!slug){notify("Não foi possível gerar o identificador.","error");return;}
  const data:AdminTenant={...companyInput,name,slug,responsible:companyInput.responsible.trim(),email:companyInput.email.trim(),
   city:companyInput.city.trim(),phone:companyInput.phone.trim(),notes:companyInput.notes.trim(),
   id:current?.id??keyId(),createdAt:current?.createdAt??today,
   addons:current?.addons??[]
  };
  setStore(prev=>({...prev,tenants:current?prev.tenants.map(t=>t.id===current.id?data:t):[data,...prev.tenants],
   events:[log(current?"Empresa actualizada":"Empresa criada",name,
    current?"Dados de demonstração editados.":"Registo fictício; sem subdomínio ou acesso real."),...prev.events]}));
  setDialog(null);notify(current?"Empresa actualizada na demonstração.":"Empresa de demonstração registada.");
 }
 function changeStatus(t:AdminTenant,status:TenantStatus){
  if(status===t.status)return;
  if(status==="suspensa"&&!window.confirm("Suspender o acesso simulado de "+t.name+"?"))return;
  setStore(prev=>({...prev,tenants:prev.tenants.map(item=>item.id===t.id?{...item,status}:item),
   events:[log("Estado de licença alterado",t.name,STATUS_LABEL[status]+" (simulação)"),...prev.events]}));
  notify("Estado actualizado apenas na demonstração.");
 }
 function openRenew(t:AdminTenant){setRenewingTenant(t.id);setRenewDays(30);setDialog("renew");}
 function renew(){
  const t=store.tenants.find(t=>t.id===renewingTenant);if(!t)return;
  const expiresAt=renewalDate(t,renewDays,today);
  setStore(prev=>({...prev,tenants:prev.tenants.map(item=>item.id===t.id?{...item,expiresAt,status:item.status==="suspensa"?"suspensa":"activa"}:item),
   events:[log("Licença prolongada",t.name,renewDays+" dias. Nova validade: "+expiresAt+" (simulação)"),...prev.events]}));
  setDialog(null);notify("Prazo da licença alterado na demonstração.");
 }
 function toggleAddon(t:AdminTenant,id:string){
  const plan=planFor(t);if(plan?.includedModules.includes(id))return;
  const enabled=t.addons.includes(id);
  setStore(prev=>({...prev,tenants:prev.tenants.map(item=>item.id===t.id?{...item,addons:enabled?item.addons.filter(x=>x!==id):[...item.addons,id]}:item),
   events:[log(enabled?"Módulo adicional retirado":"Módulo adicional incluído",t.name,(MODULE_CATALOG.find(m=>m.id===id)?.label??id)+" (simulação)"),...prev.events]}));
  notify(enabled?"Módulo adicional retirado.":"Módulo adicional seleccionado.");
 }
 function openPlan(p?:AdminPlan){setEditingPlan(p?.id??null);setPlanInput(p?{...p,includedModules:[...p.includedModules]}:defaultPlan());setDialog("plan");}
 function savePlan(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const plan={...planInput,name:planInput.name.trim(),description:planInput.description.trim()};
  const error=validatePlan(plan,store.plans);
  if(error){notify(error,"error");return;}
  const exists=store.plans.some(p=>p.id===plan.id);
  setStore(prev=>({...prev,plans:exists?prev.plans.map(p=>p.id===plan.id?plan:p):[...prev.plans,plan],
   events:[log(exists?"Plano actualizado":"Plano criado",plan.name,"Preços de demonstração — "+money(plan.monthlyPrice)+"/mês"),...prev.events]}));
  setDialog(null);notify("Plano guardado na demonstração.");
 }
 function togglePlan(p:AdminPlan){
  if(p.enabled&&store.plans.filter(x=>x.enabled).length===1){notify("Mantenha pelo menos um plano disponível.","error");return;}
  setStore(prev=>({...prev,plans:prev.plans.map(plan=>plan.id===p.id?{...plan,enabled:!plan.enabled}:plan),
   events:[log(p.enabled?"Plano retirado de novas adesões":"Plano disponibilizado",p.name,"Os contratos de exemplo existentes são mantidos."),...prev.events]}));
 }
 function resetDemo(){setStore(initialAdminStore());setSelectedTenant(null);setDialog(null);setScreen("visao-geral");notify("Dados demonstrativos repostos.");}
 const navGroups:{id:"geral"|"gestao"|"controlo";title:string}[]=[{id:"geral",title:"PLATAFORMA"},{id:"gestao",title:"GESTÃO COMERCIAL"},{id:"controlo",title:"CONTROLO"}];
 return <div className="sa-root">
  {mobileMenu&&<button type="button" className="sa-mobile-overlay" aria-label="Fechar menu" onClick={()=>setMobileMenu(false)}/>}
  <aside className={"sa-sidebar "+(sidebarSmall?"sa-collapsed ":"")+(mobileMenu?"sa-sidebar-open":"")}>
   <div className="sa-brand"><div className="sa-brand-icon"><Store size={22}/></div>{!sidebarSmall&&<div><strong>Ubuntu POS <span>360</span></strong><small>Administração Ubuntu Service</small></div>}<button className="sa-close-menu" aria-label="Fechar menu" onClick={()=>setMobileMenu(false)}><X size={19}/></button></div>
   <nav aria-label="Navegação Super Admin">{navGroups.map(group=><div className="sa-nav-group" key={group.id}>
     {!sidebarSmall&&<p>{group.title}</p>}
     {ADMIN_SCREENS.filter(x=>x.group===group.id).map(item=>{const Icon=NAV_ICONS[item.id];return <button type="button" key={item.id} onClick={()=>go(item.id)} aria-current={screen===item.id?"page":undefined} className={"sa-nav-item "+(screen===item.id?"active":"")} title={item.label}><Icon size={19}/>{!sidebarSmall&&<span>{item.label}</span>}</button>})}
   </div>)}</nav>
   <div className="sa-sidebar-footer">
    {!sidebarSmall&&<div className="sa-help"><ShieldCheck size={19}/><div><strong>Painel de demonstração</strong><span>Sem autenticação real</span></div></div>}
    <button className="sa-sidebar-collapse" onClick={()=>setSidebarSmall(!sidebarSmall)}><Menu size={18}/>{!sidebarSmall&&"Recolher menu"}</button>
    <Link className="sa-back-link" to="/"><ArrowLeft size={17}/>{!sidebarSmall&&"Voltar à loja"}</Link>
   </div>
  </aside>
  <div className="sa-workspace">
   <header className="sa-topbar">
    <div className="sa-top-left"><button className="sa-menu-trigger" aria-label="Abrir menu" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button><span>Ubuntu Service</span><ChevronRight size={15}/><strong>{ADMIN_SCREENS.find(x=>x.id===screen)?.label}</strong></div>
    <div className="sa-top-right"><span className="sa-demo-badge"><span/> Dados fictícios</span><span className="sa-avatar">US</span></div>
   </header>
   <main className="sa-main">
    <div className="sa-security-banner"><Info size={18}/><span><b>Protótipo do Super Admin.</b> As empresas, licenças e valores apresentados são fictícios. Ainda não existe autenticação, Supabase, cobrança ou activação de domínios.</span></div>
    {notice&&<div className={"sa-notice "+(notice.type==="error"?"error":"success")} role="status"><span>{notice.message}</span><button aria-label="Fechar aviso" onClick={()=>setNotice(null)}><X size={16}/></button></div>}
    {screen==="visao-geral"&&<>
     <SectionTitle eyebrow="ADMINISTRAÇÃO DA PLATAFORMA" title="Visão geral" description="Acompanhe as empresas, licenças e planos do Ubuntu POS 360.">
      <button className="sa-primary" onClick={openCreate}><Plus size={18}/> Nova empresa</button>
     </SectionTitle>
     <div className="sa-stats">
      <SummaryCard label="Empresas registadas" value={formatInteger(store.tenants.length)} help="Registos ilustrativos" icon={Building2}/>
      <SummaryCard label="Licenças activas" value={String(active)} help="Estado de demonstração" icon={CheckCircle2}/>
      <SummaryCard label="Em período de teste" value={String(trials)} help={expired?expired+" expirada(s)":"Sem licenças expiradas"} icon={Clock}/>
      <SummaryCard label="Projecção mensal" value={money(monthly)} help="Não representa receita recebida" icon={Wallet}/>
     </div>
     <div className="sa-two-columns">
      <section className="sa-panel">
       <div className="sa-panel-head"><div><h2>Empresas recentes</h2><p>Consulta rápida aos registos de exemplo</p></div><button className="sa-text-button" onClick={()=>go("empresas")}>Ver todas <ArrowRight size={16}/></button></div>
       <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Empresa</th><th>Plano</th><th>Estado</th><th className="sa-align-right">Acção</th></tr></thead><tbody>
        {store.tenants.slice(0,5).map(t=><tr key={t.id}><td><div className="sa-company-cell"><span>{t.name.charAt(0)}</span><div><strong>{t.name}</strong><small>{t.sector} · {t.city}</small></div></div></td><td>{planFor(t)?.name??"—"}</td><td><StateBadge tenant={t}/></td><td className="sa-align-right"><button className="sa-link" onClick={()=>{setSelectedTenant(t.id);setDetailsTab("resumo");setDialog("tenant")}}>Abrir</button></td></tr>)}
       </tbody></table></div>
      </section>
      <section className="sa-panel sa-alert-panel">
       <div className="sa-panel-head"><div><h2>Licenças a acompanhar</h2><p>Vencimentos nos próximos 14 dias</p></div></div>
       {expiring.length===0?<EmptyState icon={CheckCircle2} title="Sem licenças próximas do fim" body="Quando houver vencimentos próximos, poderá consultá-los aqui."/>:<div className="sa-alert-list">{expiring.map(t=><button key={t.id} onClick={()=>{setSelectedTenant(t.id);setDetailsTab("licenca");setDialog("tenant")}}><span className="sa-alert-icon"><CalendarDays size={19}/></span><span><b>{t.name}</b><small>Vence em {remainingDays(t.expiresAt,today)} dia(s) · {displayDate(t.expiresAt)}</small></span><ChevronRight size={17}/></button>)}</div>}
       <button className="sa-outline sa-panel-action" onClick={()=>go("licencas")}>Gerir licenças</button>
      </section>
     </div>
     <section className="sa-panel sa-bottom-panel"><div className="sa-panel-head"><div><h2>Actividade administrativa</h2><p>Operações efectuadas nesta demonstração</p></div><button className="sa-text-button" onClick={()=>go("auditoria")}>Consultar auditoria <ArrowRight size={16}/></button></div>
      {store.events.length===0?<EmptyState icon={Activity} title="Sem alterações recentes" body="As alterações feitas a empresas, planos e módulos serão registadas aqui."/>:<div className="sa-timeline">{store.events.slice(0,4).map(e=><div key={e.id}><span className="sa-event-icon"><Activity size={16}/></span><div><b>{e.action}</b><p>{e.target} · {e.details}</p></div><time>{fmtTime(e.createdAt)}</time></div>)}</div>}
     </section>
    </>}
    {screen==="empresas"&&<>
     <SectionTitle eyebrow="ORGANIZAÇÕES" title="Empresas" description="Registe empresas e configure os planos e módulos de cada uma.">
      <button className="sa-primary" onClick={openCreate}><Plus size={18}/> Registar empresa</button>
     </SectionTitle>
     <div className="sa-panel sa-list-panel">
      <div className="sa-toolbar">
       <label className="sa-search"><Search size={18}/><input placeholder="Pesquisar por nome, cidade ou sector" aria-label="Pesquisar empresas" value={search} onChange={e=>setSearch(e.target.value)}/></label>
       <label className="sa-select-filter"><Filter size={16}/><select value={statusFilter} aria-label="Filtrar por estado" onChange={e=>setStatusFilter(e.target.value as TenantFilter)}>
        <option value="todos">Todos os estados</option><option value="activa">Activas</option><option value="teste">Em teste</option><option value="suspensa">Suspensas</option><option value="expirada">Expiradas</option>
       </select></label>
       <small>{filtered.length} resultado(s)</small>
      </div>
      {filtered.length===0?<EmptyState icon={Search} title="Nenhuma empresa encontrada" body="Altere a pesquisa ou registe uma nova empresa." action={<button className="sa-primary" onClick={openCreate}><Plus size={16}/> Registar empresa</button>}/>:<div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Empresa</th><th>Localidade</th><th>Plano</th><th>Estado</th><th>Vencimento</th><th className="sa-align-right">Acções</th></tr></thead><tbody>
       {filtered.map(t=><tr key={t.id}><td><div className="sa-company-cell"><span>{t.name.charAt(0)}</span><div><strong>{t.name}</strong><small>{t.sector} · {t.slug}</small></div></div></td><td>{t.city}</td><td>{planFor(t)?.name??"—"}</td><td><StateBadge tenant={t}/></td><td>{displayDate(t.expiresAt)}</td><td className="sa-align-right"><button className="sa-link" onClick={()=>{setSelectedTenant(t.id);setDetailsTab("resumo");setDialog("tenant")}}>Detalhes</button><button className="sa-table-action" onClick={()=>openEdit(t)} aria-label={"Editar "+t.name}><Edit3 size={17}/></button></td></tr>)}
       </tbody></table></div>}
     </div>
    </>}
    {screen==="planos"&&<>
     <SectionTitle eyebrow="OFERTA COMERCIAL" title="Planos e preços" description="Defina o que cada plano oferece. Os valores abaixo são apenas exemplos.">
      <button className="sa-primary" onClick={()=>openPlan()}><Plus size={18}/> Criar plano</button>
     </SectionTitle>
     <div className="sa-pricing-note"><Info size={18}/> Os valores dos planos não foram aprovados como preços comerciais. Edite-os antes de vender o sistema.</div>
     <div className="sa-plan-grid">{store.plans.map(p=><article key={p.id} className="sa-plan-card">
      <div className="sa-plan-top"><div><h2>{p.name}</h2><p>{p.description}</p></div><span className={"sa-plan-availability "+(p.enabled?"enabled":"disabled")}>{p.enabled?"Disponível":"Indisponível"}</span></div>
      <div className="sa-plan-price">{money(p.monthlyPrice)} <span>/ mês</span></div>
      <div className="sa-plan-capacities"><span><Building2 size={16}/>{p.maxBranches} filial(is)</span><span><Users size={16}/>{p.maxUsers} utilizadores</span></div>
      <div className="sa-plan-includes"><b>Inclui</b>{p.includedModules.map(id=><div key={id}><Check size={16}/>{MODULE_CATALOG.find(m=>m.id===id)?.label??id}</div>)}</div>
      <div className="sa-plan-footer"><button className="sa-outline" onClick={()=>openPlan(p)}>Editar plano</button><button className="sa-quiet-button" onClick={()=>togglePlan(p)}>{p.enabled?"Desactivar para novas empresas":"Disponibilizar"}</button></div>
     </article>)}</div>
    </>}
    {screen==="licencas"&&<>
     <SectionTitle eyebrow="ACESSO À PLATAFORMA" title="Licenças" description="Consulte os prazos de utilização e simule a renovação de cada empresa."/>
     <div className="sa-three-small">
      <div className="sa-mini-stat"><CheckCircle2 size={19}/><strong>{active}</strong><span>Activas</span></div>
      <div className="sa-mini-stat"><Clock size={19}/><strong>{trials}</strong><span>Em teste</span></div>
      <div className="sa-mini-stat"><AlertTriangle size={19}/><strong>{expired+suspended}</strong><span>Expiradas ou suspensas</span></div>
     </div>
     <div className="sa-panel sa-list-panel"><div className="sa-panel-head"><div><h2>Licenças das empresas</h2><p>Prazos e alterações guardados neste navegador</p></div></div>
      {store.tenants.length===0?<EmptyState icon={CalendarDays} title="Sem licenças" body="Registe a primeira empresa para configurar uma licença."/>:<div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Empresa</th><th>Estado</th><th>Validade</th><th>Tempo restante</th><th className="sa-align-right">Acção</th></tr></thead><tbody>
      {store.tenants.map(t=>{const days=remainingDays(t.expiresAt,today);return <tr key={t.id}><td><strong>{t.name}</strong></td><td><StateBadge tenant={t}/></td><td>{displayDate(t.expiresAt)}</td><td>{days<0?<span className="sa-overdue">{Math.abs(days)} dia(s) em atraso</span>:<span className={days<=14?"sa-due-soon":""}>{days} dia(s)</span>}</td><td className="sa-align-right"><button className="sa-table-text" onClick={()=>openRenew(t)}>Prolongar prazo</button><button className="sa-table-action" aria-label={"Ver "+t.name} onClick={()=>{setSelectedTenant(t.id);setDetailsTab("licenca");setDialog("tenant")}}><ChevronRight size={18}/></button></td></tr>})}
      </tbody></table></div>}
     </div>
    </>}
    {screen==="modulos"&&<>
     <SectionTitle eyebrow="FUNCIONALIDADES" title="Catálogo de módulos" description="Consulte os recursos que poderão ser incluídos nos planos ou activados por empresa."/>
     <div className="sa-note"><Info size={18}/> A selecção dos módulos nesta fase é apenas visual. A aplicação dos módulos e das permissões será feita com o backend.</div>
     {Array.from(new Set(MODULE_CATALOG.map(m=>m.group))).map(group=><section className="sa-module-section" key={group}><h2>{group}</h2><div className="sa-module-grid">{MODULE_CATALOG.filter(m=>m.group===group).map(m=><article className="sa-module-card" key={m.id}><span className="sa-module-symbol"><Package size={21}/></span><h3>{m.label}</h3><p>{m.description}</p><div className="sa-module-bottom"><small>Adicional: {m.addonPrice===0?"Incluído na base":money(m.addonPrice)+"/mês"}</small></div></article>)}</div></section>)}
    </>}
    {screen==="subscricoes"&&<>
     <SectionTitle eyebrow="PREVISÃO FINANCEIRA" title="Subscrições" description="Visualize estimativas baseadas nos planos e adicionais da demonstração."/>
     <div className="sa-note warning"><Info size={18}/> Isto não é uma conta bancária nem um sistema de facturação. Não existem pagamentos, cobranças ou recibos ligados a este painel.</div>
     <div className="sa-stats sa-stats-three">
      <SummaryCard label="Projecção mensal" value={money(monthly)} help="Apenas empresas com estado activo" icon={Wallet}/>
      <SummaryCard label="Projecção anual" value={money(monthly*12)} help="Mensalidade estimada × 12" icon={BarChart3}/>
      <SummaryCard label="Planos disponíveis" value={String(store.plans.filter(p=>p.enabled).length)} help="Preços configuráveis" icon={Layers}/>
     </div>
     <div className="sa-panel sa-list-panel"><div className="sa-panel-head"><div><h2>Previsão por empresa</h2><p>Valores ilustrativos, sem pagamentos registados</p></div></div><div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Empresa</th><th>Plano</th><th>Adicionais</th><th>Estado</th><th>Valor estimado/mês</th></tr></thead><tbody>
      {store.tenants.map(t=>{const plan=planFor(t);return <tr key={t.id}><td><strong>{t.name}</strong></td><td>{plan?.name??"—"}</td><td>{t.addons.filter(id=>!plan?.includedModules.includes(id)).length}</td><td><StateBadge tenant={t}/></td><td><b>{tenantStage(t,today)==="activa"?money(tenantMonthlyPrice(t,plan)):"Não incluída"}</b></td></tr>})}
     </tbody></table></div></div>
    </>}
    {screen==="auditoria"&&<>
     <SectionTitle eyebrow="RASTREABILIDADE" title="Auditoria" description="Consulte o histórico das alterações efectuadas no Super Admin de demonstração.">
      <button className="sa-outline" disabled={store.events.length===0} onClick={()=>exportAudit(store.events)}><Download size={17}/> Exportar CSV</button>
     </SectionTitle>
     <div className="sa-panel sa-list-panel"><div className="sa-toolbar"><label className="sa-search"><Search size={18}/><input value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} placeholder="Pesquisar por acção ou empresa" aria-label="Pesquisar auditoria"/></label><small>{store.events.length} registos locais</small></div>
      {store.events.filter(e=>(e.action+" "+e.target+" "+e.details).toLowerCase().includes(auditSearch.toLowerCase())).length===0?<EmptyState icon={Activity} title="Sem movimentos para apresentar" body="As operações de exemplo que fizer serão guardadas aqui e podem ser exportadas."/>:<div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Data</th><th>Acção</th><th>Empresa ou plano</th><th>Descrição</th></tr></thead><tbody>
       {store.events.filter(e=>(e.action+" "+e.target+" "+e.details).toLowerCase().includes(auditSearch.toLowerCase())).map(e=><tr key={e.id}><td>{displayTime(e.createdAt)}</td><td><strong>{e.action}</strong></td><td>{e.target}</td><td>{e.details}</td></tr>)}
      </tbody></table></div>}
     </div>
    </>}
    {screen==="definicoes"&&<>
     <SectionTitle eyebrow="CONFIGURAÇÃO" title="Definições" description="Reveja o ambiente de trabalho antes da integração com o Supabase."/>
     <section className="sa-panel sa-settings">
      <div className="sa-settings-head"><SlidersHorizontal size={23}/><div><h2>Ambiente da Ubuntu Service</h2><p>Este painel foi preparado para testar fluxos antes da integração real.</p></div></div>
      <div className="sa-setting-row"><span>Idioma</span><b>Português de Moçambique</b></div>
      <div className="sa-setting-row"><span>Moeda</span><b>Metical (MZN)</b></div>
      <div className="sa-setting-row"><span>Dados</span><b>Exemplos locais no navegador</b></div>
      <div className="sa-setting-row"><span>Autenticação e autorizações</span><b>Por implementar</b></div>
      <div className="sa-setting-row"><span>Subdomínios e DNS</span><b>Não configurados</b></div>
      <div className="sa-setting-row"><span>Subsistema de pagamentos</span><b>Não configurado</b></div>
      <div className="sa-settings-danger"><h3>Repor a demonstração</h3><p>Apaga as empresas, planos e actividades criados nesta demonstração e volta a carregar os exemplos iniciais. Não afecta outros dados da aplicação.</p><button className="sa-danger-button" onClick={()=>setDialog("confirm-reset")}>Repor dados de exemplo</button></div>
     </section>
    </>}
    <footer className="sa-footer">Ubuntu POS 360 · Uma plataforma desenvolvida pela <b>Ubuntu Service, Lda.</b> · Criando pontes entre o físico e o digital.</footer>
   </main>
  </div>
  {dialog==="company"&&<DialogBox title={editingTenant?"Editar empresa de demonstração":"Registar empresa de demonstração"} onClose={()=>setDialog(null)} wide>
   <form className="sa-form-grid" onSubmit={saveCompany}>
    <InputField label="Nome da empresa"><input value={companyInput.name} required onChange={e=>setCompanyInput({...companyInput,name:e.target.value})} placeholder="Ex.: Farmácia Modelo"/></InputField>
    <InputField label="Sector de actividade"><select value={companyInput.sector} onChange={e=>setCompanyInput({...companyInput,sector:e.target.value})}>{ADMIN_SECTORS.map(s=><option key={s}>{s}</option>)}</select></InputField>
    <InputField label="Cidade ou distrito"><input value={companyInput.city} required onChange={e=>setCompanyInput({...companyInput,city:e.target.value})} placeholder="Ex.: Lichinga"/></InputField>
    <InputField label="Nome do responsável"><input value={companyInput.responsible} required onChange={e=>setCompanyInput({...companyInput,responsible:e.target.value})} placeholder="Nome de exemplo"/></InputField>
    <InputField label="E-mail de demonstração"><input type="email" value={companyInput.email} required onChange={e=>setCompanyInput({...companyInput,email:e.target.value})} placeholder="exemplo@exemplo.invalid"/></InputField>
    <InputField label="Contacto (opcional)"><input value={companyInput.phone} onChange={e=>setCompanyInput({...companyInput,phone:e.target.value})} placeholder="84 000 0000"/></InputField>
    <InputField label="Plano"><select value={companyInput.planId} required onChange={e=>{const plan=store.plans.find(p=>p.id===e.target.value);setCompanyInput({...companyInput,planId:e.target.value,branchCount:Math.min(companyInput.branchCount,plan?.maxBranches??1)})}}>{store.plans.filter(p=>p.enabled||p.id===companyInput.planId).map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.monthlyPrice)}/mês</option>)}</select></InputField>
    <InputField label="Número de filiais" hint={"Máximo do plano: "+(store.plans.find(p=>p.id===companyInput.planId)?.maxBranches??0)}><input type="number" required min="1" max={store.plans.find(p=>p.id===companyInput.planId)?.maxBranches??1} value={companyInput.branchCount} onChange={e=>setCompanyInput({...companyInput,branchCount:Number(e.target.value)})}/></InputField>
    <InputField label="Estado da licença"><select value={companyInput.status} onChange={e=>setCompanyInput({...companyInput,status:e.target.value as TenantStatus})}><option value="teste">Em teste</option><option value="activa">Activa (simulação)</option><option value="suspensa">Suspensa</option></select></InputField>
    <InputField label="Data de validade"><input type="date" min={today} required value={companyInput.expiresAt} onChange={e=>setCompanyInput({...companyInput,expiresAt:e.target.value})}/></InputField>
    <div className="sa-form-full"><InputField label="Notas internas"><textarea rows={3} value={companyInput.notes} onChange={e=>setCompanyInput({...companyInput,notes:e.target.value})} placeholder="Observações sobre a empresa"/></InputField></div>
    <p className="sa-form-note"><Info size={17}/> O endereço ilustrativo será gerado automaticamente. Não cria utilizadores, e-mails ou DNS reais.</p>
    <div className="sa-form-actions"><button type="button" className="sa-outline" onClick={()=>setDialog(null)}>Cancelar</button><button type="submit" className="sa-primary"><Check size={18}/> Guardar empresa</button></div>
   </form>
  </DialogBox>}
  {dialog==="plan"&&<DialogBox title={editingPlan?"Editar plano":"Criar plano de demonstração"} onClose={()=>setDialog(null)} wide>
    <form className="sa-form-grid" onSubmit={savePlan}>
     <InputField label="Nome do plano"><input required value={planInput.name} onChange={e=>setPlanInput({...planInput,name:e.target.value})} placeholder="Ex.: Profissional"/></InputField>
     <InputField label="Valor mensal (MZN)"><input type="number" min="0" step="0.01" required value={planInput.monthlyPrice} onChange={e=>setPlanInput({...planInput,monthlyPrice:Number(e.target.value)})}/></InputField>
     <InputField label="Máximo de filiais"><input type="number" min="1" step="1" required value={planInput.maxBranches} onChange={e=>setPlanInput({...planInput,maxBranches:Number(e.target.value)})}/></InputField>
     <InputField label="Máximo de utilizadores"><input type="number" min="1" step="1" required value={planInput.maxUsers} onChange={e=>setPlanInput({...planInput,maxUsers:Number(e.target.value)})}/></InputField>
     <div className="sa-form-full"><InputField label="Descrição"><textarea rows={2} value={planInput.description} onChange={e=>setPlanInput({...planInput,description:e.target.value})}/></InputField></div>
     <div className="sa-form-full"><b className="sa-form-section-title">Módulos incluídos no plano</b><p className="sa-form-section-help">Ponto de venda e produtos/stock são obrigatórios. Os restantes podem ser activados mais tarde.</p><div className="sa-check-grid">
      {MODULE_CATALOG.map(m=><label key={m.id} className="sa-checkbox"><input type="checkbox" disabled={m.id==="pos"||m.id==="stock"} checked={planInput.includedModules.includes(m.id)} onChange={e=>setPlanInput({...planInput,includedModules:e.target.checked?[...planInput.includedModules,m.id]:planInput.includedModules.filter(id=>id!==m.id)})}/><span>{m.label}</span></label>)}
     </div></div>
     <div className="sa-form-actions"><button type="button" className="sa-outline" onClick={()=>setDialog(null)}>Cancelar</button><button className="sa-primary" type="submit"><Check size={18}/> Guardar plano</button></div>
    </form>
  </DialogBox>}
  {dialog==="renew"&&<DialogBox title="Prolongar validade" onClose={()=>setDialog(null)}>
    {(()=>{const t=store.tenants.find(x=>x.id===renewingTenant);if(!t)return null;return <div className="sa-renew-content"><p>Empresa: <strong>{t.name}</strong></p><p>Prazo actual: <b>{displayDate(t.expiresAt)}</b></p><div className="sa-form-section-title">Adicionar período</div><div className="sa-duration-options">{([7,30,365] as const).map(d=><button key={d} onClick={()=>setRenewDays(d)} className={renewDays===d?"selected":""}>{d===7?"7 dias":d===30?"30 dias":"1 ano"}</button>)}</div><div className="sa-renew-preview"><CalendarDays size={20}/><span>Nova validade: <b>{displayDate(renewalDate(t,renewDays,today))}</b></span></div><p className="sa-form-note"><Info size={17}/> Alteração simulada; não é uma renovação comercial nem concede acesso real.</p><div className="sa-form-actions"><button className="sa-outline" onClick={()=>setDialog(null)}>Cancelar</button><button className="sa-primary" onClick={renew}>Confirmar prazo</button></div></div>})()}
  </DialogBox>}
  {dialog==="tenant"&&detail&&<DialogBox title="Detalhes da empresa" wide onClose={()=>setDialog(null)}>
    <div className="sa-tenant-head"><div className="sa-tenant-logo">{detail.name.charAt(0)}</div><div><h3>{detail.name}</h3><p>{detail.sector} · {detail.city}</p></div><StateBadge tenant={detail}/></div>
    <div className="sa-detail-tabs" role="tablist" aria-label="Detalhes da empresa">{(["resumo","modulos","licenca"] as const).map(tab=><button role="tab" key={tab} aria-selected={detailsTab===tab} className={detailsTab===tab?"active":""} onClick={()=>setDetailsTab(tab)}>{tab==="resumo"?"Resumo":tab==="modulos"?"Módulos":"Licença"}</button>)}</div>
    {detailsTab==="resumo"&&<div><dl className="sa-details-list"><div><dt>Responsável</dt><dd>{detail.responsible}</dd></div><div><dt>E-mail</dt><dd>{detail.email}</dd></div><div><dt>Plano</dt><dd>{planFor(detail)?.name??"—"}</dd></div><div><dt>Filiais</dt><dd>{detail.branchCount}</dd></div><div><dt>Identificador</dt><dd><code>{detail.slug}.pos.exemplo.invalid</code></dd></div><div><dt>Observações</dt><dd>{detail.notes||"—"}</dd></div></dl><div className="sa-modal-actions"><Link className="sa-primary" to="/empresa" search={{tenant:detail.id}} onClick={()=>setDialog(null)}><Building2 size={16}/> Painel da empresa</Link><button className="sa-outline" onClick={()=>{setDialog(null);openEdit(detail)}}><Edit3 size={16}/> Editar dados</button></div></div>}
    {detailsTab==="modulos"&&<div><p className="sa-tab-hint">Módulos do plano são incluídos automaticamente. Pode acrescentar ou retirar recursos adicionais nesta demonstração.</p><div className="sa-company-module-list">{MODULE_CATALOG.map(m=>{const inherited=planFor(detail)?.includedModules.includes(m.id)??false;const checked=assignedModules(detail,planFor(detail)).includes(m.id);return <label key={m.id} className="sa-module-toggle"><input type="checkbox" checked={checked} disabled={inherited} onChange={()=>toggleAddon(detail,m.id)}/><span><b>{m.label}</b><small>{inherited?"Incluído no plano":m.addonPrice===0?"Adicional sem custo demonstrativo":money(m.addonPrice)+"/mês (valor ilustrativo)"}</small></span></label>})}</div><div className="sa-module-total">Valor mensal estimado: <strong>{money(tenantMonthlyPrice(detail,planFor(detail)))}</strong></div></div>}
    {detailsTab==="licenca"&&<div><dl className="sa-details-list"><div><dt>Estado</dt><dd><StateBadge tenant={detail}/></dd></div><div><dt>Registo</dt><dd>{displayDate(detail.createdAt)}</dd></div><div><dt>Validade</dt><dd>{displayDate(detail.expiresAt)}</dd></div><div><dt>Dias até ao fim</dt><dd>{remainingDays(detail.expiresAt,today)}</dd></div></dl><div className="sa-modal-actions"><button className="sa-outline" onClick={()=>{setDialog(null);openRenew(detail)}}><CalendarDays size={16}/> Prolongar prazo</button>{detail.status==="suspensa"?<button className="sa-primary" onClick={()=>changeStatus(detail,"activa")}><PlayCircle size={16}/> Reactivar simulação</button>:<button className="sa-danger-button" onClick={()=>changeStatus(detail,"suspensa")}><PauseCircle size={16}/> Suspender simulação</button>}{detail.status==="teste"&&<button className="sa-primary" onClick={()=>changeStatus(detail,"activa")}>Concluir teste</button>}</div></div>}
  </DialogBox>}
  {dialog==="confirm-reset"&&<DialogBox title="Repor dados da demonstração?" onClose={()=>setDialog(null)}>
   <p className="sa-confirm-text">Esta acção apaga as empresas, planos e actividades que alterou no Super Admin deste navegador. Os exemplos iniciais voltarão a aparecer.</p><div className="sa-form-actions"><button className="sa-outline" onClick={()=>setDialog(null)}>Cancelar</button><button className="sa-danger-button" onClick={resetDemo}>Repor dados</button></div>
  </DialogBox>}
 </div>;
}
