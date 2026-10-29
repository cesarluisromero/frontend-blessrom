import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product as ProductModel, money, safeImage, errorMessage } from '../../../../shared/commerce';
import { CartService } from './cart.service';
@Component({selector:'app-product',imports:[RouterLink],template:`
<main><a routerLink="/catalogo">← Volver al catálogo</a>
@if(error()){<p role="alert">{{error()}}</p>}
@if(product();as p){@if(p.content;as c){<div class="detail">
<div>@if(image(c.imageUrl);as url){<img [src]="url" [alt]="c.name" referrerpolicy="no-referrer">}@else{<div class="placeholder">Blessrom</div>}</div>
<section><p class="eyebrow">Blessrom / {{p.slug}}</p><h1>{{c.name}}</h1><p class="description">{{c.description}}</p>
<h2>Variantes disponibles</h2>@for(v of c.variants;track v.sku){<article><strong>{{money(v.price)}}</strong><p>{{attributes(v.attributes) || v.sku}}</p><small>{{(v.available??0)>0?'Existencias: '+v.available:'Sin stock por el momento'}}</small>
@if(v.id&&(v.available??0)>0){<button [disabled]="cart.busy()" (click)="add(v.id)">Agregar al carrito</button>}</article>}
@if(notice()){<p role="status">{{notice()}} <a routerLink="/carrito">Ver carrito →</a></p>}</section></div>}}
@else if(!error()){<p role="status">Cargando producto…</p>}</main>`,
styles:[`main{max-width:1250px;margin:auto;padding:40px 6%;min-height:65vh}.detail{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:35px}img,.placeholder{width:100%;max-height:650px;object-fit:contain;background:#e9edf2}.placeholder{height:350px;display:grid;place-items:center;font:40px Georgia}h1{font-size:44px}article{padding:15px;border:1px solid var(--line);margin:12px 0;background:white}.description{white-space:pre-line}@media(max-width:750px){.detail{grid-template-columns:1fr}}`]})
export class Product {
 private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);
 readonly cart=inject(CartService);readonly notice=signal('');
 readonly product=signal<ProductModel|null>(null);readonly error=signal('');readonly image=safeImage;readonly money=money;
 attributes(attrs:Record<string,string>){return Object.entries(attrs).map(([k,v])=>k+': '+v).join(' · ');}
 async add(id:string){this.error.set('');try{const existing=this.cart.cart()?.items.find(i=>i.variantId===id)?.quantity??0;await this.cart.set(id,existing+1);this.notice.set('Producto agregado.');}catch(e){this.error.set(errorMessage(e));}}
 constructor(){const id=this.route.snapshot.paramMap.get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id)){this.error.set('Producto no encontrado.');return;}this.http.get<ProductModel>('/api/v1/products/'+id).subscribe({next:p=>this.product.set(p),error:e=>this.error.set(e.status===404?'Este producto no está disponible.':errorMessage(e))});}
}
