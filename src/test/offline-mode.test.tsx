import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,renderHook,screen,waitFor} from "@testing-library/react";
import {createElement} from "react";
import {useOfflineStore} from "../hooks/useOfflineStore";
import {OfflineHeaderStatus,OfflineSettingsPanel} from "../components/OfflineStatus";
import {initialStore} from "../lib/domain";

beforeEach(()=>{window.localStorage.clear();vi.stubGlobal("indexedDB",undefined)});
afterEach(()=>{cleanup();vi.unstubAllGlobals();window.localStorage.clear()});
describe("Modo offline preparado para a futura sincronização",()=>{
 it("reconstitui a demonstração do localStorage e preserva vendas antigas",async()=>{
  const old=initialStore();
  old.sales=[{id:"legacy-sale",createdAt:"2026-10-11T11:00:00.000Z",items:[],total:10,method:"emola"}];
  window.localStorage.setItem("ubuntu-pos360-demo-v1",JSON.stringify(old));
  const {result}=renderHook(()=>useOfflineStore());
  await waitFor(()=>expect(result.current.loaded).toBe(true));
  expect(result.current.data.sales[0]?.id).toBe("legacy-sale");
  expect(result.current.overview.pending).toBe(0);
 });
 it("adiciona uma venda à fila local e não marca nada como sincronizado",async()=>{
  const {result}=renderHook(()=>useOfflineStore());
  await waitFor(()=>expect(result.current.loaded).toBe(true));
  act(()=>result.current.setData(old=>({...old,sales:[{
   id:"VD-OFF-1",createdAt:new Date().toISOString(),items:[],total:42,method:"mpesa"
  },...old.sales]})));
  await waitFor(()=>expect(result.current.overview.pending).toBe(1));
  const store=JSON.parse(localStorage.getItem("ubuntu-pos360-demo-v1")??"{}");
  expect(store.sales[0]?.id).toBe("VD-OFF-1");
  expect(result.current.overview.mode).toBe("localStorage");
 });
 it("limpa o diário pendente ao repor a demonstração de forma explícita",async()=>{
  const {result}=renderHook(()=>useOfflineStore());
  await waitFor(()=>expect(result.current.loaded).toBe(true));
  act(()=>result.current.setData(old=>({...old,sales:[{
   id:"VD-OFF-2",createdAt:new Date().toISOString(),items:[],total:15,method:"emola"
  },...old.sales]})));
  await waitFor(()=>expect(result.current.overview.pending).toBe(1));
  act(()=>result.current.resetDemo());
  await waitFor(()=>expect(result.current.overview.pending).toBe(0));
  expect(result.current.data.sales).toHaveLength(0);
 });
 it("indicador mostra offline sem afirmar que o servidor recebeu operações",()=>{
  render(createElement(OfflineHeaderStatus,{
   online:false,overview:{mode:"indexeddb",savedAt:null,pending:8,conflicts:0,error:null,serviceWorker:"ready"},onDetails:vi.fn()
  }));
  expect(screen.getByText("Sem internet")).toBeTruthy();
  expect(screen.getByText("8 pendente(s)")).toBeTruthy();
 });
 it("painel explica ausência de sincronização e permite exportar backup manual",()=>{
  const backup=vi.fn(async()=>{});
  render(createElement(OfflineSettingsPanel,{
   online:false,loaded:true,overview:{mode:"indexeddb",savedAt:null,pending:5,conflicts:0,error:null,serviceWorker:"ready"},
   downloadBackup:backup
  }));
  expect(screen.getByRole("heading",{name:"Modo offline e dados locais"})).toBeTruthy();
  expect(screen.getByText("5 operação(ões)")).toBeTruthy();
  expect(screen.getByText(/não foram enviadas|Não enviadas/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Exportar cópia"}));
  expect(backup).toHaveBeenCalledOnce();
 });
});
