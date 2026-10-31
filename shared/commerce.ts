export interface Category { id:string; name:string; slug:string; }
export interface Variant { id?:string; sku:string; attributes:Record<string,string>; price:string|number; enabled:boolean; available?:number; }
export interface Content { name:string; description:string; categoryId:string; imageUrl:string|null; variants:Variant[]; }
export interface Product { id:string; slug:string; version:number; archived:boolean; draft?:Content|null; published?:Content|null; content?:Content; }
export interface Page<T> { items:T[]; page:number; size:number; total:number; }
export interface CartLine { variantId:string; sku:string; quantity:number; name?:string; attributes?:Record<string,string>; unitPrice?:string; lineTotal?:string; available:boolean; }
export interface Cart { id:string; status:string; expiresAt:string; items:CartLine[]; }
export interface CartAccess { id:string; accessToken:string; expiresAt:string; }
export interface ShippingRate { id:string; version:number; department_name:string; province_name:string; district_code:string; district_name:string; amount:string|number; active:boolean; }
export interface Quote { cartId:string; currency:'PEN'; items:CartLine[]; subtotal:string; shipping:string; total:string; fingerprint:string; districtName:string; }
export interface Customer { recipient:string; email:string; phone:string; address:string; districtCode:string; districtName?:string; }
export interface OrderLine { variant_id:string; sku:string; name:string; attributes:Record<string,string>; quantity:number; unit_price:string; line_total:string; }
export interface Payment { version:number; status:'PENDING_PROVIDER'|'SUBMITTED'|'APPROVED'|'REJECTED'; method:'MERCADO_PAGO'|'YAPE'|'PLIN'|'BANK_TRANSFER'|'CASH_ON_DELIVERY'; reference:string|null; has_proof:boolean; checkout_url?:string|null; provider_status?:string|null; submitted_at:string; reviewed_at:string|null; reviewed_by:string|null; review_note:string|null; }
export interface NotificationRecord { id:string; event:string; recipient:string; status:'PENDING'|'SENT'|'FAILED'; attempts:number; last_error:string|null; created_at:string; sent_at:string|null; }
export interface Shipment { version:number; carrier:string; tracking_number:string; estimated_delivery:string; notes:string|null; shipped_at:string|null; delivered_at:string|null; updated_at:string; }
export interface ReturnCase { id:string; version:number; status:'REQUESTED'|'APPROVED'|'REJECTED'|'RECEIVED'|'REFUNDED'|'EXCHANGED'; requested_resolution:'REFUND'|'EXCHANGE'; reason:string; admin_note:string|null; resolution_reference:string|null; restocked:boolean; created_at:string; updated_at:string; resolved_at:string|null; items:{variant_id:string;sku:string;name:string;quantity:number}[]; }
export interface Order { id:string; version:number; status:string; currency:'PEN'; subtotal:string; shipping:string; total:string; customer:Customer; created_at:string; reservation_expires_at:string; items:OrderLine[]; history:{status:string;actor:string;created_at:string}[]; payment:Payment|null; shipment?:Shipment|null; returns?:ReturnCase[]; notifications?:NotificationRecord[]; }
export const money = (value:string|number) => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(value));
export function safeImage(url:string|null|undefined):string|null {
 try { const parsed=new URL(url ?? ''); return parsed.protocol==='https:' ? parsed.href : null; } catch { return null; }
}
export function errorMessage(error:unknown):string {
 const e=error as {status?:number;error?:{message?:string}};
 if(e.status===401) return 'La sesión no es válida. Vuelve a iniciar sesión.';
 if(e.status===403) return 'Tu cuenta no tiene permiso para esta operación.';
 if(e.status===409) return e.error?.message ?? 'Hay un conflicto. Recarga el producto antes de continuar.';
 if(e.status===0) return 'No hay conexión con el servidor. Vuelve a intentarlo.';
 return e.error?.message ?? 'No se pudo completar la operación. Revisa los datos e inténtalo otra vez.';
}
