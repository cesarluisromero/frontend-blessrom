import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Category, Collection, HomeAdmin, HomeContent, HomeCoverPurge, HomeCoverRemoval, HomeCoverRole, HomeLink, HomeSlideContent, HomeSlidePayload, MediaVariant, ProductMedia, AiStudioJob, AiStudioResult, AiStudioStatus, errorMessage } from '../../../../shared/commerce';
import { DEFAULT_HOME, HomeHero, HomeSlide } from '../../../../shared/home-hero';
import { isFixedHomeCover } from '../../../../shared/home-cover';
import { HomeCoverSelection, HomeCoverUpload, prepareHomeCover } from './home-cover-upload';

type UploadSession={assetId:string;uploads:{variant:MediaVariant;uploadUrl:string}[]};
const HOME_API = '/api/v1/admin/storefront/home';
const PURGE_STORAGE_KEY = 'blessrom-home-cover-purge';

@Component({selector:'app-storefront-home',imports:[FormsModule,NgTemplateOutlet,HomeHero,HomeCoverUpload],template:`
<section class="editor"><header><div><p class="eyebrow">Productos / Portada</p><h1>Slider de la portada</h1><p>Administra aquí todas las imágenes que aparecen en el slider de blessrom.com.</p></div><span class="state">{{data()?.draft?'Borrador sin publicar':data()?.published?'Publicada':'Sin publicar'}}</span></header>
@if(error()){<div class="message error" role="alert">{{error()}} @if(conflict()){<button type="button" (click)="reload()">Consultar versión del servidor</button>}</div>}
@if(notice()){<div class="message" role="status">{{notice()}}</div>}
@if(data()){
<form #homeForm="ngForm" (ngSubmit)="save(homeForm)" class="layout cover-workspace">
<div class="fields cover-list">
 <div class="section-title"><div><h2>Diapositivas</h2><p>Hasta 6 imágenes. El orden de esta lista será el orden de la tienda.</p></div><button type="button" class="subtle" (click)="view.set('draft');addSlide()" [disabled]="slides.length>=6">Crear portada manual</button><button type="button" (click)="view.set('ai')">Crear portada con IA</button></div>
 <div class="slide-list" role="list" aria-label="Diapositivas de portada">
  @for(item of slides;track $index){<div class="slide-row" [class.selected]="view()==='draft'&&$index===selectedIndex()" [class.off]="!item.enabled">
   <button type="button" class="slide-select" (click)="selectDraft($index)"><span>{{$index+1}}</span><b>{{item.title||'Sin título'}}</b><small>{{slideReady(item)?'Lista para publicar':'Imágenes pendientes'}}{{item.enabled?'':' · Oculta'}}</small></button>
   <div class="row-actions"><button type="button" class="icon" (click)="move($index,-1)" [disabled]="$index===0" aria-label="Mover arriba">↑</button><button type="button" class="icon" (click)="move($index,1)" [disabled]="$index===slides.length-1" aria-label="Mover abajo">↓</button></div>
  </div>}
 </div>
 @if(data()?.publishedSlides?.length){<details class="published-covers">
   <summary>Portadas publicadas</summary>
   <p>Eliminar definitivamente retira la portada de la tienda e inicia la limpieza de sus archivos.</p>
   @for(item of data()?.publishedSlides; track $index){
     <div class="published-cover">
       @if(item.heroMedia?.urls?.thumbnail; as thumbnail){<img [src]="thumbnail" alt="" width="96" height="32">}
       <button type="button" class="subtle" [class.selected]="view()==='published'&&publishedIndex()===$index" (click)="publishedIndex.set($index);view.set('published')">{{item.content.title}}{{item.content.enabled===false?' · Oculta':''}}</button>
       <button type="button" class="danger" (click)="removePublished(item,homeForm)" [disabled]="!canRemovePublished(item,homeForm)">Eliminar definitivamente</button>
     </div>
   }
   @if(data()?.draft||homeForm.dirty||changed()){<p class="hint">Publica o resuelve el borrador antes de eliminar una portada publicada.</p>}
   @if(publishedVisibleCount()<=1){<p class="hint">Publica otra portada visible antes de eliminar la última.</p>}
 </details>}
 @if(view()==='ai'){@if(aiJob();as job){<div class="slide-list">@for(item of job.results;track item.id;let i=$index){<button type="button" class="slide-select" [class.selected]="selectedProposal()?.id===item.id" (click)="proposalId.set(item.id)"><span>{{i+1}}</span><b>{{item.content['title']||'Propuesta sin título'}}</b><small>{{item.image_approved&&item.copy_approved?'Aprobada':'Por revisar'}}</small></button>}</div>}}
</div>
<aside class="preview"><div class="preview-bar"><h2>Vista previa privada</h2><div><button type="button" [class.active]="device()==='desktop'" (click)="device.set('desktop')">Escritorio</button><button type="button" [class.active]="device()==='mobile'" (click)="device.set('mobile')">Celular</button></div></div><div class="canvas" [class.mobile]="device()==='mobile'"><app-home-hero [slides]="previewSlides()" [categories]="categories()" [collections]="collections()" [preview]="true" [forceMobile]="device()==='mobile'"/></div>@if(!previewSlides().length){<p>Selecciona una propuesta para verla aquí.</p>}</aside>
<div class="fields cover-fields">
@if(view()==='ai'){ <section class="ai-home"><div class="section-title"><div><p class="eyebrow">Opcional</p><h2>Crear portadas con IA</h2></div><span class="ai-state" [class.ready]="aiStatus()?.configured">{{aiStatus()?.configured?'Disponible':aiStatus()?.enabled?'Worker sin configurar':'Deshabilitado'}}</span></div>
 <p>Genera tres campañas con imagen para PC/celular y textos editables. Ningún resultado se publica automáticamente.</p>
 @if(aiStatus()?.enabled){<div class="ai-source-mode"><label><input type="radio" name="aiSelection" value="SMART" [(ngModel)]="aiSelectionMode" [ngModelOptions]="{standalone:true}"> Selección inteligente</label><label><input type="radio" name="aiSelection" value="MANUAL" [(ngModel)]="aiSelectionMode" [ngModelOptions]="{standalone:true}"> Elegir prendas</label></div>
 @if(aiSelectionMode==='MANUAL'){<div class="eligible-grid">@for(item of eligibleMedia();track item.assetId){<label><input type="checkbox" [checked]="aiSourceIds.includes(item.assetId)" (change)="toggleAiSource(item.assetId,$any($event.target).checked)"><img [src]="item.media.urls.thumbnail" [alt]="item.altText"><span>{{item.altText}}</span></label>}@if(!eligibleMedia().length){<p>Primero aprueba un recorte desde Productos → Imágenes.</p>}</div>}
 <label>Indicaciones opcionales<textarea name="aiBrief" [(ngModel)]="aiBrief" [ngModelOptions]="{standalone:true}" rows="3" maxlength="1000" placeholder="Ej.: campaña de verano, tono natural y elegante"></textarea></label><button type="button" (click)="generateAiCovers()" [disabled]="aiGenerating()||(aiSelectionMode==='MANUAL'&&!aiSourceIds.length)">Generar tres propuestas</button>}@else{<p class="hint">Activa <code>AI_STUDIO_ENABLED</code> y despliega el worker para utilizar esta opción.</p>}
 @if(aiGenerating()){<p role="status" class="progress">{{aiProgress()}}</p>}
 @if(aiJob();as job){<div class="ai-cover-job"><div class="job-line"><b>Trabajo {{job.status}}</b><span>Correcciones {{job.attempts}} / 3</span></div>@if(job.error_message){<div class="message error">{{job.error_message}}</div>}

 @if(selectedProposal();as result){<article class="proposal">
   <label>Frase superior<input [ngModel]="result.content['eyebrow']" (ngModelChange)="result.content['eyebrow']=$event" [ngModelOptions]="{standalone:true}" maxlength="100"></label><label>Título<input [ngModel]="result.content['title']" (ngModelChange)="result.content['title']=$event" [ngModelOptions]="{standalone:true}" maxlength="180"></label><label>Descripción<textarea [ngModel]="result.content['description']" (ngModelChange)="result.content['description']=$event" [ngModelOptions]="{standalone:true}" rows="3" maxlength="1000"></textarea></label><label>Botón hacia catálogo<input [ngModel]="result.content['buttonLabel']" (ngModelChange)="result.content['buttonLabel']=$event" [ngModelOptions]="{standalone:true}" maxlength="80"></label><button type="button" class="subtle" (click)="saveAiCopy(result)">Guardar texto editado</button>
   <div class="approval-summary"><span [class.ok]="result.image_approved">Imagen {{result.image_approved?'aprobada':'pendiente'}}</span><span [class.ok]="result.copy_approved">Texto {{result.copy_approved?'aprobado':'pendiente'}}</span></div>
   <label>Descripción de mejora<textarea [ngModel]="aiFeedback[result.id]??''" (ngModelChange)="aiFeedback[result.id]=$event" [ngModelOptions]="{standalone:true}" rows="2" maxlength="1000"></textarea></label><div class="approval-buttons"><button type="button" (click)="reviewCover(result,true,'IMAGE')" [disabled]="result.image_approved">Aprobar imagen</button><button type="button" class="reject" (click)="reviewCover(result,false,'IMAGE')" [disabled]="result.revision>=3">Rechazar imagen</button><button type="button" (click)="reviewCover(result,true,'COPY')" [disabled]="result.copy_approved">Aprobar texto</button><button type="button" class="reject" (click)="reviewCover(result,false,'COPY')" [disabled]="result.revision>=3">Rechazar texto</button></div>
   @if(result.image_approved&&result.copy_approved){<label class="choose"><input type="checkbox" [checked]="selectedAiResults().includes(result.id)" (change)="toggleAiResult(result.id,$any($event.target).checked)"> Añadir esta propuesta al borrador</label>}
  </article>}@if(selectedAiResults().length){<button type="button" (click)="applyAiCovers(homeForm)" [disabled]="busy()||homeForm.dirty||changed()||conflict()||slides.length+selectedAiResults().length>6">Agregar {{selectedAiResults().length}} al borrador</button>@if(slides.length+selectedAiResults().length>6){<p class="hint">El slider admite hasta seis diapositivas.</p>}@if(homeForm.dirty||changed()){<p class="hint">Guarda los cambios de las diapositivas antes de agregar las propuestas.</p>}}
 </div>}</section>
}
 <fieldset class="slide-editor" [disabled]="busy()" (input)="markChanged()" (change)="markChanged()">
 @if(view()==='draft'){@if(selectedSlide();as slide){
  <div class="selected-heading"><h2>Diapositiva {{selectedIndex()+1}}</h2><label class="toggle"><input type="checkbox" name="enabled" [(ngModel)]="slide.enabled"> Visible al publicar</label></div>
  <label>Frase superior<input name="eyebrow" [(ngModel)]="slide.eyebrow" maxlength="100"></label>
  <label>Título principal<input name="title" [(ngModel)]="slide.title" maxlength="180" required></label>
  <label>Descripción<textarea name="description" [(ngModel)]="slide.description" maxlength="1000" rows="4"></textarea></label>
  <h2>Imágenes de portada</h2><p>Sube una imagen por dispositivo. Puedes ajustar el recorte antes de guardar cada archivo.</p>
  @for(current of [slide]; track current){
    <div class="cover-uploads">
      <app-home-cover-upload coverRole="DESKTOP" [asset]="mediaFor(current.heroAssetId)" [disabled]="busy()" (coverSelected)="upload(current,'DESKTOP',$event)" />
      <app-home-cover-upload coverRole="MOBILE" [asset]="mediaFor(current.mobileAssetId??null)" [disabled]="busy()" (coverSelected)="upload(current,'MOBILE',$event)" />
    </div>
  }
  <label>Texto alternativo<input name="heroAlt" [(ngModel)]="slide.heroAlt" maxlength="300" [required]="!!slide.heroAssetId||!!slide.mobileAssetId"></label>
  <h2>Acciones de la diapositiva</h2>
  <div class="action"><label>Botón principal<input name="primaryLabel" [(ngModel)]="slide.primary.label" required maxlength="80"></label><label>Destino<select name="primaryType" [(ngModel)]="slide.primary.target.type" (ngModelChange)="slide.primary.target.id=undefined"><option value="catalog">Catálogo</option><option value="collections">Colecciones</option><option value="category">Categoría</option><option value="collection">Colección</option></select></label><ng-container *ngTemplateOutlet="target;context:{link:slide.primary,key:'primary'}"></ng-container></div>
  @if(slide.secondary;as secondary){<div class="action"><label>Botón secundario<input name="secondaryLabel" [(ngModel)]="secondary.label" required maxlength="80"></label><label>Destino<select name="secondaryType" [(ngModel)]="secondary.target.type" (ngModelChange)="secondary.target.id=undefined"><option value="catalog">Catálogo</option><option value="collections">Colecciones</option><option value="category">Categoría</option><option value="collection">Colección</option></select></label><ng-container *ngTemplateOutlet="target;context:{link:secondary,key:'secondary'}"></ng-container><button type="button" class="subtle" (click)="slide.secondary=null;markChanged()">Quitar botón</button></div>}@else{<button type="button" class="subtle" (click)="slide.secondary=newLink();markChanged()">Agregar botón secundario</button>}
  <div class="slide-tools"><button type="button" class="subtle" (click)="duplicateSlide()" [disabled]="slides.length>=6">Duplicar diapositiva</button><button type="button" class="danger" (click)="deleteSlide()" [disabled]="!canRemoveDraftSlide(slide)">Quitar del borrador</button></div>
  @if(!canRemoveDraftSlide(slide)){<p class="hint">Conserva al menos una diapositiva visible. Puedes sustituir sus imágenes.</p>}
 }
 }
 </fieldset>
 <div class="actions"><button type="submit" [disabled]="busy()">Guardar borrador</button><button type="button" [disabled]="busy()||!data()?.draft||homeForm.dirty||changed()||conflict()||!canPublish()" (click)="publish(homeForm)">Publicar slider</button></div>
 @if(!canPublish()){<p class="hint">Para publicar, cada diapositiva visible debe tener sus dos imágenes en las medidas indicadas.</p>}
 <p class="hint">Guardar no cambia la tienda. Solo “Publicar slider” reemplaza el contenido visible en blessrom.com.</p>
 @if(purge();as removal){
   <p class="purge-state" [class.purge-failed]="removal.status==='FAILED'" role="status">
     {{purgeLabel(removal)}} @if(removal.errorMessage){<span>{{removal.errorMessage}}</span>}
   </p>
 }
 @if(purgePollingError()){<p class="message error" role="alert">No se pudo consultar la eliminación. <button type="button" (click)="resumePurge()">Volver a consultar</button></p>}

</div>
</form>
}
<ng-template #target let-link="link" let-key="key">@if(link.target.type==='category'){<label>Categoría<select [name]="key+'Id'" [(ngModel)]="link.target.id" required><option [ngValue]="undefined">Selecciona</option>@for(c of categories();track c.id){@if(c.active){<option [value]="c.id">{{c.name}}</option>}}</select></label>}@if(link.target.type==='collection'){<label>Colección<select [name]="key+'Id'" [(ngModel)]="link.target.id" required><option [ngValue]="undefined">Selecciona</option>@for(c of collections();track c.id){@if(c.active){<option [value]="c.id">{{c.name}}</option>}}</select></label>}</ng-template>
</section>`,styleUrls:['./storefront-home.scss']})
export class StorefrontHomeEditor {
 private http=inject(HttpClient);readonly data=signal<HomeAdmin|null>(null);readonly categories=signal<Category[]>([]);readonly collections=signal<Collection[]>([]);readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');readonly conflict=signal(false);readonly device=signal<'desktop'|'mobile'>('desktop');readonly selectedIndex=signal(0);readonly changed=signal(false);readonly aiStatus=signal<AiStudioStatus|null>(null);readonly aiJobs=signal<AiStudioJob[]>([]);readonly eligibleMedia=signal<{assetId:string;altText:string;media:ProductMedia}[]>([]);readonly aiGenerating=signal(false);readonly aiProgress=signal('');readonly selectedAiResults=signal<string[]>([]);aiSelectionMode:'SMART'|'MANUAL'='SMART';aiSourceIds:string[]=[];aiBrief='';aiFeedback:Record<string,string>={};private pollingJob='';
 readonly view=signal<'draft'|'ai'|'published'>('draft');
 readonly proposalId=signal<string|null>(null);
 readonly publishedIndex=signal(0);
 selectDraft(index:number){this.selectedIndex.set(index);this.view.set('draft');}
 selectedProposal():AiStudioResult|undefined{
   const results=this.aiJob()?.results??[];
   return results.find(result=>result.id===this.proposalId())??results[0];
 }
 content:HomeContent=structuredClone(DEFAULT_HOME);slides:HomeSlideContent[]=[];private uploadedMedia=new Map<string,ProductMedia>();
 private readonly destroy = inject(DestroyRef);
 readonly purge = signal<HomeCoverPurge | null>(null);
 readonly purgePollingError = signal(false);
 private purgeId: string | null = null;
 private purgeTimer?: ReturnType<typeof setTimeout>;
 private removalRequest?: { assetId: string; version: number; key: string };

