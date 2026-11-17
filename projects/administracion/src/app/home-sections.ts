import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Category, Collection } from '../../../../shared/commerce';
import { HomeProductSection, HomeSectionsAdmin } from '../../../../shared/home-sections';

@Component({selector:'app-home-sections-editor',imports:[FormsModule],template:`
<main class="editor"><p class="eyebrow">INICIO / SECCIONES</p><h1>Secciones de productos</h1>
<p>Agrupa prendas por categoría, colección o ventas. Las secciones sin productos disponibles se ocultan automáticamente.</p>
@if(error()){<p role="alert" class="error">{{error()}}</p>}@if(notice()){<p role="status" class="notice">{{notice()}}</p>}
@if(!categories().length||!collections().length){<button type="button" class="secondary" (click)="loadOptions()">Reintentar carga de categorías y colecciones</button>}
<div class="toolbar"><button type="button" (click)="add()" [disabled]="sections.length>=8">Agregar sección</button><span>{{sections.length}} / 8 secciones</span></div>
@for(section of sections;track section.id;let i=$index){<section>
<div class="heading"><h2>Sección {{i+1}}</h2><div><button type="button" class="secondary" (click)="move(i,-1)" [disabled]="i===0" [attr.aria-label]="'Subir sección '+(i+1)">↑</button><button type="button" class="secondary" (click)="move(i,1)" [disabled]="i===sections.length-1" [attr.aria-label]="'Bajar sección '+(i+1)">↓</button><button type="button" class="secondary" (click)="remove(i)">Quitar</button></div></div>
<div class="fields"><label>Título<input [(ngModel)]="section.title" (ngModelChange)="saved.set(false)" maxlength="100" placeholder="Por ejemplo: Shorts para tu día"></label>
<label>Agrupar por<select [(ngModel)]="section.kind" (ngModelChange)="section.sourceId=null;saved.set(false)"><option value="CATEGORY">Categoría</option><option value="COLLECTION">Colección</option><option value="BEST_SELLERS">Más vendidos</option></select></label>
@if(section.kind==='CATEGORY'){<label>Categoría<select [(ngModel)]="section.sourceId" (ngModelChange)="saved.set(false)"><option [ngValue]="null">{{categories().length?'Selecciona una categoría':'Cargando categorías…'}}</option>@for(category of categories();track category.id){<option [ngValue]="category.id">{{category.name}}</option>}</select></label>}
@if(section.kind==='COLLECTION'){<label>Colección<select [(ngModel)]="section.sourceId" (ngModelChange)="saved.set(false)"><option [ngValue]="null">Selecciona una colección</option>@for(collection of collections();track collection.id){<option [ngValue]="collection.id">{{collection.name}}</option>}</select></label>}
<label>Cantidad de productos<input type="number" min="1" max="12" [(ngModel)]="section.limit" (ngModelChange)="saved.set(false)"></label>
<label class="check"><input type="checkbox" [(ngModel)]="section.enabled" (ngModelChange)="saved.set(false)"> Mostrar sección</label></div></section>}
<div class="actions"><button type="button" (click)="save()" [disabled]="busy()">Guardar borrador</button><button type="button" (click)="publish()" [disabled]="busy()||!saved()">Publicar secciones</button></div>
</main>`,styles:[`.editor{max-width:1100px;margin:auto;padding:28px}.eyebrow{letter-spacing:.16em;color:#996a2c}.editor h1{font:2.5rem Georgia,serif;color:#14243e}.editor section{background:white;border:1px solid #d7e0ea;border-radius:12px;padding:22px;margin:18px 0}.heading,.toolbar,.actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.heading h2{font:1.5rem Georgia,serif;margin:0}.heading>div{display:flex;gap:7px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.editor label{display:block;font-weight:600}.editor input:not([type=checkbox]),.editor select{box-sizing:border-box;display:block;width:100%;min-height:48px;padding:10px;margin-top:7px;border:1px solid #b8c5d4;border-radius:6px;font:inherit}.check{display:flex!important;align-items:center;gap:10px}.editor button{min-height:44px;padding:10px 18px;background:#14243e;color:white;border-radius:7px}.editor button.secondary{background:#edf2f8;color:#14243e}.editor button:disabled{opacity:.5}.error{color:#a11}.notice{color:#176d4a}@media(max-width:650px){.fields{grid-template-columns:1fr}.editor{padding:16px}}`]})
export class HomeSectionsEditor {
 private readonly http=inject(HttpClient);
 readonly categories=signal<Category[]>([]);readonly collections=signal<Collection[]>([]);
 readonly busy=signal(false);readonly saved=signal(false);readonly error=signal('');readonly notice=signal('');
 sections:HomeProductSection[]=[];version=0;
 constructor(){void this.load();}
 async load(){void this.loadOptions();try{const data=await firstValueFrom(this.http.get<HomeSectionsAdmin>('/api/v1/home-sections/admin'));this.version=data.version;this.sections=structuredClone(data.draft);this.saved.set(true);}catch(e){this.error.set((e as {status?:number}).status===404?'El backend de secciones aún no está disponible. Despliega el backend con la migración V28.':'No se pudieron cargar las secciones.');}}
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
 add(){if(this.sections.length>=8)return;this.sections.push({id:crypto.randomUUID(),title:'',kind:'CATEGORY',sourceId:null,limit:6,enabled:true});this.saved.set(false);}
 remove(index:number){this.sections.splice(index,1);this.saved.set(false);}
 move(index:number,direction:number){const next=index+direction;if(next<0||next>=this.sections.length)return;[this.sections[index],this.sections[next]]=[this.sections[next],this.sections[index]];this.saved.set(false);}
 async save(){if(this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<HomeSectionsAdmin>('/api/v1/home-sections/admin/draft',{version:this.version,sections:this.sections}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. La tienda aún no cambia.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió las secciones. Tus cambios siguen aquí.':'Revisa el título, el criterio y la cantidad de cada sección.');}finally{this.busy.set(false);}}
 async publish(){if(this.busy()||!this.saved())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.post<HomeSectionsAdmin>('/api/v1/home-sections/admin/publish',{version:this.version}));this.version=data.version;this.notice.set('Secciones publicadas en la tienda.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió las secciones. Tus cambios siguen aquí.':'No se pudieron publicar las secciones.');}finally{this.busy.set(false);}}
}
