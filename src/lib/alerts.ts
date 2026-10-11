import {creditPosition} from "./credit";
import {quantityReserved,roundMoney,type Section,type Store} from "./domain";

export type AlertKind="stock"|"credit"|"expiry"|"orders";
export type AlertPriority="critical"|"high"|"medium";
export type OperationalAlert={
 id:string;kind:AlertKind;priority:AlertPriority;
 title:string;description:string;
 section:Section;actionLabel:string;reference:string;
};
export type AlertSettings={
 lowStockThreshold:number;
 expiryWarningDays:number;
 orderWaitingHours:number;
};
export const defaultAlertSettings=():AlertSettings=>({
 lowStockThreshold:10,expiryWarningDays:30,orderWaitingHours:24
});
const numberSetting=(value:unknown,fallback:number,min:number,max:number)=>
 typeof value==="number"&&Number.isSafeInteger(value)&&value>=min&&value<=max?value:fallback;
export function safeAlertSettings(value:unknown):AlertSettings{
 const defaults=defaultAlertSettings();
 const raw=value&&typeof value==="object"?value as Partial<AlertSettings>:{};
 return {
  lowStockThreshold:numberSetting(raw.lowStockThreshold,defaults.lowStockThreshold,0,100000),
  expiryWarningDays:numberSetting(raw.expiryWarningDays,defaults.expiryWarningDays,1,365),
  orderWaitingHours:numberSetting(raw.orderWaitingHours,defaults.orderWaitingHours,1,720)
 };
}
export function safeReadAlerts(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter((x):x is string=>typeof x==="string"&&x.length>0&&x.length<=250))].slice(-500);
}
function dateKey(date:Date):string{
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
function validDay(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T12:00:00Z");
 return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
function dayDistance(from:string,to:string):number{
 const millis=(v:string)=>Date.parse(v+"T12:00:00Z");
 return Math.round((millis(to)-millis(from))/86400000);
}
const priorities:Record<AlertPriority,number>={critical:0,high:1,medium:2};
export const alertPriorityText:Record<AlertPriority,string>={critical:"Urgente",high:"Alta",medium:"Normal"};
export const alertKindText:Record<AlertKind,string>={stock:"Stock",credit:"Fiado",expiry:"Validade",orders:"Encomendas"};
const amount=(value:number)=>new Intl.NumberFormat("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2}).format(roundMoney(value))+" MZN";
const qty=(value:number)=>new Intl.NumberFormat("pt-MZ",{maximumFractionDigits:3}).format(value);
const stableAmount=(value:number)=>roundMoney(value).toFixed(2);
/**
 * Alertas calculados unicamente a partir dos dados demonstrativos locais.
 * Uma nova alteração de stock, pagamento ou estado de encomenda gera uma
 * impressão digital nova; alertas resolvidos desaparecem sem serem apagados manualmente.
 */
export function operationalAlerts(store:Store,now=new Date()):OperationalAlert[]{
 const settings=safeAlertSettings(store.alertSettings);
 const today=dateKey(now);
 const result:OperationalAlert[]=[];
 for(const product of store.products){
  if(!product.active||!Number.isFinite(product.stock))continue;
  const reserved=quantityReserved(store,product.id);
  const free=Math.max(0,Math.round((product.stock-reserved)*1000)/1000);
  if(free>settings.lowStockThreshold)continue;
  const critical=free<=0;
  result.push({
   id:"stock:"+product.id+":"+qty(free)+":"+settings.lowStockThreshold,
   kind:"stock",priority:critical?"critical":free<=Math.max(1,settings.lowStockThreshold/2)?"high":"medium",
   title:critical?product.name+" — sem stock livre":product.name+" — stock baixo",
   description:critical?"Não existem unidades livres para venda.":qty(free)+" "+product.unit+" disponível(is). Limite configurado: "+qty(settings.lowStockThreshold)+".",
   section:"products",actionLabel:"Ver produto",reference:product.id
  });
 }
 for(const customer of store.customers){
  const position=creditPosition(customer.id,store.credits,today);
  if(position.overdue<=0)continue;
  const due=position.items.filter(item=>item.overdue).map(item=>item.entry.dueDate).filter((s):s is string=>!!s).sort()[0]??"";
  const priority:AlertPriority=due&&validDay(due)&&dayDistance(due,today)>=30?"critical":"high";
  result.push({
   id:"credit:"+customer.id+":"+stableAmount(position.overdue)+":"+due+":"+priority,
   kind:"credit",priority,
   title:customer.name+" — fiado vencido",
   description:amount(position.overdue)+" vencidos"+(due?" (prazo desde "+due+")":"")+".",
   section:"customers",actionLabel:"Consultar dívida",reference:customer.id
  });
 }
 for(const lot of store.pharmaLots){
  if(!Number.isFinite(lot.qty)||lot.qty<=0||!validDay(lot.expiryDate))continue;
  const diff=dayDistance(today,lot.expiryDate);
  if(diff>settings.expiryWarningDays)continue;
  const product=store.products.find(p=>p.id===lot.productId);
  const expired=diff<0;
  result.push({
   id:"expiry:"+lot.id+":"+lot.expiryDate+":"+qty(lot.qty)+":"+(expired?"expired":diff<=7?"high":"near")+":"+settings.expiryWarningDays,
   kind:"expiry",priority:expired?"critical":diff<=7?"high":"medium",
   title:(product?.name??"Produto sem cadastro")+" — "+(expired?"lote expirado":"lote próximo da validade"),
   description:"Lote "+lot.lotNumber+" · "+qty(lot.qty)+" unidade(s) · "+(expired?"Expirou em "+lot.expiryDate:diff===0?"Expira hoje":"Validade "+lot.expiryDate+" (faltam "+diff+" dias)"),
   section:"farmacia",actionLabel:"Ver lotes da farmácia",reference:lot.id
  });
 }
 const elapsedHours=(iso:string)=>{
  const date=new Date(iso).getTime();
  return Number.isFinite(date)?Math.max(0,(now.getTime()-date)/3600000):0;
 };
 for(const order of store.onlineOrders){
  if(!["recebida","confirmada","preparacao","pronta","em_entrega"].includes(order.state))continue;
  const hours=elapsedHours(order.createdAt);
  const priority:AlertPriority=hours>=settings.orderWaitingHours?"critical":hours>=4?"high":"medium";
  result.push({
   id:"orders:online:"+order.id+":"+order.state+":"+priority,
   kind:"orders",priority,
   title:"Encomenda "+order.id+" — pendente",
   description:"Estado: "+order.state.replaceAll("_"," ")+" · "+order.customerName+". "+(hours>=settings.orderWaitingHours?"Ultrapassou "+settings.orderWaitingHours+" h desde o pedido.":"Aguarda acompanhamento."),
   section:order.state==="em_entrega"?"entregas":"encomendas-online",
   actionLabel:order.state==="em_entrega"?"Ver entrega":"Ver encomenda",
   reference:order.id
  });
 }
 for(const order of store.wholesaleOrders){
  if(!["reservada","expedida"].includes(order.state))continue;
  const hours=elapsedHours(order.createdAt);
  const priority:AlertPriority=hours>=settings.orderWaitingHours?"critical":"medium";
  result.push({
   id:"orders:wholesale:"+order.id+":"+order.state+":"+priority,
   kind:"orders",priority,
   title:"Pedido grossista "+order.id+" — "+(order.state==="reservada"?"por expedir":"por entregar"),
   description:"Valor: "+amount(order.total)+". "+(hours>=settings.orderWaitingHours?"Ultrapassou "+settings.orderWaitingHours+" h desde o pedido.":"Pedido pendente de acompanhamento."),
   section:"grossistas",actionLabel:"Ver pedido grossista",reference:order.id
  });
 }
 return result.sort((a,b)=>priorities[a.priority]-priorities[b.priority]||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title,"pt"));
}
export function alertSummary(alerts:OperationalAlert[],readIds:readonly string[]){
 const read=new Set(readIds);
 const unread=alerts.filter(a=>!read.has(a.id));
 return {
  total:alerts.length,unread:unread.length,
  critical:unread.filter(a=>a.priority==="critical").length,
  high:unread.filter(a=>a.priority==="high").length,
  byKind:Object.fromEntries((["stock","credit","expiry","orders"] as const).map(kind=>[kind,alerts.filter(a=>a.kind===kind).length])) as Record<AlertKind,number>
 };
}
export function markAlertRead(readIds:readonly string[],id:string):string[]{
 return safeReadAlerts([...readIds,id]);
}
export function markAlertUnread(readIds:readonly string[],id:string):string[]{
 return readIds.filter(x=>x!==id);
}
export function pruneReadAlerts(readIds:readonly string[],alerts:OperationalAlert[]):string[]{
 const current=new Set(alerts.map(a=>a.id));
 return safeReadAlerts(readIds.filter(id=>current.has(id)));
}
