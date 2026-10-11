import {
 keyId,roundMoney,quantityReserved,type Store,type Product,type CatalogSettings,type OnlineOrder,
 type OnlineOrderItem,type OnlineOrderStatus,type Courier,type Payment,type Sale,type CatalogListing
} from "./domain";
import {activeCashSession,saleStockMovements} from "./commercial";
import {awardLoyaltyForSale} from "./loyalty";
import {snapshotSaleItems} from "./profitability";

function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message)}
const audit=(s:Store,action:string,description:string,time:string)=>[{id:keyId(),action,description,createdAt:time},...s.audits];
const eligible=(s:Store,p:Product)=>p.active&&!s.pharmaLots.some(l=>l.productId===p.id);
export const storeKey="ubuntu-pos360-demo-v1";
export function getCatalogListing(s:Store,productId:string){
 return s.catalogListings.find(x=>x.productId===productId)??{productId,visible:true,featured:false};
}
export function listedProducts(s:Store):Product[]{
 if(!s.catalogSettings.enabled)return [];
 return s.products.filter(p=>eligible(s,p)&&getCatalogListing(s,p.id).visible);
}
export function catalogStockFree(s:Store,productId:string){
 const product=s.products.find(p=>p.id===productId);
 return product?Math.round((Math.max(0,product.stock-quantityReserved(s,productId))+Number.EPSILON)*1000)/1000:0;
}
export function updateCatalogSettings(s:Store,input:CatalogSettings):Store{
 check(input.name.trim().length>=3&&input.name.trim().length<=100,"Introduza o nome da loja.");
 check(input.description.trim().length<=300,"A descrição pode ter até 300 caracteres.");
 check(input.pickupEnabled||input.deliveryEnabled,"Active pelo menos um método de recepção.");
 check(Number.isFinite(input.deliveryFee)&&input.deliveryFee>=0&&roundMoney(input.deliveryFee)===input.deliveryFee,"Indique uma taxa de entrega válida em MZN.");
 check(Number.isFinite(input.minimumOrder)&&input.minimumOrder>=0&&roundMoney(input.minimumOrder)===input.minimumOrder,"Introduza um valor mínimo válido em MZN.");
 const time=new Date().toISOString();
 return {...s,catalogSettings:{...input,name:input.name.trim(),description:input.description.trim(),phone:input.phone.trim()},
 audits:audit(s,"Configuração de catálogo actualizada",input.name.trim(),time)};
}
export function setCatalogListing(s:Store,productId:string,changes:Partial<Pick<CatalogListing,"visible"|"featured">>):Store{
 const product=s.products.find(p=>p.id===productId);
 check(product&&eligible(s,product),"Este produto não pode ser publicado no catálogo.");
 const original=getCatalogListing(s,productId);
 const next={...original,...changes};
 const time=new Date().toISOString();
 return {...s,catalogListings:[...s.catalogListings.filter(x=>x.productId!==productId),next],
 audits:audit(s,"Visibilidade do catálogo",product.name+" · "+(next.visible?"visível":"oculto"),time)};
}
export type OnlineCheckout={name:string;phone:string;items:{productId:string;qty:number}[];fulfilment:"entrega"|"levantamento";
 address:string;method:Exclude<Payment,"fiado">;note:string};
