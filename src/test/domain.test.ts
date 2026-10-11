import {describe,expect,it} from "vitest";
import {calcTotal,initialStore,money,roundMoney,slugify,safeStore} from "../lib/domain";
describe("núcleo demonstrativo Ubuntu POS 360",()=>{
 it("calcula totais monetários sem imposto presumido",()=>{expect(calcTotal([{productId:"1",name:"Arroz",price:125.5,qty:2}])).toBe(251);});
 it("arredonda valores a duas casas",()=>{expect(roundMoney(10.235)).toBe(10.24);});
 it("cria identificador legível e seguro para empresa",()=>{expect(slugify("Talho São João!")).toBe("talho-sao-joao");});
 it("usa meticais",()=>{expect(money(1250)).toContain("MZN");});
 it("repõe estado se dados persistidos forem inválidos",()=>{expect(safeStore({bad:true})).toEqual(initialStore());});
});
