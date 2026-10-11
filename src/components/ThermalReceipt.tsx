import {useEffect,useMemo,useState,type ChangeEvent,type FormEvent} from "react";
import {CheckCircle2,FileImage,Info,Printer,ReceiptText,Settings2,Trash2} from "lucide-react";
import {money,type Sale,type Store} from "../lib/domain";
import {qrPath,THERMAL_QR_SIZE,THERMAL_QR_MAX_BYTES} from "../lib/thermal-qr";
import {receiptAmount,receiptDetails,receiptQuantity,receiptTimestamp,sanitizeThermalSettings,validReceiptLogo,type ThermalReceiptSettings,type ThermalPaper} from "../lib/thermal-receipt";
const version="DEMONSTRAÇÃO · NÃO FISCAL";
export function ThermalReceiptPreview({sale,store,paper}:{sale:Sale;store:Store;paper:ThermalPaper}){
 const settings=sanitizeThermalSettings(store.receiptSettings);
 const details=receiptDetails(sale,store);
 const qr=useMemo(()=>{
  if(!settings.showQr)return "";
  if(new TextEncoder().encode(details.qrPayload).length>THERMAL_QR_MAX_BYTES)return "";
  try{return qrPath(details.qrPayload)}catch{return ""}
 },[details.qrPayload,settings.showQr]);
 return <section className={"thermal-receipt thermal-receipt-"+paper} aria-label={"Comprovativo não fiscal "+sale.id}>
  <header className="thermal-receipt-head">
   {settings.logoDataUrl&&<img className="thermal-merchant-logo" src={settings.logoDataUrl} alt="Logótipo do estabelecimento"/>}
   <strong className="thermal-merchant-name">{settings.businessName}</strong>
   {settings.address&&<span>{settings.address}</span>}
   {settings.phone&&<span>Contacto: {settings.phone}</span>}
   {settings.nuit&&<span>NUIT informado: {settings.nuit}</span>}
   <b className="thermal-nonfiscal">{version}</b>
  </header>
  <div className="thermal-receipt-meta">
   <div><span>Referência</span><strong>{sale.id}</strong></div>
   <div><span>Data</span><span>{receiptTimestamp(sale.createdAt)}</span></div>
   <div><span>Origem</span><span>{details.source}</span></div>
   <div><span>Pagamento</span><span>{details.method}</span></div>
   {details.customerName&&<div><span>Cliente</span><span>{details.customerName}</span></div>}
   {sale.dueDate&&sale.method==="fiado"&&<div><span>Vencimento</span><span>{sale.dueDate}</span></div>}
  </div>
  <div className="thermal-line">ARTIGOS</div>
  <div className="thermal-receipt-items">
   {details.articles.map((item,i)=><div key={item.productId+"-"+i} className="thermal-receipt-item">
    <div className="thermal-item-name">{item.name}</div>
    <div className="thermal-item-calc"><span>{receiptQuantity(item.qty)} × {receiptAmount(item.price)}</span><strong>{receiptAmount(item.lineTotal)}</strong></div>
   </div>)}
  </div>
  <div className="thermal-receipt-totals">
   <div><span>Subtotal</span><strong>{receiptAmount(details.subtotal)} MZN</strong></div>
   {details.deliveryFee!==0&&<div><span>Entrega</span><strong>{receiptAmount(details.deliveryFee)} MZN</strong></div>}
   {details.adjustments!==0&&<div><span>Ajustes da venda</span><strong>{receiptAmount(details.adjustments)} MZN</strong></div>}
   <div className="thermal-total"><span>TOTAL</span><strong>{receiptAmount(details.total)} MZN</strong></div>
   {details.cashTender&&<div className="thermal-tender"><span>Dinheiro recebido</span><strong>{receiptAmount(details.cashTender.received)} MZN</strong></div>}
   {details.cashTender&&<div className="thermal-tender"><span>Troco calculado</span><strong>{receiptAmount(details.cashTender.change)} MZN</strong></div>}
  </div>
  {details.unpaid&&<div className="thermal-credit-note">VENDA A FIADO — não representa valor já recebido.</div>}
  {qr&&<div className="thermal-receipt-qr"><svg width={paper==="58mm"?98:118} height={paper==="58mm"?98:118} viewBox="0 0 41 41" role="img" aria-label="QR Code com a referência de demonstração" shapeRendering="crispEdges"><rect x="0" y="0" width="41" height="41" fill="#fff"/><path transform="translate(4 4)" d={qr} fill="#000"/></svg><span>QR da referência</span><small>Não valida pagamento nem autenticidade fiscal</small></div>}
  {settings.showQr&&!qr&&<div className="thermal-qr-unavailable">QR indisponível para esta referência.</div>}
  <footer className="thermal-receipt-footer">
   {settings.footer&&<p>{settings.footer}</p>}
   <strong>COMPROVATIVO DE DEMONSTRAÇÃO</strong>
   <small>Não comprova pagamento real nem substitui factura ou recibo fiscal.</small>
   <small>Ubuntu POS 360 · Tecnologia: Ubuntu Service, Lda.</small>
  </footer>
 </section>;
}
export function ThermalReceiptPanel({sale,store,newSale,onFinish,onPaperChange}:{sale:Sale;store:Store;newSale:boolean;onFinish:()=>void;onPaperChange:(paper:ThermalPaper)=>void}){
 const settings=sanitizeThermalSettings(store.receiptSettings);
 const [printed,setPrinted]=useState(false);
 useEffect(()=>{setPrinted(false)},[sale.id]);
 return <div className="thermal-panel">
  {newSale&&<div className="thermal-success"><CheckCircle2 size={21}/><span>Venda registada na demonstração: <b>{money(sale.total)}</b></span></div>}
  <div className="thermal-print-controls">
   <div><label htmlFor="thermal-paper-selector">Largura do papel</label><select id="thermal-paper-selector" value={settings.paper} onChange={e=>onPaperChange(e.target.value as ThermalPaper)}>
     <option value="58mm">58 mm — compacto</option><option value="80mm">80 mm — detalhado</option>
   </select></div>
   <span>Escolha a mesma largura nas definições da impressora.</span>
  </div>
  <div className="thermal-preview-area"><ThermalReceiptPreview sale={sale} store={store} paper={settings.paper}/></div>
  <p className="thermal-print-hint"><Info size={16}/> A impressão abre a caixa de diálogo do navegador. Escolha a impressora térmica e o papel correcto; a impressão e o corte automáticos dependem do dispositivo e do controlador.</p>
  <div className="thermal-panel-actions">
   <button type="button" className="outline-btn" onClick={onFinish}>{newSale?"Continuar a vender":"Fechar"}</button>
   <button type="button" className="primary-btn" onClick={()=>{setPrinted(true);window.print()}}><Printer size={18}/> {printed?"Imprimir novamente":"Imprimir comprovativo"}</button>
  </div>
 </div>;
}

