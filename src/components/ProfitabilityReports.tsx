import {useMemo,useState} from "react";
import {AlertTriangle,ArrowDownRight,ArrowRight,ArrowUpRight,BookOpen,CalendarDays,ChartNoAxesCombined,Download,Info,Package,Search,ShoppingCart,TrendingDown,TrendingUp,Wallet} from "lucide-react";
import {money,type Section,type Store} from "../lib/domain";
import {profitabilityCsv,profitabilityRange,profitabilityReport,type ProfitPeriod} from "../lib/profitability";

type Props={data:Store;go:(section:Section)=>void};
const fmt=(n:number|null)=>n===null?"Por apurar":money(n);
const formatPercentage=(n:number|null)=>n===null?"Por apurar":new Intl.NumberFormat("pt-MZ",{minimumFractionDigits:1,maximumFractionDigits:1}).format(n)+"%";
const time=(iso:string)=>new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
const dayKey=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-")};
const sourceNames:Record<string,string>={pos:"Balcão",farmacia:"Farmácia",restaurante:"Restaurante",bar:"Bar",talho:"Talho",grossistas:"Grossistas",online:"Online"};
function Metric({title,value,hint,icon:Icon,muted=false}:{title:string;value:string;hint:string;icon:typeof Wallet;muted?:boolean}){
 return <article className={"pr-metric "+(muted?"is-muted":"")}>
  <div className="pr-metric-top"><span>{title}</span><span className="pr-metric-icon"><Icon size={19}/></span></div>
  <strong>{value}</strong><p>{hint}</p>
 </article>;
}
function Empty({text}:{text:string}){return <div className="pr-empty"><ChartNoAxesCombined size={25}/><strong>Sem resultados para apresentar</strong><p>{text}</p></div>}
function csvDownload(content:string,filename:string){
 const blob=new Blob([content],{type:"text/csv;charset=utf-8;"});
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");
 link.href=url;link.download=filename;
 document.body.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function ProfitabilityReports({data,go}:Props){
 const [period,setPeriod]=useState<ProfitPeriod>("30d");
 const [start,setStart]=useState(dayKey);
 const [end,setEnd]=useState(dayKey);
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("Todas");
 const [onlyUnknown,setOnlyUnknown]=useState(false);
 const range=profitabilityRange(period,start,end);
 const report=useMemo(()=>profitabilityReport(data,range),[data,range.from,range.to,range.valid]);
 const categories=["Todas",...report.categories.map(c=>c.name)];
 const filtered=report.products.filter(p=>(category==="Todas"||p.category===category)&&
  (!onlyUnknown||p.missingCostLines>0)&&
  (p.name+" "+p.category+" "+(data.products.find(q=>q.id===p.id)?.sku??"")).toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt")));
 const ranked=report.products.filter(p=>p.margin!==null&&p.margin>0).sort((a,b)=>(b.margin??0)-(a.margin??0)).slice(0,5);
 const topMargin=Math.max(1,...ranked.map(p=>p.margin??0));
 const missingCurrent=report.products.filter(p=>p.missingCostLines>0&&data.products.find(x=>x.id===p.id)?.purchasePrice===undefined).length;
 const exportReport=()=>{
  const stamp=period==="todos"?"historico":period==="personalizado"?range.start+"_"+range.end:period;
  csvDownload(profitabilityCsv(report),"ubuntu-pos360-margens-"+stamp+".csv");
 };
 return <div className="pr-root">
  <div className="pr-topline">
   <div><span className="pr-eyebrow">GESTÃO DE RESULTADOS</span><h1>Margens e rentabilidade</h1>
    <p>Entenda o valor vendido, o custo estimado das mercadorias e a margem bruta, sem confundir fiado, receitas e lucro.</p></div>
   <button type="button" className="pr-export" onClick={exportReport} disabled={!range.valid}><Download size={18}/> Exportar CSV</button>
  </div>
  <div className="pr-period-card">
   <div className="pr-period-label"><CalendarDays size={18}/><span>Período dos resultados</span></div>
   <div className="pr-period-options" role="group" aria-label="Período do relatório">
    {([["hoje","Hoje"],["7d","7 dias"],["30d","30 dias"],["personalizado","Datas"],["todos","Todo o histórico"]] as const).map(([id,name])=>
     <button key={id} type="button" aria-pressed={period===id} className={period===id?"selected":""} onClick={()=>{setPeriod(id);setCategory("Todas");setOnlyUnknown(false)}}>{name}</button>)}
   </div>
   {period==="personalizado"&&<div className="pr-date-range">
    <label>De <input aria-label="Início do período" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
    <label>Até <input aria-label="Fim do período" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
   </div>}
   {!range.valid&&<div role="alert" className="pr-warning"><AlertTriangle size={17}/> Intervalo de datas inválido. Verifique as datas.</div>}
  </div>
  <div className="pr-metrics">
   <Metric icon={ShoppingCart} title="Vendas líquidas" value={money(report.netSales)} hint="Mercadorias, excluindo devoluções e taxas de entrega"/>
   <Metric icon={Package} title="Custo conhecido das mercadorias" value={money(report.estimatedCost)} hint="Custo estimado das linhas com histórico disponível"/>
   <Metric icon={TrendingUp} title="Margem bruta estimada" value={fmt(report.margin)} hint={report.complete?"Vendas líquidas − custo estimado":"Faltam custos históricos de vendas"}/>
   <Metric icon={ChartNoAxesCombined} title="Percentagem de margem" value={formatPercentage(report.marginPct)} hint="Margem sobre a receita líquida de mercadorias"/>
   <Metric icon={Wallet} title="Despesas registadas" value={money(report.expensesTotal)} hint="Gastos operacionais lançados no período"/>
   <Metric icon={report.resultAfterExpenses!==null&&report.resultAfterExpenses<0?TrendingDown:BookOpen} title="Resultado indicativo" value={fmt(report.resultAfterExpenses)} hint="Margem estimada − despesas registadas (não é lucro líquido)" muted/>
  </div>
  {report.missingCostLines>0&&<section className="pr-warning-card" aria-label="Custos históricos em falta">
   <AlertTriangle size={21}/>
   <div><h2>Há {report.missingCostLines} linha(s) sem custo histórico</h2>
    <p>Estas operações não têm preço de compra guardado no momento da venda. Não vamos utilizar o preço de compra actual para inventar o custo de vendas antigas.</p>
    <p>Receita líquida ainda sem custo: <b>{money(report.unknownRevenue)}</b>. A margem global e o resultado ficam como <b>Por apurar</b> até existir um método contabilístico validado.</p>
    {missingCurrent>0&&<button type="button" className="pr-inline-action" onClick={()=>go("products")}>Definir custos de {missingCurrent} produto(s) para futuras vendas <ArrowRight size={16}/></button>}
   </div>
  </section>}
  {!report.hasTransactions&&<section className="pr-empty-block"><Empty text="Registe uma venda para começar a analisar margens. Os produtos de demonstração sem custo não recebem valores inventados."/></section>}
  <div className="pr-panel-grid">
   <section className="pr-panel">
    <header><div><h2>De onde vem a margem?</h2><p>Separação entre vendas, devoluções, custo e despesas</p></div></header>
    <div className="pr-waterfall">
     {[
      ["Vendas de mercadorias",report.grossRevenue],
      ["Devoluções",-report.returnedRevenue],
      ["Vendas líquidas",report.netSales],
      ["Custo conhecido dos artigos",-report.estimatedCost],
      ["Margem das linhas com custo",report.partialMargin],
      ["Despesas registadas",-report.expensesTotal]
     ].map(([label,value])=><div key={label} className={label==="Vendas líquidas"?"pr-waterfall-highlight":""}><span>{label}</span><strong className={Number(value)<0?"pr-negative":""}>{money(Number(value))}</strong></div>)}
    </div>
    <p className="pr-explanation"><Info size={16}/> A margem parcial considera apenas artigos com custo conhecido. Nunca deve ser interpretada como margem de todo o negócio quando faltam custos.</p>
    {report.deliveryFees>0&&<p className="pr-explanation"><Info size={16}/> Taxas de entrega apresentadas em separado: {money(report.deliveryFees)}. Não entram na margem das mercadorias.</p>}
   </section>
   <section className="pr-panel">
    <header><div><h2>Artigos com maior margem conhecida</h2><p>Estimativa por produto, apenas quando o custo está registado</p></div></header>
    {ranked.length===0?<Empty text="Ainda não existem vendas com custo histórico completo e margem positiva."/>:
     <div className="pr-ranked">{ranked.map((row,i)=><div key={row.id}>
       <div className="pr-ranked-name"><span>{i+1}. {row.name}</span><strong>{money(row.margin??0)}</strong></div>
       <div className="pr-ranked-track"><span style={{width:Math.max(0,((row.margin??0)/topMargin)*100)+"%"}}/></div>
      </div>)}</div>}
    <button className="pr-inline-action" onClick={()=>go("products")}>Consultar preços de compra e venda <ArrowRight size={15}/></button>
   </section>
  </div>
  <section className="pr-panel pr-product-report">
   <header className="pr-product-heading"><div><h2>Rentabilidade por produto</h2><p>Quantidades e valores líquidos após devoluções — {range.description.toLowerCase()}</p></div>
    <span className="pr-count">{report.products.length} produto(s) movimentado(s)</span></header>
   <div className="pr-filters">
    <label className="pr-search"><Search size={17}/><input aria-label="Pesquisar rentabilidade por produto" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar produto ou código…"/></label>
    <label className="pr-category"><span>Categoria</span><select aria-label="Filtrar por categoria" value={categories.includes(category)?category:"Todas"} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label className="pr-unknown-filter"><input type="checkbox" checked={onlyUnknown} onChange={e=>setOnlyUnknown(e.target.checked)}/> Só por apurar</label>
   </div>
   {filtered.length===0?<Empty text="Não há produtos que correspondam aos filtros escolhidos."/>:
    <div className="pr-table-wrap"><table className="pr-table">
     <thead><tr><th>Produto</th><th>Qt. líquida</th><th>Vendas líquidas</th><th>Custo conhecido</th><th>Margem</th><th>% margem</th></tr></thead>
     <tbody>{filtered.map(row=><tr key={row.id}>
      <td><b>{row.name}</b><small>{row.category}{row.missingCostLines>0?" · Custo por apurar":""}</small></td>
      <td>{new Intl.NumberFormat("pt-MZ",{maximumFractionDigits:3}).format(row.qty)} {row.unit}</td>
      <td>{money(row.revenue)}</td>
      <td>{money(row.cost)}</td>
      <td className={row.margin!==null&&row.margin<0?"pr-negative":"pr-positive"}>{fmt(row.margin)}</td>
      <td>{formatPercentage(row.percent)}</td>
     </tr>)}</tbody></table></div>}
  </section>
  <div className="pr-panel-grid pr-last-grid">
   <section className="pr-panel">
    <header><div><h2>Margem por categoria</h2><p>Indicadores apurados apenas onde há custos históricos</p></div></header>
    {report.categories.length===0?<Empty text="As categorias aparecem após as primeiras vendas."/>:
     <div className="pr-category-list">{report.categories.map(c=><div key={c.name}><span>{c.name}</span><b>{fmt(c.margin)}</b><small>{money(c.revenue)} em vendas líquidas</small></div>)}</div>}
   </section>
   <section className="pr-panel">
    <header><div><h2>Vendas recentes</h2><p>Referências para confirmar os movimentos</p></div></header>
    {report.sales.length===0?<Empty text="Não foram registadas vendas no período seleccionado."/>:
     <div className="pr-recent-list">{[...report.sales].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8).map(sale=>
      <div key={sale.id}><div><b>{sale.id}</b><small>{time(sale.createdAt)} · {sourceNames[sale.source??"pos"]??"Outro"} · {sale.method==="fiado"?"Fiado":sale.method}</small></div>
       <strong>{money(sale.total)}</strong></div>)}</div>}
   </section>
  </div>
  <div className="pr-disclaimer"><Info size={17}/>
   <p><b>Estimativa de gestão, não declaração fiscal.</b> O custo usado é o último preço de compra guardado no momento da venda, quando disponível. Não calcula FIFO, custo médio por lote, impostos, desperdícios não registados, mão-de-obra não registada nem a totalidade dos encargos. Compras para stock não são subtraídas novamente como despesa da venda; fiado recebido depois da venda não conta duas vezes como receita.</p>
  </div>
 </div>;
}
