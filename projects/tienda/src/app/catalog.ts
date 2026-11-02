import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttributeDefinition, Category, Collection, Product, Page, money, safeImage, errorMessage } from '../../../../shared/commerce';
import { SeoService } from './seo.service';

@Component({selector:'app-catalog',imports:[FormsModule,RouterLink],template:`
<main><p class="eyebrow">Blessrom / Catálogo</p><h1>Encuentra tu estilo.</h1>
<form (ngSubmit)="search()" class="filters">
 <label class="search">Buscar<input name="q" [(ngModel)]="query" (ngModelChange)="suggest($event)" maxlength="100" autocomplete="off" placeholder="Nombre de la prenda">@if(suggestions().length){<div class="suggestions">@for(p of suggestions();track p.id){<a [routerLink]="['/producto',p.id]">{{p.content?.name}}</a>}</div>}</label>
 <label>Categoría<select name="category" [(ngModel)]="category"><option value="">Todas</option>@for(c of categories();track c.id){<option [value]="c.id">{{categoryLabel(c)}}</option>}</select></label>
 <label>Colección<select name="collection" [(ngModel)]="collection"><option value="">Todas</option>@for(c of collections();track c.id){<option [value]="c.id">{{c.name}}</option>}</select></label>
 <label>Color<select name="color" [(ngModel)]="color"><option value="">Todos</option>@for(o of options('color');track o.value){<option [value]="o.value">{{o.label}}</option>}</select></label>
 <label>Talla<select name="talla" [(ngModel)]="talla"><option value="">Todas</option>@for(o of options('talla');track o.value){<option [value]="o.value">{{o.label}}</option>}</select></label>
 <label>Precio mínimo<input name="minPrice" [(ngModel)]="minPrice" type="number" min="0" step="1" placeholder="S/ 0"></label>
 <label>Precio máximo<input name="maxPrice" [(ngModel)]="maxPrice" type="number" min="0" step="1" placeholder="Sin límite"></label>
 <label>Ordenar<select name="sort" [(ngModel)]="sort"><option value="name">Nombre</option><option value="newest">Novedades</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select></label>
 <label class="check"><input name="available" [(ngModel)]="available" type="checkbox"> Solo disponibles</label>
 <div class="actions"><button [disabled]="loading()">Aplicar filtros</button><button type="button" class="secondary" (click)="clear()">Limpiar</button></div>
</form>
@if(error()){<p role="alert">{{error()}} <button (click)="load()">Reintentar</button></p>}
@if(loading()){<p role="status">Cargando catálogo…</p>}@else {<p class="muted">{{total()}} productos</p><div class="grid">@for(p of items();track p.id){@if(p.content;as c){<a class="card" [routerLink]="['/producto',p.id]">@if(image(c.imageUrl);as url){<img [src]="url" [alt]="c.name" loading="lazy" referrerpolicy="no-referrer">}@else{<div class="placeholder">Blessrom</div>}<h2>{{c.name}}</h2><p>Desde {{price(p)}}</p></a>}}</div>@if(!items().length&&!error()){<p>No encontramos productos con estos filtros. Prueba ampliando la búsqueda.</p>}}
<div class="pagination"><button (click)="change(-1)" [disabled]="page===0||loading()">Anterior</button><span>Página {{page+1}}</span><button (click)="change(1)" [disabled]="(page+1)*size>=total()||loading()">Siguiente</button></div></main>`,
styles:[`main{max-width:1300px;margin:auto;padding:40px 6%;min-height:65vh}h1{font-size:46px}.filters{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:16px;align-items:end;margin:30px 0;padding:20px;background:#fff;border:1px solid var(--line);border-radius:10px}label{font-size:13px;position:relative}input,select{display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:7px;border:1px solid var(--line);border-radius:5px;font:inherit}.check{display:flex;gap:8px;align-items:center;padding-bottom:12px}.check input{width:auto;margin:0}.actions{display:flex;gap:8px}.secondary{background:#e7edf5;color:var(--navy)}.suggestions{position:absolute;z-index:4;top:100%;left:0;right:0;background:#fff;border:1px solid var(--line);box-shadow:0 8px 25px #14243e20}.suggestions a{display:block;padding:11px}.suggestions a:hover{background:#edf3fb}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:25px}.card{background:white;border:1px solid var(--line);padding:15px;border-radius:8px}.card img,.placeholder{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:center top;background:#e9edf2}.placeholder{display:grid;place-items:center;font:30px Georgia;color:#697d94}.card h2{font-size:23px}.pagination{display:flex;gap:20px;align-items:center;margin-top:35px}@media(max-width:900px){.filters{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.filters,.grid{grid-template-columns:1fr}}`]})
export class Catalog {
 private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly destroy=inject(DestroyRef);private readonly seo=inject(SeoService);private readonly suggestionInput=new Subject<string>();
 readonly catalogSeo=this.seo.update({title:'Catálogo | Blessrom',description:'Explora el catálogo de moda Blessrom: prendas, colores, tallas y colecciones disponibles en Perú.',path:'/catalogo'});
 readonly items=signal<Product[]>([]);readonly suggestions=signal<Product[]>([]);readonly categories=signal<Category[]>([]);readonly collections=signal<Collection[]>([]);readonly attributes=signal<AttributeDefinition[]>([]);readonly total=signal(0);readonly loading=signal(false);readonly error=signal('');
 query='';category='';collection='';color='';talla='';minPrice:number|null=null;maxPrice:number|null=null;available=false;sort='name';page=0;readonly size=12;readonly image=safeImage;
 constructor(){const p=this.route.snapshot.queryParamMap;this.query=p.get('q')??'';this.category=p.get('category')??'';this.collection=p.get('collection')??'';this.color=p.get('color')??'';this.talla=p.get('talla')??'';this.minPrice=this.number(p.get('minPrice'));this.maxPrice=this.number(p.get('maxPrice'));this.available=p.get('available')==='true';this.sort=p.get('sort')??'name';this.page=Math.max(0,Number(p.get('page')??0)||0);this.http.get<Category[]>('/api/v1/categories').subscribe(c=>this.categories.set(c));this.http.get<Collection[]>('/api/v1/collections').subscribe(c=>this.collections.set(c));this.http.get<AttributeDefinition[]>('/api/v1/attributes').subscribe(a=>this.attributes.set(a));this.suggestionInput.pipe(debounceTime(250),distinctUntilChanged(),takeUntilDestroyed(this.destroy)).subscribe(q=>this.loadSuggestions(q));this.load();}
 private number(value:string|null){const n=Number(value);return value!==null&&Number.isFinite(n)?n:null;}
 options(code:string){return this.attributes().find(a=>a.code.toLowerCase()===code)?.options??[];}
 categoryLabel(c:Category){const parent=this.categories().find(item=>item.id===c.parent_id);return parent?parent.name+' / '+c.name:c.name;}
 price(p:Product){return money(Math.min(...(p.content?.variants.filter(v=>v.enabled).map(v=>Number(v.price))??[0])));}
 suggest(value:string){this.suggestionInput.next(value);}
 private loadSuggestions(q:string){if(q.trim().length<2){this.suggestions.set([]);return;}this.http.get<Page<Product>>('/api/v1/products',{params:{q:q.trim(),page:0,size:5,available:true}}).subscribe({next:r=>this.suggestions.set(r.items),error:()=>this.suggestions.set([])});}
 search(){if(this.loading())return;this.page=0;this.suggestions.set([]);this.load();}
 clear(){this.query=this.category=this.collection=this.color=this.talla='';this.minPrice=this.maxPrice=null;this.available=false;this.sort='name';this.page=0;this.load();}
 change(delta:number){if(this.loading())return;this.page+=delta;this.load();window.scrollTo({top:0,behavior:'smooth'});}
 load(){this.loading.set(true);this.error.set('');const params:any={page:this.page,size:this.size,sort:this.sort};for(const [key,value] of Object.entries({q:this.query,category:this.category,collection:this.collection,color:this.color,talla:this.talla,minPrice:this.minPrice,maxPrice:this.maxPrice,available:this.available||null}))if(value!==''&&value!==null)params[key]=value;this.router.navigate([], {relativeTo:this.route,queryParams:params,replaceUrl:true});this.http.get<Page<Product>>('/api/v1/products',{params}).subscribe({next:r=>{this.items.set(r.items);this.total.set(r.total);this.loading.set(false);},error:e=>{this.error.set(errorMessage(e));this.loading.set(false);}});}
}
