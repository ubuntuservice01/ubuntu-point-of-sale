import {describe,it,expect} from "vitest";
import {initialStore,safeStore} from "./domain";
import {registerPurchase,registerSupplier} from "./commercial";
import {grossUnitDifference,grossUnitDifferencePercent,hasPurchasePrice,validUnitPrice} from "./product-pricing";

describe("Preços de compra e venda",()=>{
 it("exige valores positivos e até 2 casas decimais",()=>{
  expect(validUnitPrice(55.50)).toBe(true);
  expect(validUnitPrice(.01)).toBe(true);
  expect(validUnitPrice(0)).toBe(false);
  expect(validUnitPrice(-12)).toBe(false);
  expect(validUnitPrice(5.123)).toBe(false);
  expect(validUnitPrice(Number.NaN)).toBe(false);
 });
 it("nunca inventa preço de compra para produtos antigos",()=>{
  const saved=safeStore(initialStore());
  const product=saved.products[0]!;
  expect(hasPurchasePrice(product)).toBe(false);
  expect(grossUnitDifference(product)).toBe(null);
  expect(grossUnitDifferencePercent(product)).toBe(null);
 });
 it("calcula diferença bruta por unidade, incluindo diferença negativa",()=>{
  const original=initialStore().products[0]!;
  const product={...original,purchasePrice:300,price:385};
  expect(grossUnitDifference(product)).toBe(85);
  expect(grossUnitDifferencePercent(product)).toBe(22.08);
  expect(grossUnitDifference({...product,purchasePrice:400})).toBe(-15);
 });
 it("ao receber uma compra actualiza preço de compra de referência, sem alterar preço de venda",()=>{
  let s=registerSupplier(initialStore(),{name:"Fornecedor teste",phone:"",email:"",city:"Lichinga"});
  s=registerPurchase(s,s.suppliers[0]!.id,[{productId:"p1",qty:2,unitCost:325}],"FACT-01",false,"emola");
  const product=s.products.find(p=>p.id==="p1")!;
  expect(product.purchasePrice).toBe(325);
  expect(product.price).toBe(385);
  expect(grossUnitDifference(product)).toBe(60);
  expect(s.purchases[0]?.items[0]?.unitCost).toBe(325);
 });
});
