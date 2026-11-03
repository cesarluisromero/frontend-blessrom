import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Page, Product, ProductFacets, errorMessage, money } from '../../../../shared/commerce';
import { SeoService } from './seo.service';
import { AnalyticsService } from './analytics.service';
import { StorefrontService } from './storefront.service';
import { ProductCard } from './product-card';

@Component({ selector: 'app-catalog', imports: [FormsModule, RouterLink, ProductCard], template: `
<main>
  <p class="eyebrow"><a routerLink="/">Blessrom</a> / Catálogo</p>
  <div class="catalog-heading"><div><h1>Encuentra tu estilo.</h1><p>Prendas para acompañarte a tu ritmo.</p></div><button class="filter-toggle secondary" (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()" aria-controls="catalog-filters">Filtros y búsqueda {{activeFilters().length ? '('+activeFilters().length+')' : ''}}</button></div>
  <div class="catalog-layout">
    <form id="catalog-filters" class="filters" [class.open]="filtersOpen()" (ngSubmit)="search()">
      <div class="filter-heading"><h2>Filtrar prendas</h2><button class="text-button" type="button" (click)="clear()">Limpiar</button></div>
      <label>Nombre o SKU<input name="q" [(ngModel)]="query" type="search" maxlength="100" placeholder="¿Qué estás buscando?"></label>
      <label>Categoría<select name="category" [(ngModel)]="category"><option value="">Todas las categorías</option>@for(item of storefront.categories();track item.id){<option [value]="item.id">{{item.name}}</option>}</select></label>
      <label>Colección<select name="collection" [(ngModel)]="collection"><option value="">Todas las colecciones</option>@for(item of storefront.collections();track item.id){<option [value]="item.id">{{item.name}}</option>}</select></label>
      <label>Color<select name="color" [(ngModel)]="color"><option value="">Todos los colores</option>@if(color&&!hasFacet('colors',color)){<option [value]="color">{{color}}</option>}@for(item of facets()?.colors ?? [];track item.value){<option [value]="item.value">{{item.label}} ({{item.count}})</option>}</select></label>
      <label>Talla<select name="talla" [(ngModel)]="talla"><option value="">Todas las tallas</option>@if(talla&&!hasFacet('sizes',talla)){<option [value]="talla">{{talla}}</option>}@for(item of facets()?.sizes ?? [];track item.value){<option [value]="item.value">{{item.label}} ({{item.count}})</option>}</select></label>
      <fieldset class="price-filter"><legend>Precio en soles</legend><div><label>Desde<input name="minPrice" [(ngModel)]="minPrice" type="number" min="0" step="0.01" placeholder="0"></label><label>Hasta<input name="maxPrice" [(ngModel)]="maxPrice" type="number" min="0" step="0.01" placeholder="Sin límite"></label></div>@if(facets()?.price;as range){@if(range.min!==null&&range.max!==null){<small>En esta selección: {{money(range.min)}} – {{money(range.max)}}</small>}}</fieldset>
      <label class="check"><input name="available" [(ngModel)]="available" type="checkbox"> Solo con stock</label>
      <button class="apply" type="submit" [disabled]="loading()">Aplicar filtros</button>
    </form>
    <section class="results" aria-label="Resultados del catálogo" [attr.aria-busy]="loading()">
      <div class="results-bar"><p role="status">{{loading() ? 'Buscando prendas…' : total()+' productos'}}</p><label>Ordenar <select name="sort" [(ngModel)]="sort" (ngModelChange)="search()"><option value="newest">Novedades</option><option value="name">Nombre</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select></label></div>
      @if(activeFilters().length){<div class="chips" aria-label="Filtros aplicados">@for(filter of activeFilters();track filter.key){<button type="button" (click)="removeFilter(filter.key)" [attr.aria-label]="'Quitar filtro '+filter.label">{{filter.label}} ×</button>}</div>}
      @if(error()){<div class="empty" role="alert"><h2>No pudimos cargar el catálogo</h2><p>{{error()}}</p><button (click)="load()">Reintentar</button></div>}
      @if(!error()&&!loading()&&!items().length){<div class="empty"><h2>No encontramos prendas con estos filtros.</h2><p>Prueba otra talla, color o rango de precios.</p><button class="secondary" (click)="clear()">Ver todo el catálogo</button></div>}
      <div class="product-grid">@for(product of items();track product.id){<app-product-card [product]="product" />}</div>
      @if(total()>size){<nav class="pagination" aria-label="Páginas del catálogo"><button class="secondary" (click)="change(-1)" [disabled]="page===0||loading()">← Anterior</button><span>Página {{page+1}} de {{pages()}}</span><button class="secondary" (click)="change(1)" [disabled]="(page+1)*size>=total()||loading()">Siguiente →</button></nav>}
    </section>
  </div>
</main>`, styleUrl: './catalog.scss' })
export class Catalog {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  readonly storefront = inject(StorefrontService);
  readonly items = signal<Product[]>([]);
  readonly facets = signal<ProductFacets | null>(null);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly filtersOpen = signal(false);
  readonly error = signal('');
  private request?: Subscription;
  query = ''; category = ''; collection = ''; color = ''; talla = '';
  minPrice: number | null = null; maxPrice: number | null = null;
  available = false; sort = 'newest'; page = 0; readonly size = 12; readonly money = money;
  constructor() {
    this.seo.update({title:'Catálogo | Blessrom',description:'Explora prendas, colores, tallas y colecciones Blessrom. Compra moda en Perú.',path:'/catalogo'});
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params => { this.readParams(params); this.load(); });
    this.destroy.onDestroy(() => this.request?.unsubscribe());
  }
  private number(value: string | null) { const n = value === null || value === '' ? NaN : Number(value); return Number.isFinite(n) && n >= 0 ? n : null; }
  private readParams(params: ParamMap) {
    this.query = (params.get('q') ?? '').slice(0,100); this.category = params.get('category') ?? ''; this.collection = params.get('collection') ?? ''; this.color = params.get('color') ?? ''; this.talla = params.get('talla') ?? '';
    this.minPrice = this.number(params.get('minPrice')); this.maxPrice = this.number(params.get('maxPrice')); this.available = params.get('available') === 'true'; this.sort = ['name','newest','price-asc','price-desc'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'newest'; this.page = Math.max(0,Math.floor(this.number(params.get('page')) ?? 0));
  }
  private params() {
    const params: Record<string,string|number|boolean> = { page:this.page, sort:this.sort };
    for (const [key,value] of Object.entries({q:this.query.trim(),category:this.category,collection:this.collection,color:this.color,talla:this.talla,minPrice:this.minPrice,maxPrice:this.maxPrice,available:this.available||null})) if(value!==''&&value!==null) params[key]=value;
    return params;
  }
  private navigate() { void this.router.navigate([], {relativeTo:this.route,queryParams:this.params()}).then(changed => { if(!changed) this.load(); }); }
  search() { if(this.minPrice!==null&&this.maxPrice!==null&&this.minPrice>this.maxPrice){this.error.set('El precio mínimo debe ser menor o igual al máximo.');return;} this.page=0;this.filtersOpen.set(false);this.navigate(); }
  clear() { this.query=this.category=this.collection=this.color=this.talla='';this.minPrice=this.maxPrice=null;this.available=false;this.sort='newest';this.page=0;this.navigate(); }
  change(delta:number) { if(this.loading())return;const next=this.page+delta;if(next<0||next>=this.pages())return;this.page=next;this.navigate();window.scrollTo({top:0,behavior:'smooth'}); }
  pages() { return Math.max(1,Math.ceil(this.total()/this.size)); }
  hasFacet(key:'colors'|'sizes',value:string) { return this.facets()?.[key].some(item=>item.value===value); }
  activeFilters() { const params=this.route.snapshot.queryParamMap;return ['q','category','collection','color','talla','minPrice','maxPrice','available'].filter(key=>params.has(key)&&params.get(key)!=='').map(key=>({key,label:key==='available'?'Con stock':key==='category'?(this.storefront.categories().find(item=>item.id===params.get(key))?.name??'Categoría'):key==='collection'?(this.storefront.collections().find(item=>item.id===params.get(key))?.name??'Colección'):key==='minPrice'?'Desde S/ '+params.get(key):key==='maxPrice'?'Hasta S/ '+params.get(key):params.get(key)!})); }
  removeFilter(key:string) { void this.router.navigate([], {relativeTo:this.route,queryParams:{[key]:null,page:0},queryParamsHandling:'merge'}); }
  load() { this.request?.unsubscribe();this.loading.set(true);this.error.set('');this.request=this.http.get<Page<Product>>('/api/v1/products',{params:{...this.params(),size:this.size,includeFacets:true}}).subscribe({next:value=>{this.items.set(value.items);this.total.set(value.total);this.facets.set(value.facets??null);this.loading.set(false);if(this.query.trim())this.analytics.search(this.query.trim(),value.total);},error:error=>{this.items.set([]);this.error.set(errorMessage(error));this.loading.set(false);}}); }
}
