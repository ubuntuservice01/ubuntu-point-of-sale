import {ArrowRight,Building2,CheckCircle2,Clock3,LockKeyhole,Package,ShoppingCart,Warehouse,Wallet,AlertTriangle,Info,ShieldAlert} from "lucide-react";
import {BUSINESS_CONFIG,BUSINESS_SECTION_LABELS,type BusinessWorkspace} from "../lib/business-workspace";
import type {Section,Store} from "../lib/domain";
import {money} from "../lib/domain";
const sectionIcons:Partial<Record<Section,typeof Package>>={
 farmacia:Package,restaurante:ShoppingCart,bar:ShoppingCart,talho:Warehouse,producao:Warehouse,grossistas:Warehouse,
 pos:ShoppingCart,products:Package,purchases:Warehouse,inventory:Warehouse,reports:Wallet,cash:Wallet,customers:ShoppingCart
};
export function BusinessWelcome({workspace,data,allowed,onNavigate}:{workspace:BusinessWorkspace;data:Store;
 allowed:(section:Section)=>boolean;onNavigate:(section:Section)=>void}){
 const config=BUSINESS_CONFIG[workspace.kind];
 const saleValue=data.sales.reduce((n,s)=>n+s.total,0);
 const cards=config.shortcuts.filter(c=>workspace.sections.has(c.section)&&allowed(c.section));
 return <section className="bw-landing" aria-label={"Sistema de "+workspace.tenant.name}>
  <header className="bw-landing-header"><div>
   <p className="bw-eyebrow">O MEU NEGÓCIO · {workspace.tenant.sector.toUpperCase()}</p>
   <h1>{workspace.tenant.name}</h1><p>{config.subtitle}</p>
  </div><span className="bw-sector-chip"><Building2 size={17}/>{config.title}</span></header>
  <div className="bw-kpis">
   <article><span>Vendas registadas</span><strong>{data.sales.length}</strong><small>Somente nesta demonstração local</small></article>
   <article><span>Volume de vendas</span><strong>{money(saleValue)}</strong><small>Não representa pagamento confirmado</small></article>
   <article><span>Produtos cadastrados</span><strong>{data.products.length}</strong><small>Do próprio estabelecimento</small></article>
   <article><span>Clientes</span><strong>{data.customers.length}</strong><small>Registados neste dispositivo</small></article>
  </div>
  <div className="bw-capabilities"><div className="bw-section-title"><h2>Serviços do seu negócio</h2>
   <p>Todas as ferramentas autorizadas estão organizadas num único sistema.</p></div>
   <div className="bw-service-grid">{cards.map(card=>{
    const Icon=sectionIcons[card.section]??Package;
    return <button type="button" key={card.section} className="bw-service-card" onClick={()=>onNavigate(card.section)}>
     <span className="bw-service-icon"><Icon size={25}/></span><strong>{card.label}</strong>
     <small>{card.help}</small><span className="bw-service-open">Abrir serviço <ArrowRight size={16}/></span>
    </button>;
   })}</div>
  </div>
  {workspace.kind==="farmacia"&&<div className="bw-compliance"><ShieldAlert size={20}/><p><strong>Atenção à gestão farmacêutica:</strong> a dispensa FEFO e o controlo de validade são demonstrações operacionais. Não substituem validação de receita médica, rastreabilidade legal ou procedimentos de um farmacêutico responsável. Medicamentos com lotes são dispensados na área própria.</p></div>}
  <div className="bw-landing-foot"><Info size={16}/> A organização por sector e a separação de dados nesta fase são locais ao browser. Acesso seguro multiempresa, facturação fiscal e sincronização só com servidor e validação legal.</div>
 </section>;
}
export function BusinessAccessBlocked({workspace,unknown}:{workspace?:BusinessWorkspace|null;unknown?:boolean}){
 const expired=workspace?.stage==="expirada";
 const suspended=workspace?.stage==="suspensa";
 return <main className="bw-access-blocked"><section role="alert" className="bw-access-card">
  <div className="bw-block-icon"><LockKeyhole size={27}/></div>
  <h1>{unknown?"Empresa não encontrada":suspended?"Acesso à empresa suspenso":expired?"Licença da empresa expirada":"Módulo ou plano não disponível"}</h1>
  <p>{unknown?"Não existe uma empresa com este identificador neste navegador de demonstração.":
   suspended?"A licença está suspensa na demonstração. Nenhum registo comercial pode ser consultado ou alterado enquanto o acesso estiver bloqueado.":
   expired?"A licença desta empresa ultrapassou a data configurada na demonstração.":
   "O sector do negócio não tem um módulo correspondente atribuído, ou o plano foi desactivado. Confirme a configuração comercial no Super Admin."}</p>
  {workspace&&<div className="bw-block-details"><strong>{workspace.tenant.name}</strong><small>{workspace.tenant.sector} · {workspace.tenant.city}</small><small>Estado: {workspace.stage} · Vencimento: {workspace.tenant.expiresAt}</small></div>}
  <small>Protótipo frontend: esta verificação é local e não substitui licenciamento aplicado pelo servidor.</small>
 </section></main>;
}
