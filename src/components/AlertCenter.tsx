import {useMemo,useState,type FormEvent} from "react";
import {AlertTriangle,ArrowRight,Bell,BellOff,Check,CheckCheck,ChevronRight,Clock3,HandCoins,Info,Package,RefreshCw,Search,Settings2,ShieldAlert,ShoppingBag,Undo2,CalendarClock} from "lucide-react";
import {alertKindText,alertPriorityText,alertSummary,defaultAlertSettings,safeAlertSettings,type AlertKind,type AlertPriority,type AlertSettings,type OperationalAlert} from "../lib/alerts";

type Props={
 alerts:OperationalAlert[];readIds:readonly string[];
 onOpen:(alert:OperationalAlert)=>void;
 onRead:(id:string)=>void;onUnread:(id:string)=>void;onReadAll:()=>void;
 settings:AlertSettings;onSaveSettings:(settings:AlertSettings)=>void;
};
const kindIcon={stock:Package,credit:HandCoins,expiry:CalendarClock,orders:ShoppingBag};
const priorityIcon={critical:ShieldAlert,high:AlertTriangle,medium:Clock3};
const priorities:AlertPriority[]=["critical","high","medium"];
const kinds:AlertKind[]=["stock","credit","expiry","orders"];
type ReadFilter="pending"|"read"|"all";
type KindFilter="all"|AlertKind;
type PriorityFilter="all"|AlertPriority;

