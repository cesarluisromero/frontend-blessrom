import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {CatalogNav} from './catalog-nav';
import { Category, Collection, AttributeDefinition, Content, Product, Page, ProductMedia, MediaVariant, AiStudioJob, AiStudioResult, AiStudioStatus, errorMessage, money, safeImage, HomeCoverPurge } from '../../../../shared/commerce';
@Component({selector:'app-products',imports:[FormsModule,RouterLink,CatalogNav],templateUrl:'./products.html',styleUrls:['./products.scss','./products-gallery.scss']})
export class Products {
 private readonly destroy=inject(DestroyRef);readonly safeImage=safeImage;readonly imageErrors=signal<string[]>([]);readonly purges=signal<HomeCoverPurge[]>([]);private purgeTimers=new Map<string,ReturnType<typeof setTimeout>>();
 private readonly http=inject(HttpClient);
 private readonly route=inject(ActivatedRoute,{optional:true});private readonly router=inject(Router,{optional:true});query='';statusFilter='';categoryFilter='';
 private appliedFilters={query:'',status:'',category:''};
 private captureFilters(){this.appliedFilters={query:this.query.trim(),status:this.statusFilter,category:this.categoryFilter};}
 readonly editorTab=signal<'content'|'variants'|'images'|'publication'>('content');
 readonly items=signal<Product[]>([]);readonly categories=signal<Category[]>([]);readonly collections=signal<Collection[]>([]);readonly attributes=signal<AttributeDefinition[]>([]);
 readonly selected=signal<Product|null>(null);readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');
 readonly total=signal(0);page=0;readonly size=12;
 readonly media=signal<MediaAsset[]>([]);readonly uploadProgress=signal('');
 readonly imageMode=signal<'manual'|'ai'>('manual');readonly aiStatus=signal<AiStudioStatus|null>(null);readonly aiJobs=signal<AiStudioJob[]>([]);readonly aiJob=computed(()=>this.aiJobs()[0]??null);readonly aiProgress=signal('');readonly aiFeedback=signal('');readonly aiReferences=signal<Partial<Record<AiReferenceRole,AiReference>>>({});readonly garmentKind=signal<'TOP'|'BOTTOM'|'DRESS'>('TOP');aiOriginalPreview='';private pollingJob='';
 slug='';categoryName='';categorySlug='';categoryParent='';categoryDescription='';collectionName='';collectionSlug='';collectionDescription='';
 optionValues:Record<string,string>={};draft:Content=this.blank();
 readonly money=money; readonly confirmedArchive=signal(false);
 constructor(){this.destroy.onDestroy(()=>{for(const timer of this.purgeTimers.values())clearTimeout(timer);});try{for(const id of JSON.parse(sessionStorage.getItem('blessrom-product-purges')??'[]'))this.watchPurge(id);}catch{}this.query=this.route?.snapshot.queryParamMap.get('q')??'';this.statusFilter=this.route?.snapshot.queryParamMap.get('status')??'';this.categoryFilter=this.route?.snapshot.queryParamMap.get('category')??'';this.captureFilters();void this.load();this.http.get<AiStudioStatus>('/api/v1/admin/ai-studio/status').subscribe({next:value=>this.aiStatus.set(value),error:()=>{}});}
 private blank():Content{return {name:'',description:'',categoryId:'',imageUrl:null,collectionIds:[],variants:[{sku:'',price:0.01,enabled:true,attributes:{talla:'',color:''}}]};}
 private async run(action:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');this.notice.set('');try{await action();}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 private async refreshList(){const {query,status,category}=this.appliedFilters;const params:Record<string,string|number>={page:this.page,size:this.size};if(query)params['q']=query;if(status)params['status']=status;if(this.categories().some(c=>c.id===category)){params['category']=category;params['includeSubcategories']='false';}const data=await firstValueFrom(this.http.get<Page<Product>>('/api/v1/admin/products',{params}));this.items.set(data.items);this.total.set(data.total);}
 async filter(){if(this.busy())return;this.captureFilters();this.page=0;this.router?.navigate([],{relativeTo:this.route??undefined,queryParams:{q:this.query||null,status:this.statusFilter||null,category:this.categoryFilter||null},queryParamsHandling:'merge'});await this.run(()=>this.refreshList());}
 async load(){await this.run(async()=>{const [categories,collections,attributes]=await Promise.all([
  firstValueFrom(this.http.get<Category[]>('/api/v1/admin/categories')),firstValueFrom(this.http.get<Collection[]>('/api/v1/admin/collections')),firstValueFrom(this.http.get<AttributeDefinition[]>('/api/v1/admin/attributes'))]);
  this.categories.set(categories);this.collections.set(collections);this.attributes.set(attributes);await this.refreshList();});}
 name(p:Product){return (p.draft??p.published)?.name??p.slug;}
 state(p:Product){return p.archived?'Archivado':p.draft?(p.published?'Cambios sin publicar':'Borrador'):'Publicado';}
 newProduct(form:NgForm){if(form.dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;this.selected.set(null);this.slug='';this.draft=this.blank();this.editorTab.set('content');this.confirmedArchive.set(false);form.form.markAsPristine();form.form.markAsUntouched();this.error.set('');this.notice.set('');}
 async open(p:Product,form:NgForm){if(form.dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;await this.run(async()=>{const data=await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+p.id));this.setProduct(data);await Promise.all([this.loadMedia(data.id),this.loadAiJobs(data.id)]);form.form.markAsPristine();});}
 private setProduct(p:Product){this.selected.set(p);this.slug=p.slug;this.draft=structuredClone(p.draft??p.published??this.blank());this.draft.collectionIds??=[];this.inferGarmentKind();this.confirmedArchive.set(false);}
 addVariant(form:NgForm){if(this.draft.variants.length>=50)return;this.draft.variants.push({sku:'',attributes:{talla:'',color:''},price:0.01,enabled:true});form.form.markAsDirty();}
 removeVariant(index:number,form:NgForm){this.draft.variants.splice(index,1);form.form.markAsDirty();}
 private payload():Content{return {...this.draft,imageUrl:this.draft.imageUrl?.trim()||null,collectionIds:this.draft.collectionIds??[],
 variants:this.draft.variants.map(v=>({sku:v.sku.trim(),price:Number(v.price),enabled:v.enabled,attributes:Object.fromEntries(Object.entries(v.attributes).filter(([,value])=>value.trim()).map(([key,value])=>[key,value.trim()]))}))};}
 async save(form:NgForm){if(form.invalid||this.busy())return;await this.run(async()=>{const p=this.selected();const draft=this.payload();
 const result=await firstValueFrom(p?this.http.put<Product>('/api/v1/admin/products/'+p.id+'/draft',{version:p.version,draft}):this.http.post<Product>('/api/v1/admin/products',{slug:this.slug,draft}));
 this.setProduct(result);form.form.markAsPristine();await this.refreshList();this.notice.set('Borrador guardado. Publícalo para mostrar los cambios en la tienda.');});}
 async publish(form:NgForm){const p=this.selected();if(!p?.draft||form.dirty||this.busy())return;await this.run(async()=>{this.setProduct(await firstValueFrom(this.http.post<Product>('/api/v1/admin/products/'+p.id+'/publish',{version:p.version})));form.form.markAsPristine();await this.refreshList();this.notice.set('Producto publicado. Ya está disponible en la tienda.');});}
 async archive(form:NgForm){const p=this.selected();if(!p||!this.confirmedArchive()||this.busy())return;await this.run(async()=>{await firstValueFrom(this.http.delete('/api/v1/admin/products/'+p.id,{params:{version:p.version}}));this.setProduct(await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+p.id)));form.form.markAsPristine();await this.refreshList();this.notice.set('Producto archivado; dejó de mostrarse en la tienda.');});}
 async createCategory(form:NgForm){if(form.invalid||this.busy())return;await this.run(async()=>{const c=await firstValueFrom(this.http.post<Category>('/api/v1/admin/categories',{name:this.categoryName,slug:this.categorySlug,parentId:this.categoryParent||null,description:this.categoryDescription,displayOrder:0,active:true}));this.categories.update(rows=>[...rows,c]);this.categoryName='';this.categorySlug='';this.categoryParent='';this.categoryDescription='';form.resetForm();this.notice.set('Categoría creada. Ya puedes seleccionarla en el producto.');});}
 async createCollection(form:NgForm){if(form.invalid||this.busy())return;await this.run(async()=>{const row=await firstValueFrom(this.http.post<Collection>('/api/v1/admin/collections',{name:this.collectionName,slug:this.collectionSlug,description:this.collectionDescription,displayOrder:0,active:true,featured:false,coverImageUrl:null}));this.collections.update(rows=>[...rows,row]);this.collectionName='';this.collectionSlug='';this.collectionDescription='';form.resetForm();this.notice.set('Colección creada.');});}
 async saveCollection(collection:Collection){if(this.busy())return;await this.run(async()=>{const updated=await firstValueFrom(this.http.put<Collection>('/api/v1/admin/collections/'+collection.id,{version:collection.version,collection:{name:collection.name,slug:collection.slug,description:collection.description,startsAt:collection.starts_at,endsAt:collection.ends_at,displayOrder:Number(collection.display_order),active:collection.active,featured:collection.featured,coverImageUrl:collection.cover_image_url?.trim()||null}}));this.collections.update(rows=>rows.map(item=>item.id===updated.id?updated:item));this.notice.set('Configuración de portada actualizada.');});}
 async addOption(attribute:AttributeDefinition){const value=(this.optionValues[attribute.code]??'').trim();if(!value||this.busy())return;await this.run(async()=>{await firstValueFrom(this.http.post('/api/v1/admin/attributes/'+attribute.id+'/options',{value,label:value,displayOrder:attribute.options.length*10+10,active:true}));this.optionValues[attribute.code]='';this.attributes.set(await firstValueFrom(this.http.get<AttributeDefinition[]>('/api/v1/admin/attributes')));this.notice.set('Opción agregada a '+attribute.name+'.');});}
 attributeOptions(code:string){return this.attributes().find(item=>item.code===code)?.options.filter(option=>option.active&&option.selectable!==false)??[];}
 categoryLabel(category:Category){const parent=this.categories().find(item=>item.id===category.parent_id);return parent?parent.name+' / '+category.name:category.name;}
 collectionSelected(id:string){return (this.draft.collectionIds??[]).includes(id);}
 toggleCollection(id:string,selected:boolean,form:NgForm){const values=new Set(this.draft.collectionIds??[]);selected?values.add(id):values.delete(id);this.draft.collectionIds=[...values];form.form.markAsDirty();}
 async changePage(delta:number){if(this.busy())return;this.page+=delta;await this.run(()=>this.refreshList());}
 private async loadMedia(productId:string){this.media.set(await firstValueFrom(this.http.get<MediaAsset[]>('/api/v1/admin/products/'+productId+'/media')));}
 async selectImage(event:Event,form:NgForm){
  const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';
  const product=this.selected();if(!file||!product||this.busy())return;
  if(file.size>20*1024*1024){this.error.set('La imagen original no debe superar 20 MB.');return;}
  try{await this.run(async()=>{
   this.uploadProgress.set('Preparando imagen…');
   const variants=await this.webpVariants(file);
   const session=await firstValueFrom(this.http.post<MediaUploadSession>('/api/v1/admin/products/'+product.id+'/media/uploads',{filename:file.name,altText:this.draft.name||null}));
   for(const target of session.uploads){
    const variant=variants.find(item=>item.variant===target.variant);if(!variant)throw new Error('Falta la variante '+target.variant);
    this.uploadProgress.set('Subiendo '+this.variantLabel(target.variant)+'…');
    const response=await fetch(target.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/webp'},body:variant.blob});
    if(!response.ok)throw new Error('Cloudflare R2 rechazó la carga '+target.variant+' ('+response.status+').');
   }
   const completed=await firstValueFrom(this.http.post<MediaAsset>('/api/v1/admin/products/'+product.id+'/media/'+session.assetId+'/complete',{
    objects:variants.map(item=>({variant:item.variant,width:item.width,height:item.height,byteSize:item.blob.size}))
   }));
   await this.loadMedia(product.id);
   this.notice.set(completed.is_primary?'Imagen optimizada, subida y seleccionada como principal.':'Imagen optimizada y agregada a la galería.');
  });}finally{this.uploadProgress.set('');}
 }
 selectAiReference(event:Event,role:AiReferenceRole){const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file)return;if(file.size>20*1024*1024){this.error.set('Cada fotografía debe pesar como máximo 20 MB.');return;}if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){this.error.set('Estudio IA admite JPG, PNG, WebP o AVIF.');return;}const prior=this.aiReferences()[role];if(prior)URL.revokeObjectURL(prior.preview);const value={file,preview:URL.createObjectURL(file)};this.aiReferences.update(rows=>({...rows,[role]:value}));if(role==='FRONT'){if(this.aiOriginalPreview)URL.revokeObjectURL(this.aiOriginalPreview);this.aiOriginalPreview=value.preview;}this.error.set('');}
 removeAiReference(role:AiReferenceRole){const prior=this.aiReferences()[role];if(prior)URL.revokeObjectURL(prior.preview);this.aiReferences.update(rows=>{const next={...rows};delete next[role];return next;});if(role==='FRONT')this.aiOriginalPreview='';}
 async startAiStudio(){const product=this.selected(),references=this.aiReferences(),front=references.FRONT;if(!product||!front||!this.aiStatus()?.enabled)return;const category=this.categories().find(item=>item.id===this.draft.categoryId);if(/accesorio|calzado|zapato|zapatilla|gorra|sombrero|cintur|bolso|mochila|cartera|reloj/i.test((category?.name??'')+' '+(category?.slug??''))){this.error.set('El maniquí fantasma está disponible para prendas superiores, inferiores y vestidos; no para accesorios o calzado.');return;}this.aiProgress.set('Subiendo fotografías privadas…');this.error.set('');try{const frontUploadId=await this.uploadAiSource(front.file,product.id);const backUploadId=references.BACK?await this.uploadAiSource(references.BACK.file,product.id):null;const interiorUploadId=references.INTERIOR?await this.uploadAiSource(references.INTERIOR.file,product.id):null;this.aiProgress.set('Preparando recorte transparente…');const job=await firstValueFrom(this.http.post<AiStudioJob>('/api/v1/admin/products/'+product.id+'/ai-cutouts',{frontUploadId,backUploadId,interiorUploadId,garmentKind:this.garmentKind(),effect:'GHOST_MANNEQUIN'},{headers:{'Idempotency-Key':crypto.randomUUID()}}));this.aiJobs.update(rows=>[job,...rows.filter(row=>row.id!==job.id)]);this.watchAiJob(job.id);}catch(e){this.error.set(e instanceof Error?e.message:errorMessage(e));this.aiProgress.set('');}}
 private async uploadAiSource(file:File,productId:string){const upload=await firstValueFrom(this.http.post<{id:string;uploadUrl:string;contentType:string}>('/api/v1/admin/ai-studio/uploads',{filename:file.name,contentType:file.type,byteSize:file.size,productId}));const sent=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!sent.ok)throw new Error('No se pudo subir '+file.name+'.');await firstValueFrom(this.http.post('/api/v1/admin/ai-studio/uploads/'+upload.id+'/complete',{}));return upload.id;}
 private async loadAiJobs(productId:string){if(!this.aiStatus()?.enabled){this.aiJobs.set([]);return;}try{this.aiJobs.set(await firstValueFrom(this.http.get<AiStudioJob[]>('/api/v1/admin/ai-studio/products/'+productId+'/jobs')));}catch{this.aiJobs.set([]);}}
 private watchAiJob(id:string){this.pollingJob=id;const poll=async()=>{if(this.pollingJob!==id)return;try{const job=await firstValueFrom(this.http.get<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+id));this.aiJobs.update(rows=>[job,...rows.filter(row=>row.id!==id)]);if(['QUEUED','RUNNING'].includes(job.status)){const stage=job.stage==='GHOST'?'maniquí fantasma':'recorte';this.aiProgress.set(job.status==='QUEUED'?'En cola para '+stage+'…':'Procesando '+stage+'…');setTimeout(poll,4000);}else{this.aiProgress.set('');this.pollingJob='';}}catch{setTimeout(poll,6000);}};setTimeout(poll,1200);}
 async reviewAi(result:AiStudioResult,approve:boolean){const job=this.aiJob();if(!job)return;const scope=job.stage==='GHOST'?'GHOST':'CUTOUT';try{let updated:AiStudioJob;if(approve)updated=await firstValueFrom(this.http.post<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+job.id+'/results/'+result.id+'/approve',{scope}));else{const feedback=this.aiFeedback().trim();if(!feedback){this.error.set('Describe la mejora antes de solicitar otra versión.');return;}updated=await firstValueFrom(this.http.post<AiStudioJob>('/api/v1/admin/ai-studio/jobs/'+job.id+'/results/'+result.id+'/reject',{scope,feedback}));this.aiFeedback.set('');}this.aiJobs.update(rows=>[updated,...rows.filter(row=>row.id!==updated.id)]);if(['QUEUED','RUNNING'].includes(updated.status))this.watchAiJob(job.id);}catch(e){this.error.set(errorMessage(e));}}
 async applyAi(result:AiStudioResult,mode:'GHOST'|'CUTOUT_FALLBACK'='GHOST'){const job=this.aiJob(),product=this.selected();if(!job||!product)return;try{await firstValueFrom(this.http.post('/api/v1/admin/ai-studio/jobs/'+job.id+'/apply',{resultIds:[result.id],homeVersion:null,productImageMode:mode}));this.setProduct(await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+product.id)));this.notice.set((mode==='GHOST'?'Maniquí fantasma':'Recorte transparente')+' añadido al borrador. Publica el producto para mostrarlo en la tienda.');await this.loadAiJobs(product.id);}catch(e){this.error.set(errorMessage(e));}}
 private inferGarmentKind(){const category=this.categories().find(item=>item.id===this.draft.categoryId);const text=(category?.name??'').toLocaleLowerCase('es');this.garmentKind.set(/vestid/.test(text)?'DRESS':/pantal|short|falda|bermuda/.test(text)?'BOTTOM':'TOP');}
 async setPrimary(image:MediaAsset){const product=this.selected();if(!product)return;await this.run(async()=>{await firstValueFrom(this.http.put('/api/v1/admin/products/'+product.id+'/media/'+image.id,{altText:image.alt_text,primary:true}));await this.loadMedia(product.id);this.notice.set('Imagen principal actualizada.');});}
 mediaColors(image:MediaAsset) {
   const product=this.selected();
   const variants=[...(product?.draft?.variants??[]),...(product?.published?.variants??[])];
   const colors=variants.flatMap(v=>Object.entries(v.attributes).filter(([key,value])=>key.toLowerCase()==='color'&&value).map(([,value])=>value));
   return [...new Set(image.color_value?[...colors,image.color_value]:colors)];
 }
 async saveMediaColor(image:MediaAsset,colorValue:string) {
   const product=this.selected();
   if(!product||colorValue===(image.color_value??''))return;
   await this.run(async()=>{
     await firstValueFrom(this.http.put('/api/v1/admin/products/'+product.id+'/media/'+image.id,{colorValue}));
     await this.loadMedia(product.id);
     this.notice.set('Color de la imagen guardado.');
   });
 }
 async saveAlt(image:MediaAsset,altText:string){const product=this.selected();if(!product)return;await this.run(async()=>{await firstValueFrom(this.http.put('/api/v1/admin/products/'+product.id+'/media/'+image.id,{altText:altText.trim()||null,primary:false}));await this.loadMedia(product.id);this.notice.set('Texto alternativo guardado.');});}
 async moveMedia(index:number,delta:number){const product=this.selected();const next=index+delta;if(!product||next<0||next>=this.media().length)return;await this.run(async()=>{const ordered=[...this.media()];[ordered[index],ordered[next]]=[ordered[next],ordered[index]];this.media.set(await firstValueFrom(this.http.put<MediaAsset[]>('/api/v1/admin/products/'+product.id+'/media-order',{assetIds:ordered.map(item=>item.id)})));this.notice.set('Orden de la galería actualizado.');});}

 imageFailed(id:string){this.imageErrors.update(ids=>[...ids,id]);}
 async deleteMedia(image:MediaAsset){const product=this.selected();if(!product||!confirm('¿Eliminar esta imagen y sus archivos de Cloudflare R2?'))return;await this.run(async()=>{const purge=await firstValueFrom(this.http.delete<HomeCoverPurge>('/api/v1/admin/products/'+product.id+'/media/'+image.id,{params:{version:product.version},headers:{'Idempotency-Key':crypto.randomUUID()}}));this.trackPurge(purge);this.setProduct(await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+product.id)));await this.loadMedia(product.id);await this.refreshList();this.notice.set('Imagen retirada. La limpieza se completará cuando caduquen las cargas firmadas.');});}
 async deleteProduct(form:NgForm){const product=this.selected();if(!product||form.dirty||!confirm('¿Eliminar definitivamente «'+this.name(product)+'», sus imágenes y resultados IA? Los productos con ventas o stock no pueden eliminarse.'))return;await this.run(async()=>{const purge=await firstValueFrom(this.http.delete<HomeCoverPurge>('/api/v1/admin/products/'+product.id+'/permanent',{params:{version:product.version},headers:{'Idempotency-Key':crypto.randomUUID()}}));this.trackPurge(purge);this.selected.set(null);this.media.set([]);this.draft=this.blank();form.form.markAsPristine();await this.refreshList();this.notice.set('Producto retirado. La eliminación física está en cola.');});}
 private trackPurge(purge:HomeCoverPurge){this.purges.update(rows=>[purge,...rows.filter(row=>row.id!==purge.id)]);this.persistPurges();if(purge.status==='SUCCEEDED')void this.refreshList();if(purge.status==='QUEUED'||purge.status==='RUNNING')this.watchPurge(purge.id);}
 private persistPurges(){try{sessionStorage.setItem('blessrom-product-purges',JSON.stringify(this.purges().filter(p=>p.status!=='SUCCEEDED').map(p=>p.id)));}catch{}}
 private watchPurge(id:string){if(this.destroy.destroyed)return;this.http.get<HomeCoverPurge>('/api/v1/admin/purges/'+id).subscribe({next:purge=>{if(this.destroy.destroyed)return;this.purges.update(rows=>[purge,...rows.filter(row=>row.id!==id)]);this.persistPurges();if(purge.status==='QUEUED'||purge.status==='RUNNING')this.purgeTimers.set(id,setTimeout(()=>this.watchPurge(id),5000));},error:()=>{if(!this.destroy.destroyed)this.purgeTimers.set(id,setTimeout(()=>this.watchPurge(id),10000));}});}
 async retryPurge(purge:HomeCoverPurge){try{this.trackPurge(await firstValueFrom(this.http.post<HomeCoverPurge>('/api/v1/admin/purges/'+purge.id+'/retry',{})));}catch(e){this.error.set(errorMessage(e));}}
 private async webpVariants(file:File):Promise<PreparedImage[]>{
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('El navegador no pudo abrir este formato. Convierte HEIC/TIFF a JPG o PNG y vuelve a intentarlo.');}
  try{
   const specs:[MediaVariant,number,number][]=[['original',2000,.88],['large',1200,.84],['medium',720,.80],['thumbnail',320,.76]];const result:PreparedImage[]=[];
   for(const [variant,max,quality] of specs){
    const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const width=Math.max(1,Math.round(bitmap.width*scale));const height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('No se pudo procesar la imagen.');
    context.fillStyle='#f7f4ee';context.fillRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('El navegador no pudo generar WebP.')),'image/webp',quality));
    result.push({variant,width,height,blob});
   }return result;
  }finally{bitmap.close();}
 }
 variantLabel(value:MediaVariant){return {original:'original',large:'grande',medium:'catálogo',thumbnail:'miniatura'}[value];}
}

interface PreparedImage{variant:MediaVariant;width:number;height:number;blob:Blob}
type AiReferenceRole='FRONT'|'BACK'|'INTERIOR';
interface AiReference{file:File;preview:string}
interface MediaUploadSession{assetId:string;expiresIn:number;uploads:{variant:MediaVariant;uploadUrl:string;objectKey:string;contentType:string}[]}
interface MediaAsset extends ProductMedia{status:string;objects:{variant:MediaVariant;width:number;height:number;byte_size:number}[]}
