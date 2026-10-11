import {describe,it,expect} from "vitest";
import {initialAdminStore,addDays,tenantStage,assignedModules,projectedMonthlyRevenue,renewalDate,validateCompanyInput,validatePlan,uniqueSlug,tenantMonthlyPrice} from "./admin-demo";
describe("Super Admin demonstrativo",()=>{
 it("tem apenas empresas de exemplo",()=>expect(initialAdminStore("2026-10-11").tenants.every(t=>t.email.endsWith(".invalid"))).toBe(true));
 it("calcula a expiração sem alterar o estado persistido",()=>{
  const t=initialAdminStore("2026-10-11").tenants[0]!;
  expect(tenantStage({...t,expiresAt:"2026-10-10"},"2026-10-11")).toBe("expirada");
  expect(tenantStage({...t,status:"suspensa",expiresAt:"2026-10-10"},"2026-10-11")).toBe("suspensa");
 });
 it("renova a partir da data certa",()=>{
  const t=initialAdminStore("2026-10-11").tenants[0]!;
  expect(renewalDate({...t,expiresAt:"2026-10-20"},30,"2026-10-11")).toBe("2026-11-19");
  expect(renewalDate({...t,expiresAt:"2026-10-01"},30,"2026-10-11")).toBe("2026-11-10");
 });
 it("não duplica identificadores de empresas",()=>{
  const s=initialAdminStore("2026-10-11");
  expect(uniqueSlug("Talho Modelo",s.tenants)).toBe("talho-modelo-2");
 });
 it("combina módulos e calcula previsão sem alegar pagamento",()=>{
  const s=initialAdminStore("2026-10-11"),t=s.tenants[0]!,p=s.plans.find(x=>x.id===t.planId);
  expect(assignedModules(t,p)).toContain("farmacias");
  expect(assignedModules(t,p).filter(m=>m==="pos")).toHaveLength(1);
  expect(tenantMonthlyPrice(t,p)).toBe(2450);
  expect(projectedMonthlyRevenue(s,"2026-10-11")).toBeGreaterThan(0);
 });
 it("valida e-mail e filiais",()=>{
  const s=initialAdminStore("2026-10-11"),t=s.tenants[0]!;
  expect(validateCompanyInput({...t,email:"invalido"},s.plans,"2026-10-11")).toContain("e-mail");
  expect(validateCompanyInput({...t,planId:"basico",branchCount:5},s.plans,"2026-10-11")).toContain("filiais");
 });
 it("protege funcionalidades essenciais",()=>{
  const s=initialAdminStore("2026-10-11");
  expect(validatePlan({...s.plans[0]!,includedModules:["pos"]},s.plans)).toContain("obrigatórios");
 });
 it("muda correctamente de mês",()=>expect(addDays("2026-10-30",3)).toBe("2026-11-02"));
});
