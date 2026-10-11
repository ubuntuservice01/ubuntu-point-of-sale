import {describe,expect,it} from "vitest";
import {qrMatrix,qrPath,THERMAL_QR_SIZE,THERMAL_QR_MAX_BYTES} from "./thermal-qr";
import {defaultThermalReceiptSettings,receiptAmount,receiptDetails,receiptQuantity,receiptTimestamp,sanitizeThermalSettings,thermalQrPayload,validReceiptLogo} from "./thermal-receipt";
import {initialStore,safeStore,type Sale} from "./domain";
const example:Sale={id:"VD-TEST-001",createdAt:"2026-10-11T10:00:00Z",items:[
 {productId:"p1",name:"Arroz 5 kg",qty:2,price:125},
 {productId:"p2",name:"Açúcar 1 kg",qty:0.5,price:80}
],total:330,method:"mpesa",source:"pos"};
describe("Comprovativos térmicos não fiscais",()=>{
 it("recupera as opções de impressão para lojas antigas, sem apagar vendas",()=>{
  const old=initialStore();
  const restored=safeStore({...old,receiptSettings:undefined});
  expect(restored.receiptSettings).toEqual(defaultThermalReceiptSettings());
  expect(restored.products).toHaveLength(old.products.length);
  expect(safeStore({...old,credits:undefined}).receiptSettings.paper).toBe("80mm");
 });
 it("aceita apenas formatos de papel reais e normaliza dados adulterados no localStorage",()=>{
  const result=sanitizeThermalSettings({
   paper:"A0",businessName:"   Loja Fictícia  ",address:"  Bairro  ",phone:" 841234567 ",nuit:" 123456",
   showQr:"não",logoDataUrl:"javascript:alert(1)",footer:"Bem-vindo!"
  });
  expect(result.paper).toBe("80mm");
  expect(result.businessName).toBe("Loja Fictícia");
  expect(result.showQr).toBe(true);
  expect(result.logoDataUrl).toBe("");
  expect(validReceiptLogo("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
  expect(validReceiptLogo("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
 });
 it("distingue fiado e taxa de entrega, sem fingir pagamento confirmado",()=>{
  const store={...initialStore(),customers:[{id:"c1",name:"Cliente X",phone:"",debt:330}]};
  const details=receiptDetails({...example,method:"fiado",customerId:"c1",source:"online",total:350,deliveryFee:20},store);
  expect(details.unpaid).toBe(true);
  expect(details.method).toContain("Fiado");
  expect(details.customerName).toBe("Cliente X");
  expect(details.subtotal).toBe(290);
  expect(details.deliveryFee).toBe(20);
  expect(details.adjustments).toBe(40);
  expect(details.total).toBe(350);
 });
 it("não envia dados de clientes no QR, que codifica apenas uma referência demonstrativa",()=>{
  const text=thermalQrPayload({...example,customerId:"cliente-privado"});
  expect(text).toContain(example.id);
  expect(text).toContain("DEMO");
  expect(text).not.toContain("cliente-privado");
 });
 it("formata quantidades fraccionárias e montantes em MZN sem arredondamentos de stock",()=>{
  expect(receiptQuantity(0.375)).toContain("375");
  expect(receiptQuantity(2)).toBe("2");
  expect(receiptAmount(123.5)).toContain("123");
  expect(receiptTimestamp("invalid")).toBe("Data indisponível");
 });
});
describe("QR Code local para a referência",()=>{
 it("gera uma matriz versão 4 com padrões de localização e módulo escuro fixo",()=>{
  const qr=qrMatrix("UBUNTU-POS360-DEMO:VD-TEST-001");
  expect(qr).toHaveLength(THERMAL_QR_SIZE);
  expect(qr.every(row=>row.length===THERMAL_QR_SIZE)).toBe(true);
  expect(qr[0]![0]).toBe(true);
  expect(qr[3]![3]).toBe(true);
  expect(qr[1]![1]).toBe(false);
  expect(qr[25]![8]).toBe(true);
  expect(qr[26]![26]).toBe(true);
  expect(qr[26]![25]).toBe(false);
  expect(qr[6]![10]).toBe(true);
  expect(qr[6]![11]).toBe(false);
  expect(qrPath("UBUNTU-POS360-DEMO:VD-TEST-001")).toMatch(/^M\d+ \d+h\d+v1H\d+z/);
 });
 it("tem capacidade máxima limitada e nunca trunca silenciosamente referências",()=>{
  expect(THERMAL_QR_MAX_BYTES).toBe(78);
  expect(()=>qrMatrix("A".repeat(79))).toThrow(/demasiado longa/);
  expect(()=>qrMatrix("A".repeat(78))).not.toThrow();
 });
 it("corresponde à matriz independente de referência QR Code 4-L em modo byte",()=>{
  const result=qrMatrix("UBUNTU-POS360-DEMO:VD-TEST-001");
  const goldenRows:Record<number,string>={
   0:"111111100010001000100001101111111",
   1:"100000100100010001000101101000001",
   5:"100000100011101110111101001000001",
   10:"110111100011101110111010011010111",
   17:"011000011111110111011101110100100",
   25:"000000001001110111011101100010100",
   32:"111111101000100010001001100011011"
  };
  for(const [index,row] of Object.entries(goldenRows)){
   expect(result[Number(index)]!.map(v=>v?"1":"0").join("")).toBe(row);
  }
 });
 it("é determinístico e a alteração da referência altera o código",()=>{
  const a=qrPath("UBUNTU-POS360-DEMO:VD-111");
  const b=qrPath("UBUNTU-POS360-DEMO:VD-222");
  expect(a).toBe(qrPath("UBUNTU-POS360-DEMO:VD-111"));
  expect(a).not.toBe(b);
 });
});
