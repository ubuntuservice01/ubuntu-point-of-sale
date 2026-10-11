import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {playSuccessfulScanBeep} from "../lib/scan-feedback";

vi.mock("../lib/scan-feedback",()=>({
 prepareScanAudio:vi.fn(()=>true),
 playSuccessfulScanBeep:vi.fn(()=>true)
}));
vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),
  useNavigate:()=>()=>undefined};
});
function desktop(){
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:query==="(min-width:651px)",media:query,
  addEventListener:vi.fn(),removeEventListener:vi.fn()
 })));
}
function mobile(){
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
  matches:query==="(max-width:650px)",media:query,
  addEventListener:vi.fn(),removeEventListener:vi.fn()
 })));
}
function keyboardScan(code:string,{suffix="Enter",target=document}:{suffix?:string;target?:Document|HTMLElement}={}){
 let stamp=100;
 act(()=>{
  for(const key of code){
   const event=new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true});
   Object.defineProperty(event,"timeStamp",{value:stamp});
   target.dispatchEvent(event);stamp+=11;
  }
  const end=new KeyboardEvent("keydown",{key:suffix,bubbles:true,cancelable:true});
  Object.defineProperty(end,"timeStamp",{value:stamp+12});
  target.dispatchEvent(end);
 });
}
function startPos(){
 render(createElement(UbuntuApp));
 const nav=screen.getByRole("navigation",{name:"Navegação principal"});
 fireEvent.click(within(nav).getByRole("button",{name:"Ponto de venda"}));
}
beforeEach(()=>{window.localStorage.clear();vi.mocked(playSuccessfulScanBeep).mockClear();desktop()});
afterEach(()=>{cleanup();window.localStorage.clear();vi.unstubAllGlobals()});

describe("Scanner USB como teclado e bip de confirmação",()=>{
 it("regista leituras USB mesmo sem focar pesquisa, em desktop, com um bip por artigo",()=>{
  startPos();
  expect(screen.getByText("Leitor de códigos USB (modo teclado)")).toBeTruthy();
  keyboardScan("ALI-001");
  expect(vi.mocked(playSuccessfulScanBeep)).toHaveBeenCalledTimes(1);
  expect(screen.getByText("1 itens")).toBeTruthy();
  keyboardScan("ALI-001",{suffix:"Tab"});
  expect(vi.mocked(playSuccessfulScanBeep)).toHaveBeenCalledTimes(2);
  expect(screen.getByText("2 itens")).toBeTruthy();
 });
 it("ignora códigos inexistentes sem emitir som",()=>{
  startPos();keyboardScan("NAO-999");
  expect(vi.mocked(playSuccessfulScanBeep)).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain("não encontrado");
  expect(screen.getByText("0 itens")).toBeTruthy();
 });
 it("não intercepta digitação em campos editáveis nem teclas modificadoras",()=>{
  startPos();
  const search=screen.getByRole("textbox",{name:"Pesquisar produto"});
  search.focus();
  keyboardScan("ALI-001",{target:search});
  expect(vi.mocked(playSuccessfulScanBeep)).not.toHaveBeenCalled();
  keyboardScan("ALI-001",{target:document});
  expect(vi.mocked(playSuccessfulScanBeep)).toHaveBeenCalledTimes(1);
 });
 it("a procura por SKU no campo principal também confirma a entrada com bip",()=>{
  startPos();
  const search=screen.getByRole("textbox",{name:"Pesquisar produto"});
  fireEvent.change(search,{target:{value:"ALI-001"}});
  fireEvent.keyDown(search,{key:"Enter"});
  expect(vi.mocked(playSuccessfulScanBeep)).toHaveBeenCalledOnce();
  expect(screen.getByText("1 itens")).toBeTruthy();
 });
 it("não produz som quando a quantidade ultrapassa o stock disponível",()=>{
  startPos();
  for(let i=0;i<7;i++)keyboardScan("ALI-005");
  expect(vi.mocked(playSuccessfulScanBeep)).toHaveBeenCalledTimes(6);
  expect(screen.getByText("6 itens")).toBeTruthy();
 });
 it("ao mudar para um ecrã diferente desactiva automaticamente o scanner global",()=>{
  startPos();
  const nav=screen.getByRole("navigation",{name:"Navegação principal"});
  fireEvent.click(within(nav).getByRole("button",{name:"Visão geral"}));
  keyboardScan("ALI-001");
  expect(vi.mocked(playSuccessfulScanBeep)).not.toHaveBeenCalled();
 });
 it("num telemóvel não intercepta teclas externas e mantém a leitura por câmara",()=>{
  mobile();
  render(createElement(UbuntuApp));
  const nav=screen.getByRole("navigation",{name:"Navegação rápida móvel"});
  fireEvent.click(within(nav).getByRole("button",{name:"Vender"}));
  keyboardScan("ALI-001");
  expect(vi.mocked(playSuccessfulScanBeep)).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Ler código de barras com a câmara"}));
  const dialog=screen.getByRole("dialog",{name:"Ler código para vender"});
  fireEvent.change(within(dialog).getByRole("textbox",{name:/introduza o código manualmente/i}),{target:{value:"ALI-001"}});
  fireEvent.click(within(dialog).getByRole("button",{name:"Procurar"}));
  expect(vi.mocked(playSuccessfulScanBeep)).toHaveBeenCalledTimes(1);
 });
});
