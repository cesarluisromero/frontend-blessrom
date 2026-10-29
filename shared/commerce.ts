export interface Category { id:string; name:string; slug:string; }
export interface Variant { id?:string; sku:string; attributes:Record<string,string>; price:string|number; enabled:boolean; available?:number; }
export interface Content { name:string; description:string; categoryId:string; imageUrl:string|null; variants:Variant[]; }
export interface Product { id:string; slug:string; version:number; archived:boolean; draft?:Content|null; published?:Content|null; content?:Content; }
export interface Page<T> { items:T[]; page:number; size:number; total:number; }
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
