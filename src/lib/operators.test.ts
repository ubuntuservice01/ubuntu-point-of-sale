import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {webcrypto} from "node:crypto";
import {initialStore,safeStore,type Section} from "./domain";
import {
 ALL_ROLES,BOOTSTRAP_OPERATOR_ID,ROLE_LABELS,canApprove,canDisableOperator,defaultOperators,
 firstSection,hasConfiguredPin,initialDemoSession,roleCan,roleCanSection,securePin,
 sessionFor,verifyPin,validPin,type Operator
} from "./operators";

beforeEach(()=>vi.stubGlobal("crypto",webcrypto));
afterEach(()=>vi.unstubAllGlobals());
const start=defaultOperators();
const worker=(role:Operator["role"],id="op-"+role):Operator=>({
 id,name:"Utilizador "+role,role,active:true,createdAt:"2026-10-11T08:00:00.000Z",
 updatedAt:"2026-10-11T08:00:00.000Z"
});
describe("Perfis e permissões locais",()=>{
 it("contém os quatro perfis, com gerente por defeito na migração de dados",()=>{
  expect(ALL_ROLES).toEqual(["gerente","supervisor","caixa","stock"]);
  expect(start).toHaveLength(1);
  expect(start[0]?.id).toBe(BOOTSTRAP_OPERATOR_ID);
  expect(start[0]?.role).toBe("gerente");
  expect(ROLE_LABELS.caixa).toContain("caixa");
  const old=initialStore();
  const migrated=safeStore({...old,operators:undefined,operatorApprovals:undefined});
  expect(migrated.operators[0]?.id).toBe(BOOTSTRAP_OPERATOR_ID);
  expect(migrated.operatorApprovals).toEqual([]);
  expect(migrated.products).toHaveLength(old.products.length);
 });
 it("um caixa pode vender e receber fiado, mas não vê margens nem altera preços",()=>{
  expect(roleCan("caixa","sell")).toBe(true);
  expect(roleCan("caixa","payCredit")).toBe(true);
  expect(roleCan("caixa","editPrice")).toBe(false);
  expect(roleCan("caixa","viewProfit")).toBe(false);
  expect(roleCan("caixa","manageOperators")).toBe(false);
  for(const forbidden of ["reports","finance","companies","settings","operators","products","inventory"] as Section[])
   expect(roleCanSection("caixa",forbidden)).toBe(false);
  expect(firstSection("caixa")).toBe("pos");
 });
 it("o responsável de stock não vende nem altera preços, mas abre inventário e compras",()=>{
  expect(roleCan("stock","sell")).toBe(false);
  expect(roleCan("stock","editProduct")).toBe(false);
  expect(roleCan("stock","editPrice")).toBe(false);
  expect(roleCan("stock","manageStock")).toBe(true);
  expect(roleCanSection("stock","inventory")).toBe(true);
  expect(roleCanSection("stock","purchases")).toBe(true);
  expect(roleCanSection("stock","pos")).toBe(false);
  expect(firstSection("stock")).toBe("products");
 });
 it("supervisor opera balcão e devoluções, sem permissão para lucro ou preços sem aprovação",()=>{
  expect(roleCan("supervisor","returns")).toBe(true);
  expect(roleCan("supervisor","editProduct")).toBe(true);
  expect(roleCan("supervisor","editPrice")).toBe(false);
  expect(roleCanSection("supervisor","reports")).toBe(false);
  expect(canApprove("supervisor","returns")).toBe(true);
  expect(canApprove("supervisor","price")).toBe(false);
  expect(canApprove("gerente","price")).toBe(true);
  expect(roleCan("gerente","viewProfit")).toBe(true);
 });
 it("não desactiva o único gerente activo nem a própria conta",()=>{
  const boss=start[0]!,cash=worker("caixa");
  expect(canDisableOperator([boss,cash],boss.id,boss.id)).toBe(false);
  expect(canDisableOperator([boss,cash],cash.id,boss.id)).toBe(true);
  expect(canDisableOperator([boss,worker("gerente","boss2")],boss.id,"boss2")).toBe(true);
 });
 it("a sessão anterior válida mantém operador, sessão explicitamente encerrada não regressa",()=>{
  const cashier=worker("caixa");
  const session=sessionFor(cashier);
  expect(initialDemoSession([start[0]!,cashier],JSON.stringify(session))).toEqual(session);
  expect(initialDemoSession(start,"logout")).toBeNull();
  expect(initialDemoSession(start,JSON.stringify(session))).toBeNull();
  expect(initialDemoSession(start,null)?.operatorId).toBe(BOOTSTRAP_OPERATOR_ID);
  const secured={...start[0]!,pinSalt:"00".repeat(16),pinHash:"00".repeat(32)};
  expect(initialDemoSession([secured],null)).toBeNull();
 });
 it("aceita apenas PIN numérico de 4 a 8 dígitos e nunca guarda PIN em texto",async()=>{
  for(const invalid of ["123","123456789","a123","12 34",""])expect(validPin(invalid)).toBe(false);
  expect(validPin("1234")).toBe(true);
  const pins=await securePin("6382");
  expect(pins.pinSalt).toMatch(/^[0-9a-f]{32}$/);
  expect(pins.pinHash).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(pins)).not.toContain("6382");
  const account={...worker("supervisor"),...pins};
  expect(hasConfiguredPin(account)).toBe(true);
  expect(await verifyPin(account,"6382")).toBe(true);
  expect(await verifyPin(account,"1111")).toBe(false);
  expect(await verifyPin(account,"")).toBe(false);
 });
 it("saneamento não aceita contas malformadas com papel desconhecido",()=>{
  const migrated=safeStore({...initialStore(),operators:[
   {id:"x",name:"Fraude",role:"superadmin",active:true,createdAt:"2026-01-01"},
   {id:"valid",name:"Lojista",role:"caixa",active:true,createdAt:"2026-01-01"}
  ]});
  expect(migrated.operators).toHaveLength(1);
  expect(migrated.operators[0]?.role).toBe("caixa");
 });
});
