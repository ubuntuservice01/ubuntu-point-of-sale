import type {AdminTenant,AdminPlan} from "./admin-demo";
import {dateISO} from "./admin-demo";
export type CompanyPage="painel"|"filiais"|"funcionarios"|"perfis"|"instituicao"|"operacoes"|"actividade";
export type Branch={id:string;name:string;code:string;city:string;address:string;phone:string;active:boolean;createdAt:string};
export type Employee={id:string;name:string;email:string;phone:string;roleId:string;branchIds:string[];active:boolean;createdAt:string};
export type Role={id:string;name:string;description:string;permissions:string[];system:boolean};
export type Profile={legalName:string;tradeName:string;nuit:string;province:string;district:string;address:string;phone:string;email:string;receiptFooter:string};
export type Options={lowStockThreshold:number;allowFiado:boolean;maxDiscountPercent:number;requireCustomerForFiado:boolean;requireApprovalForRefund:boolean;receiptPaper:"58mm"|"80mm"|"a4"};
export type CompanyEvent={id:string;createdAt:string;action:string;details:string};
export type CompanyWorkspace={tenantId:string;branches:Branch[];employees:Employee[];roles:Role[];profile:Profile;options:Options;events:CompanyEvent[]};
export const COMPANY_PAGES:{id:CompanyPage;label:string;group:"geral"|"equipa"|"config"}[]=[
 {id:"painel",label:"Visão geral",group:"geral"},{id:"filiais",label:"Filiais",group:"geral"},
 {id:"funcionarios",label:"Funcionários",group:"equipa"},{id:"perfis",label:"Perfis e permissões",group:"equipa"},
 {id:"instituicao",label:"Dados da empresa",group:"config"},{id:"operacoes",label:"Configurações",group:"config"},
 {id:"actividade",label:"Histórico de alterações",group:"config"}];
export const PERMISSIONS:{id:string;name:string;group:string}[]=[
 {id:"vendas.ver",name:"Consultar vendas",group:"Vendas e caixa"},
 {id:"vendas.criar",name:"Registar vendas",group:"Vendas e caixa"},
 {id:"vendas.anular",name:"Anular vendas",group:"Vendas e caixa"},
 {id:"caixa.gerir",name:"Gerir caixa",group:"Vendas e caixa"},
 {id:"produtos.ver",name:"Consultar produtos",group:"Produtos e stock"},
 {id:"produtos.editar",name:"Gerir produtos",group:"Produtos e stock"},
 {id:"stock.movimentar",name:"Movimentar stock",group:"Produtos e stock"},
 {id:"clientes.ver",name:"Consultar clientes",group:"Clientes e fiado"},
 {id:"fiado.registar",name:"Registar fiado",group:"Clientes e fiado"},
 {id:"fiado.receber",name:"Receber dívidas",group:"Clientes e fiado"},
 {id:"financeiro.ver",name:"Consultar receitas e despesas",group:"Relatórios"},
 {id:"relatorios.ver",name:"Consultar relatórios",group:"Relatórios"},
 {id:"filiais.gerir",name:"Gerir filiais",group:"Administração"},
 {id:"utilizadores.gerir",name:"Gerir funcionários",group:"Administração"},
 {id:"permissoes.gerir",name:"Gerir perfis",group:"Administração"},
 {id:"configuracoes.gerir",name:"Gerir configurações",group:"Administração"}];
