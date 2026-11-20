import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

type Summary={id:string;number:number;kind:string;status:string;names:string;surnames:string;created_at:string};
type Detail=Summary&{consumer:Record<string,string>;purchase:Record<string,string>;detail:string;request_text:string;provider:Record<string,string>;response_text?:string;response_at?:string};
type Page={items:Summary[];page:number;size:number;total:number};

@Component({selector:'app-complaints-inbox',imports:[FormsModule,RouterLink],template:`
<main class="inbox"><a routerLink="/paginas">← Páginas y pie de página</a><h1>Hojas de reclamación</h1>
@if(error()){<p class="error" role="alert">{{error()}}</p>}
<div class="layout"><section class="list"><h2>Recibidas</h2>@for(item of items();track item.id){<button type="button" [class.active]="selected()?.id===item.id" (click)="open(item.id)"><strong>BLS-LR-{{number(item.number)}} · {{item.kind}}</strong><span>{{item.names}} {{item.surnames}}</span><small>{{item.status}} · {{item.created_at}}</small></button>}@empty{<p>No hay hojas registradas.</p>}
<div class="pager"><button type="button" class="secondary" (click)="load(page()-1)" [disabled]="page()===0">Anterior</button><span>Página {{page()+1}}</span><button type="button" class="secondary" (click)="load(page()+1)" [disabled]="(page()+1)*20>=total()">Siguiente</button></div></section>
<section class="detail">@if(selected();as claim){<h2>BLS-LR-{{number(claim.number)}}</h2><p><strong>{{claim.kind}} · {{claim.status}}</strong><br>{{claim.created_at}}</p><h3>Consumidor</h3><p>{{claim.consumer['names']}} {{claim.consumer['surnames']}} · {{claim.consumer['documentType']}} {{claim.consumer['documentNumber']}}<br>{{claim.consumer['email']}} · {{claim.consumer['phone']}}<br>{{claim.consumer['address']}}, {{claim.consumer['city']}}, {{claim.consumer['department']}}</p>
<h3>Compra</h3><p>{{claim.purchase['description']}} · S/ {{claim.purchase['amount']}}<br>Pedido: {{claim.purchase['orderNumber']||'No indicado'}}</p><h3>Detalle</h3><p class="body">{{claim.detail}}</p><h3>Pedido del consumidor</h3><p class="body">{{claim.request_text}}</p>
@if(claim.response_text){<h3>Respuesta enviada</h3><p class="body">{{claim.response_text}}</p>}@else{<label>Respuesta al consumidor<textarea [(ngModel)]="response" rows="7" maxlength="10000"></textarea></label><button type="button" (click)="answer()" [disabled]="busy()||!response.trim()">Enviar respuesta</button>}
} @else {<p>Selecciona una hoja para ver el detalle.</p>}</section></div></main>`,styles:[`
.inbox{max-width:1200px;margin:auto;padding:28px;color:#14243e}.inbox>a{color:#94642b}h1{font:clamp(2rem,4vw,3rem) Georgia,serif}.layout{display:grid;grid-template-columns:minmax(240px,360px) minmax(0,1fr);gap:20px}.list,.detail{background:white;border:1px solid #d9e1ea;border-radius:12px;padding:20px}.list>button{display:grid;gap:5px;width:100%;text-align:left;margin:8px 0;padding:14px;background:#eef2f7;color:#14243e}.list>button.active{outline:2px solid #ab762b}.list span,.list small{display:block}.pager{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-top:20px}.pager button{min-height:44px}.detail h2{font:1.8rem Georgia,serif}.detail p{line-height:1.6}.body{white-space:pre-wrap}.detail textarea{display:block;width:100%;padding:12px;margin:8px 0 15px;border:1px solid #b8c5d4;border-radius:6px}.detail>button{min-height:44px}.error{color:#a11}@media(max-width:700px){.inbox{padding:20px 16px}.layout{grid-template-columns:1fr}}
`]})
export class ComplaintsInbox {
 private readonly http=inject(HttpClient);
 readonly items=signal<Summary[]>([]);readonly selected=signal<Detail|null>(null);readonly page=signal(0);readonly total=signal(0);readonly busy=signal(false);readonly error=signal('');response='';
 constructor(){void this.load(0);}
 number(value:number){return String(value).padStart(6,'0');}
 async load(page:number){try{const data=await firstValueFrom(this.http.get<Page>('/api/v1/complaints/admin',{params:{page,size:20}}));this.items.set(data.items);this.page.set(data.page);this.total.set(data.total);}catch{this.error.set('No se pudieron cargar las hojas.');}}
 async open(id:string){this.error.set('');this.selected.set(null);try{this.selected.set(await firstValueFrom(this.http.get<Detail>('/api/v1/complaints/admin/'+id)));}catch{this.error.set('No se pudo cargar la hoja.');}}
 async answer(){const claim=this.selected();if(!claim||!this.response.trim()||this.busy())return;this.busy.set(true);this.error.set('');try{this.selected.set(await firstValueFrom(this.http.post<Detail>('/api/v1/complaints/admin/'+claim.id+'/answer',{response:this.response})));this.response='';void this.load(this.page());}catch(e){this.error.set((e as {error?:{message?:string}}).error?.message??'No se pudo registrar la respuesta.');}finally{this.busy.set(false);}}
}
