import {roundMoney,type CartItem,type Payment,type Product} from "./domain";
export type KeypadMode="qty"|"cash";
export type QuickCashState={mode:KeypadMode;entry:string;selectedProductId:string|null};
export const freshKeypad=(mode:KeypadMode="qty"):QuickCashState=>({mode,entry:"",selectedProductId:null});
export const isMeasuredUnit=(unit:string)=>["kg","L"].includes(unit);
export function quickKeypadValue(current:string,key:string,mode:KeypadMode):string{
 if(key==="C")return "";
 if(key==="⌫")return current.slice(0,-1);
 if(key===",")key=".";
 if(key==="."&&(!current||current.includes(".")))return current;
 if(!/^[0-9.]$/.test(key))return current;
 const maxDecimals=mode==="cash"?2:3;
 const next=(current==="0"&&key!=="."?key:current+key);
 if(next.length>12)return current;
 if((next.split(".")[1]?.length??0)>maxDecimals)return current;
 return next;
}
export type QuickQuantityValidation={valid:boolean;reason:string|null;qty:number};
export function quickQuantityCheck(raw:string,product:Product|undefined,available:number):QuickQuantityValidation{
 const qty=Number(raw);
 if(!product)return {valid:false,reason:"Seleccione um produto do carrinho.",qty:0};
 if(!raw||!Number.isFinite(qty)||qty<=0)return {valid:false,reason:"Introduza uma quantidade maior que zero.",qty:0};
 if(isMeasuredUnit(product.unit)?Math.round(qty*1000)!==qty*1000:!Number.isInteger(qty))
  return {valid:false,reason:isMeasuredUnit(product.unit)?"Use até 3 casas decimais.":"Este artigo só aceita unidades inteiras.",qty:0};
 if(qty>available+0.000001)return {valid:false,reason:"Quantidade superior ao stock livre.",qty:0};
 return {valid:true,reason:null,qty};
}
export function quickCashChange(raw:string,total:number):{valid:boolean;received:number;change:number;reason:string|null}{
 if(!raw)return {valid:false,received:0,change:0,reason:"Introduza o montante entregue pelo cliente."};
 const received=Number(raw);
 if(!Number.isFinite(received)||received<0||Math.abs(roundMoney(received)-received)>0.0000001)
  return {valid:false,received:0,change:0,reason:"Montante inválido."};
 if(received+0.000001<total)
  return {valid:false,received,change:0,reason:"Montante insuficiente para esta venda."};
 return {valid:true,received,change:roundMoney(received-total),reason:null};
}
export function quickCheckoutReady({
 cart,payment,customerId,creditAllowed,cashSessionOpen,cashEntry,total
}:{
 cart:CartItem[];payment:Payment;customerId:string;creditAllowed:boolean;cashSessionOpen:boolean;
 cashEntry:string;total:number;
}):{ready:boolean;reason:string|null}{
 if(cart.length===0)return {ready:false,reason:"Adicione pelo menos um artigo."};
 if(payment==="fiado"&&!customerId)return {ready:false,reason:"Seleccione o cliente do fiado."};
 if(payment==="fiado"&&!creditAllowed)return {ready:false,reason:"O limite de fiado é insuficiente."};
 if(payment==="dinheiro"&&!cashSessionOpen)return {ready:false,reason:"Abra o caixa antes de receber dinheiro."};
 if(payment==="dinheiro"){
  const cash=quickCashChange(cashEntry,total);
  if(!cash.valid)return {ready:false,reason:cash.reason};
 }
 return {ready:true,reason:null};
}
