import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {createElement} from "react";
import {UbuntuApp} from "../components/UbuntuApp";
import {QuickCash,type QuickCashProps} from "../components/QuickCash";
import {initialStore,type CartItem,type Product} from "../lib/domain";

vi.mock("@tanstack/react-router",async()=>{
 const React=await import("react");
 return {Link:({to,children,...props}:{to:string;children?:React.ReactNode;[key:string]:unknown})=>
  React.createElement("a",{...props,href:to},children),useNavigate:()=>()=>undefined};
});
const product:Product={id:"p1",name:"Arroz 5 kg",sku:"ALI-001",category:"Mercearia",unit:"un.",price:125,stock:9,active:true};
const item:CartItem={productId:"p1",name:product.name,price:125,qty:2};
const setup=(override:Partial<QuickCashProps>={})=>{
 const mocks={checkout:vi.fn(),delta:vi.fn(),exact:vi.fn(),clear:vi.fn(),payment:vi.fn(),openCash:vi.fn(),camera:vi.fn(),newCustomer:vi.fn()};
 const props:QuickCashProps={
  products:[product],cart:[item],payment:"dinheiro",customers:[],
  customerId:"",creditDueDate:"",total:250,cashOpen:true,disabled:false,
  reserved:()=>0,controlledByLot:()=>false,onAdd:()=>true,onScan:()=>true,onCamera:mocks.camera,
  onQtyDelta:mocks.delta,onQtyExact:mocks.exact,onRemove:vi.fn(),onClear:mocks.clear,
  onPayment:mocks.payment,onCustomer:vi.fn(),onDueDate:vi.fn(),onCheckout:mocks.checkout,
  onOpenCash:mocks.openCash,onNewCustomer:mocks.newCustomer,...override
 };
 render(createElement(QuickCash,props));
 const root=screen.getByRole("region",{name:"Modo Caixa Rápido"});
 return {root,mocks};
};
beforeEach(()=>{
 window.localStorage.clear();
 vi.stubGlobal("matchMedia",vi.fn().mockImplementation((q:string)=>({
  matches:false,media:q,addEventListener:vi.fn(),removeEventListener:vi.fn(),
  addListener:vi.fn(),removeListener:vi.fn()
 })));
});
afterEach(()=>{cleanup();window.localStorage.clear();vi.unstubAllGlobals();vi.restoreAllMocks()});
describe("Caixa rápido — interface do operador",()=>{
 it("apresenta botões grandes, catálogo e teclas de atalho no ecrã",()=>{
  const {root}=setup();
  expect(within(root).getByRole("heading",{name:"Caixa rápido"})).toBeTruthy();
  expect(within(root).getByRole("button",{name:"Adicionar Arroz 5 kg"})).toBeTruthy();
  expect(within(root).getByRole("group",{name:"Teclado numérico grande"})).toBeTruthy();
  expect(within(root).getByText("F2")).toBeTruthy();
  expect(within(root).getByText("F4")).toBeTruthy();
  expect(within(root).getByText("F8")).toBeTruthy();
 });
 it("edita quantidade seleccionada com teclado e respeita callback do POS",()=>{
  const {root,mocks}=setup();
  fireEvent.click(within(root).getByRole("button",{name:/Seleccionar Arroz 5 kg para alterar quantidade/}));
  fireEvent.click(within(root).getByRole("button",{name:"3"}));
  expect(within(root).getByTestId("quick-keypad-display").textContent).toBe("3");
  fireEvent.click(within(root).getByRole("button",{name:"Aplicar quantidade"}));
  expect(mocks.exact).toHaveBeenCalledWith("p1",3);
 });
 it("não permite alterar quantidades superiores ao stock livre",()=>{
  const {root,mocks}=setup({reserved:()=>8});
  fireEvent.click(within(root).getByRole("button",{name:/Seleccionar Arroz 5 kg para alterar quantidade/}));
  fireEvent.click(within(root).getByRole("button",{name:"3"}));
  expect((within(root).getByRole("button",{name:"Aplicar quantidade"}) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.exact).not.toHaveBeenCalled();
 });
 it("calcula troco e usa F4 para registar sem criar um fluxo de venda alternativo",()=>{
  const {root,mocks}=setup();
  fireEvent.click(within(root).getByRole("button",{name:"Valor recebido"}));
  fireEvent.click(within(root).getByRole("button",{name:"3"}));
  fireEvent.click(within(root).getByRole("button",{name:"0"}));
  fireEvent.click(within(root).getByRole("button",{name:"0"}));
  expect(within(root).getByText("Troco previsto")).toBeTruthy();
  expect(within(root).getByText(/50,00/)).toBeTruthy();
  fireEvent.keyDown(window,{key:"F4"});
  expect(mocks.checkout).toHaveBeenCalledTimes(1);
 });
 it("bloqueia registo de dinheiro se caixa fechado, mesmo com troco calculado",()=>{
  const {root,mocks}=setup({cashOpen:false});
  fireEvent.click(within(root).getByRole("button",{name:"Valor recebido"}));
  fireEvent.click(within(root).getByRole("button",{name:"Valor exacto"}));
  expect((within(root).getByRole("button",{name:/Registar venda/}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(root).getByRole("button",{name:/Abrir caixa/}));
  expect(mocks.openCash).toHaveBeenCalledTimes(1);
 });
 it("atualiza forma de pagamento e impede fiado sem cliente",()=>{
  const {root,mocks}=setup({payment:"fiado",customerId:"",cashOpen:false});
  expect((within(root).getByRole("button",{name:/Registar venda/}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(root).getByRole("button",{name:"M-Pesa"}));
  expect(mocks.payment).toHaveBeenCalledWith("mpesa");
  fireEvent.click(within(root).getByRole("button",{name:"Registar cliente no caixa rápido"}));
  expect(mocks.newCustomer).toHaveBeenCalledOnce();
 });
 it("F2 foca procura e F8 permite limpar a venda, sem limpar ao digitar",()=>{
  const {root,mocks}=setup();
  const search=within(root).getByRole("textbox",{name:"Pesquisar código ou produto no caixa rápido"});
  fireEvent.keyDown(window,{key:"F2"});
  expect(document.activeElement).toBe(search);
  fireEvent.keyDown(window,{key:"F8"});
  expect(mocks.clear).not.toHaveBeenCalled();
  search.blur();
  fireEvent.keyDown(window,{key:"F8"});
  expect(mocks.clear).toHaveBeenCalledTimes(1);
 });
 it("o scanner de câmara mantém o botão de leitura existente",()=>{
  const {root,mocks}=setup();
  fireEvent.click(within(root).getByRole("button",{name:"Ler código pela câmara no caixa rápido"}));
  expect(mocks.camera).toHaveBeenCalledOnce();
 });
});
describe("Caixa rápido integrado no POS existente",()=>{
 it("alternar normal/rápido preserva os produtos já adicionados ao carrinho",async()=>{
  render(createElement(UbuntuApp));
  await waitFor(()=>expect(screen.queryByText("A recuperar os dados do POS neste dispositivo…")).toBeNull());
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação principal"})).getByRole("button",{name:"Ponto de venda"}));
  fireEvent.click(screen.getByRole("button",{name:/Arroz 5 kg/}));
  expect(screen.getByText("1 itens")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Modo Caixa Rápido"}));
  const root=screen.getByRole("region",{name:"Modo Caixa Rápido"});
  expect(within(root).getByText("Venda actual")).toBeTruthy();
  expect(within(root).getByText("Arroz 5 kg")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Modo normal"}));
  expect(screen.getByText("1 itens")).toBeTruthy();
 });
 it("reconhece scanner USB no Caixa Rápido, sem duplicar carrinhos",async()=>{
  render(createElement(UbuntuApp));
  await waitFor(()=>expect(screen.queryByText("A recuperar os dados do POS neste dispositivo…")).toBeNull());
  fireEvent.click(within(screen.getByRole("navigation",{name:"Navegação principal"})).getByRole("button",{name:"Ponto de venda"}));
  fireEvent.click(screen.getByRole("button",{name:"Modo Caixa Rápido"}));
  let stamp=100;
  act(()=>{
   for(const key of "ALI-001"){
    const e=new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true});
    Object.defineProperty(e,"timeStamp",{value:stamp});document.dispatchEvent(e);stamp+=10;
   }
   const e=new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true});
   Object.defineProperty(e,"timeStamp",{value:stamp+10});document.dispatchEvent(e);
  });
  const root=screen.getByRole("region",{name:"Modo Caixa Rápido"});
  expect(within(root).getAllByText("Arroz 5 kg").length).toBeGreaterThan(0);
  expect(within(root).getByText("1 artigos")).toBeTruthy();
 });
});
