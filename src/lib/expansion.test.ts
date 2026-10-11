import {describe,it,expect} from "vitest";
import {initialStore,type Store,type Product} from "./domain";
import {startCashSession} from "./commercial";
import {registerServiceTable,startServiceOrder,addServiceOrderItem} from "./sectors";
import {
 saveRecipe,produceBatch,recipeCostEstimate,saveWholesaleTier,wholesaleUnitPrice,
 reserveWholesaleOrder,cancelWholesaleOrder,dispatchWholesaleOrder,deliverWholesaleOrder,
 freeQuantity,validQuantity
} from "./expansion";
const ingredient=(id:string,qty:number)=>({productId:id,qty});
const recipeInput={name:"Pão de farinha",productId:"p10",outputQty:10,ingredients:[ingredient("p3",.5),ingredient("p2",1)],notes:"Fórmula demonstrativa"};
const withRecipe=()=>saveRecipe(initialStore(),recipeInput);
const withCustomer=():Store=>({...initialStore(),customers:[{id:"c1",name:"Mercearia Modelo",phone:"840000000",debt:0,creditLimit:5000}]});
const orderInput={customerId:"c1",items:[{productId:"p1",qty:5}],paymentTerm:"imediato" as const,method:"emola" as const,dueDate:"",note:"Venda por volume"};
describe("Produção e padarias",()=>{
 it("valida receita, rendimento e ingredientes distintos",()=>{
  expect(()=>saveRecipe(initialStore(),{...recipeInput,ingredients:[ingredient("p10",1)]})).toThrow("diferentes");
  expect(()=>saveRecipe(initialStore(),{...recipeInput,ingredients:[ingredient("p3",.5),ingredient("p3",1)]})).toThrow("Não repita");
  expect(withRecipe().productionRecipes).toHaveLength(1);
 });
 it("consome ingredientes e aumenta produto acabado",()=>{
  const recipeState=withRecipe();
  const s=produceBatch(recipeState,recipeState.productionRecipes[0]!.id,2,"Turno manhã");
  expect(s.products.find(p=>p.id==="p10")?.stock).toBe(61);
  expect(s.products.find(p=>p.id==="p3")?.stock).toBe(41);
  expect(s.products.find(p=>p.id==="p2")?.stock).toBe(34);
  expect(s.stockMovements.filter(m=>m.reference===s.productionRuns[0]!.id)).toHaveLength(3);
 });
 it("bloqueia produção sem stock e não inventa custo",()=>{
  const s=withRecipe();
  expect(()=>produceBatch(s,s.productionRecipes[0]!.id,100,"")).toThrow("Stock");
  expect(recipeCostEstimate(s,s.productionRecipes[0]!).total).toBeUndefined();
 });
 it("não pode consumir stock reservado por comandas",()=>{
  let s=saveRecipe(initialStore(),{...recipeInput,ingredients:[ingredient("p1",28)]});
  s=registerServiceTable(s,"restaurante","Mesa 01");
  s=startServiceOrder(s,s.serviceTables[0]!.id,"");
  s=addServiceOrderItem(s,s.serviceOrders[0]!.id,"p1",1);
  expect(freeQuantity(s,"p1")).toBe(27);
  expect(()=>produceBatch(s,s.productionRecipes[0]!.id,1,"")).toThrow("reservas");
 });
 it("permite kg fraccionados mas não unidades fraccionadas",()=>{
  expect(validQuantity(.125,"kg")).toBe(true);
  expect(validQuantity(1.2,"un.")).toBe(false);
 });
});
describe("Grossistas",()=>{
 it("aplica o melhor escalão e preserva preços em encomendas",()=>{
  let s=saveWholesaleTier(withCustomer(),{productId:"p1",minimumQty:5,unitPrice:320});
  s=saveWholesaleTier(s,{productId:"p1",minimumQty:10,unitPrice:300});
  expect(wholesaleUnitPrice(s,"p1",4).price).toBe(385);
  expect(wholesaleUnitPrice(s,"p1",5).price).toBe(320);
  expect(wholesaleUnitPrice(s,"p1",11).price).toBe(300);
  s=reserveWholesaleOrder(s,orderInput,"2026-10-11");
  expect(s.wholesaleOrders[0]!.items[0]?.unitPrice).toBe(320);
 });
 it("impede reservas acima do stock e liberta quantidades ao cancelar",()=>{
  const s=reserveWholesaleOrder(withCustomer(),orderInput,"2026-10-11");
  expect(freeQuantity(s,"p1")).toBe(23);
  expect(()=>reserveWholesaleOrder(s,{...orderInput,items:[{productId:"p1",qty:24}]},"2026-10-11")).toThrow("Stock livre");
  const cancelled=cancelWholesaleOrder(s,s.wholesaleOrders[0]!.id);
  expect(freeQuantity(cancelled,"p1")).toBe(28);
 });
 it("expede com criação de venda e confirma entrega",()=>{
  let s=reserveWholesaleOrder(withCustomer(),orderInput,"2026-10-11");
  s=dispatchWholesaleOrder(s,s.wholesaleOrders[0]!.id,"2026-10-11");
  expect(s.sales[0]?.source).toBe("grossistas");
  expect(s.products.find(p=>p.id==="p1")?.stock).toBe(23);
  expect(s.wholesaleOrders[0]?.state).toBe("expedida");
  s=deliverWholesaleOrder(s,s.wholesaleOrders[0]!.id);
  expect(s.wholesaleOrders[0]?.state).toBe("entregue");
 });
 it("fiado respeita crédito no momento da reserva e da expedição",()=>{
  let s=withCustomer();
  expect(()=>reserveWholesaleOrder(s,{...orderInput,paymentTerm:"fiado",dueDate:"2026-09-01"},"2026-10-11")).toThrow("vencimento");
  s=reserveWholesaleOrder(s,{...orderInput,paymentTerm:"fiado",dueDate:"2026-11-01"},"2026-10-11");
  s=dispatchWholesaleOrder(s,s.wholesaleOrders[0]!.id,"2026-10-11");
  expect(s.customers[0]?.debt).toBe(1925);
  expect(s.credits[0]?.kind).toBe("fiado");
 });
 it("dinheiro exige caixa aberto antes de expedir",()=>{
  let s=reserveWholesaleOrder(withCustomer(),{...orderInput,method:"dinheiro"},"2026-10-11");
  expect(()=>dispatchWholesaleOrder(s,s.wholesaleOrders[0]!.id,"2026-10-11")).toThrow("Abra o caixa");
  s=startCashSession(s,0,"");
  const dispatched=dispatchWholesaleOrder(s,s.wholesaleOrders[0]!.id,"2026-10-11");
  expect(dispatched.sales[0]?.cashSessionId).toBeTruthy();
 });
});
