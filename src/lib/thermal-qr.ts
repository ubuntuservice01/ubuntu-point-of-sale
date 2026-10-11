/**
 * QR Code Model 2, versão 4, nível L (33×33, 80 bytes de dados + 20 de correcção).
 * Implementação local, sem dependências, rede ou envio de identificadores.
 * A matriz é usada apenas para a referência demonstrativa (nunca como validação fiscal).
 */
const SIZE=33, DATA_LENGTH=80, ECC_LENGTH=20;
export const THERMAL_QR_MAX_BYTES=78;

function gfMul(x:number,y:number):number{
 let result=0;
 for(let i=7;i>=0;i--){
  result=(result<<1)^((result>>>7)*0x11d);
  result^=((y>>>i)&1)*x;
 }
 return result&255;
}
function eccDivisor(degree:number):number[]{
 const result=Array(degree).fill(0) as number[];
 result[degree-1]=1;
 let root=1;
 for(let i=0;i<degree;i++){
  for(let j=0;j<degree;j++){
   result[j]=gfMul(result[j]!,root);
   if(j+1<degree)result[j]^=result[j+1]!;
  }
  root=gfMul(root,2);
 }
 return result;
}
function eccRemainder(data:number[],degree:number):number[]{
 const div=eccDivisor(degree),result=Array(degree).fill(0) as number[];
 for(const byte of data){
  const factor=byte^result.shift()!;
  result.push(0);
  for(let i=0;i<degree;i++)result[i]^=gfMul(div[i]!,factor);
 }
 return result;
}
function encode(input:string):number[]{
 const bytes=Array.from(new TextEncoder().encode(input));
 if(bytes.length>THERMAL_QR_MAX_BYTES)throw new Error("Referência demasiado longa para o QR local.");
 const bits:number[]=[];
 const append=(val:number,count:number)=>{for(let i=count-1;i>=0;i--)bits.push((val>>>i)&1)};
 append(0b0100,4);append(bytes.length,8);
 for(const byte of bytes)append(byte,8);
 append(0,Math.min(4,DATA_LENGTH*8-bits.length));
 while(bits.length%8)bits.push(0);
 const result:number[]=[];
 for(let i=0;i<bits.length;i+=8){
  let byte=0;
  for(let j=0;j<8;j++)byte=(byte<<1)|bits[i+j]!;
  result.push(byte);
 }
 for(let i=0;result.length<DATA_LENGTH;i++)result.push(i%2===0?0xec:0x11);
 return [...result,...eccRemainder(result,ECC_LENGTH)];
}
export type QrMatrix=boolean[][];
export function qrMatrix(value:string):QrMatrix{
 const bytes=encode(value);
 const matrix:boolean[][]=Array.from({length:SIZE},()=>Array(SIZE).fill(false) as boolean[]);
 const reserved:boolean[][]=Array.from({length:SIZE},()=>Array(SIZE).fill(false) as boolean[]);
 const set=(x:number,y:number,dark:boolean)=>{
  if(x<0||y<0||x>=SIZE||y>=SIZE)return;
  matrix[y]![x]=dark;reserved[y]![x]=true;
 };
 const finder=(x:number,y:number)=>{
  for(let dy=-1;dy<=7;dy++)for(let dx=-1;dx<=7;dx++){
   const dist=Math.max(Math.abs(dx-3),Math.abs(dy-3));
   set(x+dx,y+dy,dist!==2&&dist!==4);
  }
 };
 finder(0,0);finder(SIZE-7,0);finder(0,SIZE-7);
 // Padrão de alinhamento da versão 4, centro em (26,26).
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  set(26+dx,26+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
 }
 for(let i=8;i<SIZE-8;i++){
  set(6,i,i%2===0);
  set(i,6,i%2===0);
 }
 // Versão 4 usa apenas os bits de formato, sem bits de versão.
 let bits=0b01000;
 for(let i=0;i<10;i++)bits=(bits<<1)^(((bits>>>9)&1)*0x537);
 const format=((0b01000<<10)|bits)^0x5412; // ECC=L, máscara 0.
 const bit=(i:number)=>((format>>>i)&1)!==0;
 for(let i=0;i<=5;i++)set(8,i,bit(i));
 set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));
 for(let i=9;i<15;i++)set(14-i,8,bit(i));
 for(let i=0;i<8;i++)set(SIZE-1-i,8,bit(i));
 for(let i=8;i<15;i++)set(8,SIZE-15+i,bit(i));
 set(8,SIZE-8,true);
 let index=0;
 for(let right=SIZE-1;right>=1;right-=2){
  if(right===6)right=5;
  for(let vert=0;vert<SIZE;vert++){
   const y=(((right+1)&2)===0)?SIZE-1-vert:vert;
   for(let j=0;j<2;j++){
    const x=right-j;
    if(reserved[y]![x])continue;
    const dark=index<bytes.length*8?((bytes[index>>>3]!>>>(7-(index&7)))&1)===1:false;
    matrix[y]![x]=dark!==((x+y)%2===0);
    index++;
   }
  }
 }
 return matrix;
}
/** Reúne módulos consecutivos num só path para SVG pequeno e com quadrados perfeitos. */
export function qrPath(value:string):string{
 const grid=qrMatrix(value);
 const commands:string[]=[];
 for(let y=0;y<SIZE;y++){
  let from=-1;
  for(let x=0;x<=SIZE;x++){
   const dark=x<SIZE&&grid[y]![x];
   if(dark&&from===-1)from=x;
   if(!dark&&from!==-1){
    commands.push("M"+from+" "+y+"h"+(x-from)+"v1H"+from+"z");
    from=-1;
   }
  }
 }
 return commands.join("");
}
export const THERMAL_QR_SIZE=SIZE;
