import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Product as ProductModel, ProductMedia, Variant, money, safeImage, errorMessage } from '../../../../shared/commerce';
import { CartService } from './cart.service';
import { SeoService } from './seo.service';
import { AnalyticsService } from './analytics.service';
import { mediaSrcset } from './product-card';

@Component({ selector:'app-product', imports:[RouterLink,FormsModule], template:`
<main>
  <a class="back" routerLink="/catalogo">← Volver al catálogo</a>
  @if(error()){<p class="alert" role="alert">{{error()}}</p>}
  @if(loading()){<p role="status">Cargando producto…</p>}
  @if(product();as product){@if(product.content;as content){<div class="detail">
    <section class="gallery" aria-label="Fotografías del producto">
      @if(mainImage();as url){<img class="main-image" [src]="url" [attr.srcset]="srcset()" sizes="(max-width:760px) 100vw, 50vw" [alt]="activeMedia()?.alt_text || content.name" width="720" height="900" fetchpriority="high" (error)="imageFailed.set(true)">}@else{<div class="image-placeholder">Fotografía pendiente</div>}
      @if(content.media?.length){<div class="thumbnails">@for(media of content.media;track media.id){<button type="button" (click)="selectMedia(media)" [class.active]="activeMedia()?.id===media.id" [attr.aria-pressed]="activeMedia()?.id===media.id" [attr.aria-label]="'Ver '+(media.alt_text || content.name)"><img [src]="safeImage(media.urls.thumbnail)" [alt]="media.alt_text || content.name" width="76" height="95" loading="lazy"></button>}</div>}
    </section>
    <section class="product-info"><p class="eyebrow">Blessrom / {{product.slug}}</p><h1>{{content.name}}</h1><p class="price">{{money(selectedVariant()?.price ?? minimumPrice())}}</p><p class="description">{{content.description}}</p>
      @if(variants().length){
        @for(key of attributeKeys();track key){<fieldset class="attribute-picker"><legend>{{attributeLabel(key)}} <strong>{{selected()[key]}}</strong></legend><div>@for(value of attributeValues(key);track value){<button type="button" [class.selected]="selected()[key]===value" [attr.aria-pressed]="selected()[key]===value" (click)="choose(key,value)">{{value}}</button>}</div></fieldset>}
        @if(attributeKeys().length===0&&variants().length>1){<label class="sku-picker">Presentación<select name="variant" [ngModel]="selectedVariant()?.id" (ngModelChange)="chooseVariant($event)">@for(variant of variants();track variant.sku){<option [value]="variant.id">{{variant.sku}} · {{money(variant.price)}}</option>}</select></label>}
        @if(selectedVariant();as variant){<div class="stock"><small>SKU: {{variant.sku}}</small><p [class.out-of-stock]="!available()">{{available()>0 ? available()+' unidades disponibles' : 'Esta combinación no tiene stock por el momento.'}}</p></div>
          <div class="buy"><label>Cantidad<input type="number" name="quantity" [(ngModel)]="quantity" min="1" [max]="available()" step="1" [disabled]="!available()||cart.busy()"></label><button type="button" (click)="add()" [disabled]="cart.busy()||!canAdd()">{{cart.busy()?'Agregando…':'Agregar al carrito'}}</button></div>
        }
      }@else{<p class="alert">Este producto no tiene presentaciones disponibles.</p>}
      @if(notice()){<p class="notice" role="status">{{notice()}} <a routerLink="/carrito">Ver carrito →</a></p>}
      <div class="purchase-notes"><p>Precios en soles. El envío se calcula según tu distrito.</p><p>Puedes comprar como invitado. Tu stock se reserva al crear el pedido.</p></div>
    </section>
  </div>}}
</main>`, styleUrl:'./product.scss' })
export class Product {
  private readonly http=inject(HttpClient);private readonly route=inject(ActivatedRoute);private readonly seo=inject(SeoService);private readonly analytics=inject(AnalyticsService);private readonly destroy=inject(DestroyRef);private request?:Subscription;
  readonly cart=inject(CartService);readonly product=signal<ProductModel|null>(null);readonly selected=signal<Record<string,string>>({});readonly selectedId=signal<string|null>(null);readonly activeMedia=signal<ProductMedia|null>(null);readonly imageFailed=signal(false);readonly loading=signal(false);readonly error=signal('');readonly notice=signal('');readonly money=money;readonly safeImage=safeImage;quantity=1;
  readonly variants=computed(()=>this.product()?.content?.variants.filter(item=>item.enabled)??[]);
  readonly attributeKeys=computed(()=>[...new Set(this.variants().flatMap(item=>Object.keys(item.attributes)))].sort((a,b)=>this.attributeRank(a)-this.attributeRank(b)));
  readonly selectedVariant=computed(()=>this.variants().find(item=>item.id===this.selectedId())??this.variants().find(item=>this.attributeKeys().every(key=>item.attributes[key]===this.selected()[key]))??null);
  constructor(){this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params=>this.load(params.get('id')));this.destroy.onDestroy(()=>this.request?.unsubscribe());}
  private attributeRank(key:string){return key.toLowerCase()==='color'?0:['talla','size'].includes(key.toLowerCase())?1:2;}
  attributeLabel(key:string){return key.charAt(0).toUpperCase()+key.slice(1);}
  attributeValues(key:string){const colorKey=this.attributeKeys().find(value=>value.toLowerCase()==='color');const variants=['talla','size'].includes(key.toLowerCase())&&colorKey?this.variants().filter(item=>item.attributes[colorKey]===this.selected()[colorKey]):this.variants();return [...new Set(variants.map(item=>item.attributes[key]).filter(Boolean))];}
  choose(key:string,value:string){const candidates=this.variants().filter(item=>item.attributes[key]===value);const variant=candidates.find(item=>this.attributeKeys().every(other=>other===key||item.attributes[other]===this.selected()[other]))??candidates.find(item=>(item.available??0)>0)??candidates[0];if(variant)this.selectVariant(variant);}
  chooseVariant(id:string){const variant=this.variants().find(item=>item.id===id);if(variant)this.selectVariant(variant);}
  private selectVariant(variant:Variant){this.selected.set({...variant.attributes});this.selectedId.set(variant.id??null);this.quantity=1;this.notice.set('');}
  selectMedia(media:ProductMedia){this.activeMedia.set(media);this.imageFailed.set(false);}
  mainImage(){return this.imageFailed()?null:safeImage(this.activeMedia()?.urls.large??this.product()?.content?.imageUrl);}
  srcset(){return mediaSrcset(this.activeMedia());}
  minimumPrice(){const prices=this.variants().map(item=>Number(item.price));return prices.length?Math.min(...prices):0;}
  available(){const variant=this.selectedVariant();const inCart=this.cart.cart()?.items.find(item=>item.variantId===variant?.id)?.quantity??0;return Math.max(0,(variant?.available??0)-inCart);}
  canAdd(){return !!this.selectedVariant()?.id&&Number.isInteger(this.quantity)&&this.quantity>0&&this.quantity<=this.available();}
  async add(){if(!this.canAdd())return;const product=this.product();const variant=this.selectedVariant();if(!product||!variant?.id)return;this.error.set('');this.notice.set('');try{const current=this.cart.cart()?.items.find(item=>item.variantId===variant.id)?.quantity??0;await this.cart.set(variant.id,current+this.quantity);this.analytics.addToCart(product,variant.id,this.quantity);this.notice.set('Agregamos tu selección al carrito.');}catch(error){this.error.set(errorMessage(error));}}
  private load(id:string|null){this.request?.unsubscribe();this.product.set(null);this.activeMedia.set(null);this.selected.set({});this.selectedId.set(null);this.imageFailed.set(false);this.notice.set('');this.error.set('');if(!id||!/^[0-9a-f-]{36}$/i.test(id)){this.error.set('Producto no encontrado.');this.loading.set(false);return;}this.loading.set(true);this.request=this.http.get<ProductModel>('/api/v1/products/'+id).subscribe({next:product=>{this.product.set(product);this.loading.set(false);const content=product.content;const first=this.variants().find(item=>(item.available??0)>0)??this.variants()[0];if(first)this.selectVariant(first);const primary=content?.media?.find(item=>item.is_primary)??content?.media?.[0];if(primary)this.selectMedia(primary);this.analytics.viewItem(product);if(content){const low=this.minimumPrice();this.seo.update({title:content.name+' | Blessrom',description:content.description||'Compra '+content.name+' en Blessrom, Tarapoto.',path:'/producto/'+product.id,image:this.mainImage(),type:'product',jsonLd:{'@context':'https://schema.org','@type':'Product',name:content.name,description:content.description,image:this.mainImage()?[this.mainImage()]:[],sku:first?.sku,brand:{'@type':'Brand',name:'Blessrom'},offers:{'@type':'Offer',priceCurrency:'PEN',price:low.toFixed(2),availability:this.variants().some(item=>(item.available??0)>0)?'https://schema.org/InStock':'https://schema.org/OutOfStock',url:'https://blessrom.com/producto/'+product.id}}});}},error:error=>{this.error.set(error.status===404?'Este producto no está disponible.':errorMessage(error));this.loading.set(false);}});}
}
