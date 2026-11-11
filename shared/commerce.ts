export interface Category { selectable?:boolean; id:string; name:string; slug:string; parent_id:string|null; description:string; display_order:number; active:boolean; version:number; }
export interface Collection { selectable?:boolean; id:string; name:string; slug:string; description:string; starts_at:string|null; ends_at:string|null; display_order:number; active:boolean; featured:boolean; cover_image_url:string|null; version:number; }
export interface StorefrontCollection extends Collection { products:Product[]; }
export interface HomeTarget { type:'catalog'|'category'|'collection'|'collections'; id?:string; }
export interface HomeLink { label:string; target:HomeTarget; }
export interface HomeSlideContent { eyebrow:string; title:string; description:string; heroAssetId:string|null; mobileAssetId?:string|null; heroAlt:string; frameX:number; frameY:number; primary:HomeLink; secondary:HomeLink|null; enabled:boolean; }
export interface HomeContent extends Omit<HomeSlideContent,'enabled'> { shortcuts:HomeLink[]; slides?:HomeSlideContent[]; }
export interface HomeSlidePayload { content:HomeSlideContent; heroMedia?:ProductMedia|null; mobileMedia?:ProductMedia|null; }
export interface StorefrontHome { revisionId:string; content:HomeContent; heroMedia?:ProductMedia|null; slides?:HomeSlidePayload[]; }
export interface HomeAdmin { version:number; draft:HomeContent|null; published:HomeContent|null; publishedAt?:string|null; publishedRevisionId?:string|null; draftMedia?:ProductMedia|null; publishedMedia?:ProductMedia|null; draftSlides?:HomeSlidePayload[]; publishedSlides?:HomeSlidePayload[]; }
export type HomeCoverRole = 'DESKTOP' | 'MOBILE';
export interface HomeCoverPurge {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  attempts: number;
  errorMessage?: string | null;
}
export interface HomeCoverRemoval { home: HomeAdmin; purge: HomeCoverPurge; }
export interface Storefront { featuredCollections:StorefrontCollection[]; home?:StorefrontHome|null; paymentMethods?:string[]; }
export interface MerchandisingLanding<T extends Category|Collection> { entity:T; products:Page<Product>; }
export interface AttributeOption { selectable?:boolean;version?:number; id:string; attribute_id:string; value:string; label:string; swatch:string|null; display_order:number; active:boolean; }
export interface AttributeDefinition { id:string; code:string; name:string; type:'TEXT'|'SIZE'|'COLOR'; filterable:boolean; display_order:number; active:boolean; options:AttributeOption[]; }
export interface Variant { id?:string; sku:string; attributes:Record<string,string>; price:string|number; enabled:boolean; available?:number; }
export type MediaVariant='original'|'large'|'medium'|'thumbnail';
export interface MediaObject { variant:MediaVariant; width:number; height:number; byte_size?:number; }
export interface ProductMedia { color_value?:string|null; id:string; alt_text:string|null; is_primary:boolean; display_order?:number; urls:Record<MediaVariant,string>; objects?:MediaObject[]; }
export interface AiStudioStatus {enabled:boolean;configured:boolean;manualUploadAvailable:boolean;maxCorrections:number;catalogCanvas:string;desktopCover:string;mobileCover:string}
export interface AiStudioResult {id:string;slot:number;revision:number;status:string;stage?:'CUTOUT'|'GHOST';image_approved:boolean;copy_approved:boolean;cutout_approved?:boolean;ghost_approved?:boolean;cutout_revision?:number;ghost_revision?:number;fallbackAllowed?:boolean;feedback?:string|null;content:Record<string,string>;media?:ProductMedia;cutoutMedia?:ProductMedia;desktopMedia?:ProductMedia;mobileMedia?:ProductMedia}
export interface AiStudioJob {id:string;job_type:string;product_id?:string|null;page_key?:string|null;stage?:'CUTOUT'|'GHOST';status:string;attempts:number;error_code?:string|null;error_message?:string|null;results:AiStudioResult[];created_at:string;updated_at:string}
export interface Content { name:string; description:string; categoryId:string; imageUrl:string|null; media?:ProductMedia[]; variants:Variant[]; collectionIds?:string[]; }
export interface Product { colorSwatches?:Record<string,string>; thumbnailUrl?:string|null; imageAlt?:string|null; deleting?:boolean; id:string; slug:string; version:number; archived:boolean; draft?:Content|null; published?:Content|null; content?:Content; }
export interface FacetOption {value:string;label:string;count:number}
export interface ProductFacets {colors:FacetOption[];sizes:FacetOption[];price:{min:number|string|null;max:number|string|null}}
export interface Page<T> { items:T[]; page:number; size:number; total:number; facets?:ProductFacets; }
export interface CartLine { productId?:string; thumbnailUrl?:string|null; imageAlt?:string|null; variantId:string; sku:string; quantity:number; name?:string; attributes?:Record<string,string>; unitPrice?:string; lineTotal?:string; available:boolean; }
export interface Cart { id:string; status:string; expiresAt:string; items:CartLine[]; orderId?:string|null; }
export interface CartAccess { id:string; accessToken:string; expiresAt:string; }
export interface ShippingRate { id:string; version:number; department_name:string; province_name:string; district_code:string; district_name:string; amount:string|number; active:boolean; }
export interface Promotion { id:string; version:number; name:string; code:string; discount_type:'PERCENT'|'FIXED'; discount_value:string|number; minimum_subtotal:string|number; usage_limit:number|null; usage_count:number; starts_at:string; ends_at:string; active:boolean; }
export interface Quote { cartId:string; currency:'PEN'; items:CartLine[]; subtotal:string; discount?:string; couponCode?:string|null; shipping:string; total:string; fingerprint:string; districtName:string; }
export interface Customer { recipient:string; email:string; phone:string; address:string; districtCode:string; districtName?:string; }
export interface OrderLine { variant_id:string; sku:string; name:string; attributes:Record<string,string>; quantity:number; unit_price:string; line_total:string; }
export interface Payment { version:number; status:'PENDING_PROVIDER'|'SUBMITTED'|'APPROVED'|'REJECTED'; method:'MERCADO_PAGO'|'YAPE'|'PLIN'|'BANK_TRANSFER'|'CASH_ON_DELIVERY'; reference:string|null; has_proof:boolean; checkout_url?:string|null; provider_status?:string|null; submitted_at:string; reviewed_at:string|null; reviewed_by:string|null; review_note:string|null; }
export interface NotificationRecord { id:string; event:string; recipient:string; status:'PENDING'|'SENT'|'FAILED'; attempts:number; last_error:string|null; created_at:string; sent_at:string|null; }
export interface Shipment { version:number; carrier:string; tracking_number:string; estimated_delivery:string; notes:string|null; shipped_at:string|null; delivered_at:string|null; updated_at:string; }
export interface ReturnCase { id:string; version:number; status:'REQUESTED'|'APPROVED'|'REJECTED'|'RECEIVED'|'REFUNDED'|'EXCHANGED'; requested_resolution:'REFUND'|'EXCHANGE'; reason:string; admin_note:string|null; resolution_reference:string|null; restocked:boolean; provider_refund_id?:string|null; refund_amount?:string|null; refund_status?:string|null; refund_requested_at?:string|null; created_at:string; updated_at:string; resolved_at:string|null; items:{variant_id:string;sku:string;name:string;quantity:number}[]; }
export interface Order { id:string; orderNumber?:string; version:number; status:string; currency:'PEN'; subtotal:string; discount?:string; coupon_code?:string|null; shipping:string; total:string; customer:Customer; created_at:string; reservation_expires_at:string; items:OrderLine[]; history:{status:string;actor:string;created_at:string}[]; payment:Payment|null; paymentAttempts?:Pick<Payment,'method'|'status'|'reference'|'review_note'|'submitted_at'|'reviewed_at'>[]; shipment?:Shipment|null; returns?:ReturnCase[]; notifications?:NotificationRecord[]; }
export interface InventoryRow {variant_id:string;product_id:string;sku:string;name:string;on_hand:number;reserved:number;available:number;version:number;published:boolean;imageUrl?:string|null}
export interface ActivityEvent {id:string;type:string;label:string;entityId:string;entityType:string;createdAt:string;actor:string}
export interface OperationalActions {paymentsToReview:number;ordersToPrepare:number;readyToShip:number;returnsPending:number;paymentExceptions:number;criticalStock:number}
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
