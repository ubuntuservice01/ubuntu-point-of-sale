import {describe,it,expect} from "vitest";
import {initialStore,type Store,type Sale} from "./domain";
import {startCashSession,registerReturn} from "./commercial";
import {listedProducts,submitOnlineOrder,advanceOnlineOrder,cancelOnlineOrder,registerCourier,assignCourier,dispatchDelivery,completeOnlineOrder,updateCatalogSettings,setCatalogListing,catalogStockFree} from "./online";
import {loyaltyBalance,awardLoyaltyForSale,redeemLoyaltyReward,markLoyaltyRewardDelivered,reverseLoyaltyForReturn,updateLoyaltySettings} from "./loyalty";
const pickup={name:"Cliente de Demonstração",phone:"841234567",items:[{productId:"p1",qty:2}],fulfilment:"levantamento" as const,address:"",method:"mpesa" as const,note:"Testar"};
const delivery={...pickup,fulfilment:"entrega" as const,address:"Av. da Liberdade, Lichinga"};
const prepare=(s:Store)=>{
 let x=s;const id=x.onlineOrders[0]!.id;
 for(let i=0;i<3;i++)x=advanceOnlineOrder(x,id);
 return x;
};
describe("Catálogo público e encomendas digitais",()=>{
 it("não publica lotes farmacêuticos nem produtos ocultos",()=>{
  let s=setCatalogListing(initialStore(),"p1",{visible:false});
  expect(listedProducts(s).some(p=>p.id==="p1")).toBe(false);
  s={...s,pharmaLots:[{id:"L",productId:"p2",lotNumber:"L",expiryDate:"2027-10-11",qty:1,createdAt:new Date().toISOString()}]};
  expect(listedProducts(s).some(p=>p.id==="p2")).toBe(false);
 });
 it("validade mínima, telefone e limite de stock",()=>{
  const s=initialStore();
  expect(()=>submitOnlineOrder(s,{...pickup,phone:"abc"})).toThrow("telemóvel");
  expect(()=>submitOnlineOrder(s,{...delivery,address:"Rua A"})).toThrow("morada");
  expect(()=>submitOnlineOrder(s,{...pickup,items:[{productId:"p1",qty:99}]})).toThrow("Stock");
 });
 it("reserva mas não vende antes de concluir; cancela e liberta stock",()=>{
  let s=submitOnlineOrder(initialStore(),pickup),id=s.onlineOrders[0]!.id;
  expect(catalogStockFree(s,"p1")).toBe(26);
  expect(s.sales).toHaveLength(0);
  s=cancelOnlineOrder(s,id);
  expect(catalogStockFree(s,"p1")).toBe(28);
  expect(()=>advanceOnlineOrder(s,id)).toThrow();
 });
 it("conclui levantamento registando venda e pontos apenas uma vez",()=>{
  let s=prepare(submitOnlineOrder(initialStore(),pickup));
  const id=s.onlineOrders[0]!.id;
  s=completeOnlineOrder(s,id);
  expect(s.onlineOrders[0]?.state).toBe("levantada");
  expect(s.sales).toHaveLength(1);
  expect(s.products.find(p=>p.id==="p1")?.stock).toBe(26);
  expect(loyaltyBalance(s,s.onlineOrders[0]!.customerId)).toBe(7);
  expect(()=>completeOnlineOrder(s,id)).toThrow();
 });
 it("entrega exige entregador, expedição e confirmação",()=>{
  let s=prepare(submitOnlineOrder(initialStore(),delivery));
  const id=s.onlineOrders[0]!.id;
  expect(s.onlineOrders[0]?.deliveryFee).toBe(100);
  expect(()=>dispatchDelivery(s,id)).toThrow("entregador");
  s=registerCourier(s,"Entregador Exemplo","871234567");
  s=assignCourier(s,id,s.couriers[0]!.id);
  s=dispatchDelivery(s,id);
  expect(s.onlineOrders[0]?.state).toBe("em_entrega");
  expect(()=>cancelOnlineOrder(s,id)).toThrow();
  s=completeOnlineOrder(s,id);
  expect(s.sales[0]?.total).toBe(870);
  expect(s.sales[0]?.deliveryFee).toBe(100);
  expect(loyaltyBalance(s,s.onlineOrders[0]!.customerId)).toBe(7);
 });
 it("em dinheiro exige caixa aberto na entrega",()=>{
  let s=prepare(submitOnlineOrder(initialStore(),{...pickup,method:"dinheiro"}));
  expect(()=>completeOnlineOrder(s,s.onlineOrders[0]!.id)).toThrow("Abra o caixa");
  s=startCashSession(s,0,"");
  s=completeOnlineOrder(s,s.onlineOrders[0]!.id);
  expect(s.sales[0]?.cashSessionId).toBe(s.cashSessions[0]?.id);
 });
 it("não admite mudar opções de catálogo para ambas modalidades fechadas",()=>{
  const s=initialStore();
  expect(()=>updateCatalogSettings(s,{...s.catalogSettings,pickupEnabled:false,deliveryEnabled:false})).toThrow("método");
 });
});
describe("Fidelização de clientes",()=>{
 it("ganha pontos para vendas pagas, nunca duplica atribuição",()=>{
  let s:Store={...initialStore(),customers:[{id:"c",name:"Cliente",phone:"841234567",debt:0}]};
  const sale:Sale={id:"VD",createdAt:new Date().toISOString(),items:[],total:1200,customerId:"c",method:"mpesa"};
  s=awardLoyaltyForSale(s,sale);
  s=awardLoyaltyForSale(s,sale);
  expect(loyaltyBalance(s,"c")).toBe(12);
  expect(s.loyaltyMovements).toHaveLength(1);
 });
 it("resgata benefício e confirma entrega sem duplicação",()=>{
  let s:Store={...initialStore(),customers:[{id:"c",name:"Cliente",phone:"841234567",debt:0}]};
  s=updateLoyaltySettings(s,{enabled:true,meticaisPerPoint:100,rewardPoints:5,rewardName:"Benefício de teste"});
  const sale:Sale={id:"VD",createdAt:new Date().toISOString(),items:[],total:1200,customerId:"c",method:"cartao"};
  s=awardLoyaltyForSale(s,sale);
  s=redeemLoyaltyReward(s,"c");
  expect(loyaltyBalance(s,"c")).toBe(7);
  s=markLoyaltyRewardDelivered(s,s.loyaltyRewards[0]!.id);
  expect(s.loyaltyRewards[0]?.state).toBe("entregue");
  expect(()=>markLoyaltyRewardDelivered(s,s.loyaltyRewards[0]!.id)).toThrow();
 });
 it("devolução reduz os pontos ganhos de maneira proporcional",()=>{
  let s:Store={...initialStore(),customers:[{id:"c",name:"Cliente",phone:"841234567",debt:0}]};
  const sale:Sale={id:"VD",createdAt:new Date().toISOString(),items:[{productId:"p1",name:"Arroz",qty:2,price:385}],total:770,customerId:"c",method:"emola"};
  s={...s,sales:[sale]};
  s=awardLoyaltyForSale(s,sale);
  const updated={...s,returns:[{id:"R",saleId:"VD",createdAt:new Date().toISOString(),items:[{productId:"p1",qty:1,unitPrice:385}],total:385,method:"emola" as const,note:"Teste"}]};
  const after=reverseLoyaltyForReturn(updated,"VD",385);
  expect(loyaltyBalance(after,"c")).toBe(4);
 });
});
