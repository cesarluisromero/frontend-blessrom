import {Component,inject,signal} from '@angular/core';
import {FormsModule,NgForm} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {Router,RouterLink} from '@angular/router';
import {CartService} from './cart.service';
import {Quote,ShippingRate,errorMessage,money} from '../../../../shared/commerce';
@Component({selector:'app-checkout',imports:[FormsModule,RouterLink],template:`<main><a routerLink="/carrito">← Volver al carrito</a><p class="eyebrow">Entrega y confirmación</p><h1>Finalizar compra</h1>
@if(error()){<p class="alert" role="alert">{{error()}}</p>}
<div class="columns"><form #form="ngForm" (ngSubmit)="confirm(form)"><fieldset [disabled]="busy()">
<label>Nombre de quien recibe<input name="recipient" [(ngModel)]="recipient" maxlength="150" required></label>
<label>Correo electrónico<input name="email" [(ngModel)]="email" type="email" maxlength="254" required></label>
<label>Teléfono<input name="phone" [(ngModel)]="phone" pattern="[0-9+ ()-]{7,30}" required></label>
<label>Dirección completa<textarea name="address" [(ngModel)]="address" maxlength="500" required></textarea></label>
<label>Distrito<select name="district" [(ngModel)]="district" (ngModelChange)="quote=null;confirmed=false" required><option value="">Selecciona el distrito</option>@for(r of rates();track r.id){<option [value]="r.district_code">{{r.district_name}} · {{money(r.amount)}}</option>}</select></label>
<button type="button" class="secondary" [disabled]="!district" (click)="calculate()">Calcular total</button>
@if(quote;as q){<section><p>Subtotal <strong>{{money(q.subtotal)}}</strong></p><p>Envío a {{q.districtName}} <strong>{{money(q.shipping)}}</strong></p><p>Total <strong>{{money(q.total)}}</strong></p></section>
<label class="check"><input type="checkbox" name="confirmed" [(ngModel)]="confirmed">Confirmo los productos, la dirección y el total.</label>
<button type="submit" [disabled]="form.invalid||!confirmed">Crear pedido</button><small>El stock quedará reservado durante 30 minutos. El pago en línea se incorporará posteriormente.</small>}
</fieldset></form><aside><h2>Resumen</h2>@for(i of cart.cart()?.items??[];track i.variantId){<p>{{i.quantity}} × {{i.name}} <strong>{{money(i.lineTotal||0)}}</strong></p>}</aside></div></main>`,styleUrl:'./checkout.scss'})
export class Checkout {private http=inject(HttpClient);private router=inject(Router);readonly cart=inject(CartService);rates=signal<ShippingRate[]>([]);busy=signal(false);error=signal('');quote:Quote|null=null;recipient='';email='';phone='';address='';district='';confirmed=false;readonly money=money;
 constructor(){this.http.get<ShippingRate[]>('/api/v1/shipping-rates').subscribe({next:r=>this.rates.set(r),error:e=>this.error.set(errorMessage(e))});}
 async calculate(){this.busy.set(true);this.error.set('');try{this.quote=await this.cart.quote(this.district);}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async confirm(form:NgForm){if(form.invalid||!this.quote||!this.confirmed)return;this.busy.set(true);this.error.set('');try{const token=this.cart.token();const o=await this.cart.checkout({recipient:this.recipient,email:this.email,phone:this.phone,address:this.address,districtCode:this.district,quoteFingerprint:this.quote.fingerprint});sessionStorage.setItem('blessrom-order-'+o.id,JSON.stringify({order:o,token}));this.cart.clear();await this.router.navigate(['/pedido',o.id]);}catch(e){this.quote=null;this.confirmed=false;this.error.set(errorMessage(e)+' Calcula nuevamente el total.');}finally{this.busy.set(false);}}
}
