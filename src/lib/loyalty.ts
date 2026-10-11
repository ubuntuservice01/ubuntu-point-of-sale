import {keyId,roundMoney,type Store,type Sale,type LoyaltySettings,type LoyaltyMovement,type LoyaltyReward} from "./domain";

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message)}
const audit=(s:Store,action:string,description:string,time:string)=>[{id:keyId(),action,description,createdAt:time},...s.audits];
export function loyaltyBalance(s:Store,customerId:string):number{
 return s.loyaltyMovements.filter(m=>m.customerId===customerId).reduce((sum,m)=>sum+(m.kind==="ganho"?m.points:-m.points),0);
}
export function loyaltyEarnedOnSale(s:Store,saleId:string){
 return s.loyaltyMovements.filter(m=>m.kind==="ganho"&&m.saleId===saleId).reduce((sum,m)=>sum+m.points,0);
}
export function updateLoyaltySettings(s:Store,input:LoyaltySettings):Store{
 check(Number.isSafeInteger(input.meticaisPerPoint)&&input.meticaisPerPoint>=1&&input.meticaisPerPoint<=1000000,"Introduza um valor inteiro positivo para a atribuição de pontos.");
 check(Number.isSafeInteger(input.rewardPoints)&&input.rewardPoints>=1&&input.rewardPoints<=1000000,"Indique um número válido de pontos necessários.");
 check(input.rewardName.trim().length>=3&&input.rewardName.trim().length<=100,"Indique um nome válido para o benefício.");
 const now=new Date().toISOString();
 return {...s,loyaltySettings:{...input,rewardName:input.rewardName.trim()},
 audits:audit(s,"Regras de fidelização actualizadas",input.rewardName.trim(),now)};
}
export function awardLoyaltyForSale(s:Store,sale:Sale,eligibleAmount=sale.total):Store{
 if(!s.loyaltySettings.enabled||sale.method==="fiado"||!sale.customerId||!s.customers.some(c=>c.id===sale.customerId))return s;
 if(s.loyaltyMovements.some(m=>m.kind==="ganho"&&m.saleId===sale.id))return s;
 const points=Math.floor(roundMoney(eligibleAmount)/s.loyaltySettings.meticaisPerPoint);
 if(!Number.isSafeInteger(points)||points<=0)return s;
 const now=new Date().toISOString(),movement:LoyaltyMovement={
  id:keyId(),customerId:sale.customerId,kind:"ganho",points,createdAt:now,saleId:sale.id,note:"Compra liquidada: "+sale.id
 };
 return {...s,loyaltyMovements:[movement,...s.loyaltyMovements],
 audits:audit(s,"Pontos atribuídos",points+" pontos · "+sale.id,now)};
}
export function reverseLoyaltyForReturn(s:Store,saleId:string,returnAmount:number):Store{
 const sale=s.sales.find(x=>x.id===saleId);
 if(!sale?.customerId||returnAmount<=0)return s;
 const earned=loyaltyEarnedOnSale(s,saleId);
 if(!earned)return s;
 const already=s.loyaltyMovements.filter(m=>m.kind==="estorno"&&m.saleId===saleId).reduce((n,m)=>n+m.points,0);
 // A reversão é proporcional ao valor de venda; o último estorno acerta arredondamentos.
 const refunded=s.returns.filter(r=>r.saleId===saleId).reduce((n,r)=>n+r.total,0);
 const required=Math.min(earned,refunded>=sale.total?earned:Math.floor(earned*refunded/sale.total));
 const points=Math.max(0,required-already);
 if(!points)return s;
 const now=new Date().toISOString(),entry:LoyaltyMovement={id:keyId(),customerId:sale.customerId,kind:"estorno",points,createdAt:now,saleId,note:"Estorno proporcional à devolução"};
 return {...s,loyaltyMovements:[entry,...s.loyaltyMovements],audits:audit(s,"Pontos estornados",points+" pontos · "+saleId,now)};
}
export function redeemLoyaltyReward(s:Store,customerId:string):Store{
 check(s.loyaltySettings.enabled,"A fidelização está desactivada.");
 check(s.customers.some(c=>c.id===customerId),"Seleccione um cliente registado.");
 const needed=s.loyaltySettings.rewardPoints;
 check(loyaltyBalance(s,customerId)>=needed,"O cliente não tem pontos suficientes para este benefício.");
 const time=new Date().toISOString(),reward:LoyaltyReward={
  id:"BEN-"+keyId().slice(0,8).toUpperCase(),customerId,name:s.loyaltySettings.rewardName,points:needed,state:"por_entregar",createdAt:time
 };
 const movement:LoyaltyMovement={id:keyId(),customerId,kind:"resgate",points:needed,createdAt:time,rewardId:reward.id,note:"Resgate de "+reward.name};
 return {...s,loyaltyRewards:[reward,...s.loyaltyRewards],loyaltyMovements:[movement,...s.loyaltyMovements],
 audits:audit(s,"Pontos trocados por benefício",reward.id+" · "+needed+" pontos",time)};
}
export function markLoyaltyRewardDelivered(s:Store,rewardId:string):Store{
 const reward=s.loyaltyRewards.find(r=>r.id===rewardId);
 check(reward&&reward.state==="por_entregar","O benefício não está pendente de entrega.");
 const time=new Date().toISOString();
 return {...s,loyaltyRewards:s.loyaltyRewards.map(r=>r.id===rewardId?{...r,state:"entregue" as const,deliveredAt:time}:r),
 audits:audit(s,"Benefício entregue (demonstração)",reward.id+" · "+reward.name,time)};
}
