import type {Section} from "./domain";

/**
 * Gestão local demonstrativa de operadores. Nenhuma destas regras constitui
 * autorização de servidor, autenticação multiempresa ou isolamento de dados.
 */
export type OperatorRole="gerente"|"supervisor"|"caixa"|"stock";
export type OperatorAction="sell"|"manageCash"|"payCredit"|"manageStock"|"editProduct"|"editPrice"|"returns"|"manageOperators"|"manageSettings"|"viewProfit"|"manageCompanies";
export type Operator={
 id:string;name:string;role:OperatorRole;active:boolean;
 pinSalt?:string;pinHash?:string;createdAt:string;updatedAt:string;
};
export type ApprovalScope="returns"|"price";
export type OperatorApproval={
 id:string;scope:ApprovalScope;requesterId:string;approverId:string;description:string;createdAt:string;
};
export const BOOTSTRAP_OPERATOR_ID="demo-manager";
export const ROLE_LABELS:Record<OperatorRole,string>={
 gerente:"Gerente",supervisor:"Supervisor",caixa:"Operador de caixa",stock:"Responsável de stock"
};
export const ALL_ROLES:readonly OperatorRole[]=["gerente","supervisor","caixa","stock"];
const sections:Record<OperatorRole,readonly Section[]>={
 gerente:["alertas","dashboard","pos","products","customers","companies","modules","reports","finance","settings","cash","suppliers","purchases","inventory","returns","expenses","farmacia","restaurante","bar","talho","producao","grossistas","catalogo","encomendas-online","entregas","fidelizacao","operators"],
 supervisor:["alertas","dashboard","pos","products","customers","cash","suppliers","purchases","inventory","returns","expenses","farmacia","restaurante","bar","talho","producao","grossistas","catalogo","encomendas-online","entregas","fidelizacao"],
 caixa:["alertas","pos","customers","cash"],
 stock:["alertas","products","inventory","suppliers","purchases"]
};
const actions:Record<OperatorRole,readonly OperatorAction[]>={
 gerente:["sell","manageCash","payCredit","manageStock","editProduct","editPrice","returns","manageOperators","manageSettings","viewProfit","manageCompanies"],
 supervisor:["sell","manageCash","payCredit","manageStock","editProduct","returns"],
 caixa:["sell","manageCash","payCredit"],
 stock:["manageStock"]
};
export const roleCan=(role:OperatorRole,action:OperatorAction)=>actions[role].includes(action);
export const roleCanSection=(role:OperatorRole,section:Section)=>sections[role].includes(section);
export const firstSection=(role:OperatorRole):Section=>role==="caixa"?"pos":role==="stock"?"products":"dashboard";
export const canApprove=(role:OperatorRole,scope:ApprovalScope)=>
 scope==="returns"?role==="gerente"||role==="supervisor":role==="gerente";
export const DEMO_MANAGER_NAME="Gerente da demonstração";
export const defaultOperators=():Operator[]=>[{
 id:BOOTSTRAP_OPERATOR_ID,name:DEMO_MANAGER_NAME,role:"gerente",active:true,
 createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z"
}];
export function safeOperators(value:unknown):Operator[]{
 if(!Array.isArray(value))return defaultOperators();
 const valid:Operator[]=value.filter((entry):entry is Operator=>{
  if(!entry||typeof entry!=="object")return false;
  const x=entry as Record<string,unknown>;
  return typeof x.id==="string"&&x.id.length>0&&x.id.length<=90
   &&typeof x.name==="string"&&x.name.length>0&&x.name.length<=90
   &&ALL_ROLES.includes(x.role as OperatorRole)&&typeof x.active==="boolean"
   &&typeof x.createdAt==="string";
 }).map(x=>({...x,
  updatedAt:typeof x.updatedAt==="string"?x.updatedAt:x.createdAt,
  pinSalt:typeof x.pinSalt==="string"&&/^[0-9a-f]{32}$/.test(x.pinSalt)?x.pinSalt:undefined,
  pinHash:typeof x.pinHash==="string"&&/^[0-9a-f]{64}$/.test(x.pinHash)?x.pinHash:undefined
 })).slice(0,100);
 // No reabrir, os dados anteriores à gestão de operadores ganham apenas o gerente demo.
 return valid.length?valid:defaultOperators();
}
export const hasConfiguredPin=(operator:Operator)=>Boolean(operator.pinSalt&&operator.pinHash);
export function validPin(pin:string){return /^\d{4,8}$/.test(pin)}
function hex(bytes:Uint8Array){return Array.from(bytes).map(n=>n.toString(16).padStart(2,"0")).join("")}
function fromHex(value:string){return Uint8Array.from((value.match(/../g)??[]).map(x=>parseInt(x,16)))}
async function derive(pin:string,salt:Uint8Array):Promise<string>{
 const crypto=globalThis.crypto;
 if(!crypto?.subtle)throw Error("O navegador não suporta a protecção local do PIN. Utilize HTTPS e um navegador actualizado.");
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:salt as BufferSource,iterations:160_000,hash:"SHA-256"},key,256);
 return hex(new Uint8Array(bits));
}
export async function securePin(pin:string):Promise<{pinSalt:string;pinHash:string}>{
 if(!validPin(pin))throw Error("O PIN deve ter 4 a 8 algarismos.");
 if(!globalThis.crypto?.getRandomValues)throw Error("Este navegador não permite gerar um PIN seguro.");
 const salt=globalThis.crypto.getRandomValues(new Uint8Array(16));
 return {pinSalt:hex(salt),pinHash:await derive(pin,salt)};
}
export async function verifyPin(operator:Operator,pin:string):Promise<boolean>{
 if(!hasConfiguredPin(operator)||!validPin(pin))return false;
 const actual=await derive(pin,fromHex(operator.pinSalt!));
 const expected=operator.pinHash!;
 let mismatch=0;
 for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^actual.charCodeAt(i);
 return mismatch===0;
}
export type DemoSession={operatorId:string;startedAt:string};
export const DEMO_SESSION_KEY="ubuntu-pos360-operator-session-v1";
export function sessionFor(operator:Operator):DemoSession{
 return {operatorId:operator.id,startedAt:new Date().toISOString()};
}
export function initialDemoSession(operators:readonly Operator[],stored:string|null):DemoSession|null{
 if(stored==="logout")return null;
 if(stored){
  try{
   const data=JSON.parse(stored) as DemoSession;
   if(operators.some(o=>o.id===data.operatorId&&o.active)&&typeof data.startedAt==="string")return data;
   return null;
  }catch{return null}
 }
 // Compatibilidade: versões anteriores não tinham login; o gerente demo entra automaticamente.
 const bootstrap=operators.find(x=>x.id===BOOTSTRAP_OPERATOR_ID&&x.active);
 return bootstrap&&!hasConfiguredPin(bootstrap)?sessionFor(bootstrap):null;
}
export function canDisableOperator(operators:readonly Operator[],operatorId:string,actorId:string):boolean{
 const candidate=operators.find(o=>o.id===operatorId);
 if(!candidate||candidate.id===actorId)return false;
 if(candidate.role==="gerente"&&candidate.active&&operators.filter(o=>o.role==="gerente"&&o.active).length<=1)return false;
 return true;
}
