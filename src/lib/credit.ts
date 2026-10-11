import type { CreditMovement, Customer, Store } from "./domain";
import {roundMoney} from "./domain";

export type OutstandingCredit={entry:CreditMovement;remaining:number;overdue:boolean};
export type CreditPosition={balance:number;overdue:number;items:OutstandingCredit[];nextDue?:string};

/** Abatimentos são aplicados primeiro às dívidas mais antigas (FIFO).
 * Não elimina o histórico e não presume prazos quando uma data não foi indicada. */
export function creditPosition(customerId:string,entries:CreditMovement[],asOf:string):CreditPosition{
 const own=entries.filter(e=>e.customerId===customerId&&Number.isFinite(e.amount)&&e.amount>0);
 const charges=own.filter(e=>e.kind==="fiado"||e.kind==="abertura")
   .sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 let paid=roundMoney(own.filter(e=>e.kind==="pagamento"||e.kind==="devolucao").reduce((s,e)=>s+e.amount,0));
 const items=charges.map(entry=>{
  const covered=Math.min(entry.amount,paid);
  paid=roundMoney(paid-covered);
  const remaining=roundMoney(entry.amount-covered);
  return {entry,remaining,overdue:!!entry.dueDate&&entry.dueDate<asOf&&remaining>0};
 });
 const balance=roundMoney(items.reduce((s,item)=>s+item.remaining,0));
 const overdue=roundMoney(items.filter(x=>x.overdue).reduce((s,item)=>s+item.remaining,0));
 const nextDue=items.filter(x=>x.remaining>0&&x.entry.dueDate&&x.entry.dueDate>=asOf)
   .map(x=>x.entry.dueDate!).sort()[0];
 return nextDue?{balance,overdue,items,nextDue}:{balance,overdue,items};
}
export function customerBalance(customerId:string,store:Store):number{
 return roundMoney(store.credits.filter(e=>e.customerId===customerId)
  .reduce((s,e)=>s+((e.kind==="pagamento"||e.kind==="devolucao")?-e.amount:e.amount),0));
}
export function canGrantCredit(customer:Customer|undefined,amount:number){
 return !!customer&&Number.isFinite(amount)&&amount>0&&
 (customer.creditLimit==null||roundMoney(customer.debt+amount)<=customer.creditLimit);
}
