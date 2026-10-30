import {Component,inject,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule,NgForm} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {RouterLink} from '@angular/router';
import {CustomerAuthService} from './auth';
import {errorMessage,money,Order,Page} from '../../../../shared/commerce';

interface Profile {subject:string;email:string|null;first_name:string|null;last_name:string|null;phone:string|null}
export interface Address {id:string;version:number;label:string;recipient:string;phone:string;address:string;district_code:string;district_name:string;is_default:boolean}
interface OrderSummary {id:string;status:string;total:number;created_at:string;payment_status?:string}

@Component({selector:'app-account',imports:[FormsModule,RouterLink,DatePipe],template:`
<main>
 <p class="eyebrow">Tu espacio Blessrom</p><h1>Mi cuenta</h1>
 @if(auth.error()){<p class="alert">{{auth.error()}}</p>}
 @if(!auth.authenticated()){
  <section class="welcome"><h2>Compra a tu ritmo</h2><p>Inicia sesión para guardar tus direcciones y consultar todos tus pedidos desde cualquier dispositivo.</p>
   <div class="actions"><button (click)="login()">Iniciar sesión</button><button class="secondary" (click)="register()">Crear cuenta</button></div>
   <p><small>También puedes seguir comprando como invitado.</small></p>
  </section>
 } @else {
  <div class="top"><p>Sesión iniciada como <strong>{{auth.username()}}</strong></p><button class="link" (click)="logout()">Cerrar sesión</button></div>
  @if(error()){<p class="alert" role="alert">{{error()}}</p>} @if(notice()){<p class="notice">{{notice()}}</p>}
  <div class="grid">
   <section><h2>Datos personales</h2><form #profileForm="ngForm" (ngSubmit)="saveProfile(profileForm)"><fieldset [disabled]="busy()">
    <label>Nombres<input name="firstName" [(ngModel)]="firstName" maxlength="100" required></label>
    <label>Apellidos<input name="lastName" [(ngModel)]="lastName" maxlength="100" required></label>
    <label>Correo<input name="email" [(ngModel)]="email" type="email" maxlength="254" required></label>
    <label>Teléfono<input name="phone" [(ngModel)]="phone" pattern="[0-9+ ()-]{7,30}" required></label>
    <button type="submit" [disabled]="profileForm.invalid">Guardar perfil</button>
   </fieldset></form></section>
   <section><div class="row"><h2>Direcciones</h2><button class="secondary compact" (click)="newAddress(addressForm)">Nueva</button></div>
    @for(a of addresses();track a.id){<button class="address" (click)="editAddress(a,addressForm)"><strong>{{a.label}}</strong>@if(a.is_default){<span>Principal</span>}<small>{{a.recipient}} · {{a.address}}, {{a.district_name}}</small></button>}@empty{<p class="muted">Todavía no guardaste direcciones.</p>}
    <form #addressForm="ngForm" (ngSubmit)="saveAddress(addressForm)"><fieldset [disabled]="busy()"><h3>{{addressId?'Editar':'Nueva'}} dirección</h3>
     <label>Etiqueta<input name="label" [(ngModel)]="label" placeholder="Casa, trabajo…" maxlength="60" required></label>
     <label>Persona que recibe<input name="recipient" [(ngModel)]="recipient" maxlength="150" required></label>
     <label>Teléfono<input name="addressPhone" [(ngModel)]="addressPhone" pattern="[0-9+ ()-]{7,30}" required></label>
     <label>Dirección<textarea name="address" [(ngModel)]="address" maxlength="500" required></textarea></label>
     <label>Código de distrito (UBIGEO)<input name="districtCode" [(ngModel)]="districtCode" pattern="[0-9]{6}" maxlength="6" required></label>
     <label>Distrito<input name="districtName" [(ngModel)]="districtName" maxlength="150" required></label>
     <label class="check"><input type="checkbox" name="isDefault" [(ngModel)]="isDefault">Usar como dirección principal</label>
     <div class="actions"><button type="submit" [disabled]="addressForm.invalid">Guardar dirección</button>@if(addressId){<button type="button" class="danger" (click)="removeAddress(addressForm)">Eliminar</button>}</div>
    </fieldset></form>
   </section>
  </div>
  <section class="orders"><h2>Mis pedidos</h2>
   @for(o of orders();track o.id){<a [routerLink]="['/cuenta/pedidos',o.id]" class="order"><span><strong>{{status(o.status)}}</strong><small>{{o.created_at|date:'dd/MM/yyyy HH:mm':'-0500'}}</small></span><strong>{{money(o.total)}}</strong></a>}@empty{<p class="muted">Tus próximos pedidos aparecerán aquí.</p>}
  </section>
 }
</main>`,styleUrl:'./account.scss'})
export class AccountPage {
 private http=inject(HttpClient);readonly auth=inject(CustomerAuthService);busy=signal(false);error=signal('');notice=signal('');addresses=signal<Address[]>([]);orders=signal<OrderSummary[]>([]);readonly money=money;
 firstName='';lastName='';email='';phone='';addressId='';addressVersion=0;label='Casa';recipient='';addressPhone='';address='';districtCode='';districtName='';isDefault=false;
 constructor(){if(this.auth.authenticated())void this.load();}
 async login(){try{await this.auth.login();}catch{this.error.set('No se pudo abrir el inicio de sesión.');}}
 async register(){try{await this.auth.register();}catch{this.error.set('No se pudo abrir el registro.');}}
 async logout(){await this.auth.logout();}
 private async run(action:()=>Promise<void>){this.busy.set(true);this.error.set('');this.notice.set('');try{await action();}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 private async load(){await this.run(async()=>{const [p,a,o]=await Promise.all([firstValueFrom(this.http.get<Profile>('/api/v1/account')),firstValueFrom(this.http.get<Address[]>('/api/v1/account/addresses')),firstValueFrom(this.http.get<Page<OrderSummary>>('/api/v1/account/orders'))]);this.firstName=p.first_name??String(this.auth.claims()['given_name']??'');this.lastName=p.last_name??String(this.auth.claims()['family_name']??'');this.email=p.email??String(this.auth.claims()['email']??'');this.phone=p.phone??'';this.addresses.set(a);this.orders.set(o.items);});}
 async saveProfile(form:NgForm){if(form.invalid)return;await this.run(async()=>{await firstValueFrom(this.http.put('/api/v1/account',{firstName:this.firstName,lastName:this.lastName,email:this.email,phone:this.phone}));form.form.markAsPristine();this.notice.set('Perfil actualizado.');});}
 newAddress(form:NgForm){this.addressId='';this.addressVersion=0;this.label='Casa';this.recipient=[this.firstName,this.lastName].filter(Boolean).join(' ');this.addressPhone=this.phone;this.address='';this.districtCode='';this.districtName='';this.isDefault=this.addresses().length===0;form.form.markAsPristine();}
 editAddress(a:Address,form:NgForm){this.addressId=a.id;this.addressVersion=a.version;this.label=a.label;this.recipient=a.recipient;this.addressPhone=a.phone;this.address=a.address;this.districtCode=a.district_code;this.districtName=a.district_name;this.isDefault=a.is_default;form.form.markAsPristine();}
 async saveAddress(form:NgForm){if(form.invalid)return;await this.run(async()=>{const body={version:this.addressVersion,label:this.label,recipient:this.recipient,phone:this.addressPhone,address:this.address,districtCode:this.districtCode,districtName:this.districtName,isDefault:this.isDefault};if(this.addressId)await firstValueFrom(this.http.put('/api/v1/account/addresses/'+this.addressId,body));else await firstValueFrom(this.http.post('/api/v1/account/addresses',body));this.addresses.set(await firstValueFrom(this.http.get<Address[]>('/api/v1/account/addresses')));this.newAddress(form);this.notice.set('Dirección guardada.');});}
 async removeAddress(form:NgForm){if(!this.addressId||!confirm('¿Eliminar esta dirección?'))return;await this.run(async()=>{await firstValueFrom(this.http.delete('/api/v1/account/addresses/'+this.addressId,{params:{version:this.addressVersion}}));this.addresses.set(await firstValueFrom(this.http.get<Address[]>('/api/v1/account/addresses')));this.newAddress(form);this.notice.set('Dirección eliminada.');});}
 status(value:string){return ({PENDING_PAYMENT:'Pendiente de pago',PAYMENT_CONFIRMED:'Pago confirmado',PREPARING:'En preparación',SHIPPED:'Enviado',DELIVERED:'Entregado',CANCELLED:'Cancelado',EXPIRED:'Reserva vencida'} as Record<string,string>)[value]??value;}
}
