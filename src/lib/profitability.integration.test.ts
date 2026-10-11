import {describe,expect,it} from "vitest";
import {initialStore,type Store} from "./domain";
import {registerWeightedSale,registerPharmaLot,registerPharmaDispense} from "./sectors";
import {reserveWholesaleOrder,dispatchWholesaleOrder} from "./expansion";
import {profitabilityRange,profitabilityReport} from "./profitability";
import {submitOnlineOrder,advanceOnlineOrder,completeOnlineOrder} from "./online";

const product={id:"costed",name:"Carne preparada",sku:"CRN-099",category:"Talho",unit:"kg",stock:10,price:400,purchasePrice:250,active:true} as const;
const costedStore=():Store=>({...initialStore(),products:[{...product}],customers:[{id:"cliente",name:"Cliente Exemplo",phone:"841234567",debt:0,creditLimit:5000}]});
const all=profitabilityRange("todos","","");

describe("Instantâneo de custo em módulos especializados",()=>{
 it("vende ao peso e congela o custo por kg",()=>{
  const state=registerWeightedSale(costedStore(),"costed",0.4,"mpesa");
  expect(state.sales[0]?.source).toBe("talho");
  expect(state.sales[0]?.items[0]?.costAtSale).toBe(250);
  const report=profitabilityReport(state,all);
  expect(report.netSales).toBe(160);
  expect(report.estimatedCost).toBe(100);
  expect(report.margin).toBe(60);
 });
 it("congela custo da dispensa farmacêutica por lote",()=>{
  let state:Store={...initialStore(),products:[{...product,unit:"un.",stock:0}]};
  state=registerPharmaLot(state,"costed","LOTE-99","2028-03-01",4,"2026-10-11","Recepção");
  state=registerPharmaDispense(state,"costed",2,"mpesa","2026-10-11","Simulação");
  expect(state.sales[0]?.source).toBe("farmacia");
  expect(state.sales[0]?.items[0]?.costAtSale).toBe(250);
  expect(profitabilityReport(state,all).margin).toBe(300);
 });
 it("congela preço de compra numa venda grossista, preservando o preço de venda aplicado",()=>{
  let state=costedStore();
  state=reserveWholesaleOrder(state,{customerId:"cliente",items:[{productId:"costed",qty:2}],paymentTerm:"imediato",method:"emola",dueDate:"",note:""});
  state=dispatchWholesaleOrder(state,state.wholesaleOrders[0]!.id);
  expect(state.sales[0]?.source).toBe("grossistas");
  expect(state.sales[0]?.items[0]?.costAtSale).toBe(250);
  expect(profitabilityReport(state,all).margin).toBe(300);
 });
 it("no catálogo online a taxa de entrega não afecta custo ou margem dos artigos",()=>{
  let state=costedStore();
  state={...state,products:[{...product,unit:"un."}],catalogSettings:{...state.catalogSettings,enabled:true,deliveryFee:50}};
  state=submitOnlineOrder(state,{name:"Cliente Exemplo",phone:"841234567",items:[{productId:"costed",qty:1}],fulfilment:"levantamento",address:"",method:"emola",note:""});
  const orderId=state.onlineOrders[0]!.id;
  state=advanceOnlineOrder(state,orderId);
  state=advanceOnlineOrder(state,orderId);
  state=advanceOnlineOrder(state,orderId);
  state=completeOnlineOrder(state,orderId);
  expect(state.sales[0]?.items[0]?.costAtSale).toBe(250);
  expect(profitabilityReport(state,all).margin).toBe(150);
 });
});
