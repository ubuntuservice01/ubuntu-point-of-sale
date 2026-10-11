import {describe,expect,it} from "vitest";
import {consumeUsbScanKey,emptyUsbBuffer,isTypingInsideField,USB_MAX_GAP_MS} from "./usb-scanner";

function transmit(code:string,{interval=14,suffix="Enter",delay=10}:{interval?:number;suffix?:string;delay?:number}={}){
 let current=emptyUsbBuffer(),at=1000,found:string|null=null;
 for(const char of code){
  const next=consumeUsbScanKey(current,char,at);
  current=next.buffer;found=next.code??found;at+=interval;
 }
 const result=consumeUsbScanKey(current,suffix,at+delay);
 return {result,found};
}
describe("Reconhecimento de leitores USB em modo teclado",()=>{
 it("aceita sequência rápida terminada em Enter e reinicia o buffer",()=>{
  const {result}=transmit("ALI-001");
  expect(result.code).toBe("ALI-001");
  expect(result.buffer.chars).toBe("");
 });
 it("aceita códigos EAN/UPC e leitores que terminem em Tab",()=>{
  expect(transmit("7891234567895",{suffix:"Tab"}).result.code).toBe("7891234567895");
  expect(transmit("0123456789012").result.code).toBe("0123456789012");
 });
 it("não transforma a digitação humana lenta em leitura USB",()=>{
  expect(transmit("ALI-001",{interval:USB_MAX_GAP_MS+5}).result.code).toBeNull();
 });
 it("não captura códigos curtos, nem Enter isolado, nem sufixo atrasado",()=>{
  expect(transmit("A12B").result.code).toBeNull();
  expect(consumeUsbScanKey(emptyUsbBuffer(),"Enter",2000).code).toBeNull();
  expect(transmit("ALI-001",{delay:300}).result.code).toBeNull();
 });
 it("ignora Shift usado com letras maiúsculas",()=>{
  let buffer=emptyUsbBuffer();
  buffer=consumeUsbScanKey(buffer,"A",100).buffer;
  buffer=consumeUsbScanKey(buffer,"Shift",105).buffer;
  for(const [i,key] of [..."LI-001"].entries())buffer=consumeUsbScanKey(buffer,key,115+8*i).buffer;
  expect(consumeUsbScanKey(buffer,"Enter",190).code).toBe("ALI-001");
 });
 it("descarta caracteres inválidos e sequências demasiado longas",()=>{
  expect(consumeUsbScanKey(consumeUsbScanKey(emptyUsbBuffer(),"A",100).buffer,"/",120).buffer.chars).toBe("");
  let buffer=emptyUsbBuffer();
  for(let i=0;i<66;i++)buffer=consumeUsbScanKey(buffer,"A",100+i).buffer;
  expect(buffer.chars.length).toBeLessThan(6);
 });
 it("identifica campos em edição, sem bloquear teclas de outros controlos",()=>{
  const field=document.createElement("input");
  document.body.append(field);
  const button=document.createElement("button");
  document.body.append(button);
  expect(isTypingInsideField(field)).toBe(true);
  expect(isTypingInsideField(button)).toBe(false);
  expect(isTypingInsideField(null)).toBe(false);
  field.remove();button.remove();
 });
});
