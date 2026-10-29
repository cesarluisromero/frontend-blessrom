import {Component,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Product,Variant,Page,errorMessage} from '../../../../shared/commerce';
export interface Stock {variant_id:string;on_hand:number;reserved:number;available:number;version:number}
interface Movement {id:string;created_at:string;on_hand_delta:number;reserved_delta:number;reason:string;actor:string}
@Component({selector:'app-inventory',imports:[FormsModule,DatePipe],templateUrl:'./inventory.html',styleUrl:'./products.scss'})
export class Inventory {
 private http=inject(HttpClient);
 products=signal<Product[]>([]);variants=signal<Variant[]>([]);stock=signal<Stock|null>(null);movements=signal<Movement[]>([]);
 busy=signal(false);error=signal('');notice=signal('');stale=signal(false);total=signal(0);
 productId='';variantId='';page=0;movementPage=0;direction='in';quantity:number|null=null;reason='';confirmed=false;
 constructor(){void this.load(0);}
 name(p:Product){return (p.draft??p.published)?.name??p.slug;}
 label(v:Variant){return v.sku+' · '+Object.entries(v.attributes).map(([k,val])=>k+': '+val).join(' · ');}
 delta(){return (this.direction==='in'?1:-1)*(this.quantity??0);}
 valid(){const s=this.stock();const n=this.quantity;return !!s&&!this.stale()&&n!==null&&Number.isInteger(n)&&n>0&&n<=1000000&&this.reason.trim().length>0&&this.reason.trim().length<=300&&s.on_hand+this.delta()>=s.reserved&&s.on_hand+this.delta()<=2147483647;}
 private async run(fn:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');try{await fn();}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async load(page:number){if(page<0)return;await this.run(async()=>{const data=await firstValueFrom(this.http.get<Page<Product>>('/api/v1/admin/products',{params:{page,size:12}}));this.products.set(data.items);this.total.set(data.total);this.page=page;});}
 private reset(){this.quantity=null;this.reason='';this.confirmed=false;this.stale.set(false);}
 async selectProduct(){this.stock.set(null);this.movements.set([]);this.variants.set([]);this.variantId='';this.notice.set('');this.reset();if(!this.productId)return;await this.run(async()=>{const p=await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+this.productId));const all=[...(p.draft?.variants??[]),...(p.published?.variants??[])];this.variants.set([...new Map(all.filter(v=>v.id).map(v=>[v.id,v])).values()]);});}
 async selectVariant(){this.stock.set(null);this.movements.set([]);this.notice.set('');this.reset();if(this.variantId)await this.reload();}
 private async history(page:number){const rows=await firstValueFrom(this.http.get<Movement[]>('/api/v1/admin/inventory/'+this.variantId+'/movements',{params:{page,size:20}}));this.movements.set(rows);this.movementPage=page;}
 async reload(){if(!this.variantId)return;await this.run(async()=>{this.stock.set(await firstValueFrom(this.http.get<Stock>('/api/v1/admin/inventory/'+this.variantId)));this.stale.set(false);this.confirmed=false;await this.history(0);});}
 async historyPage(page:number){if(page>=0)await this.run(()=>this.history(page));}
 async adjust(){if(!this.valid()||!this.confirmed||this.busy())return;const s=this.stock()!;await this.run(async()=>{this.notice.set('');try{this.stock.set(await firstValueFrom(this.http.post<Stock>('/api/v1/admin/inventory/'+this.variantId+'/adjustments',{version:s.version,delta:this.delta(),reason:this.reason.trim()})));}
 catch(e){this.stale.set(true);this.confirmed=false;throw e;}
 this.reset();this.notice.set('Ajuste registrado. Las existencias ya están actualizadas.');this.movements.set([]);await this.history(0);});}
}