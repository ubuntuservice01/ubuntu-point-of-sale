import {money,roundMoney,type Sale,type Store} from "./domain";
export type ThermalPaper="58mm"|"80mm";
export type ThermalReceiptSettings={
 paper:ThermalPaper;
 businessName:string;
 address:string;
 phone:string;
 nuit:string;
 footer:string;
 showQr:boolean;
 logoDataUrl:string;
};
export const defaultThermalReceiptSettings=():ThermalReceiptSettings=>({
 paper:"80mm",businessName:"Loja de demonstração",address:"",phone:"",nuit:"",
 footer:"Obrigado pela preferência!",showQr:true,logoDataUrl:""
});
const clean=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
export function validReceiptLogo(value:unknown):value is string{
 return typeof value==="string"&&value.length<155_000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
}
/** Nunca assumir que dados de versões antigas ou localStorage externo são seguros. */
export function sanitizeThermalSettings(value:unknown):ThermalReceiptSettings{
 const defaults=defaultThermalReceiptSettings();
 if(!value||typeof value!=="object")return defaults;
 const x=value as Partial<ThermalReceiptSettings>;
 return {
  paper:x.paper==="58mm"?"58mm":"80mm",
  businessName:clean(x.businessName,90)||defaults.businessName,
  address:clean(x.address,160),
  phone:clean(x.phone,50),
  nuit:clean(x.nuit,30),
  footer:clean(x.footer,150),
  showQr:typeof x.showQr==="boolean"?x.showQr:true,
  logoDataUrl:validReceiptLogo(x.logoDataUrl)?x.logoDataUrl:""
 };
}
/** Cash tender is a record of the operator's declared amount, not a real payment confirmation.
 * Legacy and non-cash sales do not get fabricated amounts.
 * An inconsistent legacy record is treated as unavailable rather than printed as fact.
 */
export function cashTenderDetails(sale:Sale):{received:number;change:number}|null{
 if(sale.method!=="dinheiro"||typeof sale.cashReceived!=="number"||
    typeof sale.cashChange!=="number"||!Number.isFinite(sale.cashReceived)||
    !Number.isFinite(sale.cashChange)||!Number.isFinite(sale.total)||
    sale.cashReceived<sale.total||sale.cashChange<0)return null;
 const received=roundMoney(sale.cashReceived),change=roundMoney(sale.cashChange);
 if(Math.abs(roundMoney(received-sale.total)-change)>0.000001)return null;
 return {received,change};
}
export const thermalQrPayload=(sale:Sale)=>"UBUNTU-POS360-DEMO:"+sale.id;
export function receiptDetails(sale:Sale,store:Store){
 const subtotal=roundMoney(sale.items.reduce((sum,i)=>sum+i.qty*i.price,0));
 const deliveryFee=roundMoney(sale.deliveryFee??0);
 const adjustments=roundMoney(sale.total-subtotal-deliveryFee);
 const customer=store.customers.find(c=>c.id===sale.customerId);
 const count=roundMoney(sale.items.reduce((sum,i)=>sum+i.qty,0));
 const method:{[key:string]:string}={dinheiro:"Dinheiro",mpesa:"M-Pesa",emola:"e-Mola",cartao:"Cartão",fiado:"Fiado / crédito"};
 const source:{[key:string]:string}={pos:"Balcão",farmacia:"Farmácia",restaurante:"Restaurante",bar:"Bar",talho:"Talho",grossistas:"Grossistas",online:"Loja online"};
 return {
  subtotal,deliveryFee,adjustments,total:roundMoney(sale.total),count,cashTender:cashTenderDetails(sale),
  customerName:customer?.name??(sale.customerId?"Cliente registado":null),
  method:method[sale.method]??sale.method,
  source:source[sale.source??"pos"]??"Venda",
  unpaid:sale.method==="fiado",
  qrPayload:thermalQrPayload(sale),
  articles:sale.items.map(i=>({...i,lineTotal:roundMoney(i.qty*i.price)}))
 };
}
export function receiptAmount(value:number):string{
 return new Intl.NumberFormat("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
}
export function receiptQuantity(value:number):string{
 return new Intl.NumberFormat("pt-MZ",{maximumFractionDigits:3}).format(value);
}
export function receiptTimestamp(value:string):string{
 const time=new Date(value);
 return Number.isFinite(time.valueOf())?
 new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(time):
 "Data indisponível";
}
