import {
 keyId,roundMoney,quantityReserved,validStockQuantity,type Store,type Supplier,type Purchase,type PurchaseItem,
 type StockMovement,type Expense,type CashSession,type CashMovement,type Sale,
 type ReturnItem,type ReturnRecord,type Payment,type SupplierPayment
} from "./domain";
import {reverseLoyaltyForReturn} from "./loyalty";

/** Operações de DEMONSTRAÇÃO. Na produção, todas exigem transacções no servidor, RLS e idempotência. */
type CashMethod=Exclude<Payment,"fiado">;
function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
export function isMoney(value:number){return Number.isFinite(value)&&value>=0&&roundMoney(value)===value;}
export function isPositiveMoney(value:number){return isMoney(value)&&value>0;}
export function isPositiveQuantity(value:number){return Number.isInteger(value)&&value>0;}
export function activeCashSession(s:Store){return s.cashSessions.find(c=>c.status==="aberta");}
export function cashSessionBalance(s:Store,c:CashSession){
 const sales=roundMoney(s.sales.filter(x=>x.method==="dinheiro"&&x.cashSessionId===c.id).reduce((n,x)=>n+x.total,0));
 const credits=roundMoney(s.credits.filter(x=>x.kind==="pagamento"&&x.method==="dinheiro"&&x.cashSessionId===c.id).reduce((n,x)=>n+x.amount,0));
 const purchasePayments=roundMoney(s.purchases.filter(x=>x.paymentStatus==="paga"&&x.paymentMethod==="dinheiro"&&x.cashSessionId===c.id).reduce((n,x)=>n+x.total,0));
 const supplierPayments=roundMoney(s.supplierPayments.filter(x=>x.method==="dinheiro"&&x.cashSessionId===c.id).reduce((n,x)=>n+x.amount,0));
 const expenses=roundMoney(s.expenses.filter(x=>x.method==="dinheiro"&&x.cashSessionId===c.id).reduce((n,x)=>n+x.amount,0));
 const refunds=roundMoney(s.returns.filter(x=>x.method==="dinheiro"&&x.cashSessionId===c.id).reduce((n,x)=>n+x.total,0));
 const added=roundMoney(s.cashMovements.filter(x=>x.sessionId===c.id&&x.kind==="reforco").reduce((n,x)=>n+x.amount,0));
 const withdrawn=roundMoney(s.cashMovements.filter(x=>x.sessionId===c.id&&x.kind==="retirada").reduce((n,x)=>n+x.amount,0));
 const expected=roundMoney(c.openingFloat+sales+credits+added-purchasePayments-supplierPayments-expenses-refunds-withdrawn);
 return {expected,sales,credits,purchasePayments,supplierPayments,expenses,refunds,added,withdrawn};
}
export function checkCashAvailable(s:Store,amount:number){
 const session=activeCashSession(s);
 assert(!!session,"Abra o caixa antes de efectuar um movimento em dinheiro.");
 assert(cashSessionBalance(s,session).expected>=amount,"O caixa não tem saldo suficiente para esta saída em dinheiro.");
 return session;
}
export function startCashSession(s:Store,openingFloat:number,note:string):Store{
 assert(!activeCashSession(s),"Já existe um caixa aberto. Faça o fecho antes de abrir outro.");
 assert(isMoney(openingFloat),"Introduza um fundo de caixa válido, em MZN.");
 const entry:CashSession={id:keyId(),openedAt:new Date().toISOString(),openingFloat,status:"aberta",note:note.trim()};
 return {...s,cashSessions:[entry,...s.cashSessions],audits:[{id:keyId(),createdAt:entry.openedAt,action:"Abertura de caixa",description:"Fundo inicial "+openingFloat+" MZN (simulação)"},...s.audits]};
}
export function finishCashSession(s:Store,counted:number,note:string):Store{
 const session=activeCashSession(s);
 assert(!!session,"Não existe um caixa aberto.");
 assert(isMoney(counted),"Introduza o valor contado do caixa, em MZN.");
 const expected=cashSessionBalance(s,session).expected;
 const closedAt=new Date().toISOString(),difference=roundMoney(counted-expected);
 return {...s,cashSessions:s.cashSessions.map(c=>c.id===session.id?{...c,status:"fechada" as const,closedAt,expectedClose:expected,countedClose:counted,difference,note:note.trim()}:c),
 audits:[{id:keyId(),createdAt:closedAt,action:"Fecho de caixa",description:"Esperado "+expected+" MZN; contado "+counted+" MZN; diferença "+difference+" MZN"},...s.audits]};
}
export function registerCashMovement(s:Store,kind:CashMovement["kind"],amount:number,note:string):Store{
 assert(isPositiveMoney(amount),"Introduza um valor positivo para o movimento.");
 assert(note.trim().length>=3,"Descreva o motivo deste movimento.");
 const session=activeCashSession(s);
 assert(!!session,"Abra o caixa antes de registar um movimento.");
 if(kind==="retirada")checkCashAvailable(s,amount);
 const entry:CashMovement={id:keyId(),sessionId:session.id,kind,amount,createdAt:new Date().toISOString(),note:note.trim()};
 return {...s,cashMovements:[entry,...s.cashMovements],audits:[{id:keyId(),createdAt:entry.createdAt,action:kind==="reforco"?"Reforço do caixa":"Retirada do caixa",description:note.trim()},...s.audits]};
}
export function registerSupplier(s:Store,input:Pick<Supplier,"name"|"phone"|"email"|"city">,editingId?:string):Store{
 const name=input.name.trim(),email=input.email.trim();
 assert(name.length>=2,"Indique o nome do fornecedor.");
 assert(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),"Introduza um e-mail válido.");
 const supplier=s.suppliers.find(x=>x.id===editingId);
 assert(!s.suppliers.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==editingId),"Já existe um fornecedor com esse nome.");
 const entry:Supplier={...input,name,email,phone:input.phone.trim(),city:input.city.trim(),id:supplier?.id??keyId(),active:supplier?.active??true,createdAt:supplier?.createdAt??new Date().toISOString()};
 return {...s,suppliers:supplier?s.suppliers.map(x=>x.id===supplier.id?entry:x):[entry,...s.suppliers],audits:[{id:keyId(),createdAt:new Date().toISOString(),action:supplier?"Fornecedor actualizado":"Fornecedor criado",description:name},...s.audits]};
}
export function supplierOutstanding(s:Store,supplierId:string){
 const owed=s.purchases.filter(p=>p.supplierId===supplierId&&p.paymentStatus==="por_pagar").reduce((sum,p)=>sum+p.total,0);
 const paid=s.supplierPayments.filter(x=>x.supplierId===supplierId).reduce((sum,x)=>sum+x.amount,0);
 return roundMoney(Math.max(0,owed-paid));
}
export function registerPurchase(s:Store,supplierId:string,items:PurchaseItem[],reference:string,paid:boolean,method:CashMethod):Store{
 const supplier=s.suppliers.find(x=>x.id===supplierId&&x.active);
 assert(supplier,"Seleccione um fornecedor activo.");
 assert(items.length>0,"Adicione pelo menos um produto à compra.");
 assert(items.every(i=>!s.pharmaLots.some(l=>l.productId===i.productId)),"Produtos controlados por lotes devem ser recebidos no módulo Farmácias.");
 assert(items.every(i=>{const p=s.products.find(p=>p.id===i.productId&&p.active);return !!p&&validStockQuantity(i.qty,p.unit)&&isPositiveMoney(i.unitCost)}),"Verifique produtos, quantidades e custos.");
 assert(new Set(items.map(i=>i.productId)).size===items.length,"Cada produto deve aparecer apenas uma vez na compra.");
 const total=roundMoney(items.reduce((sum,i)=>sum+i.qty*i.unitCost,0));
 assert(total>0,"A compra deve ter um valor positivo.");
 const session=paid&&method==="dinheiro"?checkCashAvailable(s,total):undefined;
 const now=new Date().toISOString();
 const entry:Purchase={id:"CMP-"+Date.now().toString(36).toUpperCase()+"-"+keyId().slice(0,4),supplierId,items:items.map(i=>({...i})),total,reference:reference.trim(),createdAt:now,paymentStatus:paid?"paga":"por_pagar",...(paid?{paymentMethod:method}:{}),...(session?{cashSessionId:session.id}:{})};
 const changes:StockMovement[]=items.map(i=>({id:keyId(),productId:i.productId,kind:"compra",change:i.qty,createdAt:now,reference:entry.id,note:"Recepção da compra "+entry.id,balanceAfter:(s.products.find(p=>p.id===i.productId)?.stock??0)+i.qty}));
 return {...s,purchases:[entry,...s.purchases],products:s.products.map(p=>{const i=items.find(x=>x.productId===p.id);return i?{...p,stock:p.stock+i.qty}:p}),stockMovements:[...changes,...s.stockMovements],audits:[{id:keyId(),createdAt:now,action:"Compra recebida",description:entry.id+" · "+supplier.name+" · "+total+" MZN"},...s.audits]};
}
export function registerSupplierPayment(s:Store,supplierId:string,amount:number,method:CashMethod,note:string):Store{
 assert(s.suppliers.some(x=>x.id===supplierId),"Seleccione um fornecedor válido.");
 assert(isPositiveMoney(amount)&&amount<=supplierOutstanding(s,supplierId),"Introduza um valor até à dívida existente.");
 const session=method==="dinheiro"?checkCashAvailable(s,amount):undefined;
 const entry:SupplierPayment={id:keyId(),supplierId,amount,method,note:note.trim(),createdAt:new Date().toISOString(),...(session?{cashSessionId:session.id}:{})};
 return {...s,supplierPayments:[entry,...s.supplierPayments],audits:[{id:keyId(),createdAt:entry.createdAt,action:"Pagamento ao fornecedor (demo)",description:amount+" MZN · "+method},...s.audits]};
}
export function registerStockAdjustment(s:Store,productId:string,kind:"entrada"|"saida"|"ajuste",quantity:number,note:string):Store{
 const p=s.products.find(x=>x.id===productId&&x.active);
 assert(p,"Seleccione um produto activo.");
 assert(!s.pharmaLots.some(l=>l.productId===productId),"O stock por lote deve ser corrigido no módulo Farmácias.");
 assert(validStockQuantity(quantity,p.unit,kind==="ajuste"),"Introduza uma quantidade válida.");
 assert(note.trim().length>=3,"Indique o motivo do movimento.");
 const change=Math.round(((kind==="entrada"?quantity:kind==="saida"?-quantity:quantity-p.stock)+Number.EPSILON)*1000)/1000;
 assert(p.stock+change>=0,"O movimento ultrapassa o stock disponível.");
 assert(p.stock+change>=quantityReserved(s,productId),"O movimento afectaria stock reservado para comandas ou encomendas.");
 assert(change!==0,"A nova quantidade é igual ao stock actual.");
 const now=new Date().toISOString(),entry:StockMovement={id:keyId(),productId,kind,change,createdAt:now,reference:"MOV-"+Date.now().toString(36).toUpperCase(),note:note.trim(),balanceAfter:Math.round((p.stock+change+Number.EPSILON)*1000)/1000};
 return {...s,products:s.products.map(x=>x.id===productId?{...x,stock:entry.balanceAfter}:x),stockMovements:[entry,...s.stockMovements],audits:[{id:keyId(),createdAt:now,action:"Movimento de stock",description:p.name+" · "+(change>0?"+":"")+change+" "+p.unit},...s.audits]};
}
export function saleStockMovements(s:Store,sale:Sale):StockMovement[]{
 return sale.items.map(item=>{
  const p=s.products.find(x=>x.id===item.productId);
  return {id:keyId(),productId:item.productId,kind:"venda",change:-item.qty,createdAt:sale.createdAt,reference:sale.id,note:"Saída por venda",balanceAfter:Math.round(((p?.stock??0)-item.qty+Number.EPSILON)*1000)/1000};
 });
}
export function returnableQuantity(s:Store,saleId:string,productId:string){
 const sale=s.sales.find(x=>x.id===saleId);
 if(sale?.source==="farmacia"||sale?.source==="restaurante"||sale?.source==="bar"||sale?.source==="talho")return 0;
 const original=s.sales.find(x=>x.id===saleId)?.items.find(i=>i.productId===productId)?.qty??0;
 const prior=s.returns.filter(x=>x.saleId===saleId).flatMap(x=>x.items).filter(i=>i.productId===productId).reduce((sum,i)=>sum+i.qty,0);
 return Math.max(0,original-prior);
}
export function registerReturn(s:Store,saleId:string,items:{productId:string;qty:number}[],note:string):Store{
 const sale=s.sales.find(x=>x.id===saleId);
 assert(sale,"Seleccione uma venda válida.");
 assert(items.length>0&&items.every(i=>isPositiveQuantity(i.qty)&&returnableQuantity(s,saleId,i.productId)>=i.qty),"Escolha quantidades disponíveis para devolução.");
 assert(new Set(items.map(x=>x.productId)).size===items.length,"Não repita produtos na mesma devolução.");
 assert(note.trim().length>=3,"Indique o motivo da devolução.");
 const itemsWithPrice:ReturnItem[]=items.map(i=>({...i,unitPrice:sale.items.find(x=>x.productId===i.productId)!.price}));
 const total=roundMoney(itemsWithPrice.reduce((sum,i)=>sum+i.qty*i.unitPrice,0));
 assert(total>0,"A devolução deve ter valor positivo.");
 if(sale.method==="fiado"){
  const customer=s.customers.find(x=>x.id===sale.customerId);
  assert(customer&&customer.debt>=total,"Não é possível abater mais do que o saldo em dívida. A devolução após pagamento exige outro fluxo.");
 }
 const session=sale.method==="dinheiro"?checkCashAvailable(s,total):undefined;
 const now=new Date().toISOString(),entry:ReturnRecord={
  id:"DEV-"+Date.now().toString(36).toUpperCase()+"-"+keyId().slice(0,4),
  saleId,items:itemsWithPrice,total,createdAt:now,method:sale.method==="fiado"?"abater_fiado":sale.method,note:note.trim(),
  ...(session?{cashSessionId:session.id}:{})
 };
 const stock:StockMovement[]=items.map(i=>({
  id:keyId(),productId:i.productId,kind:"devolucao",change:i.qty,createdAt:now,reference:entry.id,note:note.trim(),
  balanceAfter:(s.products.find(p=>p.id===i.productId)?.stock??0)+i.qty
 }));
 return reverseLoyaltyForReturn({...s,returns:[entry,...s.returns],products:s.products.map(p=>{const i=items.find(x=>x.productId===p.id);return i?{...p,stock:p.stock+i.qty}:p}),
  stockMovements:[...stock,...s.stockMovements],
  customers:s.customers.map(c=>sale.method==="fiado"&&c.id===sale.customerId?{...c,debt:roundMoney(c.debt-total)}:c),
  credits:sale.method==="fiado"&&sale.customerId?[...s.credits,{id:keyId(),customerId:sale.customerId,kind:"devolucao" as const,amount:total,createdAt:now,saleId:sale.id,note:note.trim()}]:s.credits,
  audits:[{id:keyId(),createdAt:now,action:"Devolução simulada",description:entry.id+" · "+total+" MZN"},...s.audits]},saleId,total);
}
export function registerExpense(s:Store,description:string,category:string,amount:number,method:CashMethod,note:string):Store{
 assert(description.trim().length>=3,"Indique a descrição da despesa.");
 assert(category.trim().length>=2,"Escolha uma categoria válida.");
 assert(isPositiveMoney(amount),"Introduza um valor válido para a despesa.");
 const session=method==="dinheiro"?checkCashAvailable(s,amount):undefined;
 const entry:Expense={id:"DSP-"+Date.now().toString(36).toUpperCase()+"-"+keyId().slice(0,4),description:description.trim(),category:category.trim(),amount,method,note:note.trim(),createdAt:new Date().toISOString(),...(session?{cashSessionId:session.id}:{})};
 return {...s,expenses:[entry,...s.expenses],audits:[{id:keyId(),createdAt:entry.createdAt,action:"Despesa registada",description:entry.description+" · "+amount+" MZN (simulação)"},...s.audits]};
}
export function financialSummary(s:Store){
 const sales=roundMoney(s.sales.reduce((n,x)=>n+x.total,0));
 const returns=roundMoney(s.returns.reduce((n,x)=>n+x.total,0));
 const expenses=roundMoney(s.expenses.reduce((n,x)=>n+x.amount,0));
 const purchases=roundMoney(s.purchases.reduce((n,x)=>n+x.total,0));
 const receivedSales=roundMoney(s.sales.filter(x=>x.method!=="fiado").reduce((n,x)=>n+x.total,0));
 const paidRefunds=roundMoney(s.returns.filter(x=>x.method!=="abater_fiado").reduce((n,x)=>n+x.total,0));
 const creditReceipts=roundMoney(s.credits.filter(x=>x.kind==="pagamento").reduce((n,x)=>n+x.amount,0));
 const supplierDebts=roundMoney(s.suppliers.reduce((n,x)=>n+supplierOutstanding(s,x.id),0));
 const accountsReceivable=roundMoney(s.customers.reduce((n,x)=>n+x.debt,0));
 return {sales,returns,netSales:roundMoney(sales-returns),receivedSales,paidRefunds,creditReceipts,expenses,purchases,supplierDebts,accountsReceivable,
  netRecordedReceipts:roundMoney(receivedSales-paidRefunds+creditReceipts),
  // Sem custo de mercadoria vendida e impostos não se deve chamar lucro.
 };
}
