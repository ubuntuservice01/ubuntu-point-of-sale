import {describe,expect,it} from "vitest";
import {alertSummary,defaultAlertSettings,markAlertRead,markAlertUnread,operationalAlerts,pruneReadAlerts,safeAlertSettings,safeReadAlerts} from "./alerts";
import {initialStore,safeStore,type Store} from "./domain";
const today=new Date("2026-10-11T12:00:00");
const build=():Store=>({...initialStore(),products:[],customers:[]});
describe("Motor de alertas operacionais",()=>{
 it("gera stock baixo, stock esgotado e respeita stock reservado",()=>{
  let s=build();
  s={...s,products:[
   {id:"zero",name:"Arroz esgotado",sku:"AR-0",stock:0,active:true,unit:"un.",category:"Mercearia",price:10},
   {id:"low",name:"Óleo",sku:"OL-1",stock:5,active:true,unit:"L",category:"Mercearia",price:10},
   {id:"ok",name:"Açúcar",sku:"AC-2",stock:11,active:true,unit:"un.",category:"Mercearia",price:10},
   {id:"inactive",name:"Inactivo",sku:"IA-3",stock:0,active:false,unit:"un.",category:"Mercearia",price:10}
  ]};
  const alerts=operationalAlerts(s,today);
  expect(alerts.filter(a=>a.kind==="stock")).toHaveLength(2);
  expect(alerts.find(a=>a.reference==="zero")?.priority).toBe("critical");
  expect(alerts.find(a=>a.reference==="low")?.priority).toBe("high");
  const withReservation={...s,serviceOrders:[{id:"s1",area:"bar" as const,tableId:"mesa",items:[{productId:"ok",qty:10,unitPrice:10}],state:"aberta" as const,createdAt:"2026-10-11T09:00:00",updatedAt:"2026-10-11T09:00:00",note:""}]};
  expect(operationalAlerts(withReservation,today).some(a=>a.reference==="ok")).toBe(true);
 });
 it("fiado vencido considera pagamentos parciais e só dívidas com prazo ultrapassado",()=>{
  const s={...build(),customers:[
   {id:"c1",name:"Maria",phone:"841111111",debt:70},
   {id:"c2",name:"João",phone:"842222222",debt:50}
  ],credits:[
   {id:"f1",customerId:"c1",kind:"fiado" as const,amount:100,dueDate:"2026-10-01",createdAt:"2026-09-01T09:00:00"},
   {id:"p1",customerId:"c1",kind:"pagamento" as const,amount:30,createdAt:"2026-10-09T09:00:00"},
   {id:"f2",customerId:"c2",kind:"fiado" as const,amount:50,dueDate:"2026-10-15",createdAt:"2026-09-01T09:00:00"}
  ]};
  const alerts=operationalAlerts(s,today);
  expect(alerts.filter(a=>a.kind==="credit")).toHaveLength(1);
  expect(alerts.find(a=>a.kind==="credit")?.description).toContain("70,00");
  expect(alerts.find(a=>a.kind==="credit")?.reference).toBe("c1");
  const paid={...s,credits:[...s.credits,{id:"p2",customerId:"c1",kind:"pagamento" as const,amount:70,createdAt:"2026-10-11T10:00:00"}]};
  expect(operationalAlerts(paid,today).filter(a=>a.kind==="credit")).toHaveLength(0);
 });
 it("distingue lote expirado, validade de hoje, próximo de expirar e fora do prazo de alerta",()=>{
  const s={...build(),products:[{id:"med",name:"Medicamento A",sku:"MED-A",stock:50,active:true,unit:"un.",category:"Farmácia",price:30}],
   pharmaLots:[
    {id:"old",productId:"med",lotNumber:"L-OLD",expiryDate:"2026-09-28",qty:3,createdAt:"2026-07-01T10:00:00"},
    {id:"today",productId:"med",lotNumber:"L-NOW",expiryDate:"2026-10-11",qty:2,createdAt:"2026-07-01T10:00:00"},
    {id:"near",productId:"med",lotNumber:"L-SOON",expiryDate:"2026-10-31",qty:4,createdAt:"2026-07-01T10:00:00"},
    {id:"far",productId:"med",lotNumber:"L-FAR",expiryDate:"2027-02-01",qty:8,createdAt:"2026-07-01T10:00:00"},
    {id:"gone",productId:"med",lotNumber:"L-NO",expiryDate:"2026-09-01",qty:0,createdAt:"2026-07-01T10:00:00"}
   ]};
  const alerts=operationalAlerts(s,today).filter(a=>a.kind==="expiry");
  expect(alerts).toHaveLength(3);
  expect(alerts.find(a=>a.reference==="old")?.priority).toBe("critical");
  expect(alerts.find(a=>a.reference==="today")?.description).toContain("Expira hoje");
  expect(alerts.find(a=>a.reference==="near")?.priority).toBe("medium");
  const altered={...s,alertSettings:{...defaultAlertSettings(),expiryWarningDays:7}};
  expect(operationalAlerts(altered,today).filter(a=>a.kind==="expiry")).toHaveLength(2);
 });
 it("gera alertas de encomendas online e grossistas por concluir, nunca entregues/canceladas",()=>{
  const online=(id:string,state:"recebida"|"entregue"|"cancelada",createdAt:string)=>({
   id,customerId:"c",customerName:"Cliente A",customerPhone:"841111111",items:[],subtotal:0,
   deliveryFee:0,total:0,fulfilment:"levantamento" as const,address:"",method:"mpesa" as const,
   state,note:"",createdAt,updatedAt:createdAt
  });
  const wholesale=(id:string,state:"reservada"|"entregue")=>({
   id,customerId:"c",items:[],total:500,state,paymentTerm:"imediato" as const,note:"",
   createdAt:"2026-10-09T09:00:00",updatedAt:"2026-10-09T09:00:00"
  });
  const s={...build(),onlineOrders:[
   online("inbox","recebida","2026-10-10T06:00:00"),
   online("done","entregue","2026-10-10T06:00:00"),
   online("cancel","cancelada","2026-10-10T06:00:00")
  ],wholesaleOrders:[wholesale("w1","reservada"),wholesale("w2","entregue")]};
  const a=operationalAlerts(s,today).filter(x=>x.kind==="orders");
  expect(a).toHaveLength(2);
  expect(a.every(x=>x.priority==="critical")).toBe(true);
  expect(a.find(x=>x.reference==="inbox")?.section).toBe("encomendas-online");
  expect(a.find(x=>x.reference==="w1")?.section).toBe("grossistas");
 });
 it("uma mudança no estado do pedido altera a identidade do aviso; resoluções eliminam-no",()=>{
  const base=build();
  const order={id:"o1",customerId:"c",customerName:"Cliente",customerPhone:"841111111",items:[],
   subtotal:0,deliveryFee:0,total:0,fulfilment:"entrega" as const,address:"Bairro",
   method:"emola" as const,state:"recebida" as const,note:"",createdAt:"2026-10-11T10:00:00",updatedAt:"2026-10-11T10:00:00"};
  const s={...base,onlineOrders:[order]};
  const first=operationalAlerts(s,today)[0]!;
  const read=markAlertRead([],first.id);
  expect(alertSummary(operationalAlerts(s,today),read).unread).toBe(0);
  const changed={...s,onlineOrders:[{...order,state:"em_entrega" as const}]};
  const next=operationalAlerts(changed,today);
  expect(next[0]!.id).not.toBe(first.id);
  expect(next[0]!.section).toBe("entregas");
  expect(alertSummary(next,read).unread).toBe(1);
  expect(pruneReadAlerts(read,next)).toEqual([]);
  expect(operationalAlerts({...s,onlineOrders:[{...order,state:"entregue" as const}]},today)).toHaveLength(0);
 });
 it("marcar por ler e lido mantém idempotência e contagens por prioridade",()=>{
  const s={...build(),products:[{id:"p",name:"Zero",sku:"ZERO",stock:0,active:true,unit:"un.",category:"Mercearia",price:2}]};
  const alerts=operationalAlerts(s,today);
  const read=markAlertRead(markAlertRead([],alerts[0]!.id),alerts[0]!.id);
  expect(read).toHaveLength(1);
  expect(alertSummary(alerts,read).critical).toBe(0);
  expect(alertSummary(alerts,read).unread).toBe(0);
  expect(alertSummary(alerts,markAlertUnread(read,alerts[0]!.id)).unread).toBe(1);
 });
 it("migra dados antigos e sanitiza limites, sem perder o catálogo da demonstração",()=>{
  const old=initialStore();
  const oldSafe=safeStore({...old,alertSettings:undefined,readAlertIds:undefined});
  expect(oldSafe.alertSettings).toEqual(defaultAlertSettings());
  expect(oldSafe.readAlertIds).toEqual([]);
  expect(oldSafe.products).toHaveLength(old.products.length);
  expect(safeAlertSettings({lowStockThreshold:-4,expiryWarningDays:0,orderWaitingHours:10000})).toEqual(defaultAlertSettings());
  expect(safeReadAlerts([null,1,"good","good",""])).toEqual(["good"]);
  expect(safeStore({...old,credits:undefined}).alertSettings).toEqual(defaultAlertSettings());
 });
 it("sem dados reais não cria alertas fictícios nem notifica remotamente",()=>{
  expect(operationalAlerts(build(),today)).toEqual([]);
  expect(alertSummary([],[]).unread).toBe(0);
 });
});
