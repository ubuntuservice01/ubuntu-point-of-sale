import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {createElement} from "react";
import {ThermalReceiptPanel,ThermalReceiptPreview,ThermalReceiptSettingsPanel} from "../components/ThermalReceipt";
import {defaultThermalReceiptSettings} from "../lib/thermal-receipt";
import {initialStore,type Sale,type Store} from "../lib/domain";
afterEach(()=>{cleanup();vi.restoreAllMocks()});
const mkSale=(method:Sale["method"]="mpesa"):Sale=>({
 id:"VD-DM-005",createdAt:"2026-10-11T10:00:00.000Z",
 items:[{productId:"p1",name:"Arroz 5 kg",qty:2,price:385}],total:770,method
});
function mkStore():Store{return {...initialStore(),receiptSettings:{...defaultThermalReceiptSettings(),businessName:"Mercearia Niassa",address:"Lichinga",phone:"841234567",nuit:""}};}
describe("Experiência de impressão térmica",()=>{
 it("imprime a referência e aviso não fiscal em 58 mm, sem expor NUIT falso",()=>{
  render(createElement(ThermalReceiptPreview,{sale:mkSale(),store:mkStore(),paper:"58mm"}));
  const receipt=screen.getByRole("region",{name:"Comprovativo não fiscal VD-DM-005"});
  expect(receipt.classList.contains("thermal-receipt-58mm")).toBe(true);
  expect(within(receipt).getByText("Mercearia Niassa")).toBeTruthy();
  expect(within(receipt).getAllByText(/NÃO FISCAL/).length).toBeGreaterThan(0);
  expect(within(receipt).getByText(/VD-DM-005/)).toBeTruthy();
  expect(within(receipt).getByRole("img",{name:/QR Code/})).toBeTruthy();
  expect(within(receipt).queryByText(/NUIT informado/)).toBeNull();
 });
 it("mostra valor recebido e troco congelados no comprovativo de dinheiro",()=>{
  const sale={...mkSale("dinheiro"),cashReceived:1000,cashChange:230};
  render(createElement(ThermalReceiptPreview,{sale,store:mkStore(),paper:"58mm"}));
  const receipt=screen.getByRole("region",{name:"Comprovativo não fiscal VD-DM-005"});
  expect(within(receipt).getByText("Dinheiro recebido")).toBeTruthy();
  expect(within(receipt).getByText("Troco calculado")).toBeTruthy();
  expect(within(receipt).getByText("1 000,00 MZN")).toBeTruthy();
  expect(within(receipt).getByText("230,00 MZN")).toBeTruthy();
 });
 it("não inventa valor recebido em vendas antigas ou com outros meios",()=>{
  const {rerender}=render(createElement(ThermalReceiptPreview,{sale:mkSale("dinheiro"),store:mkStore(),paper:"80mm"}));
  expect(screen.queryByText("Dinheiro recebido")).toBeNull();
  rerender(createElement(ThermalReceiptPreview,{sale:{...mkSale("mpesa"),cashReceived:900,cashChange:130},store:mkStore(),paper:"80mm"}));
  expect(screen.queryByText("Dinheiro recebido")).toBeNull();
 });
 it("uma venda a fiado avisa que não é um pagamento recebido",()=>{
  render(createElement(ThermalReceiptPreview,{sale:mkSale("fiado"),store:mkStore(),paper:"80mm"}));
  expect(screen.getByText(/VENDA A FIADO/)).toBeTruthy();
  expect(screen.getByText(/Não comprova pagamento real/)).toBeTruthy();
 });
 it("permitir mudar 58/80 mm e imprimir sem mudar os dados da venda",()=>{
  const store=mkStore(),print=vi.fn(),setPaper=vi.fn(),finish=vi.fn();
  vi.stubGlobal("print",print);
  render(createElement(ThermalReceiptPanel,{sale:mkSale(),store,newSale:true,onFinish:finish,onPaperChange:setPaper}));
  expect(screen.getByText(/Venda registada na demonstração/)).toBeTruthy();
  expect(screen.getByLabelText("Largura do papel")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Largura do papel"),{target:{value:"58mm"}});
  expect(setPaper).toHaveBeenCalledWith("58mm");
  fireEvent.click(screen.getByRole("button",{name:"Imprimir comprovativo"}));
  expect(print).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button",{name:"Continuar a vender"}));
  expect(finish).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
 });
 it("configura dados reais fornecidos pelo operador e mantém campos facultativos",()=>{
  const save=vi.fn();
  render(createElement(ThermalReceiptSettingsPanel,{value:defaultThermalReceiptSettings(),onSave:save}));
  fireEvent.change(screen.getByRole("textbox",{name:"Nome comercial do estabelecimento"}),{target:{value:"Loja do Bairro"}});
  fireEvent.change(screen.getByRole("combobox",{name:"Largura predefinida do rolo"}),{target:{value:"58mm"}});
  fireEvent.click(screen.getByRole("button",{name:"Guardar configuração"}));
  expect(save).toHaveBeenCalledOnce();
  expect(save.mock.calls[0]![0].businessName).toBe("Loja do Bairro");
  expect(save.mock.calls[0]![0].paper).toBe("58mm");
 });
 it("permite ocultar QR sem remover os avisos de documento não fiscal",()=>{
  const store=mkStore();store.receiptSettings.showQr=false;
  render(createElement(ThermalReceiptPreview,{sale:mkSale(),store,paper:"80mm"}));
  expect(screen.queryByRole("img",{name:/QR Code/})).toBeNull();
  expect(screen.getAllByText(/não fiscal/i).length).toBeGreaterThan(0);
 });
});
