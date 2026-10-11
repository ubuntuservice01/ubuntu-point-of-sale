import {
 keyId,roundMoney,type Product,type Store,type RecipeIngredient,type ProductionRecipe,
 type ProductionRun,type StockMovement,type WholesaleTier,type WholesaleOrder,
 type WholesaleOrderItem,type Payment,type Sale
} from "./domain";
import {reservedQty} from "./sectors";
import {activeCashSession,saleStockMovements} from "./commercial";
import {canGrantCredit} from "./credit";
import {awardLoyaltyForSale} from "./loyalty";

/** Contratos de demonstração local. Produção real requer transacções, RLS e registo de custos no servidor. */
function requireRule(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}
export const qty3=(amount:number)=>Math.round((amount+Number.EPSILON)*1000)/1000;
export const validQuantity=(qty:number,unit:string)=>Number.isFinite(qty)&&qty>0&&
 (unit.toLowerCase()==="kg"||unit.toLowerCase()==="l"?qty3(qty)===qty:Number.isSafeInteger(qty));
const moneyValue=(v:number)=>Number.isFinite(v)&&v>0&&roundMoney(v)===v;
const isoToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const audit=(s:Store,action:string,description:string,createdAt=new Date().toISOString())=>[
 {id:keyId(),createdAt,action,description},...s.audits
];
export function freeQuantity(s:Store,productId:string,excludingOrder?:string):number{
 const p=s.products.find(p=>p.id===productId);
 return p?qty3(Math.max(0,p.stock-reservedQty(s,productId,excludingOrder))):0;
}
export function lastPurchaseCost(s:Store,productId:string):number|undefined{
 for(const purchase of [...s.purchases].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){
  const line=purchase.items.find(i=>i.productId===productId);
  if(line&&moneyValue(line.unitCost))return line.unitCost;
 }
 return undefined;
}
export function recipeCostEstimate(s:Store,recipe:ProductionRecipe,multiplier=1){
 const estimated=recipe.ingredients.map(i=>{
  const unitCost=lastPurchaseCost(s,i.productId);
  return {productId:i.productId,required:qty3(i.qty*multiplier),unitCost,
    lineCost:unitCost===undefined?undefined:roundMoney(i.qty*multiplier*unitCost)};
 });
 return {lines:estimated,complete:estimated.every(l=>l.lineCost!==undefined),
  total:estimated.every(l=>l.lineCost!==undefined)?roundMoney(estimated.reduce((sum,l)=>sum+(l.lineCost??0),0)):undefined};
}
export type RecipeInput=Pick<ProductionRecipe,"name"|"productId"|"outputQty"|"ingredients"|"notes">;
export function saveRecipe(s:Store,input:RecipeInput,editingId?:string):Store{
 const name=input.name.trim();
 requireRule(name.length>=3,"Indique o nome da receita ou fórmula de produção.");
 const output=s.products.find(p=>p.id===input.productId&&p.active);
 requireRule(output,"Seleccione o produto final activo.");
 requireRule(validQuantity(input.outputQty,output.unit),"Indique o rendimento da receita numa quantidade válida.");
 requireRule(!s.pharmaLots.some(l=>l.productId===output.id),"A produção deste produto é controlada por lotes farmacêuticos.");
 requireRule(input.ingredients.length>0,"Acrescente pelo menos uma matéria-prima.");
 requireRule(new Set(input.ingredients.map(i=>i.productId)).size===input.ingredients.length,"Não repita matérias-primas.");
 requireRule(input.ingredients.every(i=>{
  const p=s.products.find(p=>p.id===i.productId&&p.active);
  return !!p&&p.id!==output.id&&validQuantity(i.qty,p.unit)&&!s.pharmaLots.some(l=>l.productId===p.id);
 }),"Verifique os produtos e quantidades dos ingredientes. Produto final e matérias-primas devem ser diferentes.");
 requireRule(!s.productionRecipes.some(r=>r.id!==editingId&&r.name.toLowerCase()===name.toLowerCase()),"Já existe uma receita com este nome.");
 const prior=s.productionRecipes.find(r=>r.id===editingId);
 requireRule(!editingId||!!prior,"A receita a editar não existe.");
 const entry:ProductionRecipe={id:prior?.id??keyId(),name,productId:output.id,outputQty:input.outputQty,
  ingredients:input.ingredients.map(i=>({...i})),notes:input.notes.trim(),active:prior?.active??true,createdAt:prior?.createdAt??new Date().toISOString()};
 return {...s,productionRecipes:prior?s.productionRecipes.map(r=>r.id===prior.id?entry:r):[entry,...s.productionRecipes],
  audits:audit(s,prior?"Receita actualizada":"Receita criada",entry.name+" · "+entry.outputQty+" "+output.unit)};
}
export function toggleRecipe(s:Store,id:string):Store{
 const target=s.productionRecipes.find(r=>r.id===id);
 requireRule(target,"Receita não encontrada.");
 return {...s,productionRecipes:s.productionRecipes.map(r=>r.id===id?{...r,active:!r.active}:r),
 audits:audit(s,target.active?"Receita desactivada":"Receita reactivada",target.name)};
}
export function produceBatch(s:Store,recipeId:string,multiplier:number,note:string):Store{
 const recipe=s.productionRecipes.find(r=>r.id===recipeId&&r.active);
 requireRule(recipe,"Seleccione uma receita activa.");
 requireRule(Number.isSafeInteger(multiplier)&&multiplier>=1&&multiplier<=10000,"Indique um número inteiro positivo de lotes de produção.");
 const output=s.products.find(p=>p.id===recipe.productId&&p.active);
 requireRule(output,"O produto final deixou de estar disponível.");
 requireRule(validQuantity(qty3(recipe.outputQty*multiplier),output.unit),"A quantidade produzida não é válida.");
 const ingredients=recipe.ingredients.map(i=>({...i,qty:qty3(i.qty*multiplier)}));
 for(const ingredient of ingredients){
  const p=s.products.find(p=>p.id===ingredient.productId&&p.active);
  requireRule(p&&validQuantity(ingredient.qty,p.unit),"Ingrediente indisponível ou quantidade inválida.");
  requireRule(!s.pharmaLots.some(l=>l.productId===p.id),"Ingredientes controlados por lotes farmacêuticos não podem ser consumidos por esta produção.");
  requireRule(freeQuantity(s,p.id)>=ingredient.qty,"Stock disponível insuficiente para produzir. Verifique "+p.name+" e as reservas de comandas/encomendas.");
 }
 const now=new Date().toISOString();
 const cost=recipeCostEstimate(s,recipe,multiplier);
 const entry:ProductionRun={id:"PROD-"+keyId().slice(0,8).toUpperCase(),recipeId:recipe.id,createdAt:now,
  lots:multiplier,outputProductId:output.id,outputQty:qty3(recipe.outputQty*multiplier),ingredients,
  note:note.trim(),...(cost.total!==undefined?{estimatedCost:cost.total}:{})};
 const movements:StockMovement[]=[
  ...ingredients.map(i=>({
   id:keyId(),productId:i.productId,kind:"consumo" as const,change:-i.qty,createdAt:now,
   reference:entry.id,note:"Consumo de ingredientes — "+recipe.name,
   balanceAfter:qty3(s.products.find(p=>p.id===i.productId)!.stock-i.qty)
  })),
  {id:keyId(),productId:output.id,kind:"producao",change:entry.outputQty,createdAt:now,
   reference:entry.id,note:"Produção — "+recipe.name,balanceAfter:qty3(output.stock+entry.outputQty)}
 ];
 return {...s,productionRuns:[entry,...s.productionRuns],
  products:s.products.map(p=>{
   const ingredient=ingredients.find(i=>i.productId===p.id);
   return p.id===output.id?{...p,stock:qty3(p.stock+entry.outputQty)}:
    ingredient?{...p,stock:qty3(p.stock-ingredient.qty)}:p;
  }),
  stockMovements:[...movements,...s.stockMovements],
  audits:audit(s,"Produção concluída (demonstração)",recipe.name+" · "+entry.outputQty+" "+output.unit,now)};
}
export type TierInput=Pick<WholesaleTier,"productId"|"minimumQty"|"unitPrice">;
export function saveWholesaleTier(s:Store,input:TierInput,editingId?:string):Store{
 const product=s.products.find(p=>p.id===input.productId&&p.active);
 requireRule(product,"Seleccione um produto activo.");
 requireRule(!s.pharmaLots.some(l=>l.productId===product.id),"Produtos com lotes farmacêuticos não podem usar este módulo de grossistas.");
 requireRule(validQuantity(input.minimumQty,product.unit),"Indique a quantidade mínima válida para o escalão.");
 requireRule(moneyValue(input.unitPrice),"Introduza um preço unitário válido, em MZN.");
 requireRule(!s.wholesaleTiers.some(t=>t.id!==editingId&&t.productId===input.productId&&t.minimumQty===input.minimumQty),"Já existe um escalão para esta quantidade.");
 const prior=s.wholesaleTiers.find(t=>t.id===editingId);
 requireRule(!editingId||!!prior,"O escalão a editar não existe.");
 const tier:WholesaleTier={...input,id:prior?.id??keyId(),active:prior?.active??true,createdAt:prior?.createdAt??new Date().toISOString()};
 return {...s,wholesaleTiers:prior?s.wholesaleTiers.map(t=>t.id===prior.id?tier:t):[tier,...s.wholesaleTiers],
  audits:audit(s,prior?"Escalão actualizado":"Escalão de preço criado",product.name+" · mínimo "+tier.minimumQty+" · "+tier.unitPrice+" MZN/un.")};
}
export function toggleWholesaleTier(s:Store,id:string):Store{
 const prior=s.wholesaleTiers.find(t=>t.id===id);
 requireRule(prior,"O escalão não existe.");
 return {...s,wholesaleTiers:s.wholesaleTiers.map(t=>t.id===id?{...t,active:!t.active}:t),
 audits:audit(s,prior.active?"Escalão desactivado":"Escalão reactivado",prior.productId+" · "+prior.minimumQty)};
}
export function wholesaleUnitPrice(s:Store,productId:string,qty:number){
 const p=s.products.find(p=>p.id===productId);
 requireRule(p&&p.active,"Seleccione um produto activo.");
 const tier=s.wholesaleTiers.filter(t=>t.active&&t.productId===productId&&t.minimumQty<=qty)
   .sort((a,b)=>b.minimumQty-a.minimumQty)[0];
 return {price:tier?.unitPrice??p.price,tier:tier??null};
}
export type WholesaleDraft={customerId:string;items:{productId:string;qty:number}[];
 paymentTerm:"imediato"|"fiado";method:Exclude<Payment,"fiado">;dueDate:string;note:string};
