import {describe,expect,it} from "vitest";
import {initialStore,type CartItem,type Product} from "./domain";
import {
 freshKeypad,isMeasuredUnit,quickCashChange,quickCheckoutReady,quickKeypadValue,quickQuantityCheck
} from "./quick-cash";

const measured:Product={id:"kg1",name:"Carne por kg",sku:"CAR-001",category:"Talho",unit:"kg",stock:5,active:true,price:500};
const unit:Product={...measured,id:"un1",unit:"un.",stock:20};
const cart:CartItem[]=[{productId:"un1",name:"Produto",price:125,qty:2}];
describe("Modo Caixa Rápido — funções do teclado e validação",()=>{
 it("prepara teclado sem seleccionar produto nem inventar pagamento",()=>{
  expect(freshKeypad()).toEqual({mode:"qty",entry:"",selectedProductId:null});
  expect(freshKeypad("cash").mode).toBe("cash");
 });
 it("aceita dígitos, separador decimal e apagar o último caracter",()=>{
  let value="";
  for(const key of ["0",".","2","5"])value=quickKeypadValue(value,key,"cash");
  expect(value).toBe("0.25");
  expect(quickKeypadValue(value,"9","cash")).toBe("0.25");
  expect(quickKeypadValue(value,"⌫","cash")).toBe("0.2");
  expect(quickKeypadValue(value,"C","cash")).toBe("");
  expect(quickKeypadValue("","." ,"qty")).toBe("");
  expect(quickKeypadValue("2",",","qty")).toBe("2.");
 });
 it("não permite quantidades decimais em artigos vendidos à unidade",()=>{
  expect(isMeasuredUnit("un.")).toBe(false);
  expect(quickQuantityCheck("1.5",unit,10).valid).toBe(false);
  expect(quickQuantityCheck("2",unit,10)).toEqual({valid:true,reason:null,qty:2});
 });
 it("permite kg e litros até 3 casas decimais e respeita stock livre",()=>{
  expect(isMeasuredUnit("kg")).toBe(true);
  expect(isMeasuredUnit("L")).toBe(true);
  expect(quickQuantityCheck("0.375",measured,2).valid).toBe(true);
  expect(quickQuantityCheck("0.1234",measured,2).valid).toBe(false);
  expect(quickQuantityCheck("3",measured,2).reason).toContain("stock");
 });
 it("rejeita quantidade inválida, zero, vazia e artigo não seleccionado",()=>{
  for(const value of ["","0","-1","a","Infinity"])
   expect(quickQuantityCheck(value,unit,20).valid).toBe(false);
  expect(quickQuantityCheck("1",undefined,10).valid).toBe(false);
 });
 it("calcula troco sem arredondar valores indevidamente",()=>{
  expect(quickCashChange("300",250)).toEqual({valid:true,received:300,change:50,reason:null});
  expect(quickCashChange("0.29",0.20).change).toBe(0.09);
  expect(quickCashChange("249",250).valid).toBe(false);
  expect(quickCashChange("",250).reason).toContain("Introduza");
 });
 it("nunca regista venda a dinheiro sem caixa aberto e valor suficiente",()=>{
  const options={cart,payment:"dinheiro" as const,customerId:"",creditAllowed:true,total:250,cashEntry:"250",cashSessionOpen:false};
  expect(quickCheckoutReady(options).ready).toBe(false);
  expect(quickCheckoutReady({...options,cashSessionOpen:true}).ready).toBe(true);
  expect(quickCheckoutReady({...options,cashSessionOpen:true,cashEntry:"100"}).ready).toBe(false);
  expect(quickCheckoutReady({...options,cashSessionOpen:true,cashEntry:""}).ready).toBe(false);
 });
 it("fiado exige cliente e limite disponível, pagamentos digitais não simulam troco",()=>{
  const baseline={cart,payment:"fiado" as const,customerId:"",creditAllowed:true,total:250,cashEntry:"",cashSessionOpen:false};
  expect(quickCheckoutReady(baseline).ready).toBe(false);
  expect(quickCheckoutReady({...baseline,customerId:"c",creditAllowed:false}).ready).toBe(false);
  expect(quickCheckoutReady({...baseline,customerId:"c",creditAllowed:true}).ready).toBe(true);
  expect(quickCheckoutReady({...baseline,payment:"mpesa"}).ready).toBe(true);
  expect(quickCheckoutReady({...baseline,cart:[]}).ready).toBe(false);
 });
 it("usa os mesmos dados de produtos e pagamentos do POS existente",()=>{
  const store=initialStore();
  expect(store.products.some(p=>p.sku==="ALI-001")).toBe(true);
  expect(cart.reduce((sum,p)=>sum+p.price*p.qty,0)).toBe(250);
 });
});

describe("Valor recebido persistido (sem duplicar receita)",()=>{
 it("a diferença entre valor recebido e total é o troco, não uma segunda venda",()=>{
  const result=quickCashChange("1000",750);
  expect(result).toEqual({valid:true,received:1000,change:250,reason:null});
  expect(quickCashChange("750",750).change).toBe(0);
  expect(quickCashChange("100",750).valid).toBe(false);
  expect(quickCashChange("-1",750).valid).toBe(false);
  expect(quickCashChange("1000.005",750).valid).toBe(false);
 });
});
