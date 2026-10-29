import {Injectable,inject,signal} from '@angular/core';
import {HttpClient,HttpHeaders} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Cart,CartAccess,Order,Quote} from '../../../../shared/commerce';

const STORAGE='blessrom-cart-v1';
interface Stored {id:string;token:string;expiresAt:string;checkoutKey?:string}

@Injectable({providedIn:'root'})
export class CartService {
 private http=inject(HttpClient);private stored:Stored|null=this.read();
 readonly cart=signal<Cart|null>(null);readonly busy=signal(false);readonly error=signal('');readonly count=signal(0);
 constructor(){if(this.stored)void this.refresh();}
 private read():Stored|null {try{const value=localStorage.getItem(STORAGE);if(!value)return null;const data=JSON.parse(value) as Stored;if(!data.id||!data.token||new Date(data.expiresAt)<=new Date()){localStorage.removeItem(STORAGE);return null;}return data;}catch{return null;}}
 private save(){if(this.stored)localStorage.setItem(STORAGE,JSON.stringify(this.stored));else localStorage.removeItem(STORAGE);}
 private headers(){return new HttpHeaders({'X-Cart-Token':this.stored!.token});}
 private sync(cart:Cart){this.cart.set(cart);this.count.set(cart.items.reduce((n,item)=>n+item.quantity,0));}
 private async ensure(){if(this.stored)return;const access=await firstValueFrom(this.http.post<CartAccess>('/api/v1/carts',null));this.stored={id:access.id,token:access.accessToken,expiresAt:access.expiresAt};this.save();}
 private async run<T>(action:()=>Promise<T>){if(this.busy())throw new Error('BUSY');this.busy.set(true);this.error.set('');try{return await action();}finally{this.busy.set(false);}}
 async refresh(){if(!this.stored)return;await this.run(async()=>{try{await this.refreshDirect();}catch(e){this.clear();throw e;}});}
 private async refreshDirect(){this.sync(await firstValueFrom(this.http.get<Cart>('/api/v1/carts/'+this.stored!.id,{headers:this.headers()})));}
 async set(variantId:string,quantity:number){await this.run(async()=>{await this.ensure();this.sync(await firstValueFrom(this.http.put<Cart>('/api/v1/carts/'+this.stored!.id+'/items/'+variantId,{quantity},{headers:this.headers()})));});}
 async remove(variantId:string){await this.run(async()=>{await firstValueFrom(this.http.delete('/api/v1/carts/'+this.stored!.id+'/items/'+variantId,{headers:this.headers()}));await this.refreshDirect();});}
 async quote(district:string){return this.run(async()=>firstValueFrom(this.http.get<Quote>('/api/v1/carts/'+this.stored!.id+'/quote',{headers:this.headers(),params:{district}})));}
 async checkout(input:{recipient:string;email:string;phone:string;address:string;districtCode:string;quoteFingerprint:string}){return this.run(async()=>{if(!this.stored!.checkoutKey){this.stored!.checkoutKey=crypto.randomUUID().replaceAll('-','');this.save();}return firstValueFrom(this.http.post<Order>('/api/v1/carts/'+this.stored!.id+'/checkout',input,{headers:this.headers().set('Idempotency-Key',this.stored!.checkoutKey!)}));});}
 token(){return this.stored?.token??null;}
 clear(){this.stored=null;this.cart.set(null);this.count.set(0);this.save();}
}