export function reserveWholesaleOrder(s:Store,input:WholesaleDraft,asOf=isoToday()):Store{
 const customer=s.customers.find(c=>c.id===input.customerId);
 requireRule(customer,"Registe e seleccione um cliente para esta encomenda.");
 requireRule(input.items.length>0,"Acrescente pelo menos um produto à encomenda.");
 requireRule(new Set(input.items.map(i=>i.productId)).size===input.items.length,"Não repita produtos na encomenda.");
 const items:WholesaleOrderItem[]=input.items.map(i=>{
  const product=s.products.find(p=>p.id===i.productId&&p.active);
  requireRule(product,"Seleccione um produto activo.");
  requireRule(!s.pharmaLots.some(l=>l.productId===product.id),"O fornecimento por lotes farmacêuticos requer um fluxo próprio.");
  requireRule(validQuantity(i.qty,product.unit),"Indique uma quantidade válida para "+product.name+".");
  requireRule(freeQuantity(s,i.productId)>=i.qty,"Stock livre insuficiente para "+product.name+". Considere reservas existentes.");
  return {productId:i.productId,qty:i.qty,unitPrice:wholesaleUnitPrice(s,i.productId,i.qty).price};
 });
 const total=roundMoney(items.reduce((sum,i)=>sum+i.qty*i.unitPrice,0));
 requireRule(total>0,"A encomenda precisa de um valor positivo.");
 if(input.paymentTerm==="fiado"){
  requireRule(!!input.dueDate&&input.dueDate>=asOf,"Indique um vencimento válido para a encomenda a fiado.");
  requireRule(canGrantCredit(customer,total),"A encomenda ultrapassa o limite de fiado deste cliente.");
 }
 const now=new Date().toISOString();
 const order:WholesaleOrder={id:"GRS-"+keyId().slice(0,8).toUpperCase(),customerId:customer.id,items,total,
  state:"reservada",paymentTerm:input.paymentTerm,...(input.paymentTerm==="imediato"?{method:input.method}:{}),
  ...(input.paymentTerm==="fiado"?{dueDate:input.dueDate}:{}),note:input.note.trim(),createdAt:now,updatedAt:now};
 return {...s,wholesaleOrders:[order,...s.wholesaleOrders],
  audits:audit(s,"Encomenda grossista reservada",order.id+" · "+customer.name+" · "+total+" MZN",now)};
}
export function cancelWholesaleOrder(s:Store,id:string):Store{
 const order=s.wholesaleOrders.find(o=>o.id===id);
 requireRule(order&&order.state==="reservada","Só é possível cancelar encomendas antes da expedição.");
 const now=new Date().toISOString();
 return {...s,wholesaleOrders:s.wholesaleOrders.map(o=>o.id===id?{...o,state:"cancelada" as const,updatedAt:now}:o),
 audits:audit(s,"Encomenda grossista cancelada",id,now)};
}
export function dispatchWholesaleOrder(s:Store,id:string,asOf=isoToday()):Store{
 const order=s.wholesaleOrders.find(o=>o.id===id);
 requireRule(order&&order.state==="reservada","Só é possível expedir uma encomenda reservada.");
 const customer=s.customers.find(c=>c.id===order.customerId);
 requireRule(customer,"Cliente indisponível.");
 if(order.paymentTerm==="fiado"){
  requireRule(canGrantCredit(customer,order.total),"O fiado excede o limite actual deste cliente.");
  requireRule(!!order.dueDate&&order.dueDate>=asOf,"O vencimento da encomenda precisa de ser actualizado antes da expedição.");
 }
 for(const i of order.items){
  const product=s.products.find(p=>p.id===i.productId&&p.active);
  requireRule(product&&validQuantity(i.qty,product.unit),"Produto ou quantidade inválida.");
  requireRule(!s.pharmaLots.some(l=>l.productId===product.id),"Produto sujeito a lote farmacêutico.");
  requireRule(freeQuantity(s,i.productId,order.id)>=i.qty,"Stock alterado ou reservado por outros pedidos. Reveja "+product.name+".");
 }
 const method:Payment=order.paymentTerm==="fiado"?"fiado":(order.method??"dinheiro");
 const session=method==="dinheiro"?activeCashSession(s):undefined;
 requireRule(method!=="dinheiro"||!!session,"Abra o caixa antes de receber dinheiro.");
 const now=new Date().toISOString();
 const sale:Sale={id:"VD-GRS-"+keyId().slice(0,8).toUpperCase(),createdAt:now,
  items:order.items.map(i=>({productId:i.productId,name:s.products.find(p=>p.id===i.productId)!.name,price:i.unitPrice,qty:i.qty})),
  total:order.total,method,source:"grossistas",sourceId:order.id,
  customerId:customer.id,...(order.dueDate&&method==="fiado"?{dueDate:order.dueDate}:{}),
  ...(session?{cashSessionId:session.id}:{})};
 const credits=method==="fiado"?[...s.credits,{id:keyId(),customerId:customer.id,kind:"fiado" as const,amount:order.total,createdAt:now,saleId:sale.id,...(order.dueDate?{dueDate:order.dueDate}:{})}]:s.credits;
 return awardLoyaltyForSale({...s,sales:[sale,...s.sales],credits,
  customers:s.customers.map(c=>c.id===customer.id&&method==="fiado"?{...c,debt:roundMoney(c.debt+order.total)}:c),
  products:s.products.map(p=>{
   const item=order.items.find(i=>i.productId===p.id);
   return item?{...p,stock:qty3(p.stock-item.qty)}:p;
  }),
  stockMovements:[...saleStockMovements(s,sale),...s.stockMovements],
  wholesaleOrders:s.wholesaleOrders.map(o=>o.id===id?{...o,state:"expedida" as const,updatedAt:now,saleId:sale.id}:o),
  audits:audit(s,"Encomenda expedida (demo)",order.id+" · venda "+sale.id,now)},sale);
}
export function deliverWholesaleOrder(s:Store,id:string):Store{
 const order=s.wholesaleOrders.find(o=>o.id===id);
 requireRule(order&&order.state==="expedida","Só é possível confirmar a entrega depois da expedição.");
 const now=new Date().toISOString();
 return {...s,wholesaleOrders:s.wholesaleOrders.map(o=>o.id===id?{...o,state:"entregue" as const,updatedAt:now}:o),
 audits:audit(s,"Encomenda entregue (demo)",id,now)};
}
