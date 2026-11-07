import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Page, Product, StorefrontCollection, safeImage } from '../../../../shared/commerce';
import { HomeHero, HomeSlide } from '../../../../shared/home-hero';
import { SeoService } from './seo.service';
import { StorefrontService } from './storefront.service';
import { ProductCard } from './product-card';

@Component({ selector: 'app-home', imports: [RouterLink, HomeHero, ProductCard], template: `
<main>
  @if(heroSlides().length){<app-home-hero [slides]="heroSlides()" [categories]="storefront.categories()" [collections]="storefront.collections()" />}
  <div class="benefits" aria-label="Comprar en Blessrom"><span><b aria-hidden="true">S/</b> Precios en soles</span><span><b aria-hidden="true">↗</b> Consulta cobertura de envío</span><span><b aria-hidden="true">♙</b> Compra como invitado</span></div>
  <section class="favorites"><div class="section-heading"><h2>Encuentra tu próximo favorito</h2><a routerLink="/catalogo">Ver todo el catálogo ↗</a></div>
    @if(loading()){<p role="status">Preparando el catálogo…</p>}
    @if(error()){<p role="alert">No pudimos cargar las prendas. <button class="text-button" (click)="loadProducts()">Reintentar</button></p>}
    <div class="favorites-grid">@for(product of products();track product.id){<app-product-card [product]="product" [horizontal]="true" />}</div>
    @if(!loading()&&!error()&&!products().length){<p>Estamos preparando nuevas prendas para ti. Vuelve pronto.</p>}
  </section>
  @if(featured().length){<section id="colecciones" class="featured"><div class="section-heading"><div><p class="eyebrow">Edición Blessrom</p><h2>Colecciones para tu día a día</h2></div></div><div class="collections-grid">
    @for(collection of featured();track collection.id){<a class="collection" [routerLink]="['/coleccion',collection.slug]">@if(cover(collection);as url){<img [src]="url" [alt]="collection.name" loading="lazy" width="640" height="480">}<div><h3>{{collection.name}}</h3><p>{{collection.description}}</p><span>Explorar colección ↗</span></div></a>}
  </div></section>}
</main>`, styles: [`
main{max-width:1600px;margin:auto;padding:18px 0 0;min-height:65vh}.benefits{display:grid;grid-template-columns:repeat(3,1fr);padding:24px 3%;background:white;border-bottom:1px solid var(--line);margin:0 3%}.benefits span{display:flex;align-items:center;justify-content:center;gap:18px;font-size:14px}.benefits span+span{border-left:1px solid #cfb89c}.benefits b{color:#946326;font-size:23px;font-weight:400}.favorites,.featured{padding:30px 3% 45px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.section-heading h2{font-size:clamp(25px,2.7vw,38px);margin:0}.section-heading>a{color:#805a2c;text-decoration:underline;text-underline-offset:5px;font-size:14px;white-space:nowrap}.favorites-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.collections-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.collection{display:grid;grid-template-columns:45% 1fr;background:white;border:1px solid var(--line);border-radius:10px;overflow:hidden}.collection img{width:100%;height:100%;min-height:260px;object-fit:cover;object-position:center top}.collection>div{padding:28px}.collection h3{font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0 0 14px}.collection p{font-size:14px;color:#5c6879}.collection span{color:#805a2c;font-size:14px}.text-button{padding:0;background:transparent;color:var(--navy);text-decoration:underline}@media(max-width:1100px){.favorites-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.favorites-grid>app-product-card:last-child{display:none}.collection{grid-template-columns:1fr}.collection img{height:280px}}@media(max-width:650px){main{padding-top:12px}.benefits{padding:18px 0;gap:10px}.benefits span{font-size:10px;gap:6px;flex-direction:column;text-align:center}.benefits b{font-size:20px}.favorites,.featured{padding:28px 16px}.section-heading{align-items:flex-start;gap:12px}.section-heading>a{font-size:11px;white-space:normal;max-width:90px}.favorites-grid{grid-template-columns:1fr;gap:14px}.favorites-grid>app-product-card:last-child{display:block}.collections-grid{grid-template-columns:1fr}.collection{grid-template-columns:42% 1fr}.collection img{height:100%;min-height:230px}.collection>div{padding:20px}.collection h3{font-size:23px}}
`] })
export class Home {
  readonly storefront = inject(StorefrontService);
  private readonly http = inject(HttpClient);
  private readonly seo = inject(SeoService);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  constructor() {
    this.seo.update({ title: 'Blessrom | Moda desde Tarapoto', description: 'Descubre prendas Blessrom inspiradas en la naturaleza y energía de Tarapoto. Compra moda en Perú con precios en soles.', path: '/', jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Blessrom', url: 'https://blessrom.com', potentialAction: { '@type': 'SearchAction', target: 'https://blessrom.com/catalogo?q={search_term_string}', 'query-input': 'required name=search_term_string' } } });
    this.loadProducts();
  }
  loadProducts() { this.loading.set(true); this.error.set(false); this.http.get<Page<Product>>('/api/v1/products', { params: { page: 0, size: 3, sort: 'newest', available: true } }).subscribe({ next: value => { this.products.set(value.items); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } }); }
  featured() { return this.storefront.data()?.featuredCollections.filter(collection => collection.products.length > 0) ?? []; }
  heroSlides():HomeSlide[]{
    const home=this.storefront.data()?.home;
    if(home?.slides?.length)return home.slides.filter(item=>item.content.enabled!==false&&!!item.heroMedia).map(item=>({content:item.content,media:item.heroMedia??null,mobileMedia:item.mobileMedia??null,label:item.content.eyebrow||item.content.title}));
    return home?.heroMedia?[{content:home.content,media:home.heroMedia,label:home.content.eyebrow||home.content.title}]:[];
  }
  cover(collection: StorefrontCollection) { const product = collection.products.find(item => item.content?.imageUrl || item.content?.media?.length); return safeImage(collection.cover_image_url ?? product?.content?.media?.[0]?.urls.medium ?? product?.content?.imageUrl); }
}
