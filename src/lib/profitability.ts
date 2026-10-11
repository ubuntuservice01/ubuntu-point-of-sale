import {roundMoney,type CartItem,type Store} from "./domain";
import {dashboardRange,type DashboardPeriod} from "./ux";

/**
 * O custo é um instantâneo do preço de compra disponível no momento da venda.
 * Não representa apuramento contabilístico por FIFO/custo médio, lotes ou receitas.
 * Não usamos o custo actual para atribuir custos a vendas antigas.
 */
export function snapshotSaleItems(store:Store,items:CartItem[]):CartItem[]{
 return items.map(item=>{
  const product=store.products.find(p=>p.id===item.productId);
  const validCost=product?.purchasePrice!==undefined&&Number.isFinite(product.purchasePrice)&&product.purchasePrice>0;
  return {
   ...item,
   ...(validCost?{costAtSale:roundMoney(product.purchasePrice!)}:{}),
   ...(product?.category?{categoryAtSale:product.category}:{})
  };
 });
}

export type ProfitPeriod=DashboardPeriod|"todos";
export type ProfitRange={valid:boolean;from:number;to:number;description:string;start:string;end:string};
export function profitabilityRange(period:ProfitPeriod,start:string,end:string,now=new Date()):ProfitRange{
 if(period==="todos")return {valid:true,from:-Infinity,to:Infinity,description:"Todo o histórico",start:"",end:""};
 return dashboardRange(period,start,end,now);
}
function inRange(iso:string,range:ProfitRange){
 if(!range.valid)return false;
 const timestamp=new Date(iso).getTime();
 return Number.isFinite(timestamp)&&timestamp>=range.from&&timestamp<=range.to;
}
function validCost(item:CartItem):number|null{
 return typeof item.costAtSale==="number"&&Number.isFinite(item.costAtSale)&&item.costAtSale>0?item.costAtSale:null;
}
const sane=(n:number)=>roundMoney(n);
export type ProfitRow={
 id:string;name:string;category:string;unit:string;
 qty:number;revenue:number;knownRevenue:number;cost:number;
 unknownRevenue:number;missingCostLines:number;margin:number|null;percent:number|null;
};
type AccRow=Omit<ProfitRow,"margin"|"percent">;
function marginPercent(margin:number,base:number):number|null{
 return base>0?sane(margin/base*100):null;
}
export function profitabilityReport(store:Store,range:ProfitRange){
 const sales=range.valid?store.sales.filter(s=>inRange(s.createdAt,range)):[];
 const returns=range.valid?store.returns.filter(r=>inRange(r.createdAt,range)):[];
 const expenses=range.valid?store.expenses.filter(x=>inRange(x.createdAt,range)):[];
 const saleById=new Map(store.sales.map(s=>[s.id,s]));
 const productById=new Map(store.products.map(p=>[p.id,p]));
 const rows=new Map<string,AccRow>();
 let grossRevenue=0,returnedRevenue=0,grossDeliveryFees=0,costSales=0,costReturns=0;
 let knownRevenueSales=0,knownRevenueReturns=0,unknownRevenueSales=0,unknownRevenueReturns=0;
 let missingCostLines=0,coveredSaleLines=0,coveredReturnLines=0;
 const accumulate=(productId:string,name:string,category:string,qty:number,revenue:number,cost:number|null)=>{
  const product=productById.get(productId);
  const row=rows.get(productId)??{id:productId,name,category,unit:product?.unit??"un.",qty:0,revenue:0,knownRevenue:0,cost:0,unknownRevenue:0,missingCostLines:0};
  row.qty+=qty;
  row.revenue+=revenue;
  if(cost===null){row.unknownRevenue+=revenue;row.missingCostLines+=1;missingCostLines+=1;}
  else{row.knownRevenue+=revenue;row.cost+=cost;}
  rows.set(productId,row);
 };
 for(const sale of sales){
  grossDeliveryFees+=sale.deliveryFee??0;
  for(const line of sale.items){
   const revenue=sane(line.qty*line.price),cost=validCost(line);
   grossRevenue+=revenue;
   const itemCost=cost===null?null:sane(line.qty*cost);
   if(itemCost===null)unknownRevenueSales+=revenue;
   else{knownRevenueSales+=revenue;costSales+=itemCost;coveredSaleLines+=1;}
   accumulate(line.productId,line.name,line.categoryAtSale??productById.get(line.productId)?.category??"Sem categoria",line.qty,revenue,itemCost);
  }
 }
 for(const ret of returns){
  const sale=saleById.get(ret.saleId);
  for(const line of ret.items){
   // O preço da devolução vem do registo original; não inclui uma eventual taxa de entrega.
   const revenue=sane(line.qty*line.unitPrice);
   returnedRevenue+=revenue;
   const original=sale?.items.find(i=>i.productId===line.productId);
   const cost=original?validCost(original):null;
   const itemCost=cost===null?null:sane(cost*line.qty);
   if(itemCost===null)unknownRevenueReturns+=revenue;
   else{knownRevenueReturns+=revenue;costReturns+=itemCost;coveredReturnLines+=1;}
   accumulate(line.productId,original?.name??productById.get(line.productId)?.name??"Produto histórico",
    original?.categoryAtSale??productById.get(line.productId)?.category??"Sem categoria",-line.qty,-revenue,itemCost===null?null:-itemCost);
  }
 }
 const netSales=sane(grossRevenue-returnedRevenue);
 const estimatedCost=sane(costSales-costReturns);
 const knownNetRevenue=sane(knownRevenueSales-knownRevenueReturns);
 const partialMargin=sane(knownNetRevenue-estimatedCost);
 const missingRevenue=sane(unknownRevenueSales-unknownRevenueReturns);
 const allExpenses=sane(expenses.reduce((sum,x)=>sum+x.amount,0));
 // Sem custo em qualquer linha não se deve mostrar lucro total nem percentagem global.
 const hasTransactions=coveredSaleLines+coveredReturnLines+missingCostLines>0;
 const complete=hasTransactions&&missingCostLines===0;
 const margin=complete?partialMargin:null;
 const marginPct=complete?marginPercent(partialMargin,netSales):null;
 const resultAfterExpenses=complete?sane(partialMargin-allExpenses):null;
 const products:ProfitRow[]=[...rows.values()].map(row=>{
  const r={...row,qty:sane(row.qty),revenue:sane(row.revenue),knownRevenue:sane(row.knownRevenue),
   unknownRevenue:sane(row.unknownRevenue),cost:sane(row.cost)};
  const rowMargin=r.missingCostLines?null:sane(r.revenue-r.cost);
  return {...r,margin:rowMargin,percent:rowMargin===null?null:marginPercent(rowMargin,r.revenue)};
 }).sort((a,b)=>b.revenue-a.revenue||a.name.localeCompare(b.name,"pt"));
 const categories=new Map<string,{name:string;revenue:number;cost:number;missing:number;knownRevenue:number}>();
 for(const row of products){
  const old=categories.get(row.category)??{name:row.category,revenue:0,cost:0,missing:0,knownRevenue:0};
  old.revenue+=row.revenue;old.cost+=row.cost;old.knownRevenue+=row.knownRevenue;old.missing+=row.missingCostLines;
  categories.set(row.category,old);
 }
 const categoryRows=[...categories.values()].map(c=>({
  name:c.name,revenue:sane(c.revenue),cost:sane(c.cost),
  margin:c.missing?null:sane(c.revenue-c.cost),
  missing:c.missing
 })).sort((a,b)=>b.revenue-a.revenue);
 const fullSales=store.sales.length;
 return {range,sales,returns,expenses,
  fullSales,saleCount:sales.length,returnCount:returns.length,
  grossRevenue:sane(grossRevenue),returnedRevenue:sane(returnedRevenue),netSales,
  deliveryFees:sane(grossDeliveryFees),
  costSales:sane(costSales),costReturns:sane(costReturns),estimatedCost,
  knownNetRevenue,unknownRevenue:missingRevenue,
  missingCostLines,knownCostLines:coveredSaleLines+coveredReturnLines,
  partialMargin,complete,hasTransactions,margin,marginPct,expensesTotal:allExpenses,resultAfterExpenses,
  products,categories:categoryRows,
  // Um pagamento de fiado não volta a contar como venda. Compras de stock não são despesas do período.
  warnings:[
   ...(missingCostLines?["Há "+missingCostLines+" linha(s) de vendas/devoluções sem custo histórico. A margem total está por apurar."]:[]),
   ...(grossDeliveryFees>0?["As taxas de entrega ("+sane(grossDeliveryFees)+" MZN) são indicadas em separado, sem serem tratadas como margem de mercadorias."]:[]),
   ...(store.sales.length>0&&missingCostLines?["As vendas antigas não recebem custos retroactivos do catálogo actual."]:[])
  ]};
}

