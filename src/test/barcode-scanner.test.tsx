import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {CameraBarcodeScanner} from "../components/CameraBarcodeScanner";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),
  useNavigate:()=>()=>undefined};
});
const media=(mobile:boolean)=>vi.stubGlobal("matchMedia",vi.fn().mockImplementation((query:string)=>({
 matches:mobile&&query==="(max-width:650px)",media:query,
 addEventListener:vi.fn(),removeEventListener:vi.fn(),
 addListener:vi.fn(),removeListener:vi.fn(),dispatchEvent:vi.fn()
})));
beforeEach(()=>{
 window.localStorage.clear();media(true);
 vi.stubGlobal("isSecureContext",true);
 vi.stubGlobal("BarcodeDetector",undefined);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();window.localStorage.clear()});
const openSaleScanner=()=>{
 render(createElement(UbuntuApp));
 fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação rápida móvel"})).getByRole("button",{name:"Vender"}));
 fireEvent.click(screen.getByRole("button",{name:"Ler código de barras com a câmara"}));
 return screen.getByRole("dialog",{name:"Ler código para vender"});
};
describe("Leitor de código de barras do POS",()=>{
 it("em navegadores sem suporte mantém a procura manual e acrescenta o SKU ao carrinho",async()=>{
  const scanner=openSaleScanner();
  expect(within(scanner).getByText(/não suporta a leitura automática/)).toBeTruthy();
  fireEvent.change(within(scanner).getByRole("textbox",{name:/introduza o código manualmente/i}),{target:{value:"ALI-001"}});
  fireEvent.click(within(scanner).getByRole("button",{name:"Procurar"}));
  await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Ler código para vender"})).toBeNull());
  expect(screen.getByText("1 itens")).toBeTruthy();
  expect(screen.getAllByText("Arroz 5 kg").length).toBeGreaterThan(0);
 });
 it("código não registado permite abrir o cadastro e preencher o código, sem venda fictícia",async()=>{
  const scanner=openSaleScanner();
  fireEvent.change(within(scanner).getByRole("textbox",{name:/introduza o código manualmente/i}),{target:{value:"7891234567895"}});
  fireEvent.click(within(scanner).getByRole("button",{name:"Procurar"}));
  expect(within(scanner).getByText(/não pertence a nenhum produto/)).toBeTruthy();
  fireEvent.click(within(scanner).getByRole("button",{name:/Registar produto com este código/}));
  const form=screen.getByRole("dialog",{name:"Adicionar produto"});
  expect(within(form).getByRole("textbox",{name:"Código / SKU"}).getAttribute("value")).toBe("7891234567895");
  expect(within(form).getByRole("textbox",{name:"Código de barras (opcional)"})).toHaveProperty("value","7891234567895");
 });
 it("na edição do produto pode ler pela câmara e regressar ao formulário",async()=>{
  render(createElement(UbuntuApp));
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação rápida móvel"})).getByRole("button",{name:"Produtos"}));
  fireEvent.click(screen.getByRole("button",{name:"Adicionar produto"}));
  const modal=screen.getByRole("dialog",{name:"Adicionar produto"});
  fireEvent.click(within(modal).getByRole("button",{name:/Ler código com a câmara/}));
  const scanner=screen.getByRole("dialog",{name:"Ler código para o cadastro"});
  expect(screen.queryByRole("dialog",{name:"Adicionar produto"})).toBeNull();
  fireEvent.change(within(scanner).getByRole("textbox",{name:/introduza o código manualmente/i}),{target:{value:"123456789012"}});
  fireEvent.click(within(scanner).getByRole("button",{name:"Procurar"}));
  await waitFor(()=>expect(screen.getByRole("dialog",{name:"Adicionar produto"})).toBeTruthy());
  expect(within(screen.getByRole("dialog",{name:"Adicionar produto"})).getByRole("textbox",{name:"Código de barras (opcional)"})).toHaveProperty("value","123456789012");
 });
 it("não associa código comercial já registado a um segundo SKU",()=>{
  render(createElement(UbuntuApp));
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação rápida móvel"})).getByRole("button",{name:"Produtos"}));
  fireEvent.click(screen.getByRole("button",{name:"Adicionar produto"}));
  const modal=screen.getByRole("dialog",{name:"Adicionar produto"});
  fireEvent.change(within(modal).getByRole("textbox",{name:"Nome do produto"}),{target:{value:"Produto Teste"}});
  fireEvent.change(within(modal).getByRole("textbox",{name:"Código / SKU"}),{target:{value:"TEST-123"}});
  fireEvent.change(within(modal).getByRole("textbox",{name:"Código de barras (opcional)"}),{target:{value:"ALI-001"}});
  fireEvent.change(within(modal).getByRole("spinbutton",{name:"Preço de compra (MZN)"}),{target:{value:"50"}});
  fireEvent.change(within(modal).getByRole("spinbutton",{name:"Preço de venda (MZN)"}),{target:{value:"65"}});
  fireEvent.change(within(modal).getByRole("spinbutton",{name:"Stock inicial"}),{target:{value:"4"}});
  fireEvent.click(within(modal).getByRole("button",{name:"Guardar produto"}));
  expect(screen.getByRole("alert").textContent).toContain("já está associado ao produto");
 });
 it("ao fechar o leitor pára as faixas de vídeo e não mantém a câmara ligada",async()=>{
  const stop=vi.fn();
  const detector=vi.fn(async()=>[{rawValue:"ALI-001"}]);
  const callbacks:FrameRequestCallback[]=[];
  class FakeDetector{
   static getSupportedFormats=async()=>["code_128"];
   detect=detector;
  }
  vi.stubGlobal("BarcodeDetector",FakeDetector);
  const getUserMedia=vi.fn(async()=>({getTracks:()=>[{stop}]}));
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia}});
  vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>{});
  Object.defineProperty(HTMLMediaElement.prototype,"readyState",{configurable:true,get:()=>4});
  vi.stubGlobal("requestAnimationFrame",vi.fn((callback:FrameRequestCallback)=>{callbacks.push(callback);return callbacks.length}));
  vi.stubGlobal("cancelAnimationFrame",vi.fn());
  const close=vi.fn(),onRead=vi.fn(()=>({kind:"added" as const}));
  render(createElement(CameraBarcodeScanner,{onClose:close,onRead}));
  await waitFor(()=>expect(getUserMedia).toHaveBeenCalledOnce());
  await waitFor(()=>expect(screen.getByText("A procurar código…")).toBeTruthy());
  await act(async()=>{callbacks.shift()?.(500);await Promise.resolve();});
  await waitFor(()=>expect(onRead).toHaveBeenCalledWith("ALI-001"));
  expect(stop).toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
 });
});
