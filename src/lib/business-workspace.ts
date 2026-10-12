import type {AdminStore,AdminTenant,AdminPlan} from "./admin-demo";
import {assignedModules,tenantStage} from "./admin-demo";
import type {Section,Store} from "./domain";

export type BusinessKind="loja"|"farmacia"|"restaurante"|"bar"|"talho"|"padaria"|"grossista";
export type BusinessWorkspace={
 tenant:AdminTenant;plan:AdminPlan|undefined;kind:BusinessKind;
 licensed:boolean;stage:ReturnType<typeof tenantStage>;
 modules:ReadonlySet<string>;sections:ReadonlySet<Section>;
 title:string;subtitle:string;speciality:Section|null;
};
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
export function businessKind(sector:string):BusinessKind{
 const value=normalize(sector);
 if(value.includes("farm"))return "farmacia";
 if(value.includes("restaur"))return "restaurante";
 if(value.includes("bar")&&!value.includes("barbear"))return "bar";
 if(value.includes("talho")||value.includes("carn"))return "talho";
 if(value.includes("pada")||value.includes("produc"))return "padaria";
 if(value.includes("gross")||value.includes("atacad"))return "grossista";
 return "loja";
}
export const BUSINESS_CONFIG:Record<BusinessKind,{title:string;subtitle:string;module:string|null;speciality:Section|null;shortcuts:{section:Section;label:string;help:string}[]}> ={
 loja:{title:"Loja e mercearia",subtitle:"Vendas de balcão, produtos, stock, compras e resultados.",module:null,speciality:null,
 shortcuts:[{section:"pos",label:"Vender",help:"Balcão e Caixa Rápido"},{section:"products",label:"Produtos",help:"Preços e catálogo"},{section:"inventory",label:"Inventário",help:"Entradas e saídas"},{section:"purchases",label:"Compras",help:"Abastecimento"}]},
 farmacia:{title:"Gestão de farmácia",subtitle:"Dispensa por lotes FEFO, validade, compras e gestão comercial.",module:"farmacias",speciality:"farmacia",
 shortcuts:[{section:"farmacia",label:"Dispensa e lotes",help:"FEFO, validade e histórico"},{section:"products",label:"Medicamentos",help:"Cadastro de produtos"},{section:"purchases",label:"Compras de medicamentos",help:"Reabastecimento"},{section:"cash",label:"Caixa da farmácia",help:"Recebimentos e fecho"}]},
 restaurante:{title:"Gestão de restaurante",subtitle:"Mesas, comandas, preparação, balcão, stock e resultados.",module:"restaurantes",speciality:"restaurante",
 shortcuts:[{section:"restaurante",label:"Mesas e comandas",help:"Preparação e fecho"},{section:"pos",label:"Venda de balcão",help:"Caixa Rápido"},{section:"products",label:"Menu e produtos",help:"Preços e ingredientes"},{section:"cash",label:"Caixa",help:"Abertura e fecho"}]},
 bar:{title:"Gestão de bar",subtitle:"Mesas, comandas, bebidas, balcão e controlo de stock.",module:"bares",speciality:"bar",
 shortcuts:[{section:"bar",label:"Serviço de bar",help:"Mesas e comandas"},{section:"pos",label:"Venda rápida",help:"Balcão"},{section:"inventory",label:"Stock de bebidas",help:"Entradas e saídas"},{section:"cash",label:"Caixa",help:"Turnos e recebimentos"}]},
 talho:{title:"Gestão de talho",subtitle:"Vendas por peso, cortes, perdas, stock e resultados.",module:"talhos",speciality:"talho",
 shortcuts:[{section:"talho",label:"Pesagem e cortes",help:"Venda em kg e transformação"},{section:"pos",label:"Venda rápida",help:"Caixa Rápido"},{section:"inventory",label:"Stock de carnes",help:"Entradas e saídas"},{section:"reports",label:"Resultados",help:"Vendas e margens"}]},
 padaria:{title:"Gestão de padaria",subtitle:"Receitas, produção, matérias-primas, vendas e caixa.",module:"padarias",speciality:"producao",
 shortcuts:[{section:"producao",label:"Produção",help:"Receitas e lotes"},{section:"pos",label:"Venda rápida",help:"Balcão"},{section:"purchases",label:"Insumos",help:"Compras e abastecimento"},{section:"reports",label:"Resultados",help:"Receitas e custos"}]},
 grossista:{title:"Gestão grossista",subtitle:"Preços por volume, pedidos, expedição, crédito e stock.",module:"grossistas",speciality:"grossistas",
 shortcuts:[{section:"grossistas",label:"Pedidos grossistas",help:"Escalões e expedição"},{section:"pos",label:"Venda directa",help:"Balcão e factura não fiscal"},{section:"inventory",label:"Armazém",help:"Stock e movimentos"},{section:"customers",label:"Clientes",help:"Fiado e contas"}]}
};
export const SECTOR_MODULE_IDS=["farmacias","restaurantes","bares","talhos","padarias","grossistas"] as const;
export const baseBusinessSections:readonly Section[]=[
 "dashboard","alertas","operators","settings","cash","expenses","finance","returns",
 "pos","products","inventory","purchases","suppliers","customers","reports"
];
const moduleSections:Record<string,readonly Section[]>={
 pos:["pos","cash","returns"],stock:["products","inventory","purchases","suppliers"],
 clientes:["customers"],relatorios:["reports","finance","expenses"],
 farmacias:["farmacia"],restaurantes:["restaurante"],bares:["bar"],talhos:["talho"],
 padarias:["producao"],grossistas:["grossistas"],catalogo:["catalogo","encomendas-online"],
 entregas:["entregas"],fidelizacao:["fidelizacao"]
};
export function mandatorySectorAddon(sector:string):string[]{
 const id=BUSINESS_CONFIG[businessKind(sector)].module;
 return id?[id]:[];
}
export function resolveBusinessWorkspace(state:AdminStore,tenantId:string,now?:string):BusinessWorkspace|null{
 const tenant=state.tenants.find(t=>t.id===tenantId);
 if(!tenant)return null;
 const plan=state.plans.find(p=>p.id===tenant.planId);
 const kind=businessKind(tenant.sector);
 const config=BUSINESS_CONFIG[kind];
 const modules=new Set(assignedModules(tenant,plan));
 // Sectores exclusivos: um restaurante não apresenta Talho/Farmácia mesmo que um plano os inclua.
 const authorized=new Set<Section>(["dashboard","alertas","operators","settings"]);
 for(const id of modules){
  if(SECTOR_MODULE_IDS.includes(id as typeof SECTOR_MODULE_IDS[number])&&id!==config.module)continue;
  for(const section of moduleSections[id]??[])authorized.add(section);
 }
 const stage=tenantStage(tenant,now);
 const licensed=(stage==="activa"||stage==="teste")&&Boolean(plan?.enabled)&&
  (config.module===null||modules.has(config.module));
 return {tenant,plan,kind,licensed,stage,modules,sections:authorized,
  title:config.title,subtitle:config.subtitle,
  speciality:config.speciality!==null&&authorized.has(config.speciality)?config.speciality:null};
}
export function businessAllows(workspace:BusinessWorkspace,section:Section):boolean{
 return workspace.licensed&&workspace.sections.has(section);
}
export function businessMenuGroups(workspace:BusinessWorkspace){
 const c=workspace.kind;
 const first:Section[]=c==="farmacia"?["dashboard","farmacia","pos","cash","customers"]:
 c==="restaurante"?["dashboard","restaurante","pos","cash","customers"]:
 c==="bar"?["dashboard","bar","pos","cash","customers"]:
 c==="talho"?["dashboard","talho","pos","cash","customers"]:
 c==="padaria"?["dashboard","producao","pos","cash","customers"]:
 c==="grossista"?["dashboard","grossistas","pos","cash","customers"]:
 ["dashboard","pos","cash","customers"];
 const groups=[
  {id:"operacoes",label:"O meu negócio",sections:[...first,"alertas","returns"]},
  {id:"produtos",label:"Produtos e abastecimento",sections:["products","inventory","purchases","suppliers"]},
  {id:"gestao",label:"Gestão e resultados",sections:["reports","finance","expenses","catalogo","encomendas-online","entregas","fidelizacao"]},
  {id:"administracao",label:"Administração do negócio",sections:["operators","settings"]}
 ] as const;
 return groups.map(g=>({...g,sections:[...new Set(g.sections)].filter(s=>workspace.sections.has(s as Section)) as Section[]}))
  .filter(g=>g.sections.length>0);
}
export const BUSINESS_SECTION_LABELS:Partial<Record<Section,string>>={
 farmacia:"Dispensa, lotes e validade",restaurante:"Mesas, comandas e cozinha",bar:"Mesas e bebidas",talho:"Pesagem e cortes",
 producao:"Receitas e produção",grossistas:"Pedidos por volume",pos:"Ponto de venda e Caixa Rápido",
 products:"Produtos e preços",inventory:"Inventário e movimentos",purchases:"Compras e entradas",suppliers:"Fornecedores",
 customers:"Clientes e fiado",reports:"Relatórios",cash:"Caixa e turnos",dashboard:"Visão geral",
 settings:"Definições",operators:"Operadores e permissões",returns:"Devoluções",
 alertas:"Alertas",finance:"Rentabilidade",expenses:"Despesas",
 catalogo:"Catálogo online", "encomendas-online":"Encomendas",entregas:"Entregas",fidelizacao:"Fidelização"
};
export function emptyBusinessStore():Store{
 const data=(requireInitialStore)();
 for(const key of EMPTY_COLLECTIONS)(data[key] as unknown[]).splice(0);
 data.companies=[];data.audits=[];
 data.catalogSettings={...data.catalogSettings,enabled:false};
 return data;
}
// Import dinâmico não é necessário: a função injectada abaixo é inicialStore.
import {initialStore as requireInitialStore} from "./domain";
import {JOURNALED_COLLECTIONS} from "./offline-model";
const EMPTY_COLLECTIONS=JOURNALED_COLLECTIONS.filter(k=>k!=="operators"&&k!=="operatorApprovals");

