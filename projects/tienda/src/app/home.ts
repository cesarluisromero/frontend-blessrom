import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Storefront, StorefrontCollection, money, safeImage } from '../../../../shared/commerce';
import { SeoService } from './seo.service';
@Component({
 selector:'app-home',imports:[RouterLink],
 template: `
 <main>
 <section class="hero">
  <div><p class="eyebrow">Esencia natural. Actitud urbana.</p><h1>Tu estilo.<br>Tu naturaleza.</h1><p class="intro">Prendas para acompañarte a tu ritmo.<br>Descubre una nueva mirada al estilo cotidiano.</p><a class="button" routerLink="/catalogo">Explorar catálogo ↗</a><p class="origin">06° S / 76° O · Inspirados en nuestro origen</p></div>
  <div class="art" role="img" aria-label="Composición abstracta de montañas azules inspiradas en Tarapoto"><span>BLESSROM</span><div class="sun"></div><div class="hill one"></div><div class="hill two"></div><div class="hill three"></div><p>Entre la calma<br>y el movimiento.</p></div>
 </section>
 <section class="values"><div><span>01 / IDENTIDAD</span><h2>Estilo con origen</h2><p>Una mirada contemporánea, inspirada en la energía de nuestra tierra.</p></div><div><span>02 / DESCUBRE</span><h2>Tu próximo favorito</h2><p>Explora las prendas publicadas en nuestro catálogo.</p></div><div><span>03 / EVOLUCIÓN</span><h2>Un mundo por venir</h2><p>Comenzamos con moda. La tecnología será parte de nuestro futuro.</p></div></section>
 @if(collections().length){<section class="featured"><p class="eyebrow">Edición Blessrom</p><h2>Colecciones destacadas</h2><div class="collection-grid">
 @for(collection of collections();track collection.id){<article class="collection"><a [routerLink]="['/coleccion',collection.slug]">
 @if(image(collection.cover_image_url);as cover){<img [src]="cover" [alt]="collection.name" loading="lazy">}@else if(firstImage(collection);as productImage){<img [src]="productImage" [alt]="collection.name" loading="lazy">}@else{<div class="collection-placeholder">B</div>}
 <div><span>{{collection.products.length}} prendas</span><h3>{{collection.name}}</h3><p>{{collection.description}}</p><strong>Explorar colección ↗</strong></div></a></article>}
 </div></section>}
 </main>`,
 styles:[`
 main{max-width:1440px;margin:auto;padding:50px 6%}.hero{display:grid;grid-template-columns:1fr 1.1fr;align-items:center;gap:50px}.hero h1{margin:25px 0}.intro{color:#5c6879;margin-bottom:30px}.origin{font-size:11px;margin-top:40px;color:#69778b;letter-spacing:1px}.art{height:480px;background:#e3eaf2;position:relative;overflow:hidden;border-radius:150px 8px 8px 8px}.art>span{position:absolute;right:25px;top:25px;letter-spacing:4px;font-size:10px}.sun{width:130px;height:130px;background:#c8a578;border-radius:50%;position:absolute;left:45%;top:18%}.hill{position:absolute;width:650px;height:350px;border-radius:50%;transform:rotate(-28deg)}.one{background:#8babc4;left:-120px;top:200px}.two{background:#416888;left:80px;top:250px}.three{background:#183c61;left:-200px;top:340px}.art p{position:absolute;bottom:20px;left:30px;color:white;font-family:Georgia,serif;font-size:26px}.values{display:grid;grid-template-columns:repeat(3,1fr);gap:35px;margin:65px 0 10px;border-top:1px solid var(--line);padding-top:35px}.values span{font-size:10px;letter-spacing:1.5px;color:var(--gold)}.values p{font-size:14px;color:#5c6879}.values h2{font-size:25px}@media(max-width:760px){main{padding:30px 20px}.hero{grid-template-columns:1fr;gap:20px}.art{height:330px}.values{grid-template-columns:1fr;gap:20px}.origin{margin-top:22px}}
 .featured{margin:80px 0 20px}.featured>h2{font-size:42px;margin:12px 0 30px}.collection-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px}.collection{background:white;border:1px solid var(--line);border-radius:12px;overflow:hidden}.collection a{display:grid;grid-template-columns:minmax(180px,42%) 1fr;min-height:310px}.collection img,.collection-placeholder{width:100%;height:100%;min-height:310px;object-fit:cover;object-position:center top;background:#e4ebf3}.collection-placeholder{display:grid;place-items:center;font:80px Georgia;color:#173554}.collection a>div:last-child{padding:35px}.collection span{font-size:10px;letter-spacing:1.5px;color:var(--gold);text-transform:uppercase}.collection h3{font-size:30px;margin:16px 0}.collection p{color:#5c6879;line-height:1.55}.collection strong{display:block;margin-top:25px;color:#174f96}@media(max-width:900px){.collection-grid{grid-template-columns:1fr}}@media(max-width:560px){.collection a{grid-template-columns:1fr}.collection img,.collection-placeholder{height:280px;min-height:280px}}
 `]
})
export class Home {
 private readonly http=inject(HttpClient);
 private readonly seo=inject(SeoService);
 readonly collections=signal<StorefrontCollection[]>([]);readonly image=safeImage;
 constructor(){this.seo.update({title:'Blessrom | Moda desde Tarapoto',description:'Descubre prendas Blessrom inspiradas en la naturaleza y energía de Tarapoto. Compra moda en Perú con precios en soles.',path:'/',jsonLd:{'@context':'https://schema.org','@type':'WebSite',name:'Blessrom',url:'https://blessrom.com',potentialAction:{'@type':'SearchAction',target:'https://blessrom.com/catalogo?q={search_term_string}','query-input':'required name=search_term_string'}}});this.http.get<Storefront>('/api/v1/storefront').subscribe({next:value=>this.collections.set(value.featuredCollections)});}
 firstImage(collection:StorefrontCollection){return safeImage(collection.products.find(product=>product.content?.imageUrl)?.content?.imageUrl);}
 price(collection:StorefrontCollection){const values=collection.products.flatMap(product=>product.content?.variants.map(variant=>Number(variant.price))??[]);return values.length?money(Math.min(...values)):'';}
}
