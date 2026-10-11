import {describe,it,expect} from "vitest";
import {initialStore,type Store,type Product} from "./domain";
import {startCashSession} from "./commercial";
import {registerPharmaLot,registerPharmaDispense,availablePharmaLots,nearExpiry,registerServiceTable,startServiceOrder,addServiceOrderItem,removeServiceOrderItem,serviceActiveOrders,advanceServiceOrder,finishServiceOrder,cancelServiceOrder,reservedQty,registerButcherBatch,registerWeightedSale} from "./sectors";

const pharma=(s:Store=initialStore())=>{
 let x=registerPharmaLot(s,"p1","LOTE-2026-A","2027-03-12",4,"2026-10-11","");
 x=registerPharmaLot(x,"p1","LOTE-2026-B","2026-11-10",3,"2026-10-11","");
 return x;
};
const table=(s:Store=initialStore())=>registerServiceTable(s,"restaurante","Mesa 1");
const productsKg=(s:Store)=>{
 const mk=(id:string,name:string,stock:number):Product=>({id,name,stock,sku:id,unit:"kg",price:450,category:"Talho",active:true});
 return {...s,products:[...s.products,mk("carne","Carne em peça",20),mk("bife","Bifes",0),mk("osso","Ossos",0)]};
};
describe("Farmácia — rastreio por lote",()=>{
 it("regista lotes únicos e não aceita validade vencida",()=>{
  const s=pharma();
  expect(s.products.find(p=>p.id==="p1")?.stock).toBe(35);
  expect(()=>registerPharmaLot(s,"p1","LOTE-2026-A","2027-02-01",4,"2026-10-11","")).toThrow("já existe");
  expect(()=>registerPharmaLot(s,"p1","LOTE-C","2026-10-10",4,"2026-10-11","")).toThrow("validade");
 });
 it("dispensa FEFO e reduz stock sem consumir lotes expirados",()=>{
  const s=pharma();
  const sold=registerPharmaDispense(s,"p1",5,"emola","2026-10-11","");
  expect(sold.pharmaDispenses[0]?.allocations.map(a=>a.qty)).toEqual([3,2]);
  expect(sold.products.find(p=>p.id==="p1")?.stock).toBe(30);
  expect(sold.pharmaLots.find(l=>l.lotNumber==="LOTE-2026-B")?.qty).toBe(0);
  expect(availablePharmaLots(sold,"p1","2027-03-13")).toHaveLength(0);
 });
 it("bloqueia lote expirado ou dinheiro sem caixa",()=>{
  const s=pharma();
  expect(()=>registerPharmaDispense(s,"p1",4,"dinheiro","2026-10-11","")).toThrow("Abra o caixa");
  expect(()=>registerPharmaDispense(s,"p1",1,"emola","2027-04-01","")).toThrow("lotes válidos");
  expect(nearExpiry(s,"2026-10-11",30)).toHaveLength(1);
 });
});
describe("Restaurantes e bares — mesas e comandas",()=>{
 it("impede comandas duplicadas por mesa e reserva stock",()=>{
  let s=table();s=startServiceOrder(s,s.serviceTables[0]!.id,"Sem cebola");
  const id=s.serviceOrders[0]!.id;
  expect(()=>startServiceOrder(s,s.serviceTables[0]!.id,"")).toThrow("comanda aberta");
  s=addServiceOrderItem(s,id,"p1",2);
  expect(reservedQty(s,"p1")).toBe(2);
  s=removeServiceOrderItem(s,id,"p1");
  expect(reservedQty(s,"p1")).toBe(0);
 });
 it("passa por preparação, pronto, servido e liquida a comanda",()=>{
  let s=table();s=startServiceOrder(s,s.serviceTables[0]!.id,"");
  const id=s.serviceOrders[0]!.id;
  s=addServiceOrderItem(s,id,"p1",1);
  expect(()=>finishServiceOrder(s,id,"mpesa")).toThrow("servida");
  for(let i=0;i<3;i++)s=advanceServiceOrder(s,id);
  s=finishServiceOrder(s,id,"mpesa");
  expect(s.serviceOrders[0]!.state).toBe("fechada");
  expect(s.sales[0]!.source).toBe("restaurante");
  expect(s.products.find(p=>p.id==="p1")?.stock).toBe(27);
  expect(serviceActiveOrders(s,"restaurante")).toHaveLength(0);
 });
 it("anula antes de preparar e exige dinheiro em caixa",()=>{
  let s=table();s=startServiceOrder(s,s.serviceTables[0]!.id,"");
  let cancelled=cancelServiceOrder(s,s.serviceOrders[0]!.id);
  expect(cancelled.serviceOrders[0]!.state).toBe("anulada");
  s=addServiceOrderItem(s,s.serviceOrders[0]!.id,"p1",1);
  const id=s.serviceOrders[0]!.id;
  for(let i=0;i<3;i++)s=advanceServiceOrder(s,id);
  expect(()=>finishServiceOrder(s,id,"dinheiro")).toThrow("Abra o caixa");
  const cash=startCashSession(s,0,"");
  expect(finishServiceOrder(cash,id,"dinheiro").sales[0]!.cashSessionId).toBeTruthy();
 });
});
describe("Talhos — peso e transformação",()=>{
 it("regista quebra e movimentos de stock em kg",()=>{
  const s=registerButcherBatch(productsKg(initialStore()),"carne",10,[{productId:"bife",qty:7.25},{productId:"osso",qty:2}],"Desmanche");
  expect(s.butcherBatches[0]!.wasteQty).toBe(.75);
  expect(s.products.find(p=>p.id==="carne")?.stock).toBe(10);
  expect(s.products.find(p=>p.id==="bife")?.stock).toBe(7.25);
  expect(()=>registerButcherBatch(s,"carne",1,[{productId:"bife",qty:2}],"Teste")).toThrow("não podem pesar");
 });
 it("faz venda fraccionada ao kg e respeita caixa",()=>{
  const s=productsKg(initialStore());
  expect(()=>registerWeightedSale(s,"carne",1.5,"dinheiro")).toThrow("Abra o caixa");
  const sold=registerWeightedSale(startCashSession(s,0,""),"carne",1.25,"dinheiro");
  expect(sold.sales[0]!.total).toBe(562.5);
  expect(sold.products.find(p=>p.id==="carne")?.stock).toBe(18.75);
 });
});
