import {slugify} from "./domain";

/** CONTRATO DEMONSTRATIVO: autenticação, RLS, DNS e pagamentos reais ainda não existem. */
export type TenantStatus="activa"|"teste"|"suspensa";
export type AdminScreen="visao-geral"|"empresas"|"planos"|"licencas"|"modulos"|"subscricoes"|"auditoria"|"definicoes";
export type AdminTenant={
 id:string;name:string;slug:string;sector:string;city:string;
 responsible:string;email:string;phone:string;planId:string;
 status:TenantStatus;createdAt:string;expiresAt:string;branchCount:number;
 addons:string[];notes:string;
};
export type AdminPlan={
 id:string;name:string;description:string;monthlyPrice:number;maxBranches:number;maxUsers:number;
 includedModules:string[];enabled:boolean;
};
export type AdminEvent={id:string;createdAt:string;action:string;target:string;details:string};
export type AdminStore={tenants:AdminTenant[];plans:AdminPlan[];events:AdminEvent[]};
export type ModuleDefinition={id:string;label:string;description:string;group:string;addonPrice:number};
export const ADMIN_KEY="ubuntu-pos360-super-admin-demo-v1";
export const MODULE_CATALOG:ModuleDefinition[]=[
 {id:"pos",label:"Ponto de venda",description:"Vendas, carrinho, caixa e recibos.",group:"Essenciais",addonPrice:0},
 {id:"stock",label:"Produtos e stock",description:"Catálogo, inventário e alertas.",group:"Essenciais",addonPrice:0},
 {id:"clientes",label:"Clientes e fiado",description:"Dívidas, limites e pagamentos parciais.",group:"Essenciais",addonPrice:0},
 {id:"relatorios",label:"Relatórios",description:"Indicadores, vendas e stock.",group:"Essenciais",addonPrice:0},
 {id:"filiais",label:"Gestão de filiais",description:"Estabelecimentos e armazéns por empresa.",group:"Gestão",addonPrice:250},
 {id:"farmacias",label:"Farmácias",description:"Lotes, validade e dispensa.",group:"Sectores",addonPrice:600},
 {id:"restaurantes",label:"Restaurantes",description:"Mesas, comandas e cozinha.",group:"Sectores",addonPrice:450},
 {id:"bares",label:"Bares",description:"Doses, consumo e mesas.",group:"Sectores",addonPrice:300},
 {id:"talhos",label:"Talhos",description:"Pesagem, cortes e transformação.",group:"Sectores",addonPrice:400},
 {id:"padarias",label:"Padarias e produção",description:"Receitas, ingredientes e custos.",group:"Sectores",addonPrice:450},
 {id:"grossistas",label:"Grossistas",description:"Encomendas por volume e armazéns.",group:"Sectores",addonPrice:500},
 {id:"catalogo",label:"Catálogo online",description:"Produtos públicos e encomendas.",group:"Comércio digital",addonPrice:350},
 {id:"entregas",label:"Entregas",description:"Pedidos e distribuição.",group:"Comércio digital",addonPrice:250},
 {id:"fidelizacao",label:"Fidelização",description:"Pontos, campanhas e cupões.",group:"Comércio digital",addonPrice:200},
 {id:"offline",label:"Vendas sem Internet",description:"Fila local e sincronização posterior.",group:"Avançados",addonPrice:250},
 {id:"balancas",label:"Balanças e equipamentos",description:"Periféricos compatíveis.",group:"Avançados",addonPrice:200},
 {id:"auditoria",label:"Auditoria e alertas",description:"Histórico e avisos de risco.",group:"Avançados",addonPrice:250},
 {id:"assistente",label:"Assistente inteligente",description:"Perguntas e análise autorizada.",group:"Avançados",addonPrice:650}
];
export const ADMIN_SECTORS=["Loja","Pequeno comerciante","Farmácia","Restaurante","Bar","Talho","Padaria","Grossista"];
export const ADMIN_SCREENS:{id:AdminScreen;label:string;group:"geral"|"gestao"|"controlo"}[]=[
 {id:"visao-geral",label:"Visão geral",group:"geral"},
 {id:"empresas",label:"Empresas",group:"geral"},
 {id:"planos",label:"Planos",group:"gestao"},
 {id:"licencas",label:"Licenças",group:"gestao"},
 {id:"modulos",label:"Módulos",group:"gestao"},
 {id:"subscricoes",label:"Subscrições",group:"controlo"},
 {id:"auditoria",label:"Auditoria",group:"controlo"},
 {id:"definicoes",label:"Definições",group:"controlo"}
];
export function dateISO(date=new Date()){
 const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
 return y+"-"+m+"-"+d;
}
export function addDays(iso:string,days:number){
 const utc=new Date(iso+"T12:00:00Z");
 utc.setUTCDate(utc.getUTCDate()+days);
 return utc.toISOString().slice(0,10);
}
export function displayDate(iso:string){
 return new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(iso+"T12:00:00"));
}
export function displayTime(iso:string){
 return new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
}
export function tenantStage(tenant:AdminTenant,asOf=dateISO()):TenantStatus|"expirada"{
 return tenant.status!=="suspensa"&&tenant.expiresAt<asOf?"expirada":tenant.status;
}
export function remainingDays(expiresAt:string,asOf=dateISO()){
 const from=Date.parse(asOf+"T12:00:00Z"),to=Date.parse(expiresAt+"T12:00:00Z");
 return Math.round((to-from)/86400000);
}
export function assignedModules(tenant:AdminTenant,plan:AdminPlan|undefined){
 return Array.from(new Set([...(plan?.includedModules??[]),...tenant.addons]));
}
export function tenantMonthlyPrice(tenant:AdminTenant,plan:AdminPlan|undefined){
 if(!plan)return 0;
 const included=new Set(plan.includedModules);
 return plan.monthlyPrice+tenant.addons.filter(id=>!included.has(id))
   .reduce((sum,id)=>sum+(MODULE_CATALOG.find(m=>m.id===id)?.addonPrice??0),0);
}
export function projectedMonthlyRevenue(state:AdminStore,asOf=dateISO()){
 return state.tenants.filter(t=>tenantStage(t,asOf)==="activa")
   .reduce((sum,t)=>sum+tenantMonthlyPrice(t,state.plans.find(p=>p.id===t.planId)),0);
}
export function uniqueSlug(name:string,tenants:AdminTenant[],excludedId?:string){
 const base=slugify(name);if(!base)return "";
 if(!tenants.some(t=>t.slug===base&&t.id!==excludedId))return base;
 let n=2;while(tenants.some(t=>t.slug===base+"-"+n&&t.id!==excludedId))n++;
 return base+"-"+n;
}
const demoPlans:AdminPlan[]=[
 {id:"basico",name:"Essencial",description:"Para pequenos comerciantes e uma loja.",monthlyPrice:850,maxBranches:1,maxUsers:3,includedModules:["pos","stock","clientes","relatorios"],enabled:true},
 {id:"profissional",name:"Profissional",description:"Para negócios em expansão e pequenas equipas.",monthlyPrice:1850,maxBranches:3,maxUsers:10,includedModules:["pos","stock","clientes","relatorios","filiais","auditoria"],enabled:true},
 {id:"empresarial",name:"Empresarial",description:"Para redes comerciais e gestão de múltiplas filiais.",monthlyPrice:3650,maxBranches:15,maxUsers:50,includedModules:["pos","stock","clientes","relatorios","filiais","auditoria","catalogo","entregas"],enabled:true}
];
/** Empresas e valores fictícios, sem qualquer contrato real. */
export function initialAdminStore(asOf=dateISO()):AdminStore{
 const base=[
  {id:"demo-farm",name:"Farmácia Modelo",sector:"Farmácia",city:"Lichinga",responsible:"Responsável de exemplo",email:"farmacia@exemplo.invalid",phone:"—",planId:"profissional",status:"activa" as const,createdAt:addDays(asOf,-82),expiresAt:addDays(asOf,43),branchCount:2,addons:["farmacias"],notes:"Registo fictício para validação da interface."},
  {id:"demo-talho",name:"Talho Modelo",sector:"Talho",city:"Nampula",responsible:"Responsável de exemplo",email:"talho@exemplo.invalid",phone:"—",planId:"basico",status:"teste" as const,createdAt:addDays(asOf,-8),expiresAt:addDays(asOf,6),branchCount:1,addons:["talhos","balancas"],notes:"Registo fictício para validação da interface."},
  {id:"demo-rest",name:"Restaurante Modelo",sector:"Restaurante",city:"Pemba",responsible:"Responsável de exemplo",email:"restaurante@exemplo.invalid",phone:"—",planId:"empresarial",status:"activa" as const,createdAt:addDays(asOf,-112),expiresAt:addDays(asOf,9),branchCount:3,addons:["restaurantes"],notes:"Registo fictício para validação da interface."},
  {id:"demo-loja",name:"Mercearia Modelo",sector:"Loja",city:"Cuamba",responsible:"Responsável de exemplo",email:"loja@exemplo.invalid",phone:"—",planId:"basico",status:"suspensa" as const,createdAt:addDays(asOf,-74),expiresAt:addDays(asOf,24),branchCount:1,addons:[],notes:"Registo fictício para validação da interface."}
 ];
 return {plans:demoPlans.map(p=>({...p,includedModules:[...p.includedModules]})),
 tenants:base.map(t=>({...t,slug:slugify(t.name),addons:[...t.addons]})),
 events:[]};
}
export function safeAdminStore(value:unknown):AdminStore{
 if(!value||typeof value!=="object")return initialAdminStore();
 const v=value as Partial<AdminStore>;
 if(!Array.isArray(v.tenants)||!Array.isArray(v.plans)||!Array.isArray(v.events))return initialAdminStore();
 return {tenants:v.tenants as AdminTenant[],plans:v.plans as AdminPlan[],events:v.events as AdminEvent[]};
}
export type CompanyInput=Pick<AdminTenant,"name"|"sector"|"city"|"responsible"|"email"|"phone"|"planId"|"status"|"expiresAt"|"branchCount"|"notes">;
export function validateCompanyInput(input:CompanyInput,plans:AdminPlan[],asOf=dateISO()):string|null{
 if(input.name.trim().length<3)return "Indique o nome completo da empresa.";
 if(!slugify(input.name))return "O nome da empresa não permite criar um identificador válido.";
 if(!ADMIN_SECTORS.includes(input.sector))return "Seleccione um sector válido.";
 if(!input.city.trim())return "Indique a cidade ou distrito.";
 if(!input.responsible.trim())return "Indique o responsável da empresa.";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))return "Indique um endereço de e-mail válido.";
 const plan=plans.find(p=>p.id===input.planId);
 if(!plan)return "Seleccione um plano existente.";
 if(!Number.isInteger(input.branchCount)||input.branchCount<1||input.branchCount>plan.maxBranches)
  return "O número de filiais excede o limite do plano.";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)||Number.isNaN(Date.parse(input.expiresAt))||input.expiresAt<asOf)
  return "Indique uma data de validade igual ou posterior à data actual.";
 return null;
}
export function validatePlan(plan:AdminPlan,other:AdminPlan[]):string|null{
 if(plan.name.trim().length<3)return "Indique o nome do plano.";
 if(other.some(p=>p.id!==plan.id&&p.name.toLowerCase()===plan.name.trim().toLowerCase()))return "Já existe um plano com este nome.";
 if(!Number.isFinite(plan.monthlyPrice)||plan.monthlyPrice<0)return "O preço mensal não pode ser negativo.";
 if(!Number.isInteger(plan.maxBranches)||plan.maxBranches<1)return "Indique pelo menos uma filial.";
 if(!Number.isInteger(plan.maxUsers)||plan.maxUsers<1)return "Indique pelo menos um utilizador.";
 if(!plan.includedModules.includes("pos")||!plan.includedModules.includes("stock"))return "Os módulos POS e stock são obrigatórios.";
 return null;
}
export function renewalDate(tenant:AdminTenant,days:number,asOf=dateISO()){
 const base=tenant.expiresAt>=asOf?tenant.expiresAt:asOf;
 return addDays(base,days);
}