export function profitabilityCsv(report:ReturnType<typeof profitabilityReport>):string{
 const escapeCell=(v:string|number|null)=>{
  if(v===null)return '""';
  if(typeof v==="number")return String(v);
  const value=String(v);
  // Protege quem abre CSV no Excel/LibreOffice contra fórmulas em nomes dos produtos.
  const safe=/^[=+@\-\t\r]/.test(value)?"'"+value:value;
  return '"'+safe.replaceAll('"','""')+'"';
 };
 const rows:(string|number|null)[][]=[
  ["Ubuntu POS 360 — RELATÓRIO DEMONSTRATIVO / NÃO FISCAL"],
  ["Período",report.range.description],
  ["Vendas líquidas de mercadorias (MZN)",report.netSales],
  ["Custos estimados conhecidos (MZN)",report.estimatedCost],
  ["Receita sem custo histórico (MZN)",report.unknownRevenue],
  ["Margem bruta total estimada (MZN)",report.margin],
  ["Despesas registadas no período (MZN)",report.expensesTotal],
  ["Resultado indicativo após despesas (MZN)",report.resultAfterExpenses],
  ["Taxas de entrega (em separado)",report.deliveryFees],
  [],
  ["Produto","Categoria","Quantidade líquida","Vendas líquidas (MZN)","Custo estimado conhecido (MZN)","Margem (MZN)","Margem (%)","Linhas sem custo"],
  ...report.products.map(p=>[p.name,p.category,p.qty,p.revenue,p.cost,p.margin,p.percent,p.missingCostLines])
 ];
 return "\uFEFF"+rows.map(row=>row.map(escapeCell).join(";")).join("\r\n");
}
