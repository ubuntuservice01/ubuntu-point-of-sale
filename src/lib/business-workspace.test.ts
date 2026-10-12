import {describe,expect,it} from "vitest";
import {initialAdminStore,type AdminTenant} from "./admin-demo";
import {baseBusinessSections,businessAllows,businessKind,businessMenuGroups,BUSINESS_CONFIG,
 emptyBusinessStore,mandatorySectorAddon,resolveBusinessWorkspace,sectorServiceSections,SECTOR_SERVICE_SECTIONS} from "./business-workspace";
import {dateISO,addDays} from "./admin-demo";
import {roleCanSection} from "./operators";

const today="2026-10-12";
const admin=initialAdminStore(today);
function tenant(id:string,sector:string,addons:string[],status:AdminTenant["status"]="activa"):AdminTenant{
 return {id,name:"Empresa "+id,slug:id,sector,city:"Lichinga",responsible:"Responsável",
 email:id+"@exemplo.invalid",phone:"840000000",planId:"basico",status,createdAt:addDays(today,-3),
 expiresAt:addDays(today,100),branchCount:1,addons,notes:"Demonstração"};
}
describe("Contrato comercial — área de trabalho por negócio",()=>{
 it("cada sector tem módulo canónico e atalhos próprios",()=>{
  const expected=[["Loja","loja",[]],["Mercearia","loja",[]],["Farmácia","farmacia",["farmacias"]],
   ["Restaurante","restaurante",["restaurantes"]],["Bar","bar",["bares"]],
   ["Talho","talho",["talhos"]],["Padaria","padaria",["padarias"]],["Grossista","grossista",["grossistas"]]] as const;
  for(const [sector,kind,addons] of expected){
   expect(businessKind(sector)).toBe(kind);
   expect(mandatorySectorAddon(sector)).toEqual(addons);
   expect(BUSINESS_CONFIG[kind].shortcuts.length).toBeGreaterThan(2);
  }
 });
 it("Farmácia recebe serviços comuns e FEFO, mas não vê talho, bar ou restaurante",()=>{
  const business=resolveBusinessWorkspace(admin,"demo-farm",today)!;
  expect(business.kind).toBe("farmacia");
  expect(business.licensed).toBe(true);
  expect(businessAllows(business,"farmacia")).toBe(true);
  for(const s of ["pos","cash","products","inventory","purchases","suppliers","customers","reports","returns","operators"] as const)
   expect(businessAllows(business,s)).toBe(true);
  for(const s of ["talho","restaurante","bar","producao","grossistas","companies","modules"] as const)
   expect(businessAllows(business,s)).toBe(false);
  const menu=businessMenuGroups(business);
  expect(menu[0]!.label).toBe("O meu negócio");
  expect(menu.flatMap(g=>g.sections)).toContain("farmacia");
  expect(menu.flatMap(g=>g.sections)).not.toContain("talho");
 });
 it("Talho vê peso/cortes e serviços do comércio, sem Farmácia",()=>{
  const b=resolveBusinessWorkspace(admin,"demo-talho",today)!;
  expect(b.kind).toBe("talho");
  expect(b.sections.has("talho")).toBe(true);
  expect(b.sections.has("farmacia")).toBe(false);
  expect(b.sections.has("pos")).toBe(true);
  expect(b.sections.has("purchases")).toBe(true);
  expect(b.sections.has("reports")).toBe(true);
 });
 it("Restaurante vê mesas, comandas e caixa; não vê outros sectores",()=>{
  const b=resolveBusinessWorkspace(admin,"demo-rest",today)!;
  expect(b.kind).toBe("restaurante");
  expect(b.sections.has("restaurante")).toBe(true);
  expect(b.sections.has("talho")).toBe(false);
  expect(b.sections.has("farmacia")).toBe(false);
  expect(b.sections.has("cash")).toBe(true);
  expect(b.sections.has("catalogo")).toBe(true);
 });
 it("sectores Bar, Padaria, Grossista e Mercearia geram navegação independente",()=>{
  for(const kind of ["bar","padaria","grossista","loja"] as const){
   const addon=mandatorySectorAddon(kind==="loja"?"Loja":kind);
   const source={...admin,tenants:[tenant("t-"+kind,kind,addon)]};
   const b=resolveBusinessWorkspace(source,"t-"+kind,today)!;
   expect(b.licensed).toBe(true);
   expect(b.sections.has("pos")).toBe(true);
   const sectors=["farmacia","talho","bar","restaurante","producao","grossistas"];
   expect(sectors.filter(s=>b.sections.has(s as "farmacia"))).toEqual(b.speciality?[b.speciality]:[]);
   expect(businessMenuGroups(b).some(g=>g.sections.includes("pos"))).toBe(true);
  }
 });
 it("módulos digitais só aparecem quando contratados",()=>{
  const addons=mandatorySectorAddon("Farmácia");
  const company=tenant("f0","Farmácia",addons);
  const source={...admin,tenants:[company]};
  let b=resolveBusinessWorkspace(source,"f0",today)!;
  expect(b.sections.has("catalogo")).toBe(false);
  expect(b.sections.has("entregas")).toBe(false);
  source.tenants[0]={...company,addons:[...addons,"catalogo","entregas"]};
  b=resolveBusinessWorkspace(source,"f0",today)!;
  expect(b.sections.has("catalogo")).toBe(true);
  expect(b.sections.has("encomendas-online")).toBe(true);
  expect(b.sections.has("entregas")).toBe(true);
 });
 it("retirar o sector obrigatório bloqueia o workspace; outros addons verticais não escapam",()=>{
  const company=tenant("farm-one","Farmácia",[]);
  const state={...admin,tenants:[company]};
  expect(resolveBusinessWorkspace(state,"farm-one",today)?.licensed).toBe(false);
  state.tenants[0]={...company,addons:["talhos"]};
  const b=resolveBusinessWorkspace(state,"farm-one",today)!;
  expect(b.sections.has("talho")).toBe(false);
  expect(b.licensed).toBe(false);
 });
 it("licença suspensa, expirada ou plano inactivo nunca têm acesso autorizado",()=>{
  const a=resolveBusinessWorkspace(admin,"demo-loja",today)!;
  expect(a.stage).toBe("suspensa");
  expect(businessAllows(a,"pos")).toBe(false);
  const expired=tenant("expired","Loja",[]);
  expired.expiresAt="2026-10-01";
  const inactive={...admin,tenants:[expired],plans:admin.plans.map(p=>p.id==="basico"?{...p,enabled:false}:p)};
  expect(resolveBusinessWorkspace({...admin,tenants:[expired]},"expired",today)?.stage).toBe("expirada");
  expect(resolveBusinessWorkspace(inactive,"expired",today)?.licensed).toBe(false);
  expect(resolveBusinessWorkspace(admin,"NOT-FOUND",today)).toBeNull();
 });
 it("novo comerciante começa sem vendas nem produtos de outra demonstração",()=>{
  const data=emptyBusinessStore();
  expect(data.products).toEqual([]);
  expect(data.sales).toEqual([]);
  expect(data.credits).toEqual([]);
  expect(data.pharmaLots).toEqual([]);
  expect(data.butcherBatches).toEqual([]);
  expect(data.onlineOrders).toEqual([]);
  expect(data.operators.length).toBe(1);
  expect(data.catalogSettings.enabled).toBe(false);
 });
});

