import {keyId,roundMoney,type Store,type PharmaLot,type PharmaDispense,type ServiceArea,type ServiceTable,type ServiceOrder,type ServiceOrderItem,type ButcherBatch,type Payment,type Sale,type StockMovement} from "./domain";
import {activeCashSession,saleStockMovements} from "./commercial";

/** Contratos funcionais exclusivamente para DEMONSTRAÇÃO LOCAL; sem controlo regulamentar, pagamentos ou permissões reais. */
function ensure(test:unknown,message:string):asserts test {if(!test)throw new Error(message)};
const timestamp=()=>new Date().toISOString();
export const three=(value:number)=>Math.round((value+Number.EPSILON)*1000)/1000;
const whole=(v:number)=>Number.isSafeInteger(v)&&v>0;
const weight=(v:number)=>Number.isFinite(v)&&v>0&&three(v)===v;
const validExpiry=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"))&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
const appendAudit=(s:Store,action:string,description:string,when=timestamp())=>[{id:keyId(),createdAt:when,action,description},...s.audits];
export function availablePharmaLots(s:Store,productId:string,today:string){
 return s.pharmaLots.filter(l=>l.productId===productId&&l.qty>0&&l.expiryDate>=today)
 .sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
}
export function nearExpiry(s:Store,today:string,days=30){
 const limit=new Date(today+"T12:00:00Z");limit.setUTCDate(limit.getUTCDate()+days);
 const end=limit.toISOString().slice(0,10);
 return s.pharmaLots.filter(l=>l.qty>0&&l.expiryDate>=today&&l.expiryDate<=end).sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate));
}
export function registerPharmaLot(s:Store,productId:string,lotNumber:string,expiryDate:string,qty:number,today:string,notes:string):Store{
 const p=s.products.find(x=>x.id===productId&&x.active);
 ensure(p,"Seleccione um produto activo.");
 ensure(whole(qty),"Introduza uma quantidade inteira positiva.");
 ensure(lotNumber.trim().length>=2,"Indique o número do lote.");
 ensure(validExpiry(expiryDate)&&expiryDate>=today,"Introduza uma data de validade igual ou posterior à data de hoje.");
 ensure(!s.pharmaLots.some(l=>l.productId===productId&&l.lotNumber.toLowerCase()===lotNumber.trim().toLowerCase()),"Este lote já existe para este produto.");
 const now=timestamp(),entry:PharmaLot={id:keyId(),productId,lotNumber:lotNumber.trim(),expiryDate,qty,createdAt:now};
 const movement:StockMovement={id:keyId(),productId,kind:"entrada",change:qty,createdAt:now,reference:"LOTE-"+entry.lotNumber,note:notes.trim()||"Entrada de lote da farmácia",balanceAfter:p.stock+qty};
 return {...s,pharmaLots:[entry,...s.pharmaLots],products:s.products.map(x=>x.id===p.id?{...x,stock:p.stock+qty}:x),stockMovements:[movement,...s.stockMovements],audits:appendAudit(s,"Lote de farmácia recebido",p.name+" · "+lotNumber.trim()+" · "+qty,now)};
}
export function registerPharmaDispense(s:Store,productId:string,qty:number,method:Exclude<Payment,"fiado">,today:string,note:string):Store{
 const p=s.products.find(x=>x.id===productId&&x.active);
 ensure(p,"Seleccione um produto activo.");
 ensure(whole(qty),"Introduza uma quantidade inteira positiva.");
 ensure(p.stock>=qty,"O stock total é insuficiente.");
 const lots=availablePharmaLots(s,productId,today);
 ensure(lots.reduce((sum,l)=>sum+l.qty,0)>=qty,"Não existem unidades suficientes em lotes válidos e não expirados.");
 const session=method==="dinheiro"?activeCashSession(s):undefined;
 ensure(method!=="dinheiro"||!!session,"Abra o caixa antes de receber dinheiro.");
 let needed=qty;
 const allocations:{lotId:string;qty:number}[]=[];
 for(const l of lots){if(needed===0)break;const take=Math.min(needed,l.qty);if(take){allocations.push({lotId:l.id,qty:take});needed-=take}}
 const now=timestamp(),total=roundMoney(qty*p.price);
 const sale:Sale={id:"VD-F-"+keyId().slice(0,8).toUpperCase(),createdAt:now,items:[{productId:p.id,name:p.name,price:p.price,qty}],total,method,source:"farmacia",...(session?{cashSessionId:session.id}:{})};
 const event:PharmaDispense={id:keyId(),createdAt:now,saleId:sale.id,productId:p.id,qty,allocations,note:note.trim()};
 return {...s,sales:[sale,...s.sales],pharmaDispenses:[event,...s.pharmaDispenses],
 pharmaLots:s.pharmaLots.map(l=>{const alloc=allocations.find(a=>a.lotId===l.id);return alloc?{...l,qty:l.qty-alloc.qty}:l}),
 products:s.products.map(x=>x.id===p.id?{...x,stock:p.stock-qty}:x),
 stockMovements:[...saleStockMovements(s,sale),...s.stockMovements],
 audits:appendAudit(s,"Dispensa simulada (FEFO)",p.name+" · "+qty+" un. · "+sale.id,now)};
}
export function reservedQty(s:Store,productId:string,excludingOrder?:string){
 return s.serviceOrders.filter(o=>o.state!=="fechada"&&o.state!=="anulada"&&o.id!==excludingOrder)
 .reduce((sum,o)=>sum+o.items.filter(i=>i.productId===productId).reduce((a,i)=>a+i.qty,0),0);
}
export function registerServiceTable(s:Store,area:ServiceArea,label:string):Store{
 const name=label.trim();
 ensure(name.length>=2,"Indique o nome ou número da mesa.");
 ensure(!s.serviceTables.some(t=>t.area===area&&t.label.toLowerCase()===name.toLowerCase()),"Esta mesa já está registada neste sector.");
 const table:ServiceTable={id:keyId(),area,label:name,active:true,createdAt:timestamp()};
 return {...s,serviceTables:[...s.serviceTables,table],audits:appendAudit(s,"Mesa criada",area+" · "+name)};
}
export function serviceActiveOrders(s:Store,area?:ServiceArea){return s.serviceOrders.filter(o=>o.state!=="fechada"&&o.state!=="anulada"&&(!area||o.area===area))}
export function startServiceOrder(s:Store,tableId:string,notes:string):Store{
 const table=s.serviceTables.find(t=>t.id===tableId&&t.active);
 ensure(table,"Seleccione uma mesa activa.");
 ensure(!serviceActiveOrders(s).some(o=>o.tableId===table.id),"Esta mesa já tem uma comanda aberta.");
 const now=timestamp(),order:ServiceOrder={id:"CMD-"+keyId().slice(0,8).toUpperCase(),area:table.area,tableId:table.id,items:[],state:"aberta",createdAt:now,updatedAt:now,note:notes.trim()};
 return {...s,serviceOrders:[order,...s.serviceOrders],audits:appendAudit(s,"Comanda aberta",table.area+" · "+table.label,now)};
}
export function addServiceOrderItem(s:Store,orderId:string,productId:string,qty:number):Store{
 const order=s.serviceOrders.find(o=>o.id===orderId);
 ensure(order&&order.state==="aberta","Só é possível editar comandas abertas.");
 const p=s.products.find(p=>p.id===productId&&p.active);
 ensure(p,"Seleccione um produto activo.");
 ensure(!s.pharmaLots.some(l=>l.productId===productId),"Produtos controlados por lotes não podem ser adicionados às comandas.");
 ensure(whole(qty),"Indique uma quantidade inteira positiva.");
 const inOrder=order.items.find(i=>i.productId===productId)?.qty??0;
 ensure(p.stock-reservedQty(s,productId,orderId)>=inOrder+qty,"Stock insuficiente após reservar as outras comandas.");
 const now=timestamp(),item:ServiceOrderItem={productId,qty,unitPrice:p.price};
 const items=order.items.some(i=>i.productId===productId)?order.items.map(i=>i.productId===productId?{...i,qty:i.qty+qty}:i):[...order.items,item];
 return {...s,serviceOrders:s.serviceOrders.map(o=>o.id===orderId?{...o,items,updatedAt:now}:o)};
}
export function removeServiceOrderItem(s:Store,orderId:string,productId:string):Store{
 const o=s.serviceOrders.find(o=>o.id===orderId);
 ensure(o&&o.state==="aberta","Só pode retirar artigos de comandas abertas.");
 ensure(o.items.some(i=>i.productId===productId),"Artigo não encontrado.");
 return {...s,serviceOrders:s.serviceOrders.map(x=>x.id===o.id?{...x,items:x.items.filter(i=>i.productId!==productId),updatedAt:timestamp()}:x)};
}
export function serviceOrderTotal(o:ServiceOrder){return roundMoney(o.items.reduce((sum,i)=>sum+i.qty*i.unitPrice,0))}
export function advanceServiceOrder(s:Store,orderId:string):Store{
 const o=s.serviceOrders.find(x=>x.id===orderId);
 ensure(o&&o.items.length>0,"Adicione artigos a uma comanda aberta.");
 const next:Partial<Record<ServiceOrder["state"],ServiceOrder["state"]>>={aberta:"preparacao",preparacao:"pronta",pronta:"servida"};
 const state=next[o.state];ensure(state,"Esta comanda não pode avançar.");
 const now=timestamp();
 return {...s,serviceOrders:s.serviceOrders.map(x=>x.id===orderId?{...x,state,updatedAt:now}:x),audits:appendAudit(s,"Comanda actualizada",o.id+" · "+state,now)};
}
export function cancelServiceOrder(s:Store,orderId:string):Store{
 const o=s.serviceOrders.find(x=>x.id===orderId);
 ensure(o&&o.state==="aberta","Só é possível anular uma comanda antes da preparação.");
 const now=timestamp();
 return {...s,serviceOrders:s.serviceOrders.map(x=>x.id===orderId?{...x,state:"anulada" as const,updatedAt:now}:x),audits:appendAudit(s,"Comanda anulada",o.id,now)};
}
export function finishServiceOrder(s:Store,orderId:string,method:Exclude<Payment,"fiado">):Store{
 const o=s.serviceOrders.find(x=>x.id===orderId);
 ensure(o&&o.state==="servida"&&o.items.length>0,"A comanda deve estar servida antes do pagamento.");
 const session=method==="dinheiro"?activeCashSession(s):undefined;
 ensure(method!=="dinheiro"||!!session,"Abra o caixa antes de receber dinheiro.");
 for(const item of o.items){
  const p=s.products.find(p=>p.id===item.productId&&p.active);
  ensure(p&&p.stock>=item.qty,"Stock alterado; reveja a comanda antes de fechar.");
 }
 const now=timestamp();
 const sale:Sale={id:"VD-"+o.area.slice(0,3).toUpperCase()+"-"+keyId().slice(0,8).toUpperCase(),
  createdAt:now,items:o.items.map(i=>({productId:i.productId,name:s.products.find(p=>p.id===i.productId)!.name,price:i.unitPrice,qty:i.qty})),
  total:serviceOrderTotal(o),method,source:o.area,sourceId:o.id,...(session?{cashSessionId:session.id}:{})};
 return {...s,sales:[sale,...s.sales],products:s.products.map(p=>{const item=o.items.find(i=>i.productId===p.id);return item?{...p,stock:p.stock-item.qty}:p}),
 serviceOrders:s.serviceOrders.map(x=>x.id===o.id?{...x,state:"fechada" as const,saleId:sale.id,updatedAt:now}:x),
 stockMovements:[...saleStockMovements(s,sale),...s.stockMovements],
 audits:appendAudit(s,"Comanda recebida (demo)",o.id+" · "+sale.total+" MZN · "+method,now)};
}
export function registerButcherBatch(s:Store,sourceId:string,sourceQty:number,outputs:{productId:string;qty:number}[],note:string):Store{
 const source=s.products.find(p=>p.id===sourceId&&p.active&&p.unit.toLowerCase()==="kg");
 ensure(source,"Seleccione uma matéria-prima activa com unidade kg.");
 ensure(weight(sourceQty)&&sourceQty<=source.stock,"Introduza um peso válido até ao stock disponível.");
 ensure(outputs.length>0,"Adicione pelo menos um corte produzido.");
 ensure(new Set(outputs.map(o=>o.productId)).size===outputs.length,"Não repita o mesmo corte.");
 ensure(outputs.every(o=>o.productId!==sourceId&&weight(o.qty)&&s.products.some(p=>p.id===o.productId&&p.active&&p.unit.toLowerCase()==="kg")),"Seleccione cortes em kg e pesos positivos.");
 const total=three(outputs.reduce((sum,o)=>sum+o.qty,0));
 ensure(total<=sourceQty,"Os cortes produzidos não podem pesar mais que a matéria-prima.");
 ensure(note.trim().length>=3,"Indique o motivo ou referência da transformação.");
 const now=timestamp(),wasteQty=three(sourceQty-total);
 const batch:ButcherBatch={id:"CORTE-"+keyId().slice(0,8).toUpperCase(),createdAt:now,sourceProductId:sourceId,sourceQty,outputs:outputs.map(x=>({...x})),wasteQty,note:note.trim()};
 const entries:StockMovement[]=[
  {id:keyId(),productId:sourceId,kind:"saida",change:-sourceQty,createdAt:now,reference:batch.id,note:batch.note,balanceAfter:three(source.stock-sourceQty)},
  ...outputs.map(o=>({id:keyId(),productId:o.productId,kind:"entrada" as const,change:o.qty,createdAt:now,reference:batch.id,note:"Corte produzido",balanceAfter:three((s.products.find(p=>p.id===o.productId)?.stock??0)+o.qty)}))
 ];
 return {...s,butcherBatches:[batch,...s.butcherBatches],
 products:s.products.map(p=>p.id===sourceId?{...p,stock:three(p.stock-sourceQty)}:outputs.some(o=>o.productId===p.id)?{...p,stock:three(p.stock+outputs.find(o=>o.productId===p.id)!.qty)}:p),
 stockMovements:[...entries,...s.stockMovements],audits:appendAudit(s,"Transformação no talho",batch.id+" · quebra "+wasteQty+" kg",now)};
}
export function registerWeightedSale(s:Store,productId:string,qtyKg:number,method:Exclude<Payment,"fiado">):Store{
 const p=s.products.find(x=>x.id===productId&&x.active&&x.unit.toLowerCase()==="kg");
 ensure(p,"Seleccione um produto vendido em kg.");
 ensure(!s.pharmaLots.some(l=>l.productId===productId),"Produtos controlados por lotes devem ser dispensados na farmácia.");
 ensure(weight(qtyKg)&&p.stock>=qtyKg,"Indique um peso válido até ao stock disponível.");
 const session=method==="dinheiro"?activeCashSession(s):undefined;
 ensure(method!=="dinheiro"||!!session,"Abra o caixa antes de receber dinheiro.");
 const now=timestamp(),sale:Sale={id:"VD-TAL-"+keyId().slice(0,8).toUpperCase(),createdAt:now,
 items:[{productId:p.id,name:p.name,price:p.price,qty:qtyKg}],total:roundMoney(p.price*qtyKg),method,source:"talho",...(session?{cashSessionId:session.id}:{})};
 return {...s,sales:[sale,...s.sales],products:s.products.map(x=>x.id===p.id?{...x,stock:three(p.stock-qtyKg)}:x),
 stockMovements:[...saleStockMovements(s,sale).map(m=>({...m,balanceAfter:three(p.stock-qtyKg)})),...s.stockMovements],
 audits:appendAudit(s,"Venda por peso (demo)",p.name+" · "+qtyKg+" kg · "+sale.total+" MZN",now)};
}
