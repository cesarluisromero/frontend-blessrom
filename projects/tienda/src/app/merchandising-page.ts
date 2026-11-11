import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Category, Collection, MerchandisingLanding, Product, Page, errorMessage, money, safeImage } from '../../../../shared/commerce';
import { SeoService } from './seo.service';
import { ProductCard } from './product-card';

@Component({selector:'app-merchandising-page',imports:[RouterLink,ProductCard],template:`
<main>
 @if(loading()){<p role="status">Preparando esta selección…</p>}
 @if(error()){<section class="empty" role="alert"><h1>No encontramos esta selección</h1><p>{{error()}}</p><a class="button" routerLink="/catalogo">Volver al catálogo</a></section>}
 @if(entity();as item){@if(kind()==='category'){<header class="category-header"><nav aria-label="Ruta"><a routerLink="/">Inicio</a><span>/</span><a routerLink="/catalogo">Categorías</a><span>/</span><span aria-current="page">{{item.name}}</span></nav><h1>{{item.name}}</h1></header>}@else{<header class="editorial" [class.with-cover]="cover(item)">
  @if(cover(item);as image){<img [src]="image" [alt]="item.name" fetchpriority="high">}
  <div><p class="eyebrow">Blessrom / {{kind()==='collection'?'Colección':'Categoría'}}</p><h1>{{item.name}}</h1><p>{{item.description||'Una selección creada para acompañar tu estilo.'}}</p><a routerLink="/catalogo" [queryParams]="filter(item)">Ver en el catálogo completo ↗</a></div>
 </header>}
 <section class="products"><div class="heading"><div><p class="eyebrow">{{kind()==='category'?'Catálogo':'Selección actual'}}</p><h2>{{products().total}} productos</h2></div><div class="tools">@if(kind()==='category'){<label>Ordenar <select [value]="sort" (change)="setSort($any($event.target).value)"><option value="name">Nombre</option><option value="newest">Novedades</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select></label>}<a routerLink="/catalogo" [queryParams]="filter(item)">Todos los filtros</a></div></div>
 @if(!products().items.length){<p class="empty">Todavía no hay productos publicados en esta selección.</p>}
 <div class="grid">@for(product of products().items;track product.id){<app-product-card [product]="product" />}</div>
 <nav class="pagination" aria-label="Paginación"><button (click)="change(-1)" [disabled]="page===0||loading()">Anterior</button><span>Página {{page+1}}</span><button (click)="change(1)" [disabled]="(page+1)*size>=products().total||loading()">Siguiente</button></nav>
 </section>}
</main>`,styles:[`
main{max-width:1400px;margin:auto;padding:45px 6%;min-height:70vh}.category-header{padding:10px 0 28px;border-bottom:1px solid var(--line)}.category-header nav{display:flex;gap:10px;color:#6b7788;font-size:13px}.category-header nav a{color:#174f96}.category-header h1{font:52px Georgia,serif;color:#14243e;margin:28px 0 0}.editorial{background:#e8eef5;border-radius:120px 12px 12px 12px;min-height:390px;display:grid;place-items:center;padding:60px;position:relative;overflow:hidden}.editorial.with-cover{grid-template-columns:1fr 1fr;padding:0}.editorial img{width:100%;height:100%;min-height:480px;object-fit:cover;object-position:center top}.editorial>div{padding:55px}.editorial h1{font-size:58px;margin:18px 0}.editorial p:not(.eyebrow){max-width:560px;color:#526276;font-size:18px;line-height:1.6}.editorial a,.heading a{color:#174f96;font-weight:700}.products{padding:32px 0 20px}.heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:30px}.heading h2{font-size:36px;margin:10px 0 0}.tools{display:flex;align-items:center;gap:24px}.tools label{display:flex;align-items:center;gap:8px;color:#526276}.tools select{border:1px solid var(--line);border-radius:6px;padding:10px 28px 10px 12px;background:white;color:#14243e}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}.pagination{display:flex;justify-content:center;align-items:center;gap:20px;margin-top:40px}.empty{text-align:center;padding:70px 20px}@media(max-width:950px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.editorial.with-cover{grid-template-columns:1fr}.editorial img{min-height:360px;height:420px}.editorial h1{font-size:44px}}@media(max-width:520px){main{padding:25px 18px}.editorial,.editorial>div{padding:30px}.editorial h1{font-size:38px}.category-header h1{font-size:40px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.heading{align-items:start;gap:15px;flex-direction:column}.tools{width:100%;justify-content:space-between;gap:10px}.tools label{font-size:13px}.tools select{padding:9px 20px 9px 8px}}
`]})
export class MerchandisingPage {
 private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);private readonly seo=inject(SeoService);private readonly destroyRef=inject(DestroyRef);
 readonly entity=signal<Category|Collection|null>(null);readonly products=signal<Page<Product>>({items:[],page:0,size:12,total:0});readonly loading=signal(true);readonly error=signal('');readonly image=safeImage;
 readonly kind=signal<'collection'|'category'>(this.route.snapshot.data['kind']);slug='';page=0;readonly size=12;sort='name';private request?:import('rxjs').Subscription;
 constructor(){this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params=>{this.slug=params.get('slug')??'';this.page=0;this.entity.set(null);this.load();});}
 load(){this.request?.unsubscribe();this.loading.set(true);this.error.set('');const path=this.kind()==='collection'?'collections':'categories';this.request=this.http.get<MerchandisingLanding<Category|Collection>>('/api/v1/'+path+'/'+encodeURIComponent(this.slug),{params:{page:this.page,size:this.size,...(this.kind()==='category'?{sort:this.sort}:{})}}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:value=>{this.entity.set(value.entity);this.products.set(value.products);this.loading.set(false);const item=value.entity;const label=this.kind()==='collection'?'Colección':'Categoría';this.seo.update({title:item.name+' | Blessrom',description:item.description||label+' '+item.name+' de Blessrom.',path:'/'+(this.kind()==='collection'?'coleccion':'categoria')+'/'+item.slug,image:this.cover(item),jsonLd:{'@context':'https://schema.org','@type':'CollectionPage',name:item.name,description:item.description,url:'https://blessrom.com/'+(this.kind()==='collection'?'coleccion':'categoria')+'/'+item.slug}});},error:value=>{this.error.set(errorMessage(value));this.loading.set(false);}});}
 setSort(value:string){if(this.kind()==='collection'||value===this.sort)return;this.sort=value;this.page=0;this.load();}
 change(delta:number){if(this.loading())return;this.page+=delta;this.load();window.scrollTo({top:0,behavior:'smooth'});}
 cover(item:Category|Collection){return 'cover_image_url' in item?safeImage(item.cover_image_url):null;}
 filter(item:Category|Collection){return this.kind()==='collection'?{collection:item.id}:{category:item.id};}
 price(product:Product){return money(Math.min(...(product.content?.variants.map(variant=>Number(variant.price))??[0])));}
}
