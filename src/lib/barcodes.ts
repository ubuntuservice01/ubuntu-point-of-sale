import type {Product} from "./domain";

/** Mantém zeros à esquerda; alguns dispositivos apresentam UPC-A também como EAN-13 com prefixo 0. */
export function normalizeBarcode(value:string):string{
 return value.trim().replace(/[\s\u200B-\u200D\uFEFF]/g,"").toUpperCase();
}
export function barcodeVariants(value:string):string[]{
 const barcode=normalizeBarcode(value);
 if(!barcode)return [];
 const values=new Set([barcode]);
 if(/^0\d{12}$/.test(barcode))values.add(barcode.slice(1));
 if(/^\d{12}$/.test(barcode))values.add("0"+barcode);
 return [...values];
}
export function sameBarcode(a:string,b:string):boolean{
 if(!a||!b)return false;
 const variants=new Set(barcodeVariants(a));
 return barcodeVariants(b).some(value=>variants.has(value));
}
/** Código EAN/UPC/Code128 alfanumérico (sem espaços) e SKU interno. */
export function validBarcode(value:string):boolean{
 return /^[A-Z0-9._-]{4,64}$/.test(normalizeBarcode(value));
}
export function findProductByScan(products:readonly Product[],rawValue:string):Product|undefined{
 const code=normalizeBarcode(rawValue);
 if(!code)return undefined;
 // O código de barras dedicado prevalece sobre o SKU usado internamente.
 return products.find(p=>p.barcode&&sameBarcode(p.barcode,code))
  ??products.find(p=>sameBarcode(p.sku,code));
}
/** Evita registar o mesmo valor no SKU ou no código de barras de produtos distintos. */
export function barcodeCollision(
 products:readonly Product[],sku:string,barcode:string,ignoreId?:string
):Product|undefined{
 return products.find(product=>{
  if(product.id===ignoreId)return false;
  const values=[product.sku,product.barcode??""].filter(Boolean);
  return values.some(existing=>sameBarcode(existing,sku)||(barcode!==""&&sameBarcode(existing,barcode)));
 });
}
