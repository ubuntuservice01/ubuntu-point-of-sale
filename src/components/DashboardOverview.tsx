import {useMemo,useState} from "react";
import {Activity,AlertTriangle,ArrowRight,Banknote,CalendarDays,ChevronRight,Clock3,HandCoins,Package,Plus,Receipt,ShoppingCart,TrendingUp,Wallet} from "lucide-react";
import {money,type Section,type Store,type Payment} from "../lib/domain";
import {dashboardRange,dashboardMetrics,dashboardSalesBars,stockAlertsList,type DashboardPeriod} from "../lib/ux";
import {creditPosition} from "../lib/credit";

type Props={data:Store;go:(section:Section)=>void;addProduct:()=>void;addCustomer:()=>void;openOverdue:()=>void};
const paymentLabels:Record<Payment,string>={dinheiro:"Dinheiro",mpesa:"M-Pesa",emola:"e-Mola",cartao:"Cartão",fiado:"Fiado"};
const dateTime=(iso:string)=>new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const dayKey=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-")};
function Stat({icon:Icon,label,value,description,onClick}:{icon:typeof Wallet;label:string;value:string;description:string;onClick?:()=>void}){
 const content=<><div className="ux-stat-heading"><span>{label}</span><span className="ux-stat-icon"><Icon size={17}/></span></div><strong className="ux-stat-value">{value}</strong><small>{description}</small></>;
 return onClick?<button type="button" className="ux-stat-card ux-stat-action" onClick={onClick}>{content}<ChevronRight className="ux-stat-chevron" size={15}/></button>:
 <article className="ux-stat-card">{content}</article>;
}
function EmptyPanel({description}:{description:string}){return <div className="ux-no-data"><Activity size={23}/><strong>Sem movimentos neste período</strong><p>{description}</p></div>}
export function DashboardOverview({data,go,addProduct,addCustomer,openOverdue}:Props){
 const [period,setPeriod]=useState<DashboardPeriod>("7d");
 const [from,setFrom]=useState(dayKey);
 const [to,setTo]=useState(dayKey);
 const range=dashboardRange(period,from,to);
 const metrics=useMemo(()=>dashboardMetrics(data,range),[data,range.from,range.to,range.valid]);
 const bars=useMemo(()=>dashboardSalesBars(data,range),[data,range.from,range.to,range.valid]);
 const maxBar=Math.max(1,...bars.map(b=>b.total));
 const outstanding=data.customers.reduce((sum,c)=>sum+c.debt,0);
 const overdue=data.customers.reduce((sum,c)=>sum+creditPosition(c.id,data.credits,dayKey()).overdue,0);
 const stock=stockAlertsList(data);
 const lowTotal=data.products.filter(p=>p.active&&p.stock<=10).length;
 const purchaseTotal=data.purchases.filter(p=>new Date(p.createdAt).getTime()>=range.from&&new Date(p.createdAt).getTime()<=range.to).reduce((n,p)=>n+p.total,0);
 const expenseTotal=data.expenses.filter(e=>new Date(e.createdAt).getTime()>=range.from&&new Date(e.createdAt).getTime()<=range.to).reduce((n,e)=>n+e.amount,0);
 const paid=metrics.byMethod.filter(x=>x.method!=="fiado");
 const grossPaid=paid.reduce((n,m)=>n+m.total,0);
 const grossMethodMax=Math.max(1,...metrics.byMethod.map(m=>m.total));
 return <div className="ux-dashboard">
   <div className="ux-dashboard-title">
    <div><p className="eyebrow">VISÃO GERAL</p><h1>O seu negócio, num só lugar</h1><p className="text-muted">Vendas, fiado, stock e actividades da demonstração.</p></div>
    <div className="ux-period">
     <label htmlFor="ux-period-input">Período dos dados</label>
     <select id="ux-period-input" value={period} onChange={e=>setPeriod(e.target.value as DashboardPeriod)}>
      <option value="hoje">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="personalizado">Personalizado</option>
     </select>
    </div>
   </div>
   {period==="personalizado"&&<div className="ux-dates"><label>Desde<input aria-label="Data inicial" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até<input aria-label="Data final" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}
   {!range.valid&&<p role="alert" className="ux-date-error"><AlertTriangle size={17}/> Intervalo inválido. A data final não pode ser anterior à data inicial.</p>}
   <section className="ux-welcome" aria-label="Acções rápidas">
    <div className="ux-welcome-text"><b>Bom trabalho! Tem tudo à mão.</b><p>Comece uma venda ou consulte o que precisa de atenção.</p></div>
    <div className="ux-welcome-actions">
     <button className="primary-btn" onClick={()=>go("pos")}><ShoppingCart size={16}/> Nova venda</button>
     <button className="outline-btn" onClick={()=>go("customers")}><HandCoins size={16}/> Consultar fiado</button>
     <button className="outline-btn" onClick={addProduct}><Plus size={16}/> Adicionar produto</button>
     <button className="outline-btn" onClick={()=>go("cash")}><Wallet size={16}/> Gestão de caixa</button>
    </div>
   </section>
   <div className="ux-section-heading"><h2>Indicadores principais</h2><span>{range.description} · Valores de demonstração</span></div>
   <div className="ux-metrics">
    <Stat icon={Banknote} label="Vendas pagas (líquidas)" value={money(metrics.paidNet)} description="Pagas menos devoluções do período" onClick={()=>go("reports")}/>
    <Stat icon={Receipt} label="Vendas realizadas" value={String(metrics.salesCount)} description="Inclui vendas a fiado" onClick={()=>go("reports")}/>
    <Stat icon={HandCoins} label="Fiado por receber" value={money(outstanding)} description="Saldo acumulado dos clientes" onClick={()=>go("customers")}/>
    <Stat icon={AlertTriangle} label="Dívidas vencidas" value={money(overdue)} description="Com data de vencimento ultrapassada" onClick={openOverdue}/>
    <Stat icon={Package} label="Produtos com stock baixo" value={String(lowTotal)} description="Até 10 unidades da respectiva medida" onClick={()=>go("products")}/>
    <Stat icon={ShoppingCart} label="Compras recebidas" value={money(purchaseTotal)} description="Custo das mercadorias recebidas" onClick={()=>go("purchases")}/>
    <Stat icon={Wallet} label="Despesas registadas" value={money(expenseTotal)} description="Gastos operacionais no período" onClick={()=>go("expenses")}/>
   </div>
   <div className="ux-analytics-grid">
    <section className="surface ux-insight">
     <header className="ux-panel-header"><div><h2>Evolução das vendas</h2><p>Valor bruto das vendas, com fiado, em {range.description.toLowerCase()}</p></div><span className="ux-panel-number">{money(metrics.gross)}</span></header>
     {metrics.salesCount===0||!range.valid?<EmptyPanel description="Ao registar vendas, a evolução aparece aqui. Não são usadas barras de exemplo."/>:
     <div className="ux-chart" role="img" aria-label={"Gráfico de vendas no período "+range.description}>
      {bars.map(bar=><div key={bar.key} className="ux-bar-col"><span className="ux-bar-value">{bar.total>0?money(bar.total):"—"}</span><div className="ux-bar-track" title={bar.label+": "+money(bar.total)}><div className="ux-bar-fill" style={{height:(bar.total?Math.max(5,bar.total/maxBar*100):0)+"%"}}/></div><small>{bar.label}</small></div>)}
     </div>}
     <p className="ux-footnote">Este gráfico não representa lucro. Os valores vêm das vendas registadas neste navegador.</p>
    </section>
    <section className="surface ux-insight">
     <header className="ux-panel-header"><div><h2>Formas de pagamento</h2><p>Distribuição das vendas brutas do período</p></div></header>
     {metrics.salesCount===0||!range.valid?<EmptyPanel description="Os métodos utilizados nas vendas aparecerão aqui."/>:
     <div className="ux-methods">{metrics.byMethod.map(row=><div className="ux-method" key={row.method}><div><b>{paymentLabels[row.method]}</b><strong>{money(row.total)}</strong></div><div className="ux-method-rail" aria-hidden="true"><span style={{width:(row.total/grossMethodMax*100)+"%"}}/></div></div>)}</div>}
     {metrics.salesCount>0&&<p className="ux-footnote">Vendas pagas: {money(grossPaid)} · Vendas a fiado: {money(metrics.fiadoTotal)}. Não inclui pagamentos posteriores de dívidas.</p>}
    </section>
   </div>
   <div className="ux-secondary-grid">
    <section className="surface ux-insight">
     <header className="ux-panel-header"><div><h2>Produtos mais vendidos</h2><p>Por valor bruto no período</p></div><button className="text-link" onClick={()=>go("reports")}>Relatórios <ArrowRight size={15}/></button></header>
     {metrics.bestProducts.length===0?<EmptyPanel description="O ranking surgirá depois das primeiras vendas."/>:<div className="ux-simple-list">{metrics.bestProducts.map((p,i)=><div key={p.id}><span className="ux-rank">{i+1}</span><b>{p.name}</b><strong>{money(p.total)}</strong></div>)}</div>}
    </section>
    <section className="surface ux-insight">
     <header className="ux-panel-header"><div><h2>Atenção ao stock</h2><p>Produtos com 10 unidades ou menos</p></div><button className="text-link" onClick={()=>go("products")}>Ver produtos <ArrowRight size={15}/></button></header>
     {stock.length===0?<div className="ux-no-data"><Package size={22}/><strong>Nenhum alerta de stock</strong><p>Não há produtos abaixo do limite definido.</p></div>:
     <div className="ux-simple-list">{stock.map(p=><div key={p.id}><span className="ux-stock-symbol"><Package size={16}/></span><b>{p.name}</b><strong className={p.stock<=0?"ux-danger":""}>{p.stock} {p.unit}</strong></div>)}</div>}
     {lowTotal>stock.length&&<button className="text-link ux-bottom-link" onClick={()=>go("products")}>Mais {lowTotal-stock.length} produtos com stock baixo <ChevronRight size={15}/></button>}
    </section>
   </div>
   <div className="ux-secondary-grid">
    <section className="surface ux-insight">
     <header className="ux-panel-header"><div><h2>Vendas recentes</h2><p>Últimas operações da demonstração</p></div><button className="text-link" onClick={()=>go("reports")}>Ver todas <ArrowRight size={15}/></button></header>
     {data.sales.length===0?<EmptyPanel description="As vendas registadas irão aparecer nesta lista."/>:<div className="ux-simple-list ux-sales-list">{[...data.sales].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5).map(s=><div key={s.id}><span className="ux-sale-status">{s.method==="fiado"?"Fiado":"Paga"}</span><span><b>{s.id}</b><small>{dateTime(s.createdAt)}</small></span><strong>{money(s.total)}</strong></div>)}</div>}
    </section>
    <section className="surface ux-insight">
     <header className="ux-panel-header"><div><h2>Actividade recente</h2><p>Alterações efectuadas no navegador</p></div><button className="text-link" onClick={()=>go("settings")}>Definições <ArrowRight size={15}/></button></header>
     {data.audits.length===0?<EmptyPanel description="Ainda não existem actividades registadas."/>:<div className="ux-simple-list ux-activity-list">{data.audits.slice(0,5).map(a=><div key={a.id}><span className="ux-activity-symbol"><Clock3 size={15}/></span><span><b>{a.action}</b><small>{a.description}</small></span><small>{dateTime(a.createdAt)}</small></div>)}</div>}
    </section>
   </div>
   <p className="ux-dashboard-disclaimer"><CalendarDays size={15}/> Os indicadores são calculados a partir de dados guardados localmente. Não há pagamentos externos nem relatórios fiscais.</p>
 </div>;
}
