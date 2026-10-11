import {normalizeBarcode,validBarcode} from "./barcodes";

/**
 * Leitores USB "keyboard wedge" introduzem caracteres em poucos milissegundos e
 * terminam normalmente em Enter/Tab. Não confundir esta sequência com digitação.
 * Para códigos curtos ou dispositivos lentos, utilizar o campo de pesquisa.
 */
export const USB_MAX_GAP_MS=85;
export const USB_SUFFIX_GAP_MS=250;
export const USB_MIN_AUTO_LENGTH=6;
export type UsbScanBuffer={chars:string;startedAt:number;lastAt:number};
export const emptyUsbBuffer=():UsbScanBuffer=>({chars:"",startedAt:0,lastAt:0});

export function consumeUsbScanKey(
 buffer:UsbScanBuffer,key:string,at:number
):{buffer:UsbScanBuffer;code:string|null}{
 if(key==="Shift"||key==="CapsLock")return {buffer,code:null};
 if(key==="Enter"||key==="Tab"){
  const raw=buffer.chars;
  const code=raw.length>=USB_MIN_AUTO_LENGTH
    &&at-buffer.lastAt<=USB_SUFFIX_GAP_MS&&validBarcode(raw)?normalizeBarcode(raw):null;
  return {buffer:emptyUsbBuffer(),code};
 }
 if(key.length!==1||!/^[A-Za-z0-9._-]$/.test(key)||!Number.isFinite(at))
  return {buffer:emptyUsbBuffer(),code:null};
 const continuous=buffer.chars.length>0&&at>=buffer.lastAt&&at-buffer.lastAt<=USB_MAX_GAP_MS;
 const chars=continuous?buffer.chars+key:key;
 if(chars.length>64)return {buffer:emptyUsbBuffer(),code:null};
 return {buffer:{chars,startedAt:continuous?buffer.startedAt:at,lastAt:at},code:null};
}

export function isTypingInsideField(target:EventTarget|null):boolean{
 return target instanceof HTMLElement&&Boolean(target.closest(
  'input,textarea,select,[contenteditable="true"],[role="textbox"]'
 ));
}
