import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SiteInformation } from '../../../../shared/site-information';
import { LinkedText } from '../../../../shared/linked-text';

type Receipt={number:string;createdAt:string;receipt:string};

@Component({selector:'app-data-deletion',imports:[FormsModule,RouterLink,LinkedText],template:`
<main class="page"><a routerLink="/">Inicio</a><h1>{{title()}}</h1>
@if(body()){<p class="intro"><app-linked-text [text]="body()" /></p>}
@if(receipt();as saved){<section class="receipt" role="status"><h2>Solicitud recibida: {{saved.number}}</h2><p>Fecha: {{saved.createdAt}}</p><p>Guarda este número. Revisaremos tu identidad y responderemos al correo indicado. Puedes imprimir esta constancia.</p><pre>{{saved.receipt}}</pre><button type="button" (click)="print()">Imprimir o guardar PDF</button></section>}
@else{<p>Solicita la eliminación de tus datos personales. Verificaremos tu identidad antes de atenderla. Algunos registros pueden conservarse cuando exista una obligación legal.</p>
<p>Los campos marcados con * son obligatorios.</p>
@if(error()){<p class="error" role="alert">{{error()}}</p>}
<form #requestForm="ngForm" (ngSubmit)="submit(requestForm)">
<label>Nombre y apellidos *<input name="fullName" [(ngModel)]="data.fullName" required maxlength="200" autocomplete="name"></label>
<label>Tipo de documento *<select name="documentType" [(ngModel)]="data.documentType" required><option value="">Selecciona</option><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option><option value="OTRO">Otro</option></select></label>
<label>Número de documento *<input name="documentNumber" [(ngModel)]="data.documentNumber" required maxlength="30"></label>
<label>Número de WhatsApp con código de país *<input name="whatsapp" [(ngModel)]="data.whatsapp" required maxlength="30" pattern="\\+[1-9][0-9 ]{7,18}" placeholder="Ej. +51 987 654 321" inputmode="tel" autocomplete="tel"></label>
<label>Correo electrónico para notificación *<input name="email" [(ngModel)]="data.email" required type="email" maxlength="254" autocomplete="email"></label>
<label>Motivo (opcional)<textarea name="reason" [(ngModel)]="data.reason" maxlength="2000" rows="4" placeholder="Cuéntanos qué datos deseas eliminar"></textarea></label>
<label class="check"><input name="confirmed" type="checkbox" [(ngModel)]="data.confirmed" required> Confirmo que soy el titular de los datos y que la información enviada es correcta. *</label>
<button type="submit" [disabled]="busy()">{{busy()?'Enviando…':'Enviar solicitud'}}</button>
</form>}
</main>`,styles:[`
.page{max-width:760px;margin:auto;padding:42px 20px 96px;color:#14243e}.page>a{color:#94642b}.page h1{font:clamp(2rem,5vw,3rem) Georgia,serif}.page p{line-height:1.65}.intro{white-space:pre-wrap}.page form,.receipt{background:white;border:1px solid #d9e1ea;border-radius:12px;padding:24px}.page label{display:block;margin:18px 0;font-weight:600}.page input:not([type=checkbox]),.page select,.page textarea{display:block;width:100%;min-height:48px;padding:11px;margin-top:7px;border:1px solid #aebed0;border-radius:6px;font:inherit}.page textarea{resize:vertical}.page label.check{display:flex;gap:12px;align-items:flex-start}.page input[type=checkbox]{width:20px;height:20px;flex:0 0 20px}.page button{min-height:48px;padding:12px 22px}.error{color:#a11}.receipt pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}@media print{.page>a,.receipt button{display:none}}
`]})
export class DataDeletionPage {
 private readonly http=inject(HttpClient);
 readonly title=signal('Eliminar datos');readonly body=signal('');readonly busy=signal(false);readonly error=signal('');readonly receipt=signal<Receipt|null>(null);
 data={fullName:'',documentType:'',documentNumber:'',whatsapp:'',email:'',reason:'',confirmed:false};
 constructor(){this.http.get<SiteInformation>('/api/v1/site-information').subscribe({next:info=>{const page=info.pages['eliminar-datos'];this.title.set(page.title);this.body.set(page.body);},error:()=>this.error.set('No se pudo cargar el texto de esta página.')});}
 async submit(form:NgForm){if(form.invalid||!this.data.confirmed){form.control.markAllAsTouched();this.error.set('Completa los campos obligatorios y revisa el número de WhatsApp.');return;}if(this.busy())return;
  this.busy.set(true);this.error.set('');try{this.receipt.set(await firstValueFrom(this.http.post<Receipt>('/api/v1/data-deletion-requests',this.data)));window.scrollTo({top:0,behavior:'smooth'});}
  catch(e){this.error.set((e as {error?:{message?:string}}).error?.message??'No se pudo enviar la solicitud. Conservamos lo escrito para que vuelvas a intentarlo.');}finally{this.busy.set(false);}}
 print(){window.print();}
}