 constructor() {
  this.destroy.onDestroy(() => {
   this.pollingJob = '';
   if (this.purgeTimer !== undefined) clearTimeout(this.purgeTimer);
  });
  void this.load();
  try { this.purgeId = sessionStorage.getItem(PURGE_STORAGE_KEY); } catch { /* Storage can be unavailable. */ }
  if (this.purgeId) this.resumePurge();
 }
 newLink():HomeLink{return {label:'',target:{type:'catalog'}};}
 newSlide():HomeSlideContent{return {...structuredClone(DEFAULT_HOME),enabled:true};}
 selectedSlide(){return this.slides[this.selectedIndex()]??this.slides[0];}
 markChanged(){this.changed.set(true);}
 private legacySlide(content:HomeContent):HomeSlideContent{return {eyebrow:content.eyebrow,title:content.title,description:content.description,heroAssetId:content.heroAssetId,mobileAssetId:content.mobileAssetId??null,heroAlt:content.heroAlt,frameX:content.frameX,frameY:content.frameY,primary:structuredClone(content.primary),secondary:structuredClone(content.secondary),enabled:true};}
 private slidePayloads(){const first=this.slides[0]??this.newSlide();this.content={...this.content,...first,shortcuts:this.content.shortcuts??[],slides:this.slides};return this.content;}
 private serverPayloads():HomeSlidePayload[]{return [...(this.data()?.draftSlides??[]),...(this.data()?.publishedSlides??[])];}
 mediaFor(assetId:string|null){if(!assetId)return null;const payload=this.serverPayloads().find(item=>item.content.heroAssetId===assetId||item.content.mobileAssetId===assetId);return this.uploadedMedia.get(assetId)??(payload?.content.mobileAssetId===assetId?payload.mobileMedia:payload?.heroMedia)??null;}
 previewSlides():HomeSlide[]{
  if(this.view()==='published'){
   const slide=this.data()?.publishedSlides?.[this.publishedIndex()];
   return slide?[{content:slide.content,media:slide.heroMedia??null,mobileMedia:slide.mobileMedia,label:slide.content.title}]:[];
  }
  if(this.view()==='ai'){
   const result=this.selectedProposal();
   if(!result)return [];
   const content={...this.newSlide(),eyebrow:result.content['eyebrow']??'',title:result.content['title']??'',description:result.content['description']??'',primary:{label:result.content['buttonLabel']??'Ver catálogo',target:{type:'catalog' as const}}};
   return [{content,media:result.desktopMedia??null,mobileMedia:result.mobileMedia,label:content.title}];
  }
  const slide=this.selectedSlide();
  return slide?[{content:slide,media:this.mediaFor(slide.heroAssetId),mobileMedia:this.mediaFor(slide.mobileAssetId??null),label:slide.title}]:[];
 }
 aiJob(){return this.aiJobs()[0]??null;}
 toggleAiSource(id:string,selected:boolean){const values=new Set(this.aiSourceIds);selected?values.add(id):values.delete(id);this.aiSourceIds=[...values];}
 toggleAiResult(id:string,selected:boolean){this.selectedAiResults.update(values=>selected?[...new Set([...values,id])]:values.filter(value=>value!==id));}
 async generateAiCovers(){const current=this.data();if(!current||this.aiGenerating())return;this.aiGenerating.set(true);this.aiProgress.set('Preparando tres campañas…');this.error.set('');try{const job=await firstValueFrom(this.http.post<AiStudioJob>('/api/v1/admin/storefront/home/ai-proposals',{selectionMode:this.aiSelectionMode,assetIds:this.aiSelectionMode==='MANUAL'?this.aiSourceIds:[],categoryId:null,collectionId:null,brief:this.aiBrief,version:current.version},{headers:{'Idempotency-Key':crypto.randomUUID()}}));this.aiJobs.update(rows=>[job,...rows.filter(row=>row.id!==job.id)]);this.selectedAiResults.set([]);this.watchAiJob(job.id);}catch(e){this.error.set(errorMessage(e));this.aiGenerating.set(false);this.aiProgress.set('');}}
 private watchAiJob(id:string){this.pollingJob=id;const poll=async()=>{if(this.pollingJob!==id)return;try{const job=await firstValueFrom(this.http.get<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+id));this.aiJobs.update(rows=>[job,...rows.filter(row=>row.id!==id)]);if(['QUEUED','RUNNING'].includes(job.status)){this.aiProgress.set(job.status==='QUEUED'?'En cola…':'Generando imágenes y textos…');setTimeout(poll,5000);}else{this.aiGenerating.set(false);this.aiProgress.set('');this.pollingJob='';}}catch{setTimeout(poll,7000);}};setTimeout(poll,1200);}
 async reviewCover(result:AiStudioResult,approve:boolean,scope:'IMAGE'|'COPY'){const job=this.aiJob();if(!job)return;try{let updated:AiStudioJob;if(approve)updated=await firstValueFrom(this.http.post<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+job.id+'/results/'+result.id+'/approve',{scope}));else{const feedback=(this.aiFeedback[result.id]??'').trim();if(!feedback){this.error.set('Describe la mejora antes de rechazar.');return;}updated=await firstValueFrom(this.http.post<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+job.id+'/results/'+result.id+'/reject',{scope,feedback}));this.aiFeedback[result.id]='';this.aiGenerating.set(true);this.watchAiJob(job.id);}this.aiJobs.update(rows=>[updated,...rows.filter(row=>row.id!==updated.id)]);}catch(e){this.error.set(errorMessage(e));}}
 async saveAiCopy(result:AiStudioResult){const job=this.aiJob();if(!job)return;try{const updated=await firstValueFrom(this.http.put<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+job.id+'/results/'+result.id+'/copy',{eyebrow:result.content['eyebrow']??'',title:result.content['title']??'',description:result.content['description']??'',buttonLabel:result.content['buttonLabel']??'Ver catálogo'}));this.aiJobs.update(rows=>[updated,...rows.filter(row=>row.id!==updated.id)]);this.notice.set('Texto guardado. Vuelve a aprobarlo para añadir la propuesta.');}catch(e){this.error.set(errorMessage(e));}}
 async applyAiCovers(form: NgForm) {
  const current = this.data();
  const job = this.aiJob();
  if (!current || !job || !this.selectedAiResults().length || this.slides.length+this.selectedAiResults().length>6 || form.dirty || this.changed() || this.conflict() || this.busy()) return;
  this.busy.set(true);
  this.error.set('');
  try {
   const saved = await firstValueFrom(this.http.post<HomeAdmin>('/api/v1/admin/ai-studio/jobs/'+job.id+'/apply', {
    resultIds: this.selectedAiResults(),
    homeVersion: current.version,
   }));
   const added=this.slides.length;
   this.setHome(saved);
   this.selectDraft(Math.max(0,Math.min(added,this.slides.length-1)));
   this.selectedAiResults.set([]);
   this.notice.set('Propuestas añadidas al borrador. Revisa y publica el slider cuando estén listas.');
  } catch (error) {
   this.conflict.set((error as { status?: number }).status === 409);
   this.error.set(errorMessage(error));
  } finally {
   this.busy.set(false);
  }
 }
 addSlide(){if(this.slides.length>=6)return;this.slides.push(this.newSlide());this.selectedIndex.set(this.slides.length-1);this.markChanged();}
 duplicateSlide(){const slide=this.selectedSlide();if(!slide||this.slides.length>=6)return;this.slides.splice(this.selectedIndex()+1,0,structuredClone(slide));this.selectedIndex.update(i=>i+1);this.markChanged();}
 canRemoveDraftSlide(slide: HomeSlideContent) {
  return !this.busy() && this.slides.length > 1 &&
   (slide.enabled === false || this.slides.some(other => other !== slide && other.enabled !== false));
 }

 deleteSlide() {
  const slide = this.selectedSlide();
  if (!slide || !this.canRemoveDraftSlide(slide)) return;
  this.slides.splice(this.selectedIndex(), 1);
  this.selectedIndex.set(Math.min(this.selectedIndex(), this.slides.length - 1));
  this.markChanged();
 }
 move(index:number,direction:number){const target=index+direction;if(target<0||target>=this.slides.length)return;[this.slides[index],this.slides[target]]=[this.slides[target],this.slides[index]];this.selectDraft(target);this.markChanged();}
 async load(){this.busy.set(true);try{const [home,categories,collections,status]=await Promise.all([firstValueFrom(this.http.get<HomeAdmin>('/api/v1/admin/storefront/home')),firstValueFrom(this.http.get<Category[]>('/api/v1/admin/categories')),firstValueFrom(this.http.get<Collection[]>('/api/v1/admin/collections')),firstValueFrom(this.http.get<AiStudioStatus>('/api/v1/admin/ai-studio/status'))]);this.data.set(home);this.publishedIndex.set(0);this.view.set(!home.draft&&home.publishedSlides?.length?'published':'draft');this.categories.set(categories);this.collections.set(collections);this.aiStatus.set(status);this.content=structuredClone(home.draft??home.published??DEFAULT_HOME);this.slides=structuredClone(this.content.slides?.length?this.content.slides:[this.legacySlide(this.content)]);this.selectedIndex.set(0);this.uploadedMedia.clear();this.changed.set(false);if(status.enabled){const [eligible,jobs]=await Promise.all([firstValueFrom(this.http.get<{assetId:string;altText:string;media:ProductMedia}[]>('/api/v1/admin/ai-studio/eligible-media')),firstValueFrom(this.http.get<AiStudioJob[]>('/api/v1/admin/ai-studio/home/jobs'))]);this.eligibleMedia.set(eligible);this.aiJobs.set(jobs);}}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async reload(){const local=structuredClone(this.slides);await this.load();this.slides=local;this.conflict.set(false);this.changed.set(true);this.notice.set('Versión del servidor consultada. Tus cambios locales siguen aquí para conciliarlos.');}
 private invalidSlide(){
  const validLink=(link:HomeLink)=>!!link.label.trim()&&
   (link.target.type==='category'?this.categories().some(c=>c.active&&c.id===link.target.id):
    link.target.type==='collection'?this.collections().some(c=>c.active&&c.id===link.target.id):true);
  return this.slides.findIndex(slide=>!slide.title.trim()||
   ((slide.heroAssetId||slide.mobileAssetId)&&!slide.heroAlt.trim())||
   !validLink(slide.primary)||(slide.secondary&&!validLink(slide.secondary)));
 }
 async save(form:NgForm){const current=this.data();if(!current||this.busy())return;const invalid=this.invalidSlide();if(invalid>=0){this.selectDraft(invalid);this.error.set('Revisa el título, el texto alternativo y los enlaces de la diapositiva '+(invalid+1)+'.');return;}this.busy.set(true);this.error.set('');try{const saved=await firstValueFrom(this.http.put<HomeAdmin>('/api/v1/admin/storefront/home/draft',{version:current.version,content:this.slidePayloads()}));this.data.set(saved);this.conflict.set(false);this.changed.set(false);form.form.markAsPristine();this.notice.set('Borrador del slider guardado. La tienda todavía muestra la versión publicada.');}catch(e){this.conflict.set((e as {status?:number}).status===409);this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async publish(form: NgForm) {
  const current = this.data();
  if (!current?.draft || this.busy() || form.dirty || this.changed() || this.conflict() || !this.canPublish()) return;
  this.busy.set(true);
  this.error.set('');
  try {
   this.data.set(await firstValueFrom(this.http.post<HomeAdmin>(HOME_API + '/publish', { version: current.version })));
   this.notice.set('Slider publicado en la tienda.');
  } catch (error) {
   this.conflict.set((error as { status?: number }).status === 409);
   this.error.set(errorMessage(error));
  } finally {
   this.busy.set(false);
  }
 }

 private setHome(home: HomeAdmin) {
  this.view.set('draft');
  this.publishedIndex.set(0);
  this.data.set(home);
  this.content = structuredClone(home.draft ?? home.published ?? DEFAULT_HOME);
  this.slides = structuredClone(this.content.slides?.length ? this.content.slides : [this.legacySlide(this.content)]);
  this.selectedIndex.set(0);
  this.uploadedMedia.clear();
  this.changed.set(false);
  this.conflict.set(false);
 }

 slideReady(slide: HomeSlideContent) {
  return isFixedHomeCover(this.mediaFor(slide.heroAssetId), 'DESKTOP') &&
   isFixedHomeCover(this.mediaFor(slide.mobileAssetId ?? null), 'MOBILE');
 }

 canPublish() {
  const visible = this.slides.filter(slide => slide.enabled !== false);
  return visible.length > 0 && visible.every(slide => this.slideReady(slide));
 }

 publishedVisibleCount() {
  return this.data()?.publishedSlides?.filter(item => item.content.enabled !== false && item.content.heroAssetId).length ?? 0;
 }

 canRemovePublished(item: HomeSlidePayload, form: NgForm) {
  return !!item.content.heroAssetId && !this.busy() && !form.dirty && !this.changed() &&
   !this.data()?.draft && !this.conflict() && !this.purgeId &&
   (item.content.enabled === false || this.publishedVisibleCount() > 1);
 }

 async removePublished(item: HomeSlidePayload, form: NgForm) {
  const current = this.data();
  const assetId = item.content.heroAssetId;
  if (!current || !assetId || !this.canRemovePublished(item, form)) return;
  if (!window.confirm(`¿Eliminar definitivamente «${item.content.title}»? Se retirará de la tienda y se iniciará la limpieza de sus archivos.`)) return;
  const previous = this.removalRequest;
  const key = previous?.assetId === assetId && previous.version === current.version ? previous.key : crypto.randomUUID();
  this.removalRequest = { assetId, version: current.version, key };
  this.busy.set(true);
  this.error.set('');
  this.notice.set('');
  try {
   const removed = await firstValueFrom(this.http.delete<HomeCoverRemoval>(HOME_API + '/slides/' + assetId, {
    params: { version: current.version },
    headers: { 'Idempotency-Key': key },
   }));
   this.removalRequest = undefined;
   this.setHome(removed.home);
   form.form.markAsPristine();
   this.purge.set(removed.purge);
   if (this.isPurgePending(removed.purge)) {
    this.purgeId = removed.purge.id;
    try { sessionStorage.setItem(PURGE_STORAGE_KEY, removed.purge.id); } catch { /* Polling can continue in this tab. */ }
    this.resumePurge();
   }
  } catch (error) {
   this.error.set(errorMessage(error));
  } finally {
   this.busy.set(false);
  }
 }

 private isPurgePending(purge: HomeCoverPurge) {
  return purge.status === 'QUEUED' || purge.status === 'RUNNING';
 }

 purgeLabel(purge: HomeCoverPurge) {
  switch (purge.status) {
   case 'QUEUED': return 'Portada retirada. La limpieza de archivos está en cola.';
   case 'RUNNING': return 'Portada retirada. Se están eliminando sus archivos.';
   case 'SUCCEEDED': return 'Portada eliminada definitivamente.';
   case 'FAILED': return 'Portada retirada. La limpieza de archivos no pudo completarse.';
  }
 }

 resumePurge() {
  const id = this.purgeId;
  if (!id || this.destroy.destroyed) return;
  this.purgePollingError.set(false);
  void this.pollPurge(id);
 }

 private async pollPurge(id: string) {
  try {
   const status = await firstValueFrom(this.http.get<HomeCoverPurge>(HOME_API + '/purges/' + id));
   if (this.destroy.destroyed || this.purgeId !== id) return;
   this.purge.set(status);
   if (this.isPurgePending(status)) {
    this.purgeTimer = setTimeout(() => void this.pollPurge(id), 2500);
   } else {
    this.purgeId = null;
    try { sessionStorage.removeItem(PURGE_STORAGE_KEY); } catch { /* The terminal status is shown above. */ }
   }
  } catch {
   if (!this.destroy.destroyed) this.purgePollingError.set(true);
  }
 }

 async upload(slide: HomeSlideContent, role: HomeCoverRole, selection: HomeCoverSelection) {
  if (this.busy() || !this.slides.includes(slide)) return;
  this.busy.set(true);
  this.error.set('');
  this.notice.set('');
  try {
   const variants = await prepareHomeCover(role, selection);
   const session = await firstValueFrom(this.http.post<UploadSession>(HOME_API + '/media/uploads', {
    filename: selection.file.name,
    altText: slide.heroAlt || slide.title || null,
    role,
   }));
   for (const target of session.uploads) {
    const image = variants.find(item => item.variant === target.variant);
    if (!image) throw new Error('Falta un tamaño de la imagen.');
    const response = await fetch(target.uploadUrl, {
     method: 'PUT',
     headers: { 'Content-Type': 'image/webp' },
     body: image.blob,
    });
    if (!response.ok) throw new Error('No se pudo subir la imagen. Vuelve a intentarlo.');
   }
   const media = await firstValueFrom(this.http.post<ProductMedia>(HOME_API + '/media/' + session.assetId + '/complete', {
    objects: variants.map(({ variant, width, height, blob }) => ({ variant, width, height, byteSize: blob.size })),
   }));
   if (role === 'DESKTOP') slide.heroAssetId = media.id;
   else slide.mobileAssetId = media.id;
   if (!slide.heroAlt) slide.heroAlt = slide.title;
   this.uploadedMedia.set(media.id, media);
   this.markChanged();
   this.notice.set('Imagen cargada. Guarda el borrador para asociarla a la diapositiva.');
  } catch (error) {
   this.error.set(error instanceof Error ? error.message : errorMessage(error));
  } finally {
   this.busy.set(false);
  }
 }
}
