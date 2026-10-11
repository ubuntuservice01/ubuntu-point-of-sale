import {useEffect,useState} from "react";
import {LayoutDashboard,ShoppingCart,Package,HandCoins,Grid3X3,X,Plus,Users,Receipt,Wallet,ClipboardList,ArrowRight} from "lucide-react";
import {money,type Section} from "../lib/domain";
import {useDialogFocus} from "../lib/useDialogFocus";

type MobileNavItem={id:Section;label:string;icon:typeof LayoutDashboard};
export const MOBILE_NAV_ITEMS:readonly MobileNavItem[]=[
 {id:"dashboard",label:"Início",icon:LayoutDashboard},
 {id:"pos",label:"Vender",icon:ShoppingCart},
 {id:"products",label:"Produtos",icon:Package},
 {id:"customers",label:"Fiado",icon:HandCoins}
];
export const MOBILE_QUICK_ACTIONS=[
 {id:"sale",label:"Nova venda",subtitle:"Voltar ao balcão",icon:ShoppingCart},
 {id:"product",label:"Novo produto",subtitle:"Registar artigo",icon:Package},
 {id:"customer",label:"Novo cliente",subtitle:"Abrir cadastro",icon:Users},
 {id:"debt",label:"Receber fiado",subtitle:"Escolher cliente devedor",icon:HandCoins},
 {id:"purchase",label:"Compras e entradas",subtitle:"Gerir recepções",icon:ClipboardList},
 {id:"cash",label:"Gestão de caixa",subtitle:"Abrir, consultar ou fechar",icon:Wallet}
] as const;
export type QuickActionId=(typeof MOBILE_QUICK_ACTIONS)[number]["id"];
type Props={
 section:Section;cartCount:number;cartTotal:number;cartVisible:boolean;drawerOpen:boolean;
 navigate:(section:Section)=>void;action:(action:QuickActionId)=>void;
 showCart:()=>void;
};

function useMobileViewport(){
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  if(typeof window.matchMedia!=="function")return;
  const media=window.matchMedia("(max-width:650px)");
  const update=()=>setMobile(media.matches);
  update();
  if(typeof media.addEventListener==="function"){
   media.addEventListener("change",update);
   return()=>media.removeEventListener("change",update);
  }
  media.addListener?.(update);
  return()=>media.removeListener?.(update);
 },[]);
 return mobile;
}
function QuickSheet({close,choose}:{close:()=>void;choose:(action:QuickActionId)=>void}){
 const ref=useDialogFocus<HTMLDivElement>(close);
 return <>
  <button className="mobile-quick-scrim" aria-label="Fechar acções rápidas" onClick={close}/>
  <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Acções rápidas" className="mobile-quick-sheet">
   <header className="mobile-quick-header">
    <div><strong>Acções rápidas</strong><small>Escolha a tarefa que pretende realizar</small></div>
    <button type="button" className="mobile-sheet-close" aria-label="Fechar acções rápidas" onClick={close}><X size={21}/></button>
   </header>
   <div className="mobile-quick-grid">
    {MOBILE_QUICK_ACTIONS.map(item=><button type="button" key={item.id} className="mobile-quick-action" onClick={()=>choose(item.id)}>
     <span className="mobile-quick-icon"><item.icon size={22}/></span>
     <span><strong>{item.label}</strong><small>{item.subtitle}</small></span>
     <ArrowRight size={17} className="mobile-quick-arrow"/>
    </button>)}
   </div>
   <p className="mobile-quick-disclaimer">As operações continuam a ser demonstrativas e não processam pagamentos reais.</p>
  </div>
 </>;
}
export function MobileQuickNav({section,cartCount,cartTotal,cartVisible,drawerOpen,navigate,action,showCart}:Props){
 const mobile=useMobileViewport();
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[section,mobile,drawerOpen]);
 if(!mobile||drawerOpen)return null;
 const choose=(id:QuickActionId)=>{setOpen(false);action(id)};
 return <>
  {section==="pos"&&cartCount>0&&!cartVisible&&<button type="button" className="mobile-floating-cart" onClick={showCart} aria-label={"Ver carrinho com "+cartCount+" artigos, total "+money(cartTotal)}>
   <span><ShoppingCart size={19}/><b>{cartCount} {cartCount===1?"artigo":"artigos"}</b></span>
   <span><strong>{money(cartTotal)}</strong><ArrowRight size={18}/></span>
  </button>}
  <nav className="mobile-bottom-nav" aria-label="Navegação rápida móvel">
   {MOBILE_NAV_ITEMS.map(item=><button type="button" key={item.id} className={"mobile-nav-link "+(section===item.id?"is-current":"")}
     aria-current={section===item.id?"page":undefined} onClick={()=>navigate(item.id)}>
    <item.icon size={22} strokeWidth={section===item.id?2.5:2}/>
    <span>{item.label}</span>{item.id==="pos"&&cartCount>0&&<small className="mobile-nav-count">{cartCount}</small>}
   </button>)}
   <button type="button" className={"mobile-nav-link "+(open?"is-current":"")} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
    <Grid3X3 size={22}/><span>Mais</span>
   </button>
  </nav>
  {open&&<QuickSheet close={()=>setOpen(false)} choose={choose}/>}
 </>;
}
