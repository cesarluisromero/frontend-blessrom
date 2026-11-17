import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Category, Collection, HomeCoverRole, MediaVariant, ProductMedia } from '../../../../shared/commerce';
import { HomeProductSection, HomeSectionsAdmin } from '../../../../shared/home-sections';
import { HomeCoverSelection, HomeCoverUpload, prepareHomeCover } from './home-cover-upload';

type UploadSession={assetId:string;uploads:{variant:MediaVariant;uploadUrl:string}[]};

@Component({selector:'app-home-sections-editor',imports:[FormsModule,HomeCoverUpload],template:`
<main class="editor"><p class="eyebrow">INICIO / SECCIONES</p><h1>Secciones de productos</h1>
<p>Agrupa prendas por categoría, colección o ventas. Las secciones sin productos disponibles se ocultan automáticamente.</p>
@if(error()){<p role="alert" class="error">{{error()}}</p>}@if(notice()){<p role="status" class="notice">{{notice()}}</p>}
@if(!categories().length||!collections().length){<button type="button" class="secondary" (click)="loadOptions()">Reintentar carga de categorías y colecciones</button>}
<div class="toolbar"><button type="button" (click)="add()" [disabled]="sections.length>=8">Agregar sección</button><span>{{sections.length}} / 8 secciones</span></div>
@for(section of sections;track section.id;let i=$index){<section>
<div class="heading"><h2>Sección {{i+1}}</h2><div><button type="button" class="secondary" (click)="move(i,-1)" [disabled]="i===0" [attr.aria-label]="'Subir sección '+(i+1)">↑</button><button type="button" class="secondary" (click)="move(i,1)" [disabled]="i===sections.length-1" [attr.aria-label]="'Bajar sección '+(i+1)">↓</button><button type="button" class="secondary" (click)="remove(i)">Quitar</button></div></div>
<p class="published-state">{{publishedState(section)}}</p>
<div class="fields"><label>Título<input [(ngModel)]="section.title" (ngModelChange)="saved.set(false)" maxlength="100" placeholder="Por ejemplo: Shorts para tu día"></label>
<label>Presentación<select [(ngModel)]="section.presentation" (ngModelChange)="presentationChanged(section)"><option value="GRID">Cuadrícula</option><option value="CAROUSEL">Carrusel horizontal</option><option value="VISUAL">Portada con imágenes</option></select></label>
<label>Agrupar por<select [(ngModel)]="section.kind" (ngModelChange)="section.sourceId=null;saved.set(false)"><option value="CATEGORY">Categoría</option><option value="COLLECTION">Colección</option>@if(section.presentation!=='VISUAL'){<option value="BEST_SELLERS">Más vendidos</option>}</select></label>
@if(section.kind==='CATEGORY'){<label>Categoría<select [(ngModel)]="section.sourceId" (ngModelChange)="saved.set(false)"><option [ngValue]="null">{{categories().length?'Selecciona una categoría':'Cargando categorías…'}}</option>@for(category of categories();track category.id){<option [ngValue]="category.id">{{category.name}}</option>}</select></label>}
@if(section.kind==='COLLECTION'){<label>Colección<select [(ngModel)]="section.sourceId" (ngModelChange)="saved.set(false)"><option [ngValue]="null">Selecciona una colección</option>@for(collection of collections();track collection.id){<option [ngValue]="collection.id">{{collection.name}}</option>}</select></label>}
@if(section.presentation!=='VISUAL'){<label>Cantidad de productos (máximo 24)<input type="number" min="1" max="24" [(ngModel)]="section.limit" (ngModelChange)="saved.set(false)"></label>}
@if(section.presentation==='CAROUSEL'){<label>Productos visibles en PC<select [(ngModel)]="section.visibleCount" (ngModelChange)="saved.set(false)"><option [ngValue]="3">3 productos</option><option [ngValue]="4">4 productos</option></select></label><label class="check"><input type="checkbox" [(ngModel)]="section.autoRotate" (ngModelChange)="saved.set(false)"> Avanzar automáticamente</label>}
@if(section.presentation==='VISUAL'){<div class="visual-upload"><p>Sube una imagen editada para cada dispositivo. PC: <strong>2160 × 720 px (3:1)</strong>. Móvil: <strong>1024 × 1280 px (4:5)</strong>. El editor permite ajustar el recorte.</p><div class="cover-uploads"><app-home-cover-upload coverRole="DESKTOP" [asset]="mediaFor(section.desktopAssetId)" [disabled]="busy()" (coverSelected)="upload(section,'DESKTOP',$event)"/><app-home-cover-upload coverRole="MOBILE" [asset]="mediaFor(section.mobileAssetId)" [disabled]="busy()" (coverSelected)="upload(section,'MOBILE',$event)"/></div><p>El botón de la tienda abrirá los productos de la categoría o colección seleccionada.</p></div>}
<label class="check"><input type="checkbox" [(ngModel)]="section.enabled" (ngModelChange)="saved.set(false)"> Mostrar sección</label></div></section>}
@if(!saved()&&loaded()){<p class="hint">Hay cambios sin guardar. Al publicar, primero se guardará el borrador.</p>}
<div class="actions"><button type="button" (click)="save()" [disabled]="busy()||!loaded()">Guardar borrador</button><button type="button" (click)="publish()" [disabled]="busy()||!loaded()">{{saved()?'Publicar secciones':'Guardar y publicar secciones'}}</button></div>
</main>`,styles:[`.editor{max-width:1100px;margin:auto;padding:28px}.eyebrow{letter-spacing:.16em;color:#996a2c}.editor h1{font:2.5rem Georgia,serif;color:#14243e}.editor section{background:white;border:1px solid #d7e0ea;border-radius:12px;padding:22px;margin:18px 0}.heading,.toolbar,.actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.heading h2{font:1.5rem Georgia,serif;margin:0}.heading>div{display:flex;gap:7px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.visual-upload{grid-column:1/-1}.visual-upload p{font-weight:400;line-height:1.5}.cover-uploads{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.editor label{display:block;font-weight:600}.editor input:not([type=checkbox]),.editor select{box-sizing:border-box;display:block;width:100%;min-height:48px;padding:10px;margin-top:7px;border:1px solid #b8c5d4;border-radius:6px;font:inherit}.check{display:flex!important;align-items:center;gap:10px}.editor button{min-height:44px;padding:10px 18px;background:#14243e;color:white;border-radius:7px}.editor button.secondary{background:#edf2f8;color:#14243e}.editor button:disabled{opacity:.5}.error{color:#a11}.notice{color:#176d4a}@media(max-width:650px){.fields,.cover-uploads{grid-template-columns:1fr}.editor{padding:16px}}`]})
export class HomeSectionsEditor {
 private readonly http=inject(HttpClient);
 readonly categories=signal<Category[]>([]);readonly collections=signal<Collection[]>([]);
  readonly busy=signal(false);readonly saved=signal(false);readonly loaded=signal(false);readonly error=signal('');readonly notice=signal('');
  readonly uploadedMedia=signal<Record<string,ProductMedia>>({});
 sections:HomeProductSection[]=[];publishedSections:HomeProductSection[]=[];version=0;
 constructor(){void this.load();}
 async load(){void this.loadOptions();try{const data=await firstValueFrom(this.http.get<HomeSectionsAdmin>('/api/v1/home-sections/admin'));this.version=data.version;this.sections=data.draft.map(section=>({...section,presentation:section.presentation??'GRID',visibleCount:section.visibleCount??4,autoRotate:section.autoRotate??true}));this.publishedSections=data.published;this.uploadedMedia.set(data.media??{});this.saved.set(true);this.loaded.set(true);}catch(e){this.error.set((e as {status?:number}).status===404?'El backend de secciones aún no está disponible. Despliega el backend con la migración V28.':'No se pudieron cargar las secciones.');}}
 publishedState(section:HomeProductSection){const current=this.publishedSections.find(item=>item.id===section.id);return current?'Publicado actualmente como '+({GRID:'cuadrícula',CAROUSEL:'carrusel',VISUAL:'portada visual'}[current.presentation??'GRID']):'Esta sección aún no está publicada';}
 async loadOptions(){
  const [categories,collections]=await Promise.allSettled([
   firstValueFrom(this.http.get<Category[]>('/api/v1/admin/categories')),
   firstValueFrom(this.http.get<Collection[]>('/api/v1/admin/collections'))
  ]);
  if(categories.status==='fulfilled')this.categories.set(categories.value);
  else this.error.set('No se pudieron cargar las categorías. Revisa la conexión con el backend.');
  if(collections.status==='fulfilled')this.collections.set(collections.value);
  else if(categories.status==='fulfilled')this.error.set('No se pudieron cargar las colecciones. Revisa la conexión con el backend.');
 }
 add(){if(this.sections.length>=8)return;this.sections.push({id:crypto.randomUUID(),title:'',kind:'CATEGORY',sourceId:null,limit:6,enabled:true,presentation:'GRID',visibleCount:4,autoRotate:true,desktopAssetId:null,mobileAssetId:null});this.saved.set(false);}
 presentationChanged(section:HomeProductSection){if(section.presentation==='VISUAL'){section.limit=Math.min(section.limit,3);if(section.kind==='BEST_SELLERS'){section.kind='CATEGORY';section.sourceId=null;}}this.saved.set(false);}
 remove(index:number){this.sections.splice(index,1);this.saved.set(false);}
 move(index:number,direction:number){const next=index+direction;if(next<0||next>=this.sections.length)return;[this.sections[index],this.sections[next]]=[this.sections[next],this.sections[index]];this.saved.set(false);}
 mediaFor(id?:string|null){return id?this.uploadedMedia()[id]??null:null;}
 async upload(section:HomeProductSection,role:HomeCoverRole,selection:HomeCoverSelection){
  if(this.busy())return;
  this.busy.set(true);this.error.set('');this.notice.set('');
  try{
   const variants=await prepareHomeCover(role,selection);
   const session=await firstValueFrom(this.http.post<UploadSession>('/api/v1/admin/storefront/home/media/uploads',{filename:selection.file.name,altText:section.title||'Portada de categoría o colección',role}));
   for(const target of session.uploads){const image=variants.find(item=>item.variant===target.variant);if(!image)throw new Error('Falta un tamaño de la imagen.');
    const response=await fetch(target.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/webp'},body:image.blob});
    if(!response.ok)throw new Error('No se pudo subir la imagen. Vuelve a intentarlo.');}
   const media=await firstValueFrom(this.http.post<ProductMedia>('/api/v1/admin/storefront/home/media/'+session.assetId+'/complete',{
    objects:variants.map(({variant,width,height,blob})=>({variant,width,height,byteSize:blob.size}))
   }));
   if(role==='DESKTOP')section.desktopAssetId=media.id;else section.mobileAssetId=media.id;
   this.uploadedMedia.update(current=>({...current,[media.id]:media}));
   this.saved.set(false);this.notice.set('Imagen cargada. Guarda y publica la sección cuando tengas ambas imágenes.');
  }catch(e){this.error.set(e instanceof Error?e.message:'No se pudo cargar la imagen.');}
  finally{this.busy.set(false);}
 }
 async save(){if(this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<HomeSectionsAdmin>('/api/v1/home-sections/admin/draft',{version:this.version,sections:this.sections}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. La tienda aún no cambia.');}catch(e){const status=(e as {status?:number}).status;this.error.set(status===401?'La sesión no autorizó guardar el borrador. Vuelve a iniciar sesión.':status===409?'Otro administrador cambió las secciones. Tus cambios siguen aquí.':'Revisa el título, el criterio y la cantidad de cada sección.');}finally{this.busy.set(false);}}
 async publish(){if(this.busy()||!this.loaded())return;this.busy.set(true);this.error.set('');try{
  if(!this.saved()){
   const saved=await firstValueFrom(this.http.put<HomeSectionsAdmin>('/api/v1/home-sections/admin/draft',{version:this.version,sections:this.sections}));
   this.version=saved.version;this.saved.set(true);
  }
  const data=await firstValueFrom(this.http.post<HomeSectionsAdmin>('/api/v1/home-sections/admin/publish',{version:this.version}));
  this.version=data.version;this.publishedSections=data.published;this.notice.set('Secciones publicadas. Recarga la tienda para ver el carrusel actualizado.');
 }catch(e){const status=(e as {status?:number}).status;this.error.set(status===401?'La sesión no autorizó publicar. Vuelve a iniciar sesión.':status===409?'Otro administrador cambió las secciones. Tus cambios siguen aquí.':(e as {error?:{message?:string}}).error?.message||'No se pudieron publicar las secciones.');}finally{this.busy.set(false);}}
}
