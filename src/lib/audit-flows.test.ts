import {describe,it,expect} from "vitest";
import {initialStore,safeStore,validStockQuantity,type Store,type CreditMovement} from "./domain";
import {registerSupplier,registerPurchase,registerStockAdjustment,startCashSession,cashSessionBalance} from "./commercial";
import {awardLoyaltyForCreditPayment,loyaltyBalance} from "./loyalty";
import {reserveWholesaleOrder,dispatchWholesaleOrder} from "./expansion";
import {submitOnlineOrder,catalogStockFree} from "./online";
import {registerServiceTable,startServiceOrder,addServiceOrderItem} from "./sectors";

const stockOf=(s:Store,id:string)=>s.products.find(p=>p.id===id)!.stock;
describe("Auditoria integrada de stock, vendas e fiado",()=>{
 it("respeita gramas e litros, mas não unidades fraccionadas",()=>{
  expect(validStockQuantity(.125,"kg")).toBe(true);
  expect(validStockQuantity(.001,"KG")).toBe(true);
  expect(validStockQuantity(.25,"L")).toBe(true);
  expect(validStockQuantity(1.25,"un.")).toBe(false);
  expect(validStockQuantity(.0005,"kg")).toBe(false);
  expect(validStockQuantity(0,"kg",true)).toBe(true);
  expect(validStockQuantity(-1,"kg",true)).toBe(false);
 });
 it("recebe compra fraccionada em kg e permite correcção com motivo",()=>{
  let s=registerSupplier(initialStore(),{name:"Fornecedor de farinha",phone:"",email:"",city:"Lichinga"});
  const first=stockOf(s,"p3");
  s=registerPurchase(s,s.suppliers[0]!.id,[{productId:"p3",qty:.375,unitCost:85}],"FAR-21",false,"emola");
  expect(stockOf(s,"p3")).toBe(first+.375);
  s=registerStockAdjustment(s,"p3","entrada",.125,"Recontagem de farinha");
  expect(stockOf(s,"p3")).toBe(first+.5);
  expect(s.stockMovements[0]?.balanceAfter).toBe(first+.5);
  expect(()=>registerStockAdjustment(s,"p3","saida",.0001,"Quebra")).toThrow("quantidade");
  expect(()=>registerPurchase(s,s.suppliers[0]!.id,[{productId:"p2",qty:.5,unitCost:150}],"",false,"emola")).toThrow("quantidades");
 });
 it("não permite consumir stock reservado por encomendas online em comandas, inventário e grossistas",()=>{
  const pickup={name:"Pessoa de Teste",phone:"841234567",items:[{productId:"p1",qty:26}],fulfilment:"levantamento" as const,address:"",method:"emola" as const,note:""};
  let s=submitOnlineOrder(initialStore(),pickup);
  expect(catalogStockFree(s,"p1")).toBe(2);
  expect(()=>registerStockAdjustment(s,"p1","saida",3,"Inventário")).toThrow("reservado");
  s=registerServiceTable(s,"restaurante","Mesa 01");
  s=startServiceOrder(s,s.serviceTables[0]!.id,"");
  expect(()=>addServiceOrderItem(s,s.serviceOrders[0]!.id,"p1",3)).toThrow("Stock insuficiente");
  const store:Store={...s,customers:[...s.customers,{id:"gross",name:"Revenda Exemplo",phone:"871234567",debt:0,creditLimit:10000}]};
  expect(()=>reserveWholesaleOrder(store,{customerId:"gross",items:[{productId:"p1",qty:3}],paymentTerm:"imediato",method:"emola",dueDate:"",note:""})).toThrow("Stock livre");
 });
 it("atribui pontos de fiado por pagamentos parciais sem perder fracções",()=>{
  const base=initialStore();
  let s:Store={...base,customers:[{id:"c",name:"Cliente Fiado",phone:"841234567",debt:300}],
   credits:[{id:"charge",customerId:"c",kind:"fiado",amount:300,createdAt:"2026-10-01T12:00:00.000Z"}]};
  const make=(id:string,amount:number):CreditMovement=>({id,customerId:"c",kind:"pagamento",amount,method:"mpesa",createdAt:new Date().toISOString()});
  const first=make("payment-1",45);
  s={...s,credits:[...s.credits,first]};
  s=awardLoyaltyForCreditPayment(s,first.id);
  expect(loyaltyBalance(s,"c")).toBe(0);
  const second=make("payment-2",65);
  s={...s,credits:[...s.credits,second]};
  s=awardLoyaltyForCreditPayment(s,second.id);
  expect(loyaltyBalance(s,"c")).toBe(1);
  s=awardLoyaltyForCreditPayment(s,second.id);
  expect(loyaltyBalance(s,"c")).toBe(1);
 });
 it("faz pontos nas vendas grossistas liquidadas, não nas vendas a fiado",()=>{
  const initial=initialStore();
  const withClient:Store={...initial,customers:[{id:"ret",name:"Revenda",phone:"841234567",debt:0,creditLimit:5000}]};
  let s=reserveWholesaleOrder(withClient,{customerId:"ret",items:[{productId:"p1",qty:5}],paymentTerm:"imediato",method:"mpesa",dueDate:"",note:""});
  s=dispatchWholesaleOrder(s,s.wholesaleOrders[0]!.id);
  expect(loyaltyBalance(s,"ret")).toBe(19);
  expect(s.sales[0]?.customerId).toBe("ret");
  let f=reserveWholesaleOrder(withClient,{customerId:"ret",items:[{productId:"p1",qty:5}],paymentTerm:"fiado",method:"mpesa",dueDate:"2027-01-01",note:""},"2026-10-11");
  f=dispatchWholesaleOrder(f,f.wholesaleOrders[0]!.id,"2026-10-11");
  expect(loyaltyBalance(f,"ret")).toBe(0);
 });
 it("migra demonstrações anteriores sem apagar listas existentes",()=>{
  const original=initialStore();
  const older=Object.fromEntries(Object.entries(original).filter(([key])=>!["catalogSettings","catalogListings","onlineOrders","loyaltySettings","loyaltyMovements","loyaltyRewards"].includes(key)));
  const restored=safeStore(older);
  expect(restored.catalogSettings.enabled).toBe(true);
  expect(restored.onlineOrders).toEqual([]);
  expect(restored.loyaltySettings.rewardPoints).toBeGreaterThan(0);
  expect(restored.products).toHaveLength(original.products.length);
 });
});
