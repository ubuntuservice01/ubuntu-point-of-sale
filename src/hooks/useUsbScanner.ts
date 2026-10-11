import {useEffect,useRef} from "react";
import {consumeUsbScanKey,emptyUsbBuffer,isTypingInsideField} from "../lib/usb-scanner";

/**
 * Leitores USB de tipo teclado funcionam sem drivers e emitem Enter ou Tab no fim.
 * Escuta apenas o POS em desktop; não intercepta a escrita em formulários.
 */
export function useUsbScanner(enabled:boolean,onBarcode:(value:string)=>void){
 const callbackRef=useRef(onBarcode);
 const bufferRef=useRef(emptyUsbBuffer());
 callbackRef.current=onBarcode;
 useEffect(()=>{
  bufferRef.current=emptyUsbBuffer();
  if(!enabled)return;
  const keydown=(event:KeyboardEvent)=>{
   if(window.matchMedia?.("(max-width:650px)").matches){
    bufferRef.current=emptyUsbBuffer();return;
   }
   if(event.defaultPrevented||event.isComposing||event.repeat||event.ctrlKey||event.altKey||event.metaKey||isTypingInsideField(event.target)){
    bufferRef.current=emptyUsbBuffer();return;
   }
   const next=consumeUsbScanKey(bufferRef.current,event.key,event.timeStamp);
   bufferRef.current=next.buffer;
   if(next.code){
    // Impede que o Enter do leitor active o botão actualmente focado.
    event.preventDefault();
    callbackRef.current(next.code);
   }
  };
  document.addEventListener("keydown",keydown,true);
  return()=>{document.removeEventListener("keydown",keydown,true);bufferRef.current=emptyUsbBuffer();};
 },[enabled]);
}
