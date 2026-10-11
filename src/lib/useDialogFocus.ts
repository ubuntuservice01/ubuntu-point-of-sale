import {useEffect,useRef} from "react";

/**
 * Gestão centralizada de foco dos diálogos demonstrativos.
 * Mantém o teclado dentro da janela, suporta Escape e devolve o foco a quem abriu o diálogo.
 * Não define permissões ou autenticação.
 */
export function useDialogFocus<T extends HTMLElement>(onClose:()=>void){
 const elementRef=useRef<T>(null);
 const closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{
  const container=elementRef.current;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const focusable=()=>Array.from(container?.querySelectorAll<HTMLElement>(
   'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )??[]).filter(item=>item.getAttribute("aria-hidden")!=="true");
  (focusable().find(item=>item.matches("input,select,textarea,[autofocus]"))??focusable()[0]??container)?.focus();
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();closeRef.current();return;}
   if(event.key!=="Tab")return;
   const nodes=focusable(),first=nodes[0],last=nodes[nodes.length-1];
   if(!first||!last){event.preventDefault();container?.focus();return;}
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener("keydown",keydown);
  return()=>{document.removeEventListener("keydown",keydown);previous?.focus()};
 },[]);
 return elementRef;
}
