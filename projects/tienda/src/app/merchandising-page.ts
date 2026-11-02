import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Category, Collection, MerchandisingLanding, Product, Page, errorMessage, money, safeImage } from '../../../../shared/commerce';

@Component({selector:'app-merchandising-page',imports:[RouterLink],template:`
<main>
 @if(loading()){<p role="status">Preparando esta selección…</p>}
 @if(error()){<section class="empty" role="alert"><h1>No encontramos esta selección</h1><p>{{error()}}</p><a class="button" routerLink="/catalogo">Volver al catálogo</a></section>}
 @if(entity();as item){<header class="editorial" [class.with-cover]="cover(item)">
  @if(cover(item);as image){<img [src]="image" [alt]="item.name">}
  <div><p class="eyebrow">Blessrom / {{kind()==='collection'?'Colección':'Categoría'}}</p><h1>{{item.name}}</h1><p>{{item.description||'Una selección creada para acompañar tu estilo.'}}</p><a routerLink="/catalogo" [queryParams]="filter(item)">Ver en el catálogo completo ↗</a></div>
 </header>
 <section class="products"><div class="heading"><div><p class="eyebrow">Selección actual</p><h2>{{products().total}} productos</h2></div><a routerLink="/catalogo" [queryParams]="filter(item)">Todos los filtros</a></div>
 @if(!products().items.length){<p class="empty">Todavía no hay productos publicados en esta selección.</p>}
 <div class="grid">@for(product of products().items;track product.id){@if(product.content;as content){<a class="card" [routerLink]="['/producto',product.id]">
  @if(image(content.imageUrl);as url){<img [src]="url" [alt]="content.name" loading="lazy">}@else{<div class="placeholder">B</div>}
  <p class="eyebrow">Blessrom</p><h3>{{content.name}}</h3><span>Desde {{price(product)}}</span></a>}}</div>
 <nav class="pagination" aria-label="Paginación"><button (click)="change(-1)" [disabled]="page===0||loading()">Anterior</button><span>Página {{page+1}}</span><button (click)="change(1)" [disabled]="(page+1)*size>=products().total||loading()">Siguiente</button></nav>
 </section>}
</main>`,styles:[`
main{max-width:1400px;margin:auto;padding:45px 6%;min-height:70vh}.editorial{background:#e8eef5;border-radius:120px 12px 12px 12px;min-height:390px;display:grid;place-items:center;padding:60px;position:relative;overflow:hidden}.editorial.with-cover{grid-template-columns:1fr 1fr;padding:0}.editorial img{width:100%;height:100%;min-height:480px;object-fit:cover;object-position:center top}.editorial>div{padding:55px}.editorial h1{font-size:58px;margin:18px 0}.editorial p:not(.eyebrow){max-width:560px;color:#526276;font-size:18px;line-height:1.6}.editorial a,.heading a{color:#174f96;font-weight:700}.products{padding:70px 0 20px}.heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:30px}.heading h2{font-size:36px;margin:10px 0 0}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}.card{border:1px solid var(--line);border-radius:10px;padding:13px;background:white}.card img,.placeholder{width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center top;background:#e7edf4;border-radius:6px}.placeholder{display:grid;place-items:center;font:65px Georgia;color:#173554}.card .eyebrow{margin:18px 0 8px}.card h3{font-size:22px;margin:0 0 12px}.card span{color:#53657a}.pagination{display:flex;justify-content:center;align-items:center;gap:20px;margin-top:40px}.empty{text-align:center;padding:70px 20px}@media(max-width:950px){.grid{grid-template-columns:repeat(2,1fr)}.editorial.with-cover{grid-template-columns:1fr}.editorial img{min-height:360px;height:420px}.editorial h1{font-size:44px}}@media(max-width:520px){main{padding:25px 18px}.editorial,.editorial>div{padding:30px}.editorial h1{font-size:38px}.grid{grid-template-columns:1fr}.heading{align-items:start;gap:15px;flex-direction:column}}
`]})
export class MerchandisingPage {
 private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);
 readonly entity=signal<Category|Collection|null>(null);readonly products=signal<Page<Product>>({items:[],page:0,size:12,total:0});readonly loading=signal(true);readonly error=signal('');readonly image=safeImage;
 readonly kind=signal<'collection'|'category'>(this.route.snapshot.data['kind']);readonly slug=this.route.snapshot.paramMap.get('slug')??'';page=0;readonly size=12;
 constructor(){this.load();}
 load(){this.loading.set(true);this.error.set('');const path=this.kind()==='collection'?'collections':'categories';this.http.get<MerchandisingLanding<Category|Collection>>('/api/v1/'+path+'/'+encodeURIComponent(this.slug),{params:{page:this.page,size:this.size}}).subscribe({next:value=>{this.entity.set(value.entity);this.products.set(value.products);this.loading.set(false);},error:value=>{this.error.set(errorMessage(value));this.loading.set(false);}});}
 change(delta:number){if(this.loading())return;this.page+=delta;this.load();window.scrollTo({top:0,behavior:'smooth'});}
 cover(item:Category|Collection){return 'cover_image_url' in item?safeImage(item.cover_image_url):null;}
 filter(item:Category|Collection){return this.kind()==='collection'?{collection:item.id}:{category:item.id};}
 price(product:Product){return money(Math.min(...(product.content?.variants.map(variant=>Number(variant.price))??[0])));}
}
