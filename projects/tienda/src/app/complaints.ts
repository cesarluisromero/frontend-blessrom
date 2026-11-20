import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ComplaintSettings, SiteInformation } from '../../../../shared/site-information';
import { LinkedText } from '../../../../shared/linked-text';

type Receipt={number:string;createdAt:string;receipt:string};

@Component({selector:'app-complaints',imports:[FormsModule,RouterLink,LinkedText],template:`
<main class="complaints"><a routerLink="/">Inicio</a><h1>{{settings()?.title||'Libro de Reclamaciones Virtual'}}</h1>
@if(loading()){<p>Cargando formulario…</p>}
@else if(!settings()?.enabled){<p role="alert">{{error()||'El Libro de Reclamaciones no está disponible en este momento. Comunícate con Blessrom desde la página de contacto.'}}</p><a routerLink="/contacto">Ir a Contacto</a>}
@else if(receipt();as saved){<section class="receipt" role="status"><h2>Hoja registrada: {{saved.number}}</h2><p>Fecha: {{saved.createdAt}}</p><p>Guarda este número y descarga o imprime la constancia. Si el correo está habilitado, también recibirás una copia.</p><pre>{{saved.receipt}}</pre><button type="button" (click)="print()">Imprimir o guardar PDF</button></section>}
@else{
<p class="intro"><app-linked-text [text]="settings()?.intro || ''" /></p><p><strong>Proveedor:</strong> {{settings()?.businessName}} · RUC {{settings()?.ruc}}<br>{{settings()?.address}}</p>
<p>Los campos con * son obligatorios. Recibirás respuesta en un plazo máximo de 15 días hábiles.</p>
@if(error()){<p class="error" role="alert">{{error()}}</p>}
<form #claimForm="ngForm" (ngSubmit)="submit(claimForm)">
<fieldset><legend>Datos del consumidor</legend>
<label>Apellidos *<input name="surnames" [(ngModel)]="consumer.surnames" required maxlength="120" autocomplete="family-name"></label>
<label>Nombres *<input name="names" [(ngModel)]="consumer.names" required maxlength="120" autocomplete="given-name"></label>
<label>Tipo de documento *<select name="documentType" [(ngModel)]="consumer.documentType" required><option value="">Selecciona</option><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option><option value="OTRO">Otro</option></select></label>
<label>Número de documento *<input name="documentNumber" [(ngModel)]="consumer.documentNumber" required maxlength="30"></label>
<label>Celular *<input name="phone" [(ngModel)]="consumer.phone" required maxlength="30" inputmode="tel" autocomplete="tel"></label>
<label>Correo electrónico *<input name="email" [(ngModel)]="consumer.email" required type="email" maxlength="254" autocomplete="email"></label>
<label>Dirección *<input name="address" [(ngModel)]="consumer.address" required maxlength="300" autocomplete="street-address"></label>
<label>Departamento *<select name="department" [(ngModel)]="consumer.department" required><option value="">Selecciona</option>@for(department of departments;track department){<option [value]="department">{{department}}</option>}</select></label>
<label>Ciudad *<input name="city" [(ngModel)]="consumer.city" required maxlength="100"></label>
<label class="check"><input type="checkbox" name="minor" [(ngModel)]="consumer.minor"> El consumidor es menor de edad</label>
@if(consumer.minor){<div class="representative"><h3>Padre, madre o representante</h3><label>Nombre completo *<input name="representativeName" [(ngModel)]="consumer.representativeName" required maxlength="200"></label><label>Documento *<input name="representativeDocument" [(ngModel)]="consumer.representativeDocument" required maxlength="30"></label><label>Teléfono *<input name="representativePhone" [(ngModel)]="consumer.representativePhone" required maxlength="30"></label><label>Correo *<input name="representativeEmail" [(ngModel)]="consumer.representativeEmail" required type="email" maxlength="254"></label></div>}
</fieldset>
<fieldset><legend>Bien o servicio</legend><label>Número de pedido, si lo tienes<input name="orderNumber" [(ngModel)]="purchase.orderNumber" maxlength="40"></label><label>Descripción de la compra *<textarea name="description" [(ngModel)]="purchase.description" required maxlength="1000" rows="3"></textarea></label><label>Monto del bien o servicio (S/) *<input name="amount" [(ngModel)]="purchase.amount" required type="number" min="0" max="99999999" step="0.01" inputmode="decimal"></label></fieldset>
<fieldset><legend>Detalle de la reclamación</legend><label>Tipo *<select name="kind" [(ngModel)]="kind" required><option value="">Selecciona</option><option value="RECLAMO">Reclamo: disconformidad con el producto o servicio</option><option value="QUEJA">Queja: disconformidad con la atención</option></select></label><label>Detalle del reclamo o queja *<textarea name="detail" [(ngModel)]="detail" required maxlength="5000" rows="5"></textarea></label><label>¿Qué solución solicitas? *<textarea name="requestText" [(ngModel)]="requestText" required maxlength="5000" rows="3"></textarea></label></fieldset>
<label class="check"><input type="checkbox" name="confirmed" [(ngModel)]="confirmed" required> Confirmo que los datos y el contenido de esta hoja expresan mi reclamación. *</label>
<p class="small">Presentar esta hoja no impide acudir a otras vías de solución ni es requisito previo para denunciar ante Indecopi.</p>
<button type="submit" [disabled]="busy()">{{busy()?'Enviando…':'Enviar hoja de reclamación'}}</button>
</form>}
</main>`,styles:[`
.complaints{max-width:780px;margin:auto;padding:40px 20px 90px;color:#14243e}.complaints>a{color:#94642b}.complaints h1{font:clamp(2rem,5vw,3.2rem) Georgia,serif}.intro{white-space:pre-wrap}.complaints p{line-height:1.6}fieldset{border:1px solid #d7e0eb;border-radius:12px;margin:25px 0;padding:20px;background:white}legend{font:1.45rem Georgia,serif;padding:0 8px}.complaints label{display:block;margin:14px 0;font-weight:600}.complaints label.check{display:flex;gap:10px;align-items:flex-start}.complaints input:not([type=checkbox]),.complaints select,.complaints textarea{display:block;width:100%;min-height:48px;padding:11px;margin-top:7px;border:1px solid #aebed0;border-radius:6px;font:inherit}.complaints textarea{resize:vertical}.complaints input[type=checkbox]{width:20px;height:20px;flex:0 0 20px}.complaints form button,.receipt button{min-height:48px;padding:12px 22px}.error{color:#a11}.small{font-size:13px}.receipt{background:white;border:1px solid #d7e0eb;border-radius:12px;padding:22px}.receipt pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}@media print{.complaints>a,.receipt button{display:none}}
`]})
export class ComplaintsPage {
 private readonly http=inject(HttpClient);
 readonly settings=signal<ComplaintSettings|null>(null);
 readonly loading=signal(true);readonly busy=signal(false);readonly error=signal('');readonly receipt=signal<Receipt|null>(null);
 readonly departments=['AMAZONAS','ÁNCASH','APURÍMAC','AREQUIPA','AYACUCHO','CAJAMARCA','CALLAO','CUSCO','HUANCAVELICA','HUÁNUCO','ICA','JUNÍN','LA LIBERTAD','LAMBAYEQUE','LIMA','LORETO','MADRE DE DIOS','MOQUEGUA','PASCO','PIURA','PUNO','SAN MARTÍN','TACNA','TUMBES','UCAYALI'];
 consumer={surnames:'',names:'',documentType:'',documentNumber:'',phone:'',email:'',address:'',department:'',city:'',minor:false,representativeName:'',representativeDocument:'',representativePhone:'',representativeEmail:''};
 purchase={description:'',amount:null as number|null,orderNumber:''};kind='';detail='';requestText='';confirmed=false;
 constructor(){this.http.get<SiteInformation>('/api/v1/site-information').subscribe({next:info=>{this.settings.set(info.complaints??null);this.loading.set(false);},error:()=>{this.error.set('No se pudo cargar el formulario.');this.loading.set(false);}});}
 async submit(form:NgForm){if(form.invalid||!this.confirmed){form.control.markAllAsTouched();this.error.set('Completa todos los campos obligatorios.');return;}if(this.busy())return;this.busy.set(true);this.error.set('');try{const receipt=await firstValueFrom(this.http.post<Receipt>('/api/v1/complaints',{kind:this.kind,consumer:this.consumer,purchase:this.purchase,detail:this.detail,requestText:this.requestText,confirmed:this.confirmed}));this.receipt.set(receipt);window.scrollTo({top:0,behavior:'smooth'});}catch(e){this.error.set((e as {error?:{message?:string}}).error?.message??'No se pudo enviar la hoja. Conservamos lo escrito para que vuelvas a intentarlo.');}finally{this.busy.set(false);}}
 print(){window.print();}
}
