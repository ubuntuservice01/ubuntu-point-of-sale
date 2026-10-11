import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {initialStore} from "./domain";
import {
 backupEnvelope,checkRemoteRevision,changedOperations,
 queueCounts
} from "./offline-model";
import {exportOfflineBackup,loadOffline,persistOffline,queuedOperations} from "./offline-db";
const now=new Date("2026-10-11T20:00:00.000Z");
beforeEach(()=>{window.localStorage.clear();vi.stubGlobal("indexedDB",undefined)});
afterEach(()=>{vi.unstubAllGlobals();window.localStorage.clear()});
const product={id:"new-p",name:"Produto offline",sku:"OFF-001",category:"Loja",unit:"un.",price:25,purchasePrice:15,stock:10,active:true};
const sale={id:"offline-sale",createdAt:"2026-10-11T20:00:00Z",items:[{productId:"new-p",name:"Produto offline",price:25,qty:1}],total:25,method:"mpesa" as const};
describe("Preparação de operações sem servidor",()=>{
 it("gera operações imutáveis com ids únicos para venda, produto e movimentos de stock",()=>{
  const before=initialStore();
  const after={...before,products:[...before.products,product],sales:[sale],stockMovements:[{
   id:"sm-1",productId:"new-p",kind:"venda" as const,change:-1,createdAt:now.toISOString(),
   reference:"offline-sale",note:"",balanceAfter:9
  }]};
  const ops=changedOperations(before,after,"client-test",now);
  expect(ops.map(op=>op.collection).sort()).toEqual(["products","sales","stockMovements"]);
  expect(ops.every(op=>op.status==="pending"&&op.clientId==="client-test"&&op.baseRevision===null)).toBe(true);
  expect(new Set(ops.map(op=>op.id)).size).toBe(ops.length);
  expect(ops.find(op=>op.collection==="sales")?.payload).toEqual(sale);
 });
 it("não duplica eventos quando os dados são iguais",()=>{
  const before=initialStore(),after=structuredClone(before);
  expect(changedOperations(before,after,"device",now)).toEqual([]);
 });
 it("acompanha cancelamentos e revisões de encomendas sem substituir silenciosamente o passado",()=>{
  const before=initialStore();
  const after={...before,products:before.products.filter(p=>p.id!=="p1"),
   onlineOrders:[{id:"o1",customerId:"c",customerName:"Cliente",customerPhone:"841111111",items:[],
    subtotal:0,deliveryFee:0,total:0,fulfilment:"levantamento" as const,
    address:"",method:"emola" as const,state:"recebida" as const,note:"",
    createdAt:now.toISOString(),updatedAt:now.toISOString()}]};
  const first=changedOperations(before,after,"device",now);
  expect(first.some(op=>op.collection==="products"&&op.action==="delete"&&op.recordId==="p1")).toBe(true);
  const updated={...after,onlineOrders:after.onlineOrders.map(o=>({...o,state:"confirmada" as const}))};
  const second=changedOperations(after,updated,"device",now);
  expect(second).toHaveLength(1);
  expect(second[0]).toMatchObject({action:"upsert",collection:"onlineOrders",recordId:"o1"});
  expect(second[0]!.id).not.toBe(first.find(op=>op.recordId==="o1")?.id);
 });
 it("cataloga configurações e visibilidade de produtos e guarda transições distintas",()=>{
  const before=initialStore();
  const after={...before,catalogSettings:{...before.catalogSettings,name:"Loja Matriz"},
   catalogListings:[{productId:"p1",visible:false,featured:false}]};
  const ops=changedOperations(before,after,"device",now);
  expect(ops.map(op=>op.collection).sort()).toEqual(["catalogListings","catalogSettings"]);
  expect(ops.find(op=>op.collection==="catalogListings")?.recordId).toBe("p1");
  expect(ops.find(op=>op.collection==="catalogSettings")?.recordId).toBe("catalogSettings");
 });
 it("não declara uma operação sincronizável sem revisão remota e não substitui alterações concorrentes",()=>{
  const base=initialStore();
  const op=changedOperations(base,{...base,products:[...base.products,product]},"device",now)[0]!;
  expect(checkRemoteRevision(op,{exists:false,revision:null},new Set())).toBe("conflict");
  const ready={...op,baseRevision:"rev-1"};
  expect(checkRemoteRevision(ready,{exists:true,revision:"rev-2"},new Set())).toBe("conflict");
  expect(checkRemoteRevision(ready,{exists:true,revision:"rev-1"},new Set())).toBe("send");
  expect(checkRemoteRevision(ready,{exists:true,revision:"rev-2"},new Set([ready.id]))).toBe("already-applied");
 });
 it("faz contagem distinta de operações pendentes e de revisão manual",()=>{
  const base=initialStore(),op=changedOperations(base,{...base,products:[...base.products,product]},"x")[0]!;
  expect(queueCounts([op,{...op,id:"conflict",status:"conflict"}])).toEqual({pending:1,conflicts:1});
 });
 it("o backup contém a base demonstrativa e a fila, sem indicar sincronização concluída",()=>{
  const base=initialStore();
  const op=changedOperations(base,{...base,products:[...base.products,product]},"x")[0]!;
  const backup=backupEnvelope(base,[op],"x",now);
  expect(backup.format).toBe("ubuntu-pos360-offline-backup");
  expect(backup.pendingOperations).toHaveLength(1);
  expect(backup.exportedAt).toBe(now.toISOString());
  expect(backup.warning).toContain("Dados pessoais");
 });
});
describe("Persistência offline com alternativa localStorage",()=>{
 it("migra o histórico já existente sem o reenviar artificialmente",async()=>{
  const historical={...initialStore(),sales:[sale]};
  localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(historical));
  const boot=await loadOffline();
  expect(boot.mode).toBe("localStorage");
  expect(boot.state.sales[0]!.id).toBe("offline-sale");
  expect(boot.pending).toBe(0);
  expect(await queuedOperations()).toEqual([]);
 });
 it("grava dados e fila pendente sem que o modo online marque operações como enviadas",async()=>{
  const boot=await loadOffline();
  const after={...boot.state,sales:[sale]};
  const changes=changedOperations(boot.state,after,boot.clientId,now);
  const saved=await persistOffline(after,changes,boot.clientId,boot.writeId);
  expect(saved.mode).toBe("localStorage");
  expect(saved.pending).toBe(1);
  expect((await queuedOperations())[0]?.status).toBe("pending");
  expect(JSON.parse(localStorage.getItem("ubuntu-pos360-demo-v1")??"{}").sales).toHaveLength(1);
  const exported=JSON.parse(await exportOfflineBackup(after,boot.clientId));
  expect(exported.pendingOperations).toHaveLength(1);
 });
 it("repor demonstração limpa a fila local, sem criar falsos eventos de exclusão remota",async()=>{
  const boot=await loadOffline();
  const after={...boot.state,sales:[sale]};
  await persistOffline(after,changedOperations(boot.state,after,boot.clientId,now),boot.clientId,boot.writeId);
  expect(await queuedOperations()).toHaveLength(1);
  const result=await persistOffline(initialStore(),[],boot.clientId,null,{reset:true});
  expect(result.pending).toBe(0);
  expect(await queuedOperations()).toEqual([]);
 });
});
