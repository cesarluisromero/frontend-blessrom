import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SiteInformation, SiteInformationAdmin, SITE_PAGE_KEYS } from '../../../../shared/site-information';

@Component({selector:'app-site-information',imports:[FormsModule],template:`
<main class="editor"><h1>Pie de página y páginas informativas</h1>
<p>Edita el contacto y el contenido de las páginas. La tienda cambia únicamente al publicar.</p>
@if (error()) { <p role="alert" class="error">{{error()}}</p> }
@if (notice()) { <p role="status" class="notice">{{notice()}}</p> }
@if (draft; as content) {
<section><h2>Contacto</h2><label>Dirección<input [(ngModel)]="content.address" (ngModelChange)="saved.set(false)" maxlength="300"></label>
@for (phone of content.phones; track $index) {<label>Teléfono {{$index+1}}<input [(ngModel)]="content.phones[$index]" (ngModelChange)="saved.set(false)" maxlength="30"></label>}
<button type="button" class="secondary" (click)="content.phones.push('');saved.set(false)" [disabled]="content.phones.length>=5">Agregar teléfono</button></section>
@for (key of pageKeys; track key) {<section><h2>{{pageLabels[key]}}</h2>
<label>Título<input [(ngModel)]="content.pages[key].title" (ngModelChange)="saved.set(false)" maxlength="100"></label>
<label>Contenido<textarea [(ngModel)]="content.pages[key].body" (ngModelChange)="saved.set(false)" rows="10" maxlength="20000"></textarea></label>
<p class="hint">El contenido se muestra como texto. Revisa el texto legal antes de publicarlo.</p></section>}
<div class="actions"><button type="button" (click)="save()" [disabled]="busy()">Guardar borrador</button>
<button type="button" (click)="publish()" [disabled]="busy()||!saved()">Publicar contenido</button></div>
}
</main>`,styles:[`.editor{max-width:1000px;margin:auto;padding:28px}.editor h1{font:2.5rem Georgia,serif;color:#14243e}.editor section{background:white;border:1px solid #d8e0e9;border-radius:14px;padding:24px;margin:20px 0}.editor h2{font:1.7rem Georgia,serif}.editor label{display:block;margin:16px 0;font-weight:600}.editor input,.editor textarea{display:block;box-sizing:border-box;width:100%;padding:12px;margin-top:7px;border:1px solid #b8c5d4;border-radius:6px;font:inherit}.actions{display:flex;gap:12px;flex-wrap:wrap}.editor button{min-height:44px;padding:10px 18px;background:#14243e;color:white;border-radius:7px}.editor button:disabled{opacity:.5}.hint{font-size:13px;color:#556}.error{color:#a11}.notice{color:#176d4a}`]})
export class SiteInformationEditor {
  private readonly http=inject(HttpClient);
  readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');readonly saved=signal(false);
  readonly pageKeys=SITE_PAGE_KEYS;
  readonly pageLabels:Record<(typeof SITE_PAGE_KEYS)[number],string>={'quienes-somos':'Quiénes somos','privacidad':'Privacidad','terminos':'Términos','eliminar-datos':'Eliminar datos'};
  draft:SiteInformation|null=null;version=0;
  constructor(){void this.load();}
  async load(){try{const data=await firstValueFrom(this.http.get<SiteInformationAdmin>('/api/v1/site-information/admin'));this.version=data.version;this.draft=structuredClone(data.draft);this.saved.set(true);}catch{this.error.set('No se pudo cargar el contenido.');}}
  async save(){if(!this.draft||this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<SiteInformationAdmin>('/api/v1/site-information/admin/draft',{version:this.version,content:this.draft}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. La tienda todavía muestra el contenido publicado.');}catch(e){this.saved.set(false);this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el contenido. Tus cambios siguen en el formulario.':'No se pudo guardar el borrador.');}finally{this.busy.set(false);}}
  async publish(){if(this.busy()||!this.saved())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.post<SiteInformationAdmin>('/api/v1/site-information/admin/publish',{version:this.version}));this.version=data.version;this.notice.set('Contenido publicado en la tienda.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el contenido. Tus cambios siguen en el formulario.':'No se pudo publicar.');}finally{this.busy.set(false);}}
}
