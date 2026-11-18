import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SiteInformation, SiteInformationAdmin, SITE_PAGE_KEYS } from '../../../../shared/site-information';

type Section = (typeof SITE_PAGE_KEYS)[number] | 'contacto' | 'pie';

@Component({selector:'app-site-information',imports:[FormsModule],template:`
<main class="editor">
  <p class="eyebrow">TIENDA / CONTENIDO</p><h1>Páginas y pie de página</h1>
  <p>Edita cada página. La tienda cambia únicamente cuando publiques el borrador.</p>
  @if(error()){<p role="alert" class="error">{{error()}}</p>}
  @if(notice()){<p role="status" class="notice">{{notice()}}</p>}
  @if(loading()){<p role="status">Cargando páginas…</p>}
  @if(error() && !loading() && !draft()){<button type="button" (click)="load()">Reintentar carga</button>}
  @if(draft(); as content){
    <div class="layout">
      <nav class="sections" aria-label="Páginas editables">
        <h2>Empresa</h2>
        <button type="button" [class.selected]="selected()==='quienes-somos'" (click)="selected.set('quienes-somos')">Quiénes somos</button>
        <button type="button" [class.selected]="selected()==='contacto'" (click)="selected.set('contacto')">Contacto</button>
        <h2>Legal</h2>
        @for(key of legalKeys;track key){<button type="button" [class.selected]="selected()===key" (click)="selected.set(key)">{{pageLabels[key]}}</button>}
        <h2>Pie de página</h2>
        <button type="button" [class.selected]="selected()==='pie'" (click)="selected.set('pie')">Dirección y teléfonos</button>
      </nav>
      <section class="page-editor">
        @if(selected()==='pie'){
          <h2>Dirección y teléfonos</h2><p>Estos datos aparecen en el pie de página y en Contacto.</p>
          <label>Dirección<input [(ngModel)]="content.address" (ngModelChange)="changed()" maxlength="300"></label>
          @for(phone of content.phones;track $index){<label>Teléfono {{$index+1}}<input [(ngModel)]="content.phones[$index]" (ngModelChange)="changed()" maxlength="30"></label>}
          <button type="button" class="secondary" (click)="content.phones.push('');changed()" [disabled]="content.phones.length>=5">Agregar teléfono</button>
        } @else if(selected()==='contacto'){
          <h2>Contacto</h2><p>El texto aparecerá antes de la dirección y los teléfonos.</p>
          <label>Texto de la página<textarea [(ngModel)]="content.contactBody" (ngModelChange)="changed()" rows="12" maxlength="20000" placeholder="Cuéntales cómo pueden comunicarse con Blessrom."></textarea></label>
          <a class="preview-link" href="https://blessrom.com/contacto" target="_blank" rel="noopener noreferrer">Ver página publicada ↗</a>
        } @else {
          @for(key of pageKeys;track key){@if(selected()===key){
            <h2>{{pageLabels[key]}}</h2>
            <label>Título<input [(ngModel)]="content.pages[key].title" (ngModelChange)="changed()" maxlength="100"></label>
            <label>Texto de la página<textarea [(ngModel)]="content.pages[key].body" (ngModelChange)="changed()" rows="14" maxlength="20000" placeholder="Escribe aquí el contenido."></textarea></label>
            <p class="hint">Separa los párrafos con saltos de línea. Revisa el contenido legal antes de publicarlo.</p>
            <a class="preview-link" [href]="'https://blessrom.com/informacion/'+key" target="_blank" rel="noopener noreferrer">Ver página publicada ↗</a>
          }}
        }
      </section>
    </div>
    <div class="actions"><button type="button" (click)="save()" [disabled]="busy()">Guardar borrador</button><button type="button" (click)="publish()" [disabled]="busy()||!saved()">Publicar páginas</button></div>
  }
</main>`,styles:[`
.editor{max-width:1200px;margin:auto;padding:28px;color:#14243e}.eyebrow{font-size:12px;letter-spacing:.14em;color:#805a2c}.editor h1{font:clamp(2rem,4vw,2.8rem) Georgia,serif;margin:8px 0}.editor>p{line-height:1.6}.layout{display:grid;grid-template-columns:minmax(210px,270px) minmax(0,1fr);gap:22px;margin-top:28px}.sections,.page-editor{background:white;border:1px solid #d8e0e9;border-radius:14px;padding:24px}.sections h2{font:600 13px Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#536174;margin:16px 0 8px}.sections h2:first-child{margin-top:0}.sections button{display:block;width:100%;text-align:left;margin:3px 0;background:transparent;color:#14243e}.sections button.selected{background:#14243e;color:white}.page-editor h2{font:1.8rem Georgia,serif;margin:0 0 14px}.page-editor>p{color:#536174;line-height:1.5}.page-editor label{display:block;margin:18px 0;font-weight:600}.page-editor input,.page-editor textarea{display:block;width:100%;padding:12px;margin-top:7px;border:1px solid #b8c5d4;border-radius:6px;font:inherit;line-height:1.5}.page-editor textarea{resize:vertical}.actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;margin-top:22px}.editor button{min-height:44px;padding:10px 18px;border-radius:7px}.editor button:disabled{opacity:.5}.secondary{background:#eaf0f7;color:#14243e}.hint{font-size:13px;color:#536174}.error{color:#a11}.notice{color:#176d4a}.preview-link{display:inline-block;color:#805a2c;text-decoration:underline;margin-top:8px}@media(max-width:700px){.editor{padding:20px 16px}.layout{grid-template-columns:minmax(0,1fr);gap:14px}.sections{display:flex;gap:8px;overflow-x:auto;padding:12px}.sections h2{display:none}.sections button{width:auto;white-space:nowrap;flex:0 0 auto}.page-editor{padding:18px}.actions button{flex:1 1 150px}}
`]})
export class SiteInformationEditor {
  private readonly http=inject(HttpClient);
  readonly busy=signal(false);readonly loading=signal(true);readonly error=signal('');readonly notice=signal('');readonly saved=signal(false);
  readonly draft=signal<SiteInformation|null>(null);
  readonly selected=signal<Section>('quienes-somos');
  readonly pageKeys=SITE_PAGE_KEYS;
  readonly legalKeys=SITE_PAGE_KEYS.filter(key=>key!=='quienes-somos');
  readonly pageLabels:Record<(typeof SITE_PAGE_KEYS)[number],string>={'quienes-somos':'Quiénes somos','privacidad':'Privacidad','terminos':'Términos','eliminar-datos':'Eliminar datos'};
  version=0;
  constructor(){void this.load();}
  changed(){this.saved.set(false);this.notice.set('');}
  async load(){this.loading.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.get<SiteInformationAdmin>('/api/v1/site-information/admin'));this.version=data.version;const content=structuredClone(data.draft);content.contactBody ??='';this.draft.set(content);this.saved.set(true);}catch(e){const status=(e as {status?:number}).status;this.error.set(status===401||status===403?'No se pudo autorizar la carga. Vuelve a iniciar sesión.':status===404?'El backend todavía no ofrece este módulo. Despliega la versión actual del backend.':'No se pudieron cargar las páginas.');}finally{this.loading.set(false);}}
  async save(){const content=this.draft();if(!content||this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<SiteInformationAdmin>('/api/v1/site-information/admin/draft',{version:this.version,content}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. La tienda todavía muestra el contenido publicado.');}catch(e){this.saved.set(false);this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el contenido. Tus cambios siguen en el formulario.':'No se pudo guardar el borrador.');}finally{this.busy.set(false);}}
  async publish(){if(this.busy()||!this.saved())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.post<SiteInformationAdmin>('/api/v1/site-information/admin/publish',{version:this.version}));this.version=data.version;this.notice.set('Páginas publicadas en la tienda.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el contenido. Tus cambios siguen en el formulario.':'No se pudo publicar.');}finally{this.busy.set(false);}}
}
