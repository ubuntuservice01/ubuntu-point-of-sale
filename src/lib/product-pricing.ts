import {roundMoney,type Product} from "./domain";

/** Purchase cost is unknown for historical products without a configured purchase price.
 * Do not infer a cost from selling prices or show fictional profit figures. */
export function validUnitPrice(value:number):boolean {
 return Number.isFinite(value)&&value>0&&Math.abs(value*100-Math.round(value*100))<1e-7;
}
export function hasPurchasePrice(product:Product):boolean {
 return product.purchasePrice!==undefined&&validUnitPrice(product.purchasePrice);
}
/** Difference before expenses, taxes, discounts or other cost allocations; not net profit. */
export function grossUnitDifference(product:Product):number|null {
 return hasPurchasePrice(product)?roundMoney(product.price-product.purchasePrice!):null;
}
export function grossUnitDifferencePercent(product:Product):number|null {
 const difference=grossUnitDifference(product);
 return difference===null||product.price<=0?null:Math.round((difference/product.price)*10000)/100;
}