describe("Catálogo de serviços visíveis dentro de cada módulo comercial",()=>{
 it("Farmácia inclui todos os serviços comerciais contratados e acessíveis ao gerente, sem serviços de outros sectores",()=>{
  const w=resolveBusinessWorkspace(admin,"demo-farm",today)!;
  const list=sectorServiceSections(w,s=>roleCanSection("gerente",s));
  for(const item of ["farmacia","products","inventory","purchases","suppliers","customers","cash","pos","reports","finance","returns","expenses","operators","settings"] as const)
   expect(list).toContain(item);
  expect(list).not.toContain("talho");
  expect(list).not.toContain("restaurante");
  expect(list).not.toContain("catalogo");
  expect(list).not.toContain("entregas");
 });
 it("Caixa da Farmácia não recebe gestão de preços, operadores nem relatórios",()=>{
  const w=resolveBusinessWorkspace(admin,"demo-farm",today)!;
  const list=sectorServiceSections(w,s=>roleCanSection("caixa",s)||s==="farmacia");
  expect(list).toContain("farmacia");
  for(const item of ["pos","cash","customers","alertas"] as const)expect(list).toContain(item);
  for(const item of ["products","purchases","operators","reports","finance","settings"] as const)expect(list).not.toContain(item);
 });
 it("Talho, Restaurante, Bar, Padaria e Grossistas mostram apenas o próprio sector e as ferramentas autorizadas",()=>{
  const specs=[["Talho","talho","talhos"],["Restaurante","restaurante","restaurantes"],["Bar","bar","bares"],
   ["Padaria","padaria","producao"],["Grossista","grossista","grossistas"]] as const;
  for(const [sector,kind,special] of specs){
   const source={...admin,tenants:[tenant(kind,sector,mandatorySectorAddon(sector))]};
   const w=resolveBusinessWorkspace(source,kind,today)!;
   const list=sectorServiceSections(w,s=>roleCanSection("gerente",s));
   expect(w.licensed).toBe(true);
   expect(list).toContain(special);
   for(const common of ["pos","cash","products","inventory","purchases","suppliers","customers","reports"])
    expect(list).toContain(common);
   expect(list.filter(s=>["farmacia","talho","restaurante","bar","producao","grossistas"].includes(s))).toEqual([special]);
   expect(SECTOR_SERVICE_SECTIONS[w.kind as Exclude<typeof w.kind,"loja">].length).toBeGreaterThan(10);
  }
 });
 it("Plano sem licença não mostra atalhos, mesmo se o sector existir",()=>{
  const suspended=resolveBusinessWorkspace(admin,"demo-loja",today)!;
  expect(sectorServiceSections(suspended,()=>true)).toEqual([]);
  const invalid={...admin,tenants:[tenant("missing","Farmácia",[])]};
  const workspace=resolveBusinessWorkspace(invalid,"missing",today)!;
  expect(workspace.licensed).toBe(false);
  expect(sectorServiceSections(workspace,()=>true)).toEqual([]);
 });
});