export const ALL_PERMISSIONS=PERMISSIONS.map(p=>p.id);
export function defaultRoles():Role[]{return [
 {id:"admin",name:"Administrador da empresa",description:"Gere todas as áreas.",system:true,permissions:[...ALL_PERMISSIONS]},
 {id:"gestor",name:"Gestor de filial",description:"Coordena uma ou mais filiais.",system:true,permissions:ALL_PERMISSIONS.filter(p=>!p.includes("gerir")&&p!=="vendas.anular")},
 {id:"caixa",name:"Operador de caixa",description:"Regista vendas e recebimentos.",system:true,permissions:["vendas.ver","vendas.criar","caixa.gerir","produtos.ver","clientes.ver","fiado.registar","fiado.receber"]},
 {id:"stock",name:"Responsável de stock",description:"Gere produtos e inventário.",system:true,permissions:["produtos.ver","produtos.editar","stock.movimentar","relatorios.ver"]},
 {id:"financeiro",name:"Financeiro",description:"Consulta resultados e dívidas.",system:true,permissions:["vendas.ver","clientes.ver","fiado.receber","financeiro.ver","relatorios.ver"]}
]}
export const companyKey=(tenantId:string)=>"ubuntu-pos360-company-demo-v1-"+tenantId;
export function initialCompanyWorkspace(t:AdminTenant):CompanyWorkspace{
 const branches:Branch[]=Array.from({length:Math.max(1,Math.min(3,t.branchCount))},(_,i)=>({
  id:t.id+"-branch-"+(i+1),name:i===0?"Estabelecimento principal":"Filial "+(i+1),
  code:i===0?"PRINCIPAL":"FIL-"+(i+1),city:t.city,address:"Morada por definir",phone:"",active:true,createdAt:dateISO()
 }));
 return {tenantId:t.id,branches,employees:[{id:t.id+"-admin",name:"Administrador de exemplo",email:"admin@exemplo.invalid",phone:"",roleId:"admin",branchIds:branches.map(b=>b.id),active:true,createdAt:dateISO()}],roles:defaultRoles(),
 profile:{legalName:t.name,tradeName:t.name,nuit:"",province:"",district:t.city,address:"",phone:t.phone==="—"?"":t.phone,email:t.email,receiptFooter:"Obrigado pela preferência."},
 options:{lowStockThreshold:10,allowFiado:true,maxDiscountPercent:10,requireCustomerForFiado:true,requireApprovalForRefund:true,receiptPaper:"80mm"},events:[]};
}
export function safeCompanyWorkspace(value:unknown,t:AdminTenant):CompanyWorkspace{
 if(!value||typeof value!=="object")return initialCompanyWorkspace(t);
 const d=value as Partial<CompanyWorkspace>;
 if(d.tenantId!==t.id||!Array.isArray(d.branches)||!Array.isArray(d.employees)||!Array.isArray(d.roles)||!Array.isArray(d.events)||!d.profile||!d.options)return initialCompanyWorkspace(t);
 return d as CompanyWorkspace;
}
export const activeBranches=(s:CompanyWorkspace)=>s.branches.filter(b=>b.active);
export const activeStaff=(s:CompanyWorkspace)=>s.employees.filter(e=>e.active);
export const staffInBranch=(s:CompanyWorkspace,id:string)=>activeStaff(s).filter(e=>e.branchIds.includes(id));
export function planCapacity(s:CompanyWorkspace,p:AdminPlan|undefined){return {branches:{current:activeBranches(s).length,max:p?.maxBranches??1},users:{current:activeStaff(s).length,max:p?.maxUsers??1}};}
export type BranchInput=Pick<Branch,"name"|"code"|"city"|"address"|"phone">;
export function validateBranch(v:BranchInput,s:CompanyWorkspace,plan:AdminPlan|undefined,editingId?:string){
 if(v.name.trim().length<2)return "Indique o nome da filial.";
 if(!/^[A-Z0-9-]{2,12}$/.test(v.code.trim().toUpperCase()))return "Código inválido: use 2 a 12 letras, números ou hífen.";
 if(!v.city.trim())return "Indique a cidade ou distrito.";
 if(s.branches.some(b=>b.id!==editingId&&b.code.toUpperCase()===v.code.trim().toUpperCase()))return "Este código já é utilizado noutra filial.";
 if(!editingId&&activeBranches(s).length>=(plan?.maxBranches??1))return "Foi atingido o limite de filiais do plano.";
 return null;
}
export type EmployeeInput=Pick<Employee,"name"|"email"|"phone"|"roleId"|"branchIds">;
export function validateEmployee(v:EmployeeInput,s:CompanyWorkspace,p:AdminPlan|undefined,editingId?:string){
 if(v.name.trim().length<3)return "Indique o nome do funcionário.";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))return "Introduza um e-mail válido.";
 if(s.employees.some(e=>e.id!==editingId&&e.email.toLowerCase()===v.email.trim().toLowerCase()))return "Já existe um funcionário com este e-mail.";
 if(!s.roles.some(r=>r.id===v.roleId))return "Seleccione um perfil válido.";
 if(v.branchIds.length===0||v.branchIds.some(id=>!s.branches.some(b=>b.id===id&&b.active)))return "Escolha pelo menos uma filial activa.";
 if(!editingId&&activeStaff(s).length>=(p?.maxUsers??1))return "Foi atingido o limite de utilizadores do plano.";
 return null;
}
export function canDeactivateEmployee(e:Employee,s:CompanyWorkspace){return !e.active||e.roleId!=="admin"||activeStaff(s).filter(x=>x.roleId==="admin").length>1;}
export function canDeactivateBranch(b:Branch,s:CompanyWorkspace){
 if(!b.active)return true;
 if(activeBranches(s).length<=1)return false;
 return staffInBranch(s,b.id).every(e=>e.branchIds.some(id=>id!==b.id&&s.branches.some(br=>br.id===id&&br.active)));
}
export function validateRole(r:Role,s:CompanyWorkspace,editingId?:string){
 if(r.name.trim().length<3)return "Indique o nome do perfil.";
 if(s.roles.some(x=>x.id!==editingId&&x.name.toLowerCase()===r.name.trim().toLowerCase()))return "Este perfil já existe.";
 if(r.permissions.some(p=>!ALL_PERMISSIONS.includes(p)))return "Foi seleccionada uma permissão desconhecida.";
 if(!r.permissions.length)return "Seleccione pelo menos uma permissão.";
 return null;
}
export function validateOptions(v:Options){
 if(!Number.isInteger(v.lowStockThreshold)||v.lowStockThreshold<0||v.lowStockThreshold>100000)return "Introduza um limite de stock válido.";
 if(!Number.isFinite(v.maxDiscountPercent)||v.maxDiscountPercent<0||v.maxDiscountPercent>100)return "O desconto máximo deve estar entre 0% e 100%.";
 if(!["58mm","80mm","a4"].includes(v.receiptPaper))return "Escolha um formato de impressão válido.";
 return null;
}
export function validateProfile(p:Profile){
 if(p.legalName.trim().length<3)return "Indique a designação social.";
 if(p.tradeName.trim().length<2)return "Indique o nome comercial.";
 if(p.nuit&&!/^\d{9}$/.test(p.nuit))return "O NUIT deve conter 9 algarismos.";
 if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))return "Introduza um e-mail válido.";
 return null;
}
