import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

type Summary={id:string;number:number;full_name:string;status:string;created_at:string};
type Detail=Summary&{document_type:string;document_number:string;whatsapp:string;email:string;reason:string|null;admin_note:string|null;resolved_at:string|null};
type Page={items:Summary[];page:number;size:number;total:number};

@Component({selector:'app-data-deletion-inbox',imports:[FormsModule,RouterLink],template:`
<main class="inbox"><a routerLink="/paginas">← Páginas y pie de página</a><h1>Solicitudes de eliminación de datos</h1><p>Verifica la identidad y revisa los registros antes de resolver cada solicitud. Cambiar el estado no elimina datos automáticamente.</p>
@if(error()){<p class="error" role="alert">{{error()}}</p>}
<div class="layout"><section class="list"><h2>Recibidas</h2>@for(item of items();track item.id){<button type="button" [class.active]="selected()?.id===item.id" (click)="open(item.id)"><strong>BLS-DAT-{{number(item.number)}}</strong><span>{{item.full_name}}</span><small>{{item.status}} · {{item.created_at}}</small></button>}@empty{<p>No hay solicitudes.</p>}
<div class="pager"><button type="button" class="secondary" (click)="load(page()-1)" [disabled]="page()===0">Anterior</button><span>Página {{page()+1}}</span><button type="button" class="secondary" (click)="load(page()+1)" [disabled]="(page()+1)*20>=total()">Siguiente</button></div></section>
<section class="detail">@if(selected();as request){<h2>BLS-DAT-{{number(request.number)}}</h2><p><strong>{{request.status}}</strong> · {{request.created_at}}</p><dl><dt>Titular</dt><dd>{{request.full_name}}</dd><dt>Documento</dt><dd>{{request.document_type}} {{request.document_number}}</dd><dt>WhatsApp</dt><dd>{{request.whatsapp}}</dd><dt>Correo</dt><dd>{{request.email}}</dd><dt>Motivo</dt><dd>{{request.reason||'No indicado'}}</dd></dl>
@if(request.admin_note){<h3>Respuesta registrada</h3><p class="body">{{request.admin_note}}</p>}
@if(request.status!=='RESUELTA'&&request.status!=='RECHAZADA'){
<label>Explicación para el solicitante<textarea [(ngModel)]="note" rows="6" maxlength="5000"></textarea></label>
<div class="actions"><button type="button" class="secondary" (click)="update('EN_REVISION')" [disabled]="busy()||request.status==='EN_REVISION'">En revisión</button><button type="button" (click)="update('RESUELTA')" [disabled]="busy()||!note.trim()">Registrar resolución</button><button type="button" class="secondary" (click)="update('RECHAZADA')" [disabled]="busy()||!note.trim()">Registrar rechazo</button></div><p class="hint">El correo de respuesta se envía cuando el servicio SMTP está habilitado.</p>
}}
@else{<p>Selecciona una solicitud para ver el detalle.</p>}</section></div></main>`,styles:[`
.inbox{max-width:1200px;margin:auto;padding:28px;color:#14243e}.inbox>a{color:#94642b}h1{font:clamp(2rem,4vw,3rem) Georgia,serif}.inbox p{line-height:1.6}.layout{display:grid;grid-template-columns:minmax(240px,360px) minmax(0,1fr);gap:20px}.list,.detail{background:white;border:1px solid #d9e1ea;border-radius:12px;padding:20px}.list>button{display:grid;gap:5px;width:100%;text-align:left;margin:8px 0;padding:14px;background:#eef2f7;color:#14243e}.list>button.active{outline:2px solid #ab762b}.list span,.list small{display:block}.pager,.actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:20px}.pager{justify-content:space-between}.pager button,.actions button{min-height:44px}.detail h2{font:1.8rem Georgia,serif}.detail dt{font-weight:700;margin-top:12px}.detail dd{margin:4px 0;overflow-wrap:anywhere}.body{white-space:pre-wrap}.detail textarea{display:block;width:100%;padding:12px;margin:8px 0 15px;border:1px solid #b8c5d4;border-radius:6px}.secondary{background:#eaf0f7;color:#14243e}.error{color:#a11}@media(max-width:700px){.inbox{padding:20px 16px}.layout{grid-template-columns:1fr}}
`]})
export class DataDeletionInbox {
 private readonly http=inject(HttpClient);
 readonly items=signal<Summary[]>([]);readonly selected=signal<Detail|null>(null);readonly page=signal(0);readonly total=signal(0);readonly busy=signal(false);readonly error=signal('');note='';
 constructor(){void this.load(0);}
 number(value:number){return String(value).padStart(6,'0');}
 async load(page:number){try{const data=await firstValueFrom(this.http.get<Page>('/api/v1/data-deletion-requests/admin',{params:{page,size:20}}));this.items.set(data.items);this.page.set(data.page);this.total.set(data.total);}catch{this.error.set('No se pudieron cargar las solicitudes.');}}
 async open(id:string){this.error.set('');this.selected.set(null);this.note='';try{this.selected.set(await firstValueFrom(this.http.get<Detail>('/api/v1/data-deletion-requests/admin/'+id)));}catch{this.error.set('No se pudo cargar la solicitud.');}}
 async update(status:'EN_REVISION'|'RESUELTA'|'RECHAZADA'){const request=this.selected();if(!request||this.busy())return;this.busy.set(true);this.error.set('');try{this.selected.set(await firstValueFrom(this.http.post<Detail>('/api/v1/data-deletion-requests/admin/'+request.id+'/status',{status,note:this.note})));void this.load(this.page());}catch(e){this.error.set((e as {error?:{message?:string}}).error?.message??'No se pudo actualizar la solicitud.');}finally{this.busy.set(false);}}
}