/** Um directório compacto dos serviços REAIS disponíveis em cada negócio.
 * Não cria funcionalidades inexistentes nem ignora licença ou perfil do operador.
 */
export const SECTOR_SERVICE_SECTIONS:Record<Exclude<BusinessKind,"loja">,readonly Section[]>={
 farmacia:["farmacia","products","inventory","purchases","suppliers","customers","cash","pos","returns","reports","finance","expenses","alertas","operators","settings"],
 restaurante:["restaurante","pos","products","inventory","purchases","suppliers","customers","cash","returns","reports","finance","expenses","alertas","operators","settings"],
 bar:["bar","pos","products","inventory","purchases","suppliers","customers","cash","returns","reports","finance","expenses","alertas","operators","settings"],
 talho:["talho","pos","products","inventory","purchases","suppliers","customers","cash","returns","reports","finance","expenses","alertas","operators","settings"],
 padaria:["producao","pos","products","inventory","purchases","suppliers","customers","cash","returns","reports","finance","expenses","alertas","operators","settings"],
 grossista:["grossistas","pos","products","inventory","purchases","suppliers","customers","cash","returns","reports","finance","expenses","alertas","operators","settings"]
};
export const SECTOR_SERVICE_HELP:Partial<Record<Section,string>>={
 farmacia:"Lotes, validade e dispensa FEFO demonstrativa",
 restaurante:"Mesas, comandas e preparação",
 bar:"Mesas, comandas e atendimento de bar",
 talho:"Pesagem, vendas em kg, cortes e quebras",
 producao:"Receitas, ordens e histórico de produção",
 grossistas:"Preços por quantidade, reservas e expedições",
 pos:"Vender artigos fora de lotes farmacêuticos",
 products:"Cadastro, códigos, preços e stock",
 inventory:"Movimentos e ajustes de inventário",
 purchases:"Entradas e compras de mercadorias",
 suppliers:"Fornecedores e pagamentos",
 customers:"Clientes, fiado e recebimentos",
 cash:"Abertura, turnos e fecho de caixa",
 returns:"Devoluções com permissões",
 reports:"Vendas e histórico",
 finance:"Margens e rentabilidade estimada",
 expenses:"Registo de despesas",
 alertas:"Stock baixo, validade e dívidas vencidas",
 operators:"Identificação e permissões da equipa",
 settings:"Definições do estabelecimento"
};
export function sectorServiceSections(
 workspace:BusinessWorkspace,allowed:(section:Section)=>boolean
):Section[]{
 if(workspace.kind==="loja"||!workspace.licensed)return [];
 return SECTOR_SERVICE_SECTIONS[workspace.kind].filter(s=>businessAllows(workspace,s)&&allowed(s));
}
