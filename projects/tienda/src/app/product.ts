import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product as ProductModel, ProductMedia, money, safeImage, errorMessage } from '../../../../shared/commerce';
import { CartService } from './cart.service';
@Component({selector:'app-product',imports:[RouterLink],template:`
<main><a routerLink="/catalogo">← Volver al catálogo</a>
@if(error()){<p role="alert">{{error()}}</p>}
@if(product();as p){@if(p.content;as c){<div class="detail">
<div class="product-gallery">@if(image(activeImage()??c.imageUrl);as url){<img class="main-image" [src]="url" [alt]="activeAlt()||c.name" referrerpolicy="no-referrer">}@else{<div class="placeholder">Blessrom</div>}@if(c.media?.length){<div class="thumbnails" aria-label="Galería de imágenes">@for(media of c.media;track media.id){<button type="button" (click)="selectMedia(media)" [class.active]="activeImage()===media.urls.large" [attr.aria-label]="'Mostrar '+(media.alt_text||c.name)"><img [src]="media.urls.thumbnail" [alt]="media.alt_text||c.name"></button>}</div>}</div>
<section><p class="eyebrow">Blessrom / {{p.slug}}</p><h1>{{c.name}}</h1><p class="description">{{c.description}}</p>
<h2>Variantes disponibles</h2>@for(v of c.variants;track v.sku){<article><strong>{{money(v.price)}}</strong><p>{{attributes(v.attributes) || v.sku}}</p><small>{{(v.available??0)>0?'Existencias: '+v.available:'Sin stock por el momento'}}</small>
@if(v.id&&(v.available??0)>0){<button [disabled]="cart.busy()" (click)="add(v.id)">Agregar al carrito</button>}</article>}
@if(notice()){<p role="status">{{notice()}} <a routerLink="/carrito">Ver carrito →</a></p>}</section></div>}}
@else if(!error()){<p role="status">Cargando producto…</p>}</main>`,
styles:[`main{max-width:1250px;margin:auto;padding:40px 6%;min-height:65vh}.detail{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:35px}.main-image,.placeholder{width:100%;aspect-ratio:4/5;max-height:700px;object-fit:contain;object-position:center top;background:#e9edf2}.placeholder{height:350px;display:grid;place-items:center;font:40px Georgia}.thumbnails{display:flex;gap:10px;overflow-x:auto;margin-top:12px;padding:2px}.thumbnails button{flex:0 0 76px;padding:3px;background:white;border:2px solid transparent;border-radius:5px}.thumbnails button.active{border-color:var(--blue)}.thumbnails img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center top}h1{font-size:44px}article{padding:15px;border:1px solid var(--line);margin:12px 0;background:white}.description{white-space:pre-line}@media(max-width:750px){.detail{grid-template-columns:1fr}}`]})
export class Product {
 private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);
 readonly cart=inject(CartService);readonly notice=signal('');
 readonly product=signal<ProductModel|null>(null);readonly error=signal('');readonly activeImage=signal<string|null>(null);readonly activeAlt=signal('');readonly image=safeImage;readonly money=money;
 selectMedia(media:ProductMedia){this.activeImage.set(media.urls.large);this.activeAlt.set(media.alt_text??'');}
 attributes(attrs:Record<string,string>){return Object.entries(attrs).map(([k,v])=>k+': '+v).join(' · ');}
 async add(id:string){this.error.set('');try{const existing=this.cart.cart()?.items.find(i=>i.variantId===id)?.quantity??0;await this.cart.set(id,existing+1);this.notice.set('Producto agregado.');}catch(e){this.error.set(errorMessage(e));}}
 constructor(){const id=this.route.snapshot.paramMap.get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id)){this.error.set('Producto no encontrado.');return;}this.http.get<ProductModel>('/api/v1/products/'+id).subscribe({next:p=>{this.product.set(p);const primary=p.content?.media?.find(item=>item.is_primary)??p.content?.media?.[0];if(primary)this.selectMedia(primary);},error:e=>this.error.set(e.status===404?'Este producto no está disponible.':errorMessage(e))});}
}