export function ThermalReceiptSettingsPanel({value,onSave}:{value:ThermalReceiptSettings;onSave:(value:ThermalReceiptSettings)=>void}){
 const [draft,setDraft]=useState(()=>sanitizeThermalSettings(value));
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 useEffect(()=>setDraft(sanitizeThermalSettings(value)),[value]);
 const update=<K extends keyof ThermalReceiptSettings>(key:K,next:ThermalReceiptSettings[K])=>{
  setDraft(current=>({...current,[key]:next}));setError("");setSuccess("");
 };
 const upload=(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];event.target.value="";
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setError("Use uma imagem PNG, JPG ou WebP.");return;}
  if(file.size>110_000){setError("O logótipo deve ter no máximo 110 KB para não sobrecarregar o armazenamento local.");return;}
  const reader=new FileReader();
  reader.onload=()=>{
   const url=reader.result;
   if(!validReceiptLogo(url)){setError("Não foi possível carregar um logótipo válido.");return;}
   update("logoDataUrl",url);
  };
  reader.onerror=()=>setError("Não foi possível ler o ficheiro do logótipo.");
  reader.readAsDataURL(file);
 };
 const submit=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(draft.businessName.trim().length<3){setError("Indique o nome comercial com pelo menos três caracteres.");return;}
  onSave(sanitizeThermalSettings(draft));setSuccess("Configuração dos comprovativos guardada neste navegador.");setError("");
 };
 return <section className="thermal-settings-panel" aria-labelledby="thermal-settings-heading">
  <header><div className="thermal-settings-icon"><ReceiptText size={22}/></div><div><h2 id="thermal-settings-heading">Comprovativos térmicos (não fiscais)</h2><p>Configure a identificação do seu estabelecimento e o formato de impressão.</p></div></header>
  <form onSubmit={submit} className="thermal-settings-form">
   <label>Nome comercial do estabelecimento<input required minLength={3} maxLength={90} value={draft.businessName} onChange={e=>update("businessName",e.target.value)} placeholder="Ex.: Mercado da Baixa"/></label>
   <label>Morada / localização<input maxLength={160} value={draft.address} onChange={e=>update("address",e.target.value)} placeholder="Ex.: Lichinga, Niassa"/></label>
   <div className="thermal-settings-pair"><label>Contacto<input maxLength={50} value={draft.phone} onChange={e=>update("phone",e.target.value)} placeholder="Ex.: 84..."/></label><label>NUIT (opcional)<input maxLength={30} value={draft.nuit} onChange={e=>update("nuit",e.target.value)} placeholder="Preencha apenas se confirmado"/></label></div>
   <label>Mensagem no rodapé<input maxLength={150} value={draft.footer} onChange={e=>update("footer",e.target.value)} placeholder="Obrigado pela preferência!"/></label>
   <div className="thermal-settings-pair"><label>Largura predefinida do rolo<select value={draft.paper} onChange={e=>update("paper",e.target.value as ThermalPaper)}><option value="58mm">58 mm (compacto)</option><option value="80mm">80 mm (detalhado)</option></select></label><label className="thermal-qr-switch"><input type="checkbox" checked={draft.showQr} onChange={e=>update("showQr",e.target.checked)}/> Incluir QR da referência demonstrativa</label></div>
   <div className="thermal-logo-settings">
    <div><strong>Logótipo do estabelecimento</strong><small>PNG/JPG/WebP, até 110 KB. Guardado apenas neste navegador.</small></div>
    {draft.logoDataUrl&&<img alt="Pré-visualização do logótipo" src={draft.logoDataUrl}/>}
    <label className="thermal-logo-upload"><FileImage size={16}/> Seleccionar imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/></label>
    {draft.logoDataUrl&&<button type="button" className="thermal-logo-remove" onClick={()=>update("logoDataUrl","")}><Trash2 size={15}/> Retirar logótipo</button>}
   </div>
   {error&&<p role="alert" className="thermal-settings-error">{error}</p>}
   {success&&<p role="status" className="thermal-settings-success">{success}</p>}
   <p className="thermal-settings-disclaimer"><Info size={16}/> Estas informações são ilustrativas e não verificam NUIT, autorizações fiscais ou recebimentos. Os comprovativos não são documentos fiscais.</p>
   <div className="thermal-settings-actions"><button type="submit" className="primary-btn"><Settings2 size={17}/> Guardar configuração</button></div>
  </form>
 </section>;
}
