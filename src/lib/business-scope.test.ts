import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
import {loadOffline,persistOffline,queuedOperations} from "./offline-db";
import {scopedOfflineKey,OFFLINE_LEGACY_KEY,OFFLINE_LOCAL_JOURNAL_KEY,changedOperations} from "./offline-model";
import {initialStore} from "./domain";
beforeEach(()=>{localStorage.clear();vi.stubGlobal("indexedDB",undefined)});
afterEach(()=>{localStorage.clear();vi.unstubAllGlobals()});
describe("Isolamento demonstrativo dos dados por tenant",()=>{
 it("escopos diferentes usam nomes únicos no armazenamento sem alterar o POS legado",()=>{
  expect(scopedOfflineKey(OFFLINE_LEGACY_KEY)).toBe(OFFLINE_LEGACY_KEY);
  expect(scopedOfflineKey(OFFLINE_LEGACY_KEY,"empresa-a")).not.toBe(scopedOfflineKey(OFFLINE_LEGACY_KEY,"empresa-b"));
  expect(scopedOfflineKey(OFFLINE_LOCAL_JOURNAL_KEY,"empresa-a")).not.toBe(scopedOfflineKey(OFFLINE_LOCAL_JOURNAL_KEY,"empresa-b"));
 });
 it("nunca importa vendas do POS comum para uma nova empresa",async()=>{
  const old=initialStore();old.sales=[{id:"legacy",items:[],total:90,createdAt:"2026-10-10",method:"dinheiro"}];
  localStorage.setItem(OFFLINE_LEGACY_KEY,JSON.stringify(old));
  const tenant=await loadOffline("empresa-a");
  expect(tenant.state.sales).toEqual([]);
  expect(tenant.state.products).toEqual([]);
  const general=await loadOffline();
  expect(general.state.sales[0]?.id).toBe("legacy");
 });
 it("vendas de empresa A não aparecem em empresa B e ambos têm outbox independente",async()=>{
  const a=await loadOffline("empresa-a");
  const b=await loadOffline("empresa-b");
  const data={...a.state,sales:[{id:"A-001",items:[],total:100,method:"dinheiro" as const,createdAt:"2026-10-12"}]};
  const ops=changedOperations(a.state,data,a.clientId);
  const saved=await persistOffline(data,ops,a.clientId,a.writeId,{},"empresa-a");
  expect(saved.pending).toBe(1);
  expect((await loadOffline("empresa-a")).state.sales[0]!.id).toBe("A-001");
  expect((await loadOffline("empresa-b")).state.sales).toEqual([]);
  expect(await queuedOperations("empresa-b")).toEqual([]);
  expect((await queuedOperations("empresa-a")).length).toBe(1);
  expect(localStorage.getItem(scopedOfflineKey(OFFLINE_LEGACY_KEY,"empresa-a"))).toContain("A-001");
  expect(localStorage.getItem(scopedOfflineKey(OFFLINE_LEGACY_KEY,"empresa-b"))).toBeNull();
 });
});
