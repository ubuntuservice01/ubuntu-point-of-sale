import {useEffect,useMemo,useState,type FormEvent,type ReactNode} from "react";
import {Link,useNavigate} from "@tanstack/react-router";
import {Activity,ArrowLeft,ArrowRight,Building2,Check,ChevronRight,ClipboardList,FileText,Info,LayoutDashboard,Menu,Package,Plus,Search,Settings,ShieldCheck,Store,Users,X,Edit3,UserRound,MapPin,AlertCircle,CheckCircle2,SlidersHorizontal,LockKeyhole,History,CalendarDays} from "lucide-react";
import {keyId} from "../lib/domain";
import {ADMIN_KEY,initialAdminStore,safeAdminStore,displayDate,displayTime,type AdminTenant,type AdminPlan} from "../lib/admin-demo";
import {COMPANY_PAGES,PERMISSIONS,ALL_PERMISSIONS,companyKey,initialCompanyWorkspace,safeCompanyWorkspace,activeBranches,activeStaff,staffInBranch,planCapacity,validateBranch,validateEmployee,validateRole,validateProfile,validateOptions,canDeactivateBranch,canDeactivateEmployee,type CompanyPage,type CompanyWorkspace,type Branch,type BranchInput,type Employee,type EmployeeInput,type Role,type Profile,type Options} from "../lib/company-demo";

