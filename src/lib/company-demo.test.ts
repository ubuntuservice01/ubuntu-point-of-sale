import {describe,it,expect} from "vitest";
import {initialAdminStore} from "./admin-demo";
import {initialCompanyWorkspace,safeCompanyWorkspace,activeStaff,activeBranches,planCapacity,validateBranch,validateEmployee,canDeactivateBranch,canDeactivateEmployee,validateRole,defaultRoles,validateProfile,validateOptions} from "./company-demo";
describe("Administração de empresa",()=>{
 const admin=initialAdminStore("2026-10-11"),tenant=admin.tenants[0]!,state=initialCompanyWorkspace(tenant),plan=admin.plans.find(p=>p.id===tenant.planId);
 it("inicializa com o tenant correcto",()=>{expect(state.tenantId).toBe(tenant.id);expect(safeCompanyWorkspace({...state,tenantId:"outro"},tenant).tenantId).toBe(tenant.id)});
 it("respeita a capacidade do plano",()=>{expect(planCapacity(state,plan).branches.current).toBe(2);expect(planCapacity(state,plan).users.current).toBe(1)});
 it("não admite código de filial repetido",()=>expect(validateBranch({name:"Outra",code:state.branches[0]!.code,city:"Lichinga",address:"",phone:""},state,plan)).toContain("já"));
 it("valida e-mails e filiais",()=>{expect(validateEmployee({name:"Outro",email:"admin@exemplo.invalid",phone:"",roleId:"caixa",branchIds:[state.branches[0]!.id]},state,plan)).toContain("e-mail");expect(validateEmployee({name:"Outro",email:"outro@exemplo.invalid",phone:"",roleId:"caixa",branchIds:["outro"]},state,plan)).toContain("filial")});
 it("protege o último administrador",()=>{expect(canDeactivateEmployee(state.employees[0]!,state)).toBe(false);expect(activeStaff(state)).toHaveLength(1)});
 it("protege filial ainda indispensável a um funcionário",()=>{const mod={...state,employees:state.employees.map(e=>({...e,branchIds:[state.branches[0]!.id]}))};expect(canDeactivateBranch(mod.branches[0]!,mod)).toBe(false);expect(activeBranches(state)).toHaveLength(2)});
 it("preserva o perfil base",()=>expect(defaultRoles().find(r=>r.id==="admin")?.permissions.length).toBeGreaterThan(10));
 it("rejeita permissões desconhecidas",()=>expect(validateRole({id:"outro",name:"Auditor",system:false,description:"",permissions:["desconhecida"]},state)).toContain("desconhecida"));
 it("valida NUIT e descontos",()=>{expect(validateProfile({...state.profile,nuit:"abc"})).toContain("NUIT");expect(validateOptions({...state.options,maxDiscountPercent:120})).toContain("100%")});
});