export function normalizePhone(phone:string):string{
 const digits=phone.replace(/[^\d]/g,"");
 return digits.startsWith("258")&&digits.length===12?digits.slice(3):digits;
}
export function submitOnlineOrder(s:Store,input:OnlineCheckout):Store{
 check(s.catalogSettings.enabled,"O catálogo encontra-se indisponível.");
 const name=input.name.trim(),phone=normalizePhone(input.phone);
 check(name.length>=3&&name.length<=100,"Indique o nome do cliente (3 a 100 caracteres).");
 check(/^8\d{8}$/.test(phone),"Introduza um número de telemóvel moçambicano com 9 algarismos.");
 check(input.items.length>0,"Adicione produtos ao carrinho.");
 check(new Set(input.items.map(x=>x.productId)).size===input.items.length,"Existem produtos repetidos no carrinho.");
 check(input.fulfilment==="entrega"?s.catalogSettings.deliveryEnabled:s.catalogSettings.pickupEnabled,"Esta modalidade de recepção está indisponível.");
 const address=input.address.trim();
 check(input.fulfilment!=="entrega"||(address.length>=8&&address.length<=220),"Introduza a morada para entrega (mínimo 8 caracteres).");
 const items:OnlineOrderItem[]=input.items.map(line=>{
  const product=s.products.find(p=>p.id===line.productId);
  check(product&&eligible(s,product)&&getCatalogListing(s,product.id).visible,"Um dos produtos não se encontra disponível no catálogo.");
  check(Number.isSafeInteger(line.qty)&&line.qty>0,"Introduza quantidades inteiras positivas.");
  check(catalogStockFree(s,line.productId)>=line.qty,"Stock livre insuficiente para "+product.name+".");
  return {productId:product.id,name:product.name,qty:line.qty,unitPrice:product.price};
 });
 const subtotal=roundMoney(items.reduce((n,i)=>n+i.qty*i.unitPrice,0));
 check(subtotal>=s.catalogSettings.minimumOrder,"O carrinho está abaixo do valor mínimo para encomenda.");
 const deliveryFee=input.fulfilment==="entrega"?s.catalogSettings.deliveryFee:0;
 const total=roundMoney(subtotal+deliveryFee);
 check(total>0,"A encomenda precisa de valor positivo.");
 const existing=s.customers.find(c=>normalizePhone(c.phone)===phone);
 const customerId=existing?.id??keyId();
 const now=new Date().toISOString();
 const order:OnlineOrder={id:"ONL-"+keyId().slice(0,8).toUpperCase(),customerId,customerName:name,customerPhone:phone,
  items,subtotal,deliveryFee,total,fulfilment:input.fulfilment,address:input.fulfilment==="entrega"?address:"",
  method:input.method,state:"recebida",note:input.note.trim().slice(0,250),createdAt:now,updatedAt:now};
 return {...s,customers:existing?s.customers:[...s.customers,{id:customerId,name,phone,debt:0}],
 onlineOrders:[order,...s.onlineOrders],
 audits:audit(s,"Encomenda online recebida (demonstração)",order.id+" · "+total+" MZN",now)};
}
const nextStatus:Partial<Record<OnlineOrderStatus,OnlineOrderStatus>>={
 recebida:"confirmada",confirmada:"preparacao",preparacao:"pronta"
};
export function advanceOnlineOrder(s:Store,id:string):Store{
 const order=s.onlineOrders.find(x=>x.id===id);
 check(order,"Encomenda não encontrada.");
 const next=nextStatus[order.state];
 check(next,"Esta encomenda não pode avançar.");
 const now=new Date().toISOString();
 return {...s,onlineOrders:s.onlineOrders.map(x=>x.id===id?{...x,state:next,updatedAt:now}:x),
 audits:audit(s,"Encomenda online actualizada",id+" · "+next,now)};
}
export function cancelOnlineOrder(s:Store,id:string):Store{
 const order=s.onlineOrders.find(x=>x.id===id);
 check(order&&!["cancelada","em_entrega","entregue","levantada"].includes(order.state),"Não é possível cancelar esta encomenda nesta fase.");
 const now=new Date().toISOString();
 return {...s,onlineOrders:s.onlineOrders.map(x=>x.id===id?{...x,state:"cancelada" as const,updatedAt:now}:x),
 audits:audit(s,"Encomenda online cancelada",id,now)};
}
export function registerCourier(s:Store,name:string,phone:string,editingId?:string):Store{
 const clean=name.trim(),number=normalizePhone(phone);
 check(clean.length>=3,"Indique o nome do entregador.");
 check(/^8\d{8}$/.test(number),"Introduza um contacto moçambicano de 9 algarismos.");
 const previous=s.couriers.find(x=>x.id===editingId);
 check(!editingId||previous,"O entregador a editar não existe.");
 check(!s.couriers.some(c=>c.id!==editingId&&c.phone===number),"Já existe um entregador com este contacto.");
 const time=new Date().toISOString(),entry:Courier={id:previous?.id??keyId(),name:clean,phone:number,active:previous?.active??true,createdAt:previous?.createdAt??time};
 return {...s,couriers:previous?s.couriers.map(c=>c.id===previous.id?entry:c):[entry,...s.couriers],
 audits:audit(s,previous?"Entregador actualizado":"Entregador registado",clean,time)};
}
export function toggleCourier(s:Store,id:string):Store{
 const courier=s.couriers.find(c=>c.id===id);
 check(courier,"Entregador não encontrado.");
 check(!courier.active||!s.onlineOrders.some(o=>o.courierId===id&&o.state==="em_entrega"),"O entregador tem encomendas em distribuição.");
 const now=new Date().toISOString();
 return {...s,couriers:s.couriers.map(c=>c.id===id?{...c,active:!c.active}:c),
 audits:audit(s,"Estado do entregador alterado",courier.name,now)};
}
export function assignCourier(s:Store,orderId:string,courierId:string):Store{
 const order=s.onlineOrders.find(x=>x.id===orderId);
 check(order&&order.fulfilment==="entrega"&&order.state==="pronta","A encomenda tem de estar pronta para atribuir entrega.");
 const courier=s.couriers.find(x=>x.id===courierId&&x.active);
 check(courier,"Seleccione um entregador activo.");
 const now=new Date().toISOString();
 return {...s,onlineOrders:s.onlineOrders.map(o=>o.id===orderId?{...o,courierId:courier.id,updatedAt:now}:o),
 audits:audit(s,"Entregador atribuído",order.id+" · "+courier.name,now)};
}
export function dispatchDelivery(s:Store,orderId:string):Store{
 const order=s.onlineOrders.find(x=>x.id===orderId);
 check(order&&order.fulfilment==="entrega"&&order.state==="pronta","A encomenda ainda não pode sair para entrega.");
 check(order.courierId&&s.couriers.some(c=>c.id===order.courierId&&c.active),"Atribua um entregador activo.");
 const now=new Date().toISOString();
 return {...s,onlineOrders:s.onlineOrders.map(o=>o.id===orderId?{...o,state:"em_entrega" as const,updatedAt:now}:o),
 audits:audit(s,"Saída para entrega (demonstração)",orderId,now)};
}
export function completeOnlineOrder(s:Store,orderId:string):Store{
 const order=s.onlineOrders.find(o=>o.id===orderId);
 check(order,"Encomenda não encontrada.");
 check(order.fulfilment==="levantamento"?order.state==="pronta":order.state==="em_entrega",
  "A encomenda ainda não pode ser concluída.");
 if(order.fulfilment==="entrega")check(order.courierId,"Atribua um entregador.");
 for(const item of order.items){
  const product=s.products.find(p=>p.id===item.productId&&p.active);
  check(product&&!s.pharmaLots.some(l=>l.productId===product.id),"Um produto deixou de estar disponível.");
  check(product.stock-quantityReserved(s,item.productId,order.id)>=item.qty,"O stock disponível mudou. Verifique "+product.name+".");
 }
 const session=order.method==="dinheiro"?activeCashSession(s):undefined;
 check(order.method!=="dinheiro"||session,"Abra o caixa para concluir o recebimento em dinheiro.");
 const now=new Date().toISOString();
 const sale:Sale={id:"VD-ONL-"+keyId().slice(0,8).toUpperCase(),createdAt:now,source:"online",sourceId:order.id,customerId:order.customerId,
  items:snapshotSaleItems(s,order.items.map(i=>({productId:i.productId,name:i.name,price:i.unitPrice,qty:i.qty}))),
  total:order.total,deliveryFee:order.deliveryFee,method:order.method,...(session?{cashSessionId:session.id}:{})};
 const updated:Store={...s,sales:[sale,...s.sales],
  products:s.products.map(p=>{const line=order.items.find(i=>i.productId===p.id);return line?{...p,stock:Math.round((p.stock-line.qty+Number.EPSILON)*1000)/1000}:p}),
  stockMovements:[...saleStockMovements(s,sale),...s.stockMovements],
  onlineOrders:s.onlineOrders.map(o=>o.id===orderId?{...o,state:order.fulfilment==="entrega"?"entregue" as const:"levantada" as const,updatedAt:now,saleId:sale.id}:o),
  audits:audit(s,order.fulfilment==="entrega"?"Entrega concluída":"Levantamento concluído",order.id+" · "+sale.id+" (pagamento demonstrativo)",now)};
 return awardLoyaltyForSale(updated,sale,order.subtotal);
}
