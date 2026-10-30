import {Component,inject,signal} from '@angular/core';
import {FormsModule,NgForm} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Router,RouterLink} from '@angular/router';
import {CartService} from './cart.service';
import {Quote,ShippingRate,errorMessage,money} from '../../../../shared/commerce';
import {CustomerAuthService} from './auth';
import type {Address} from './account';
@Component({selector:'app-checkout',imports:[FormsModule,RouterLink],template:`<main><a routerLink="/carrito">← Volver al carrito</a><p class="eyebrow">Entrega y confirmación</p><h1>Finalizar compra</h1>
@if(error()){<p class="alert" role="alert">{{error()}}</p>}
<div class="columns"><form #form="ngForm" (ngSubmit)="confirm(form)"><fieldset [disabled]="busy()">
<label>Nombre de quien recibe<input name="recipient" [(ngModel)]="recipient" maxlength="150" required></label>
<label>Correo electrónico<input name="email" [(ngModel)]="email" type="email" maxlength="254" required></label>
<label>Teléfono<input name="phone" [(ngModel)]="phone" pattern="[0-9+ ()-]{7,30}" required></label>
<label>Dirección completa<textarea name="address" [(ngModel)]="address" maxlength="500" required></textarea></label>
<label>Departamento<select name="department" [(ngModel)]="department" (ngModelChange)="selectDepartment()" required><option value="">Selecciona el departamento</option>@for(name of departments();track name){<option [value]="name">{{name}}</option>}</select></label>
<label>Provincia<select name="province" [(ngModel)]="province" (ngModelChange)="selectProvince()" required><option value="">Selecciona la provincia</option>@for(name of provinces();track name){<option [value]="name">{{name}}</option>}</select></label>
<label>Distrito<select name="district" [(ngModel)]="district" (ngModelChange)="invalidateQuote()" required><option value="">Selecciona el distrito</option>@for(r of districts();track r.id){<option [value]="r.district_code">{{r.district_name}} · {{money(r.amount)}}</option>}</select></label>
<button type="button" class="secondary" [disabled]="!district" (click)="calculate()">Calcular total</button>
@if(quote;as q){<section><p>Subtotal <strong>{{money(q.subtotal)}}</strong></p><p>Envío a {{q.districtName}} <strong>{{money(q.shipping)}}</strong></p><p>Total <strong>{{money(q.total)}}</strong></p></section>
<label class="check"><input type="checkbox" name="confirmed" [(ngModel)]="confirmed">Confirmo los productos, la dirección y el total.</label>
<button type="submit" [disabled]="form.invalid||!confirmed">Crear pedido</button><small>El stock quedará reservado durante 30 minutos. En el siguiente paso registrarás el medio de pago.</small>}
</fieldset></form><aside><h2>Resumen</h2>@for(i of cart.cart()?.items??[];track i.variantId){<p>{{i.quantity}} × {{i.name}} <strong>{{money(i.lineTotal||0)}}</strong></p>}</aside></div></main>`,styleUrl:'./checkout.scss'})
export class Checkout {private http=inject(HttpClient);private router=inject(Router);private auth=inject(CustomerAuthService);readonly cart=inject(CartService);rates=signal<ShippingRate[]>([]);busy=signal(false);error=signal('');quote:Quote|null=null;recipient='';email='';phone='';address='';department='';province='';district='';confirmed=false;readonly money=money;
 constructor(){this.http.get<ShippingRate[]>('/api/v1/shipping-rates').subscribe({next:r=>{this.rates.set(r);if(this.auth.authenticated())void this.prefill();},error:e=>this.error.set(errorMessage(e))});}
 departments(){return [...new Set(this.rates().map(r=>r.department_name))].sort((a,b)=>a.localeCompare(b,'es'));}
 provinces(){return [...new Set(this.rates().filter(r=>r.department_name===this.department).map(r=>r.province_name))].sort((a,b)=>a.localeCompare(b,'es'));}
 districts(){return this.rates().filter(r=>r.department_name===this.department&&r.province_name===this.province);}
 invalidateQuote(){this.quote=null;this.confirmed=false;}
 selectDepartment(){this.province='';this.district='';this.invalidateQuote();}
 selectProvince(){this.district='';this.invalidateQuote();}
 private async prefill(){try{const [p,addresses]=await Promise.all([firstValueFrom(this.http.get<{email:string;first_name:string;last_name:string;phone:string}>('/api/v1/account')),firstValueFrom(this.http.get<Address[]>('/api/v1/account/addresses'))]);const a=addresses.find(x=>x.is_default);this.recipient=a?.recipient??[p.first_name,p.last_name].filter(Boolean).join(' ');this.email=p.email??'';this.phone=a?.phone??p.phone??'';this.address=a?.address??'';const rate=this.rates().find(r=>r.district_code===a?.district_code);this.department=rate?.department_name??'';this.province=rate?.province_name??'';this.district=rate?.district_code??'';}catch{/* La compra invitada sigue disponible si el perfil no se puede cargar. */}}
 async calculate(){this.busy.set(true);this.error.set('');try{this.quote=await this.cart.quote(this.district);}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async confirm(form:NgForm){if(form.invalid||!this.quote||!this.confirmed)return;this.busy.set(true);this.error.set('');try{const token=this.cart.token();const o=await this.cart.checkout({recipient:this.recipient,email:this.email,phone:this.phone,address:this.address,districtCode:this.district,quoteFingerprint:this.quote.fingerprint});sessionStorage.setItem('blessrom-order-'+o.id,JSON.stringify({order:o,token}));this.cart.clear();await this.router.navigate(['/pedido',o.id]);}catch(e){this.quote=null;this.confirmed=false;this.error.set(errorMessage(e)+' Calcula nuevamente el total.');}finally{this.busy.set(false);}}
}
