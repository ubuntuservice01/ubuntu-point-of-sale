import {describe,it,expect} from "vitest";
import {initialStore,type Product} from "./domain";
import {barcodeCollision,barcodeVariants,findProductByScan,normalizeBarcode,sameBarcode,validBarcode} from "./barcodes";

describe("Reconhecimento e associação de códigos de barras",()=>{
 const example={id:"code-1",name:"Leite teste",sku:"LEI-001",barcode:"7891234567895",category:"Mercearia",unit:"un.",purchasePrice:50,price:65,stock:8,active:true} satisfies Product;
 it("preserva zeros à esquerda e remove espaços de leitura",()=>{
  expect(normalizeBarcode(" 0 123456789012 ")).toBe("0123456789012");
  expect(normalizeBarcode(" lei-001 ")).toBe("LEI-001");
  expect(barcodeVariants("0123456789012")).toContain("123456789012");
 });
 it("trata UPC-A de 12 dígitos e EAN-13 iniciado por zero como equivalentes",()=>{
  expect(sameBarcode("0123456789012","123456789012")).toBe(true);
  expect(sameBarcode("123456789012","0123456789012")).toBe(true);
  expect(sameBarcode("7891234567895","7891234567896")).toBe(false);
 });
 it("procura primeiro o código comercial e depois o SKU",()=>{
  const list=[...initialStore().products,example];
  expect(findProductByScan(list,"7891234567895")?.id).toBe(example.id);
  expect(findProductByScan(list," lei-001 ")?.id).toBe(example.id);
  expect(findProductByScan(list,"ALI-001")?.id).toBe("p1");
  expect(findProductByScan(list,"9999999999999")).toBeUndefined();
 });
 it("não confunde produtos activos e inactivos: o operador deve validar o estado",()=>{
  expect(findProductByScan([{...example,active:false}],"7891234567895")?.active).toBe(false);
 });
 it("recusa códigos inválidos e aceita códigos EAN e internos comuns",()=>{
  expect(validBarcode("7891234567895")).toBe(true);
  expect(validBarcode(" ALI-001 ")).toBe(true);
  expect(validBarcode("   ")).toBe(false);
  expect(validBarcode("ABC")).toBe(false);
  expect(validBarcode("https://example.org")).toBe(false);
 });
 it("impede duplicação de código comercial entre produtos",()=>{
  const other={...example,id:"code-2",sku:"LEI-002",barcode:"1111111111111"};
  expect(barcodeCollision([example],"OUT-001","7891234567895")?.id).toBe(example.id);
  expect(barcodeCollision([example],"OUT-001","LEI-001")?.id).toBe(example.id);
  expect(barcodeCollision([example],"LEI-001","")?.id).toBe(example.id);
  expect(barcodeCollision([example],"LEI-001","",example.id)).toBeUndefined();
  expect(barcodeCollision([example,other],"OUT-001","0000000000000")).toBeUndefined();
 });
 it("deteta colisão EAN-13/UPC-A em produtos diferentes",()=>{
  const product={...example,barcode:"0123456789012"};
  expect(barcodeCollision([product],"NOV-001","123456789012")?.id).toBe(product.id);
 });
});
