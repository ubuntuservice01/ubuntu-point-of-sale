import {money,roundMoney,SECTIONS,type Payment,type Sale,type Section,type Store} from "./domain";

/** Organização apenas visual: não altera direitos nem concede acesso a áreas restritas. */
export const NAV_GROUPS = [
 {id:"operacoes",label:"Operações",sections:["dashboard","pos","cash","customers","returns"]},
 {id:"produtos",label:"Produtos e stock",sections:["products","inventory","purchases","suppliers"]},
 {id:"gestao",label:"Gestão",sections:["expenses","reports","finance","catalogo","encomendas-online","entregas","fidelizacao"]},
 {id:"sectores",label:"Negócios especializados",sections:["farmacia","restaurante","bar","talho","producao","grossistas"]},
 {id:"administracao",label:"Administração demonstrativa",sections:["companies","modules","settings"]}
] as const satisfies ReadonlyArray<{id:string;label:string;sections:readonly Section[]}>;
export type NavGroupId = (typeof NAV_GROUPS)[number]["id"];
export const allNavigationSections=()=>NAV_GROUPS.flatMap(group=>group.sections) as Section[];
export const navGroupFor=(section:Section)=>NAV_GROUPS.find(group=>(group.sections as readonly Section[]).includes(section));
export const sectionLabel=(section:Section)=>SECTIONS.find(item=>item.id===section)?.label??section;

export type DashboardPeriod="hoje"|"7d"|"30d"|"personalizado";
function localDate(date:Date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");}
function parseDay(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const result=new Date(value+"T12:00:00");return Number.isFinite(result.valueOf())&&localDate(result)===value?result:null;}
const firstInstant=(day:Date)=>new Date(day.getFullYear(),day.getMonth(),day.getDate()).getTime();
const endInstant=(day:Date)=>new Date(day.getFullYear(),day.getMonth(),day.getDate()+1).getTime()-1;
export function dashboardRange(period:DashboardPeriod,startCustom:string,endCustom:string,now=new Date()){
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 let first=new Date(today),last=new Date(today);
 if(period==="7d")first=new Date(today.getFullYear(),today.getMonth(),today.getDate()-6);
 if(period==="30d")first=new Date(today.getFullYear(),today.getMonth(),today.getDate()-29);
 if(period==="personalizado"){
  const from=parseDay(startCustom),to=parseDay(endCustom);
  if(!from||!to||from>to)return {valid:false,from:firstInstant(today),to:endInstant(today),description:"Intervalo inválido",start:localDate(today),end:localDate(today)};
  first=from;last=to;
 }
 const start=localDate(first),end=localDate(last);
 const description=period==="hoje"?"Hoje":period==="7d"?"Últimos 7 dias":period==="30d"?"Últimos 30 dias":start+" a "+end;
 return {valid:true,from:firstInstant(first),to:endInstant(last),description,start,end};
}
type Range=ReturnType<typeof dashboardRange>;
export const filteredSales=(store:Store,range:Range)=>range.valid?store.sales.filter(s=>{const n=new Date(s.createdAt).getTime();return n>=range.from&&n<=range.to;}):[];
export function dashboardMetrics(store:Store,range:Range){
 const sales=filteredSales(store,range);
 const returns=range.valid?store.returns.filter(r=>{const n=new Date(r.createdAt).getTime();return n>=range.from&&n<=range.to;}):[];
 const paid=sales.filter(s=>s.method!=="fiado");
 const paidRefunds=returns.filter(r=>r.method!=="abater_fiado").reduce((sum,r)=>sum+r.total,0);
 const methods:(Exclude<Payment,"fiado">|"fiado")[]=["dinheiro","mpesa","emola","cartao","fiado"];
 const byMethod=methods.map(method=>({method,total:roundMoney(sales.filter(s=>s.method===method).reduce((sum,s)=>sum+s.total,0))}));
 const perProduct=new Map<string,{name:string,total:number}>();
 for(const s of sales)for(const item of s.items){
  const old=perProduct.get(item.productId);
  perProduct.set(item.productId,{name:item.name,total:roundMoney((old?.total??0)+item.price*item.qty)});
 }
 const bestProducts=[...perProduct.entries()].map(([id,v])=>({id,...v})).sort((a,b)=>b.total-a.total).slice(0,5);
 return {
  sales,returns,paidCount:paid.length,salesCount:sales.length,fiadoCount:sales.length-paid.length,
  paidGross:roundMoney(paid.reduce((sum,s)=>sum+s.total,0)),
  paidRefunds:roundMoney(paidRefunds),
  paidNet:roundMoney(paid.reduce((sum,s)=>sum+s.total,0)-paidRefunds),
  fiadoTotal:roundMoney(sales.filter(s=>s.method==="fiado").reduce((sum,s)=>sum+s.total,0)),
  gross:roundMoney(sales.reduce((sum,s)=>sum+s.total,0)),
  byMethod,bestProducts
 };
}
export type SalesBar={key:string;label:string;total:number};
export function dashboardSalesBars(store:Store,range:Range):SalesBar[]{
 if(!range.valid)return [];
 const sales=filteredSales(store,range);
 const dayStart=new Date(range.from);
 const dayEnd=new Date(range.to);
 const days=Math.round((Date.UTC(dayEnd.getFullYear(),dayEnd.getMonth(),dayEnd.getDate())-
   Date.UTC(dayStart.getFullYear(),dayStart.getMonth(),dayStart.getDate()))/86400000)+1;
 if(days===1){
  const intervals=Array.from({length:6},(_,i)=>({key:String(i),label:String(i*4).padStart(2,"0")+"h",total:0}));
  for(const sale of sales){const hours=new Date(sale.createdAt).getHours();intervals[Math.floor(hours/4)]!.total+=sale.total;}
  return intervals.map(p=>({...p,total:roundMoney(p.total)}));
 }
 // Máximo 10 grupos para manter a legibilidade em tablet/telemóvel.
 const size=Math.ceil(days/10);
 const result:SalesBar[]=[];
 for(let offset=0;offset<days;offset+=size){
  const a=new Date(dayStart.getFullYear(),dayStart.getMonth(),dayStart.getDate()+offset);
  const b=new Date(dayStart.getFullYear(),dayStart.getMonth(),dayStart.getDate()+Math.min(days-1,offset+size-1));
  const min=firstInstant(a),max=endInstant(b);
  const total=sales.filter(s=>{const n=new Date(s.createdAt).getTime();return n>=min&&n<=max;}).reduce((sum,s)=>sum+s.total,0);
  const fmt=(d:Date)=>new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short"}).format(d);
  result.push({key:localDate(a),label:size>1?fmt(a)+"–"+fmt(b):fmt(a),total:roundMoney(total)});
 }
 return result;
}
export function stockAlertsList(store:Store,limit=5){
 return store.products.filter(p=>p.active&&p.stock<=10).sort((a,b)=>a.stock-b.stock).slice(0,limit);
}
export const periodSummary=(store:Store,range:Range)=>money(dashboardMetrics(store,range).paidNet);