type Dialog="branch"|"employee"|"role"|null;
type Notice={text:string;error?:boolean};
type PageIcon=typeof Building2;
const ICONS:Record<CompanyPage,PageIcon>={painel:LayoutDashboard,filiais:Building2,funcionarios:Users,perfis:ShieldCheck,instituicao:FileText,operacoes:SlidersHorizontal,actividade:History};
const emailOf=(value:string)=>value.trim().toLowerCase();
const newBranch=():BranchInput=>({name:"",code:"",city:"",address:"",phone:""});
const newStaff=():EmployeeInput=>({name:"",email:"",phone:"",roleId:"caixa",branchIds:[]});
const newRole=():Role=>({id:keyId(),name:"",description:"",permissions:["produtos.ver"],system:false});
const initials=(name:string)=>name.trim().split(" ").filter(Boolean).slice(0,2).map(w=>w.charAt(0).toUpperCase()).join("")||"US";
function Heading({label,title,description,children}:{label:string;title:string;description:string;children?:ReactNode}){return <header className="co-heading"><div><p>{label}</p><h1>{title}</h1><span>{description}</span></div>{children&&<div className="co-heading-actions">{children}</div>}</header>}
function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="co-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>}
function Empty({icon:Icon,title,text,action}:{icon:PageIcon;title:string;text:string;action?:ReactNode}){return <div className="co-empty"><span><Icon size={24}/></span><h3>{title}</h3><p>{text}</p>{action}</div>}
function Modal({title,onClose,children,error}:{title:string;onClose:()=>void;children:ReactNode;error?:string|undefined}){useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn)},[onClose]);return <div className="co-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><section className="co-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button onClick={onClose} aria-label="Fechar"><X size={20}/></button></header><div className="co-modal-content">{error&&<p role="alert" className="co-modal-error"><AlertCircle size={16}/>{error}</p>}{children}</div></section></div>}
function InfoCard({label,value,help,icon:Icon}:{label:string;value:string;help:string;icon:PageIcon}){return <article className="co-stat"><div><span>{label}</span><span className="co-stat-icon"><Icon size={19}/></span></div><strong>{value}</strong><small>{help}</small></article>}
const groupLabels=[{id:"geral",text:"EMPRESA"},{id:"equipa",text:"EQUIPA"},{id:"config",text:"CONFIGURAÇÃO"}] as const;
export function CompanyAdminApp({tenantId}:{tenantId?:string|undefined}){
 const navigate=useNavigate();
 const [admin,setAdmin]=useState(()=>initialAdminStore());
 const bootTenant=admin.tenants.find(t=>t.id===tenantId)??admin.tenants[0]!;
 const [workspace,setWorkspace]=useState<CompanyWorkspace>(()=>initialCompanyWorkspace(bootTenant));
 const [loaded,setLoaded]=useState(false);
 const [page,setPage]=useState<CompanyPage>("painel");
 const [mobileMenu,setMobileMenu]=useState(false);
 const [collapsed,setCollapsed]=useState(false);
 const [dialog,setDialog]=useState<Dialog>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [branchEditing,setBranchEditing]=useState<string|null>(null);
 const [branchForm,setBranchForm]=useState<BranchInput>(newBranch);
 const [staffEditing,setStaffEditing]=useState<string|null>(null);
 const [staffForm,setStaffForm]=useState<EmployeeInput>(newStaff);
 const [roleEditing,setRoleEditing]=useState<string|null>(null);
 const [roleForm,setRoleForm]=useState<Role>(newRole);
 const [branchQuery,setBranchQuery]=useState("");
 const [staffQuery,setStaffQuery]=useState("");
 const [staffStatus,setStaffStatus]=useState("todos");
 const [auditQuery,setAuditQuery]=useState("");
 const [profile,setProfile]=useState<Profile>(()=>workspace.profile);
 const [options,setOptions]=useState<Options>(()=>workspace.options);
 useEffect(()=>{
  let source=initialAdminStore();
  try{const raw=window.localStorage.getItem(ADMIN_KEY);if(raw)source=safeAdminStore(JSON.parse(raw))}catch{/* modo demonstração sem armazenamento */}
  setAdmin(source);
  const selected=source.tenants.find(t=>t.id===(tenantId??source.tenants[0]?.id));
  if(selected){
   let next=initialCompanyWorkspace(selected);
   try{const saved=window.localStorage.getItem(companyKey(selected.id));if(saved)next=safeCompanyWorkspace(JSON.parse(saved),selected)}catch{/* usar dados de exemplo */}
   setWorkspace(next);setProfile(next.profile);setOptions(next.options);
  }
  setLoaded(true);
 },[tenantId]);
 const tenant=admin.tenants.find(t=>t.id===(tenantId??admin.tenants[0]?.id));
 const plan=admin.plans.find(p=>p.id===tenant?.planId);
 useEffect(()=>{if(!loaded||!tenant)return;try{window.localStorage.setItem(companyKey(tenant.id),JSON.stringify(workspace))}catch{/* dados continuam em memória */}},[workspace,loaded,tenant]);
 const capacity=planCapacity(workspace,plan);
 const activeBranchCount=activeBranches(workspace).length;
 const activeEmployeeCount=activeStaff(workspace).length;
 const pendingBranches=workspace.branches.filter(b=>!b.active).length;
 const notices=workspace.events;
 const filteredBranches=workspace.branches.filter(b=>(b.name+" "+b.code+" "+b.city).toLowerCase().includes(branchQuery.toLowerCase()));
 const filteredStaff=workspace.employees.filter(e=>(e.name+" "+e.email).toLowerCase().includes(staffQuery.toLowerCase())&&(staffStatus==="todos"||(staffStatus==="activos"&&e.active)||(staffStatus==="inactivos"&&!e.active)));
 const filteredEvents=workspace.events.filter(e=>(e.action+" "+e.details).toLowerCase().includes(auditQuery.toLowerCase()));
 const activity=useMemo(()=>notices.slice(0,5),[notices]);
 const inform=(text:string,error=false)=>setNotice({text,error});
 const event=(action:string,details:string)=>({id:keyId(),createdAt:new Date().toISOString(),action,details});
 const go=(p:CompanyPage)=>{setPage(p);setMobileMenu(false);setNotice(null)};
 const openBranch=(b?:Branch)=>{setNotice(null);setBranchEditing(b?.id??null);setBranchForm(b?{name:b.name,code:b.code,city:b.city,address:b.address,phone:b.phone}:newBranch());setDialog("branch")};
 function saveBranch(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const validation=validateBranch(branchForm,workspace,plan,branchEditing??undefined);if(validation){inform(validation,true);return}
  const isEdit=workspace.branches.some(b=>b.id===branchEditing);
  const b:Branch={...branchForm,name:branchForm.name.trim(),code:branchForm.code.trim().toUpperCase(),city:branchForm.city.trim(),address:branchForm.address.trim(),phone:branchForm.phone.trim(),id:branchEditing??keyId(),active:true,createdAt:workspace.branches.find(x=>x.id===branchEditing)?.createdAt??new Date().toISOString()};
  setWorkspace(old=>({...old,branches:isEdit?old.branches.map(x=>x.id===b.id?{...x,...b,active:x.active}:x):[...old.branches,b],events:[event(isEdit?"Filial actualizada":"Filial criada",b.name+" · "+b.code),...old.events]}));
  setDialog(null);inform(isEdit?"Dados da filial actualizados.":"Filial criada na demonstração.");
 }
 function toggleBranch(b:Branch){
  if(b.active&&!canDeactivateBranch(b,workspace)){inform("Não pode desactivar a última filial activa nem uma filial que seja a única afectação de um funcionário.",true);return}
  if(!b.active&&activeBranchCount>=(plan?.maxBranches??1)){inform("O plano não permite activar mais filiais.",true);return}
  if(b.active&&!window.confirm("Desactivar a filial "+b.name+"?"))return;
  setWorkspace(old=>({...old,branches:old.branches.map(x=>x.id===b.id?{...x,active:!b.active}:x),events:[event(b.active?"Filial desactivada":"Filial reactivada",b.name),...old.events]}));
  inform("Estado da filial actualizado na demonstração.");
 }
 const openEmployee=(e?:Employee)=>{
  setNotice(null);setStaffEditing(e?.id??null);setStaffForm(e?{name:e.name,email:e.email,phone:e.phone,roleId:e.roleId,branchIds:[...e.branchIds]}:{...newStaff(),branchIds:activeBranches(workspace)[0]?[activeBranches(workspace)[0]!.id]:[]});setDialog("employee")
 };
 function saveEmployee(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const validation=validateEmployee(staffForm,workspace,plan,staffEditing??undefined);if(validation){inform(validation,true);return}
  const current=workspace.employees.find(x=>x.id===staffEditing);
  if(current?.active&&current.roleId==="admin"&&staffForm.roleId!=="admin"&&!canDeactivateEmployee(current,workspace)){inform("Mantenha pelo menos um administrador activo.",true);return}
  const emp:Employee={...staffForm,name:staffForm.name.trim(),email:emailOf(staffForm.email),phone:staffForm.phone.trim(),branchIds:[...staffForm.branchIds],id:current?.id??keyId(),active:current?.active??true,createdAt:current?.createdAt??new Date().toISOString()};
  setWorkspace(old=>({...old,employees:current?old.employees.map(x=>x.id===current.id?emp:x):[...old.employees,emp],events:[event(current?"Funcionário actualizado":"Funcionário registado",emp.name+" · "+emp.email),...old.events]}));setDialog(null);inform("Funcionário guardado na demonstração. Não foi criada nenhuma conta de acesso.");
 }
 function toggleEmployee(e:Employee){
  if(e.active&&!canDeactivateEmployee(e,workspace)){inform("Não é possível desactivar o último administrador activo.",true);return}
  if(!e.active&&activeEmployeeCount>=(plan?.maxUsers??1)){inform("O plano não permite activar mais funcionários.",true);return}
  if(!e.active&&e.branchIds.every(id=>!workspace.branches.some(b=>b.id===id&&b.active))){inform("Atribua primeiro uma filial activa ao funcionário.",true);return}
  if(e.active&&!window.confirm("Desactivar o funcionário "+e.name+"?"))return;
  setWorkspace(old=>({...old,employees:old.employees.map(x=>x.id===e.id?{...x,active:!e.active}:x),events:[event(e.active?"Funcionário desactivado":"Funcionário reactivado",e.name),...old.events]}));inform("Estado alterado apenas na demonstração.");
 }
 const openRole=(r?:Role)=>{
  if(r?.system){inform("Perfis-base são protegidos. Crie um perfil personalizado para ajustar permissões.",true);return}
  setNotice(null);setRoleEditing(r?.id??null);setRoleForm(r?{...r,permissions:[...r.permissions]}:newRole());setDialog("role");
 };
 function saveRole(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const validation=validateRole(roleForm,workspace,roleEditing??undefined);if(validation){inform(validation,true);return}
  const exists=workspace.roles.some(r=>r.id===roleEditing);
  const role={...roleForm,name:roleForm.name.trim(),description:roleForm.description.trim(),system:false};
  setWorkspace(old=>({...old,roles:exists?old.roles.map(r=>r.id===role.id?role:r):[...old.roles,role],events:[event(exists?"Perfil actualizado":"Perfil criado",role.name+" · "+role.permissions.length+" permissões (simuladas)"),...old.events]}));
  setDialog(null);inform("Perfil guardado. As permissões só serão aplicadas com autenticação real.");
 }
 function saveProfile(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const validation=validateProfile(profile);if(validation){inform(validation,true);return}
  setWorkspace(old=>({...old,profile:{...profile},events:[event("Dados institucionais actualizados",profile.legalName),...old.events]}));inform("Dados da empresa guardados na demonstração.");
 }
 function saveOptions(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const validation=validateOptions(options);if(validation){inform(validation,true);return}
  setWorkspace(old=>({...old,options:{...options},events:[event("Configurações operacionais alteradas","Parâmetros de demonstração actualizados"),...old.events]}));inform("Configurações guardadas. Ainda não afectam o POS real.");
 }
 const rolesById=(id:string)=>workspace.roles.find(r=>r.id===id)?.name??"Perfil desconhecido";
 const viewTenant=(id:string)=>{void navigate({to:"/empresa",search:{tenant:id}})};
 if(!tenant)return <div className="co-invalid"><Building2 size={34}/><h1>Empresa não encontrada</h1><p>A empresa indicada não está nos registos desta demonstração.</p><Link to="/super-admin" className="co-primary">Abrir Super Admin</Link></div>;
 return <div className="co-shell">
  {mobileMenu&&<button className="co-scrim" aria-label="Fechar navegação" onClick={()=>setMobileMenu(false)}/>}
  <aside className={"co-sidebar "+(collapsed?"co-sidebar-small ":"")+(mobileMenu?"co-sidebar-open":"")}>
   <div className="co-brand"><span className="co-brand-icon"><Store size={21}/></span>{!collapsed&&<span><b>Ubuntu POS 360</b><small>Administração empresarial</small></span>}<button className="co-mobile-close" onClick={()=>setMobileMenu(false)} aria-label="Fechar menu"><X size={20}/></button></div>
   <div className="co-organisation"><span className="co-organisation-icon">{initials(tenant.name)}</span>{!collapsed&&<span><b>{tenant.name}</b><small>{tenant.sector} · {tenant.city}</small></span>}</div>
   <nav aria-label="Administração da empresa">{groupLabels.map(group=><div className="co-nav-group" key={group.id}>{!collapsed&&<p>{group.text}</p>}{COMPANY_PAGES.filter(x=>x.group===group.id).map(item=>{const Icon=ICONS[item.id];return <button key={item.id} title={item.label} aria-current={page===item.id?"page":undefined} className={"co-nav-link "+(page===item.id?"selected":"")} onClick={()=>go(item.id)}><Icon size={19}/>{!collapsed&&<span>{item.label}</span>}</button>})}</div>)}</nav>
   <div className="co-sidebar-bottom"><button onClick={()=>setCollapsed(x=>!x)}><Menu size={18}/>{!collapsed&&"Recolher menu"}</button><Link to="/super-admin"><ArrowLeft size={18}/>{!collapsed&&"Super Admin"}</Link><Link to="/"><Store size={18}/>{!collapsed&&"Ponto de venda"}</Link></div>
  </aside>
  <div className="co-workspace"><header className="co-topbar"><div><button aria-label="Abrir menu" className="co-menu-open" onClick={()=>setMobileMenu(true)}><Menu size={20}/></button><span>Administração</span><ChevronRight size={15}/><strong>{COMPANY_PAGES.find(p=>p.id===page)?.label}</strong></div><div><select value={tenant.id} aria-label="Empresa da demonstração" onChange={e=>viewTenant(e.target.value)}>{admin.tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><span className="co-avatar">{initials(tenant.name)}</span></div></header>
   <main className="co-main">
    <div className="co-demo-note"><Info size={18}/><p><b>Administração em demonstração.</b> As filiais, funcionários, perfis e permissões são simulados no seu navegador. Não existe login, atribuição de acesso ou isolamento seguro entre empresas.</p></div>
    {notice&&<div role="status" className={"co-notice "+(notice.error?"error":"")}><span>{notice.text}</span><button aria-label="Fechar aviso" onClick={()=>setNotice(null)}><X size={17}/></button></div>}
    {page==="painel"&&<>
     <Heading label="ESTABELECIMENTO" title={"Olá, "+tenant.name} description="Acompanhe a equipa, as filiais e as definições da empresa."/>
     <div className="co-stats"><InfoCard icon={Building2} label="Filiais activas" value={String(activeBranchCount)} help={"Limite do plano: "+capacity.branches.max}/><InfoCard icon={Users} label="Funcionários activos" value={String(activeEmployeeCount)} help={"Limite do plano: "+capacity.users.max}/><InfoCard icon={ShieldCheck} label="Perfis disponíveis" value={String(workspace.roles.length)} help="Regras ilustrativas de acesso"/><InfoCard icon={ClipboardList} label="Registos de actividade" value={String(workspace.events.length)} help="Alterações locais"/></div>
     <div className="co-columns"><section className="co-panel"><div className="co-panel-heading"><div><h2>Organização da empresa</h2><p>Gestão do pessoal e dos estabelecimentos</p></div></div><div className="co-links"><button onClick={()=>go("filiais")}><span><Building2 size={20}/></span><div><b>Gerir filiais</b><small>Estabelecimentos, localizações e códigos</small></div><ChevronRight size={18}/></button><button onClick={()=>go("funcionarios")}><span><Users size={20}/></span><div><b>Gerir funcionários</b><small>Utilizadores e afectação a filiais</small></div><ChevronRight size={18}/></button><button onClick={()=>go("perfis")}><span><ShieldCheck size={20}/></span><div><b>Perfis e permissões</b><small>Quem poderá executar cada tarefa</small></div><ChevronRight size={18}/></button></div></section>
      <section className="co-panel"><div className="co-panel-heading"><div><h2>Plano actual</h2><p>Configurado pela Ubuntu Service</p></div></div><div className="co-plan-name">{plan?.name??"Plano por definir"}</div><dl className="co-plan-details"><div><dt>Filiais</dt><dd>{capacity.branches.current} / {capacity.branches.max}</dd></div><div><dt>Utilizadores</dt><dd>{capacity.users.current} / {capacity.users.max}</dd></div><div><dt>Validade</dt><dd>{displayDate(tenant.expiresAt)}</dd></div></dl><p className="co-panel-hint">A contratação, renovação e activação de módulos serão controladas no Super Admin.</p><Link className="co-outline link" to="/super-admin">Abrir Super Admin <ArrowRight size={16}/></Link></section></div>
     <section className="co-panel co-recent"><div className="co-panel-heading"><div><h2>Actividade recente</h2><p>Alterações efectuadas nesta demonstração</p></div><button className="co-link" onClick={()=>go("actividade")}>Ver tudo <ArrowRight size={15}/></button></div>{activity.length===0?<Empty icon={Activity} title="Ainda não há alterações" text="Ao gerir filiais, funcionários ou configurações, os movimentos aparecerão aqui."/>:<div className="co-event-list">{activity.map(e=><div key={e.id}><span><CheckCircle2 size={17}/></span><div><b>{e.action}</b><p>{e.details}</p></div><time>{displayTime(e.createdAt)}</time></div>)}</div>}</section>
    </>}
    {page==="filiais"&&<>
      <Heading label="ESTRUTURA" title="Filiais e estabelecimentos" description="Organize os locais onde a empresa desenvolve as suas actividades."><button className="co-primary" onClick={()=>openBranch()} disabled={activeBranchCount>=capacity.branches.max}><Plus size={18}/> Nova filial</button></Heading>
      <div className="co-capacity"><Building2 size={17}/> {activeBranchCount} de {capacity.branches.max} filiais activas no plano. {pendingBranches>0?pendingBranches+" desactivada(s).":""}</div>
      <section className="co-panel co-list-panel"><div className="co-toolbar"><label className="co-search"><Search size={18}/><input value={branchQuery} onChange={e=>setBranchQuery(e.target.value)} placeholder="Pesquisar filial ou código" aria-label="Pesquisar filial"/></label><span>{filteredBranches.length} registo(s)</span></div>
       {filteredBranches.length===0?<Empty icon={Search} title="Nenhuma filial encontrada" text="Altere a pesquisa ou registe uma nova filial."/>:<div className="co-table-wrap"><table className="co-table"><thead><tr><th>Filial</th><th>Código</th><th>Localização</th><th>Funcionários</th><th>Estado</th><th className="right">Acções</th></tr></thead><tbody>{filteredBranches.map(b=><tr key={b.id}><td><b>{b.name}</b><small>{b.address||"Morada não definida"}</small></td><td><code>{b.code}</code></td><td>{b.city}</td><td>{staffInBranch(workspace,b.id).length}</td><td><span className={"co-state "+(b.active?"active":"inactive")}>{b.active?"Activa":"Desactivada"}</span></td><td className="right"><button className="co-table-btn" onClick={()=>openBranch(b)}>Editar</button><button className="co-table-btn neutral" onClick={()=>toggleBranch(b)}>{b.active?"Desactivar":"Reactivar"}</button></td></tr>)}</tbody></table></div>}
      </section>
    </>}
    {page==="funcionarios"&&<>
      <Heading label="RECURSOS HUMANOS" title="Funcionários" description="Defina os funcionários, perfis e filiais a que estão afectos."><button className="co-primary" onClick={()=>openEmployee()} disabled={activeEmployeeCount>=capacity.users.max}><Plus size={18}/> Registar funcionário</button></Heading>
      <div className="co-capacity"><Users size={17}/> {activeEmployeeCount} de {capacity.users.max} utilizadores activos no plano. Nenhum acesso real é criado nesta fase.</div>
      <section className="co-panel co-list-panel"><div className="co-toolbar"><label className="co-search"><Search size={18}/><input aria-label="Pesquisar funcionário" value={staffQuery} onChange={e=>setStaffQuery(e.target.value)} placeholder="Pesquisar nome ou e-mail"/></label><select aria-label="Filtrar funcionários" value={staffStatus} onChange={e=>setStaffStatus(e.target.value)}><option value="todos">Todos os estados</option><option value="activos">Activos</option><option value="inactivos">Desactivados</option></select></div>
       {filteredStaff.length===0?<Empty icon={Search} title="Nenhum funcionário encontrado" text="Registe uma pessoa ou altere os filtros."/>:<div className="co-table-wrap"><table className="co-table"><thead><tr><th>Funcionário</th><th>Perfil</th><th>Filiais</th><th>Estado</th><th className="right">Acções</th></tr></thead><tbody>{filteredStaff.map(e=><tr key={e.id}><td><div className="co-person"><span>{initials(e.name)}</span><div><b>{e.name}</b><small>{e.email}</small></div></div></td><td>{rolesById(e.roleId)}</td><td>{e.branchIds.map(id=>workspace.branches.find(b=>b.id===id)?.name??"Desconhecida").join(", ")}</td><td><span className={"co-state "+(e.active?"active":"inactive")}>{e.active?"Activo":"Desactivado"}</span></td><td className="right"><button className="co-table-btn" onClick={()=>openEmployee(e)}>Editar</button><button className="co-table-btn neutral" onClick={()=>toggleEmployee(e)}>{e.active?"Desactivar":"Reactivar"}</button></td></tr>)}</tbody></table></div>}
      </section>
    </>}
    {page==="perfis"&&<>
      <Heading label="EQUIPA" title="Perfis e permissões" description="Configure as tarefas que cada função poderá executar quando existir autenticação."><button className="co-primary" onClick={()=>openRole()}><Plus size={18}/> Criar perfil</button></Heading>
      <div className="co-permission-note"><LockKeyhole size={18}/><span><b>Pré-visualização de permissões.</b> Estas opções ainda não controlam acessos. O servidor terá de aplicar as permissões, independentemente do frontend.</span></div>
      <div className="co-role-grid">{workspace.roles.map(r=><article key={r.id} className="co-role-card"><div className="co-role-heading"><span><ShieldCheck size={21}/></span>{r.system&&<small>Perfil de base</small>}</div><h3>{r.name}</h3><p>{r.description||"Perfil personalizado da empresa."}</p><div className="co-role-bottom"><span>{r.permissions.length} permissões</span><button className="co-table-btn" onClick={()=>openRole(r)} disabled={r.system}>{r.system?"Protegido":"Editar"}</button></div></article>)}</div>
      <section className="co-panel co-permission-list"><div className="co-panel-heading"><div><h2>Permissões previstas no sistema</h2><p>Visão completa das operações que poderão ser autorizadas</p></div></div>{Array.from(new Set(PERMISSIONS.map(p=>p.group))).map(g=><div key={g} className="co-permission-group"><h3>{g}</h3><div>{PERMISSIONS.filter(p=>p.group===g).map(p=><span key={p.id}>{p.name}</span>)}</div></div>)}</section>
    </>}
    {page==="instituicao"&&<>
      <Heading label="IDENTIDADE INSTITUCIONAL" title="Dados da empresa" description="Informações que poderão aparecer nos documentos, recibos e perfis da empresa."/>
      <section className="co-panel co-form-panel"><form onSubmit={saveProfile}><div className="co-form-grid">
       <Field label="Designação social"><input required value={profile.legalName} onChange={e=>setProfile({...profile,legalName:e.target.value})}/></Field>
       <Field label="Nome comercial"><input required value={profile.tradeName} onChange={e=>setProfile({...profile,tradeName:e.target.value})}/></Field>
       <Field label="NUIT (opcional)"><input inputMode="numeric" maxLength={9} value={profile.nuit} onChange={e=>setProfile({...profile,nuit:e.target.value})} placeholder="9 algarismos"/></Field>
       <Field label="Província"><input value={profile.province} onChange={e=>setProfile({...profile,province:e.target.value})} placeholder="Ex.: Niassa"/></Field>
       <Field label="Distrito / cidade"><input value={profile.district} onChange={e=>setProfile({...profile,district:e.target.value})}/></Field>
       <Field label="Telefone"><input type="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></Field>
       <Field label="E-mail"><input type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></Field>
       <Field label="Morada"><input value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})}/></Field>
       <div className="full"><Field label="Mensagem no rodapé do recibo"><textarea rows={3} maxLength={250} value={profile.receiptFooter} onChange={e=>setProfile({...profile,receiptFooter:e.target.value})}/></Field></div>
      </div><p className="co-inline-note"><Info size={16}/> Os documentos fiscais e a emissão real de recibos só serão activados após validação legal e integração segura.</p><div className="co-form-actions"><button type="button" className="co-outline" onClick={()=>setProfile({...workspace.profile})}>Descartar alterações</button><button className="co-primary" type="submit"><Check size={17}/> Guardar dados</button></div></form></section>
    </>}
    {page==="operacoes"&&<>
      <Heading label="PARAMETRIZAÇÃO" title="Configurações operacionais" description="Defina as regras de trabalho da empresa para a futura integração com o POS."/>
      <section className="co-panel co-form-panel"><form onSubmit={saveOptions}><div className="co-form-grid">
       <Field label="Moeda"><input readOnly value="MZN — Metical moçambicano" aria-label="Moeda da empresa"/></Field>
       <Field label="Alerta de stock baixo (unidades)"><input type="number" min={0} max={100000} step={1} required value={options.lowStockThreshold} onChange={e=>setOptions({...options,lowStockThreshold:Number(e.target.value)})}/></Field>
       <Field label="Desconto máximo (%)"><input type="number" min={0} max={100} step=".01" required value={options.maxDiscountPercent} onChange={e=>setOptions({...options,maxDiscountPercent:Number(e.target.value)})}/></Field>
       <Field label="Formato previsto para recibos"><select value={options.receiptPaper} onChange={e=>setOptions({...options,receiptPaper:e.target.value as Options["receiptPaper"]})}><option value="58mm">Térmico 58 mm</option><option value="80mm">Térmico 80 mm</option><option value="a4">A4</option></select></Field>
      </div><div className="co-option-list">
       <label><input type="checkbox" checked={options.allowFiado} onChange={e=>setOptions({...options,allowFiado:e.target.checked})}/><span><b>Permitir vendas a fiado</b><small>Autorizar registo de dívidas dos clientes no futuro POS.</small></span></label>
       <label><input type="checkbox" checked={options.requireCustomerForFiado} disabled={!options.allowFiado} onChange={e=>setOptions({...options,requireCustomerForFiado:e.target.checked})}/><span><b>Exigir identificação do cliente para fiado</b><small>Associar as dívidas a clientes registados.</small></span></label>
       <label><input type="checkbox" checked={options.requireApprovalForRefund} onChange={e=>setOptions({...options,requireApprovalForRefund:e.target.checked})}/><span><b>Solicitar aprovação para devoluções</b><small>Preparado para validação por um perfil autorizado.</small></span></label>
      </div><p className="co-inline-note"><Info size={16}/> Estas preferências são armazenadas somente nesta demonstração. Ainda não alteram as regras de vendas do POS.</p><div className="co-form-actions"><button type="button" className="co-outline" onClick={()=>setOptions({...workspace.options})}>Descartar alterações</button><button className="co-primary" type="submit"><Check size={17}/> Guardar configurações</button></div></form></section>
    </>}
    {page==="actividade"&&<>
      <Heading label="AUDITORIA" title="Histórico de alterações" description="Acompanhe as acções simuladas na administração desta empresa."/>
      <section className="co-panel co-list-panel"><div className="co-toolbar"><label className="co-search"><Search size={18}/><input aria-label="Pesquisar actividade" placeholder="Pesquisar actividade" value={auditQuery} onChange={e=>setAuditQuery(e.target.value)}/></label><span>{filteredEvents.length} movimento(s)</span></div>{filteredEvents.length===0?<Empty icon={History} title="Sem alterações para apresentar" text="Quando fizer uma alteração nesta empresa, ela aparecerá neste histórico local."/>:<div className="co-table-wrap"><table className="co-table"><thead><tr><th>Data</th><th>Acção</th><th>Descrição</th></tr></thead><tbody>{filteredEvents.map(e=><tr key={e.id}><td>{displayTime(e.createdAt)}</td><td><b>{e.action}</b></td><td>{e.details}</td></tr>)}</tbody></table></div>}</section>
    </>}
    <footer className="co-footer">Ubuntu POS 360 · Uma plataforma desenvolvida pela <b>Ubuntu Service, Lda.</b></footer>
   </main>
  </div>
  {dialog==="branch"&&<Modal error={notice?.error?notice.text:undefined} title={branchEditing?"Editar filial":"Registar filial"} onClose={()=>setDialog(null)}><form className="co-form" onSubmit={saveBranch}>
   <Field label="Nome da filial"><input value={branchForm.name} required onChange={e=>setBranchForm({...branchForm,name:e.target.value})} placeholder="Ex.: Loja Central"/></Field>
   <Field label="Código interno"><input value={branchForm.code} required maxLength={12} onChange={e=>setBranchForm({...branchForm,code:e.target.value.toUpperCase()})} placeholder="EX.: LOJA-01"/></Field>
   <Field label="Cidade ou distrito"><input value={branchForm.city} required onChange={e=>setBranchForm({...branchForm,city:e.target.value})}/></Field>
   <Field label="Morada"><input value={branchForm.address} onChange={e=>setBranchForm({...branchForm,address:e.target.value})}/></Field>
   <Field label="Contacto"><input value={branchForm.phone} onChange={e=>setBranchForm({...branchForm,phone:e.target.value})}/></Field>
   <div className="co-form-actions"><button type="button" className="co-outline" onClick={()=>setDialog(null)}>Cancelar</button><button type="submit" className="co-primary">Guardar filial</button></div>
  </form></Modal>}
  {dialog==="employee"&&<Modal error={notice?.error?notice.text:undefined} title={staffEditing?"Editar funcionário":"Registar funcionário"} onClose={()=>setDialog(null)}><form className="co-form" onSubmit={saveEmployee}>
   <Field label="Nome completo"><input required value={staffForm.name} onChange={e=>setStaffForm({...staffForm,name:e.target.value})}/></Field>
   <Field label="E-mail de demonstração"><input type="email" required value={staffForm.email} onChange={e=>setStaffForm({...staffForm,email:e.target.value})} placeholder="pessoa@exemplo.invalid"/></Field>
   <Field label="Telefone"><input type="tel" value={staffForm.phone} onChange={e=>setStaffForm({...staffForm,phone:e.target.value})}/></Field>
   <Field label="Perfil de acesso (simulado)"><select value={staffForm.roleId} onChange={e=>setStaffForm({...staffForm,roleId:e.target.value})}>{workspace.roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
   <fieldset className="co-fieldset"><legend>Filiais atribuídas</legend><div>{activeBranches(workspace).map(b=><label key={b.id}><input type="checkbox" checked={staffForm.branchIds.includes(b.id)} onChange={e=>setStaffForm({...staffForm,branchIds:e.target.checked?[...staffForm.branchIds,b.id]:staffForm.branchIds.filter(x=>x!==b.id)})}/>{b.name}</label>)}</div></fieldset>
   <p className="co-inline-note"><Info size={16}/> Este formulário não cria contas de acesso nem envia credenciais.</p>
   <div className="co-form-actions"><button type="button" className="co-outline" onClick={()=>setDialog(null)}>Cancelar</button><button type="submit" className="co-primary">Guardar funcionário</button></div>
  </form></Modal>}
  {dialog==="role"&&<Modal error={notice?.error?notice.text:undefined} title={roleEditing?"Editar perfil personalizado":"Criar perfil personalizado"} onClose={()=>setDialog(null)}><form className="co-form" onSubmit={saveRole}>
   <Field label="Nome do perfil"><input required value={roleForm.name} onChange={e=>setRoleForm({...roleForm,name:e.target.value})} placeholder="Ex.: Supervisor"/></Field>
   <Field label="Descrição"><textarea rows={2} value={roleForm.description} onChange={e=>setRoleForm({...roleForm,description:e.target.value})}/></Field>
   <fieldset className="co-fieldset"><legend>Permissões de demonstração</legend>{Array.from(new Set(PERMISSIONS.map(p=>p.group))).map(g=><div className="co-permission-form-group" key={g}><b>{g}</b><div>{PERMISSIONS.filter(p=>p.group===g).map(p=><label key={p.id}><input type="checkbox" checked={roleForm.permissions.includes(p.id)} onChange={e=>setRoleForm({...roleForm,permissions:e.target.checked?[...roleForm.permissions,p.id]:roleForm.permissions.filter(id=>id!==p.id)})}/>{p.name}</label>)}</div></div>)}</fieldset>
   <div className="co-form-actions"><button type="button" className="co-outline" onClick={()=>setDialog(null)}>Cancelar</button><button type="submit" className="co-primary">Guardar perfil</button></div>
  </form></Modal>}
 </div>;
}