function AlertCard({alert,read,onOpen,onRead,onUnread}:{alert:OperationalAlert;read:boolean;onOpen:()=>void;onRead:()=>void;onUnread:()=>void}){
 const Icon=kindIcon[alert.kind],Priority=priorityIcon[alert.priority];
 return <article className={"al-card "+(read?"is-read ":"")+"al-priority-"+alert.priority}>
  <div className="al-card-top">
   <span className="al-kind-icon"><Icon size={19}/></span>
   <span className="al-kind">{alertKindText[alert.kind]}</span>
   <span className={"al-priority-label al-priority-label-"+alert.priority}><Priority size={14}/>{alertPriorityText[alert.priority]}</span>
   {read&&<span className="al-read-chip"><Check size={13}/> Lido</span>}
  </div>
  <div className="al-card-body"><h3>{alert.title}</h3><p>{alert.description}</p></div>
  <div className="al-card-actions">
   <button type="button" className="al-open-action" onClick={onOpen}>{alert.actionLabel}<ArrowRight size={16}/></button>
   {read?<button type="button" className="al-read-action" aria-label={"Marcar como por ler: "+alert.title} onClick={onUnread}><Undo2 size={15}/> Marcar por ler</button>:
    <button type="button" className="al-read-action" aria-label={"Marcar como lido: "+alert.title} onClick={onRead}><Check size={15}/> Marcar lido</button>}
  </div>
 </article>;
}
function SettingsForm({settings,onSave}:{settings:AlertSettings;onSave:(settings:AlertSettings)=>void}){
 const [draft,setDraft]=useState(()=>safeAlertSettings(settings));
 const [saved,setSaved]=useState(false);
 const submit=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  const clean=safeAlertSettings(draft);
  onSave(clean);setDraft(clean);setSaved(true);
 };
 const reset=()=>{setDraft(defaultAlertSettings());setSaved(false)};
 return <form onSubmit={submit} className="al-settings-form">
  <p>Defina quando surgem os avisos. Estes limites aplicam-se apenas aos dados da demonstração deste navegador.</p>
  <div className="al-settings-fields">
   <label>Limite de stock baixo (unidades)<input aria-label="Limite de stock baixo" type="number" min={0} max={100000} step={1} required value={draft.lowStockThreshold} onChange={e=>{setDraft(s=>({...s,lowStockThreshold:Number(e.target.value)}));setSaved(false)}}/></label>
   <label>Avisar validade com antecedência (dias)<input aria-label="Antecedência de validade" type="number" min={1} max={365} step={1} required value={draft.expiryWarningDays} onChange={e=>{setDraft(s=>({...s,expiryWarningDays:Number(e.target.value)}));setSaved(false)}}/></label>
   <label>Pedido em atraso após (horas)<input aria-label="Prazo de encomenda" type="number" min={1} max={720} step={1} required value={draft.orderWaitingHours} onChange={e=>{setDraft(s=>({...s,orderWaitingHours:Number(e.target.value)}));setSaved(false)}}/></label>
  </div>
  {saved&&<p className="al-settings-saved" role="status"><Check size={16}/> Limites de alerta guardados localmente.</p>}
  <div className="al-settings-actions"><button type="button" className="al-secondary" onClick={reset}><RefreshCw size={15}/> Restaurar valores predefinidos</button><button type="submit" className="al-primary"><Check size={15}/> Guardar limites</button></div>
 </form>;
}
export function AlertCenter({alerts,readIds,onOpen,onRead,onUnread,onReadAll,settings,onSaveSettings}:Props){
 const [readFilter,setReadFilter]=useState<ReadFilter>("pending");
 const [kindFilter,setKindFilter]=useState<KindFilter>("all");
 const [priorityFilter,setPriorityFilter]=useState<PriorityFilter>("all");
 const [search,setSearch]=useState("");
 const [settingsOpen,setSettingsOpen]=useState(false);
 const readSet=useMemo(()=>new Set(readIds),[readIds]);
 const summary=alertSummary(alerts,readIds);
 const filtered=alerts.filter(a=>
  (readFilter==="all"||(readFilter==="pending"?!readSet.has(a.id):readSet.has(a.id)))&&
  (kindFilter==="all"||a.kind===kindFilter)&&
  (priorityFilter==="all"||a.priority===priorityFilter)&&
  (a.title+" "+a.description+" "+alertKindText[a.kind]).toLocaleLowerCase("pt").includes(search.trim().toLocaleLowerCase("pt"))
 );
 return <div className="al-root">
  <div className="al-hero">
   <div><p className="al-kicker">CONTROLO OPERACIONAL</p><h1>Central de notificações e alertas</h1>
    <p>Priorize tarefas do dia-a-dia com base nos dados registados neste navegador.</p></div>
   <button type="button" className="al-settings-button" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(x=>!x)}><Settings2 size={17}/> Configurar alertas</button>
  </div>
  <div className="al-stats" aria-label="Resumo dos alertas">
   <article><span><Bell size={18}/> Por ler</span><strong>{summary.unread}</strong><small>Aguardam a sua atenção</small></article>
   <article><span><ShieldAlert size={18}/> Urgentes</span><strong>{summary.critical}</strong><small>Por ler e de prioridade crítica</small></article>
   <article><span><AlertTriangle size={18}/> Alta prioridade</span><strong>{summary.high}</strong><small>Por ler e de prioridade alta</small></article>
   <article><span><CheckCheck size={18}/> Identificados</span><strong>{summary.total}</strong><small>Activos, lidos ou por ler</small></article>
  </div>
  {settingsOpen&&<section className="al-settings" aria-label="Configuração dos alertas"><h2>Limites dos avisos</h2><SettingsForm settings={settings} onSave={onSaveSettings}/></section>}
  <section className="al-board" aria-label="Lista de alertas operacionais">
   <div className="al-board-head">
    <div><h2>Avisos do seu negócio</h2><p>Os alertas desaparecem automaticamente quando a situação é resolvida. Uma nova alteração pode gerar um aviso novo.</p></div>
    <button className="al-secondary" type="button" onClick={onReadAll} disabled={summary.unread===0}><CheckCheck size={17}/> Marcar todos como lidos</button>
   </div>
   <div className="al-toolbar">
    <div className="al-tabs" role="group" aria-label="Estado dos alertas">
     {([["pending","Por ler"],["read","Lidos"],["all","Todos"]] as const).map(([id,label])=><button type="button" key={id} aria-pressed={readFilter===id} onClick={()=>setReadFilter(id)}>{label}</button>)}
    </div>
    <label className="al-search"><Search size={17}/><input aria-label="Pesquisar alertas" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar avisos…"/></label>
   </div>
   <div className="al-kind-filters" role="group" aria-label="Filtrar tipo de alerta">
    <button type="button" aria-pressed={kindFilter==="all"} onClick={()=>setKindFilter("all")}>Todos os tipos <small>{summary.total}</small></button>
    {kinds.map(kind=><button type="button" key={kind} aria-pressed={kindFilter===kind} onClick={()=>setKindFilter(kind)}>{alertKindText[kind]} <small>{summary.byKind[kind]}</small></button>)}
   </div>
   <div className="al-priority-filter"><label>Prioridade<select aria-label="Filtrar prioridade" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value as PriorityFilter)}><option value="all">Todas as prioridades</option>{priorities.map(priority=><option key={priority} value={priority}>{alertPriorityText[priority]}</option>)}</select></label><span>{filtered.length} aviso(s) encontrado(s)</span></div>
   {filtered.length===0?<div className="al-empty"><BellOff size={29}/><h3>{summary.total===0?"Tudo em ordem nesta demonstração":"Nenhum aviso corresponde aos filtros"}</h3><p>{summary.total===0?"Não existem alertas activos neste momento. O sistema verificará novamente quando os dados ou a data mudarem.":"Pode mudar o estado, o tipo ou a pesquisa para consultar outros avisos."}</p></div>:
    <div className="al-list">{filtered.map(alert=><AlertCard key={alert.id} alert={alert} read={readSet.has(alert.id)}
     onRead={()=>onRead(alert.id)} onUnread={()=>onUnread(alert.id)} onOpen={()=>onOpen(alert)}/>)}</div>}
  </section>
  <p className="al-footnote"><Info size={17}/> Os avisos são calculados localmente enquanto utiliza esta demonstração. Não são notificações por SMS, e-mail, WhatsApp ou push; não representam fiscalização nem vigilância permanente.</p>
 </div>;
}

export function AlertBellPopover({alerts,readIds,onOpen,onAll}:{
 alerts:OperationalAlert[];readIds:readonly string[];
 onOpen:(alert:OperationalAlert)=>void;onAll:()=>void;
}){
 const summary=alertSummary(alerts,readIds);
 const visible=alerts.filter(a=>!readIds.includes(a.id)).slice(0,4);
 return <div className="al-bell-popover" role="region" aria-label="Alertas da demonstração">
  <div className="al-bell-heading"><strong>Alertas operacionais</strong><span>{summary.unread} por ler</span></div>
  {visible.length===0?<p className="al-bell-empty">Não existem avisos por ler.</p>:
   <div className="al-bell-list">{visible.map(item=>{
    const Icon=kindIcon[item.kind];
    return <button type="button" key={item.id} onClick={()=>onOpen(item)}>
     <span className={"al-bell-icon al-priority-"+item.priority}><Icon size={17}/></span>
     <span><b>{item.title}</b><small>{alertKindText[item.kind]} · {alertPriorityText[item.priority]}</small></span><ChevronRight size={16}/>
    </button>;
   })}</div>}
  <button className="al-bell-all" type="button" onClick={onAll}>Abrir central de alertas <ArrowRight size={17}/></button>
 </div>;
}
