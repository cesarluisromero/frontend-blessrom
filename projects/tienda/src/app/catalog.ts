import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Category, Product, Page, money, safeImage, errorMessage } from '../../../../shared/commerce';
@Component({selector:'app-catalog',imports:[FormsModule,RouterLink],template:`
<main><p class="eyebrow">Blessrom / Catálogo</p><h1>Encuentra tu estilo.</h1>
<form (ngSubmit)="search()"><label>Buscar<input name="q" [(ngModel)]="query" maxlength="100" placeholder="Nombre de la prenda"></label><label>Categoría<select name="category" [(ngModel)]="category"><option value="">Todas</option>@for(c of categories();track c.id){<option [value]="c.id">{{c.name}}</option>}</select></label><button [disabled]="loading()">Buscar</button></form>
@if(error()){<p role="alert">{{error()}} <button (click)="load()">Reintentar</button></p>}
@if(loading()){<p role="status">Cargando catálogo…</p>}
@else {<p class="muted">{{total()}} productos</p><div class="grid">@for(p of items();track p.id){@if(p.content;as c){<a class="card" [routerLink]="['/producto',p.id]">
@if(image(c.imageUrl);as url){<img [src]="url" [alt]="c.name" loading="lazy" referrerpolicy="no-referrer">}@else{<div class="placeholder">Blessrom</div>}
<h2>{{c.name}}</h2><p>Desde {{price(p)}}</p></a>}}</div>
@if(!items().length&&!error()){<p>Aún no hay productos para esta búsqueda.</p>}}
<div class="pagination"><button (click)="change(-1)" [disabled]="page===0||loading()">Anterior</button><span>Página {{page+1}}</span><button (click)="change(1)" [disabled]="(page+1)*size>=total()||loading()">Siguiente</button></div></main>`,
styles:[`main{max-width:1300px;margin:auto;padding:40px 6%;min-height:65vh}h1{font-size:46px}form{display:flex;gap:20px;align-items:end;flex-wrap:wrap;margin:30px 0}label{font-size:14px}input,select{display:block;padding:13px;margin-top:8px;border:1px solid var(--line);border-radius:5px;font:inherit}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:25px}.card{background:white;border:1px solid var(--line);padding:15px;border-radius:8px}.card img,.placeholder{width:100%;height:300px;object-fit:cover;background:#e9edf2}.placeholder{display:grid;place-items:center;font:30px Georgia;color:#697d94}.card h2{font-size:23px}.pagination{display:flex;gap:20px;align-items:center;margin-top:35px}@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}.card img,.placeholder{height:210px}}@media(max-width:480px){.grid{grid-template-columns:1fr}}`]})
export class Catalog {
 private readonly http=inject(HttpClient);
 readonly items=signal<Product[]>([]);readonly categories=signal<Category[]>([]);readonly total=signal(0);readonly loading=signal(false);readonly error=signal('');
 query='';category='';page=0;readonly size=12;readonly image=safeImage;
 constructor(){this.http.get<Category[]>('/api/v1/categories').subscribe({next:c=>this.categories.set(c),error:()=>this.error.set('No pudimos cargar las categorías.')});this.load();}
 price(p:Product){return money(Math.min(...(p.content?.variants.map(v=>Number(v.price))??[0])));}
 search(){if(this.loading())return;this.page=0;this.load();}
 change(delta:number){if(this.loading())return;this.page+=delta;this.load();}
 load(){this.loading.set(true);this.error.set('');this.items.set([]);this.http.get<Page<Product>>('/api/v1/products',{params:{page:this.page,size:this.size,q:this.query,...(this.category?{category:this.category}:{})}}).subscribe({next:r=>{this.items.set(r.items);this.total.set(r.total);this.loading.set(false);},error:e=>{this.error.set(errorMessage(e));this.loading.set(false);}});}
}
