import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SiteInformation, SiteInformationAdmin, SITE_PAGE_KEYS } from '../../../../shared/site-information';

type Section = (typeof SITE_PAGE_KEYS)[number] | 'contacto' | 'pie' | 'libro';

@Component({selector:'app-site-information',imports:[FormsModule,RouterLink],template:`
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
        <button type="button" [class.selected]="selected()==='libro'" (click)="selected.set('libro')">Libro de Reclamaciones</button>
        <h2>Pie de página</h2>
        <button type="button" [class.selected]="selected()==='pie'" (click)="selected.set('pie')">Dirección y teléfonos</button>
      </nav>
      <section class="page-editor">
        @if(selected()==='libro'){
          <h2>Libro de Reclamaciones</h2><p>Configura los datos del proveedor que aparecerán en cada hoja. El formulario público se habilitará al publicar esta configuración completa.</p>
          @if(content.complaints; as book){
            <label class="check"><input type="checkbox" [(ngModel)]="book.enabled" (ngModelChange)="changed()"> Mostrar y habilitar el Libro de Reclamaciones</label>
            <label>Título<input [(ngModel)]="book.title" (ngModelChange)="changed()" maxlength="100"></label>
            <label>Texto introductorio<textarea #introEditor [(ngModel)]="book.intro" (ngModelChange)="changed()" rows="4" maxlength="3000"></textarea></label>
            <button type="button" class="secondary link-action" (click)="insertLink(introEditor,'intro')">Insertar enlace en el texto seleccionado</button>
            <label>Razón social o nombre del titular *<input [(ngModel)]="book.businessName" (ngModelChange)="changed()" maxlength="200"></label>
            <label>RUC *<input [(ngModel)]="book.ruc" (ngModelChange)="changed()" maxlength="11" inputmode="numeric"></label>
            <label>Dirección del establecimiento *<input [(ngModel)]="book.address" (ngModelChange)="changed()" maxlength="300"></label>
            <label>Correo que recibirá los reclamos *<input [(ngModel)]="book.email" (ngModelChange)="changed()" maxlength="254" type="email"></label>
            <p class="hint">El envío de constancias por correo requiere SMTP y NOTIFICATIONS_ENABLED=true en el backend. Revisa los datos antes de habilitar el formulario.</p>
            <a class="preview-link" routerLink="/paginas/reclamaciones">Ver hojas recibidas →</a><br>
            <a class="preview-link" href="https://blessrom.com/libro-de-reclamaciones" target="_blank" rel="noopener noreferrer">Ver formulario publicado ↗</a>
          }
        } @else if(selected()==='pie'){
          <h2>Dirección y teléfonos</h2><p>Estos datos aparecen en el pie de página y en Contacto.</p>
          <label>Dirección<input [(ngModel)]="content.address" (ngModelChange)="changed()" maxlength="300"></label>
          @for(phone of content.phones;track $index){<label>Teléfono {{$index+1}}<input [(ngModel)]="content.phones[$index]" (ngModelChange)="changed()" maxlength="30"></label>}
          <button type="button" class="secondary" (click)="content.phones.push('');changed()" [disabled]="content.phones.length>=5">Agregar teléfono</button>
        } @else if(selected()==='contacto'){
          <h2>Contacto</h2><p>El texto aparecerá antes de la dirección y los teléfonos.</p>
          <label>Texto de la página<textarea #contactEditor [(ngModel)]="content.contactBody" (ngModelChange)="changed()" rows="12" maxlength="20000" placeholder="Cuéntales cómo pueden comunicarse con Blessrom."></textarea></label>
          <button type="button" class="secondary link-action" (click)="insertLink(contactEditor,'contact')">Insertar enlace en el texto seleccionado</button>
          <a class="preview-link" href="https://blessrom.com/contacto" target="_blank" rel="noopener noreferrer">Ver página publicada ↗</a>
        } @else {
          @for(key of pageKeys;track key){@if(selected()===key){
            <h2>{{pageLabels[key]}}</h2>
            <label>Título<input [(ngModel)]="content.pages[key].title" (ngModelChange)="changed()" maxlength="100"></label>
            <label>Texto de la página<textarea #pageEditor [(ngModel)]="content.pages[key].body" (ngModelChange)="changed()" rows="14" maxlength="20000" placeholder="Escribe aquí el contenido."></textarea></label>
            <button type="button" class="secondary link-action" (click)="insertLink(pageEditor,'page')">Insertar enlace en el texto seleccionado</button>
            <p class="hint">Separa los párrafos con saltos de línea. Revisa el contenido legal antes de publicarlo.</p>
            <a class="preview-link" [href]="'https://blessrom.com/informacion/'+key" target="_blank" rel="noopener noreferrer">Ver página publicada ↗</a>
            @if(key==='eliminar-datos'){<p><a class="preview-link" routerLink="/paginas/solicitudes-de-datos">Ver solicitudes recibidas →</a></p>}
          }}
        }
      </section>
    </div>
    <div class="actions"><button type="button" (click)="save()" [disabled]="busy()">Guardar borrador</button><button type="button" (click)="publish()" [disabled]="busy()||!saved()">Publicar páginas</button></div>
  }
</main>`,styles:[`
.editor{max-width:1200px;margin:auto;padding:28px;color:#14243e}.eyebrow{font-size:12px;letter-spacing:.14em;color:#805a2c}.editor h1{font:clamp(2rem,4vw,2.8rem) Georgia,serif;margin:8px 0}.editor>p{line-height:1.6}.layout{display:grid;grid-template-columns:minmax(210px,270px) minmax(0,1fr);gap:22px;margin-top:28px}.sections,.page-editor{background:white;border:1px solid #d8e0e9;border-radius:14px;padding:24px}.sections h2{font:600 13px Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#536174;margin:16px 0 8px}.sections h2:first-child{margin-top:0}.sections button{display:block;width:100%;text-align:left;margin:3px 0;background:transparent;color:#14243e}.sections button.selected{background:#14243e;color:white}.page-editor h2{font:1.8rem Georgia,serif;margin:0 0 14px}.page-editor>p{color:#536174;line-height:1.5}.page-editor label{display:block;margin:18px 0;font-weight:600}.page-editor label.check{display:flex;align-items:center;gap:10px}.page-editor label.check input{width:auto;margin:0}.page-editor input,.page-editor textarea{display:block;width:100%;padding:12px;margin-top:7px;border:1px solid #b8c5d4;border-radius:6px;font:inherit;line-height:1.5}.page-editor textarea{resize:vertical}.link-action{margin-top:-8px}.actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;margin-top:22px}.editor button{min-height:44px;padding:10px 18px;border-radius:7px}.editor button:disabled{opacity:.5}.secondary{background:#eaf0f7;color:#14243e}.hint{font-size:13px;color:#536174}.error{color:#a11}.notice{color:#176d4a}.preview-link{display:inline-block;color:#805a2c;text-decoration:underline;margin-top:8px}@media(max-width:700px){.editor{padding:20px 16px}.layout{grid-template-columns:minmax(0,1fr);gap:14px}.sections{display:flex;gap:8px;overflow-x:auto;padding:12px}.sections h2{display:none}.sections button{width:auto;white-space:nowrap;flex:0 0 auto}.page-editor{padding:18px}.actions button{flex:1 1 150px}}
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
  insertLink(textarea:HTMLTextAreaElement,field:'intro'|'contact'|'page'){
    const content=this.draft();if(!content)return;
    const start=textarea.selectionStart,end=textarea.selectionEnd;
    const selected=textarea.value.slice(start,end).trim();
    const label=selected||window.prompt('¿Qué palabra o frase llevará el enlace?')?.trim();
    if(!label)return;
    const url=window.prompt('Dirección del enlace (https://... o ruta interna /...):')?.trim();
    if(!url)return;
    if((!/^https?:\/\/[^\s]+$/i.test(url)&&!/^\/(?!\/)[^\s]*$/.test(url))||url.includes(')')){
      this.error.set('Ingresa un enlace http, https o una ruta interna que comience con /.');return;
    }
    const max=field==='intro'?3000:20000;
    const insertion=`[${label.replaceAll('[','(').replaceAll(']',')')}](${url})`;
    const next=textarea.value.slice(0,start)+insertion+textarea.value.slice(end);
    if(next.length>max){this.error.set(`El texto supera el límite de ${max} caracteres.`);return;}
    if(field==='intro'&&content.complaints)content.complaints.intro=next;
    else if(field==='contact')content.contactBody=next;
    else if(field==='page'){
      const key=this.selected();if(key!=='pie'&&key!=='contacto'&&key!=='libro')content.pages[key].body=next;
    }
    this.error.set('');this.changed();
    queueMicrotask(()=>{textarea.focus();textarea.setSelectionRange(start+insertion.length,start+insertion.length);});
  }
  async load(){this.loading.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.get<SiteInformationAdmin>('/api/v1/site-information/admin'));this.version=data.version;const content=structuredClone(data.draft);content.contactBody ??='';content.complaints??={enabled:false,title:'Libro de Reclamaciones Virtual',intro:'Registra aquí tu reclamo o queja. Recibirás una constancia con el número de tu hoja.',businessName:'',ruc:'',address:content.address,email:''};this.draft.set(content);this.saved.set(true);}catch(e){const status=(e as {status?:number}).status;this.error.set(status===401||status===403?'No se pudo autorizar la carga. Vuelve a iniciar sesión.':status===404?'El backend todavía no ofrece este módulo. Despliega la versión actual del backend.':'No se pudieron cargar las páginas.');}finally{this.loading.set(false);}}
  async save(){const content=this.draft();if(!content||this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<SiteInformationAdmin>('/api/v1/site-information/admin/draft',{version:this.version,content}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. La tienda todavía muestra el contenido publicado.');}catch(e){this.saved.set(false);this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el contenido. Tus cambios siguen en el formulario.':'No se pudo guardar el borrador.');}finally{this.busy.set(false);}}
  async publish(){if(this.busy()||!this.saved())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.post<SiteInformationAdmin>('/api/v1/site-information/admin/publish',{version:this.version}));this.version=data.version;this.notice.set('Páginas publicadas en la tienda.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el contenido. Tus cambios siguen en el formulario.':(e as {error?:{message?:string}}).error?.message??'No se pudo publicar.');}finally{this.busy.set(false);}}
}
