import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublishedHomeSection } from '../../../../shared/home-sections';
import { Product, safeImage } from '../../../../shared/commerce';
import { ProductCard } from './product-card';

@Component({selector:'app-home-product-section',imports:[RouterLink,ProductCard],template:`
@if(section.presentation==='VISUAL'){
 @if(visualProducts().length){<section class="visual" [attr.aria-label]="section.title">
  <h2 class="sr-only">{{section.title}}</h2>
  <div class="visual-images">@for(product of visualProducts();track product.id){@if(image(product);as src){<img [src]="src" [alt]="product.content?.name || section.title" loading="lazy" width="480" height="600">}}</div>
  <a class="visual-cta" [routerLink]="sectionLink()">{{section.kind==='CATEGORY'?'Ver categoría':'Ver colección'}} <span aria-hidden="true">↗</span></a>
 </section>}
} @else {
 <section class="products-section" [attr.aria-label]="section.title" (mouseenter)="paused=true" (mouseleave)="paused=false" (focusin)="paused=true" (focusout)="paused=false">
  <div class="heading"><h2>{{section.title}}</h2><div class="heading-actions"><a [routerLink]="sectionLink()">{{section.kind==='BEST_SELLERS'?'Ver catálogo':section.kind==='CATEGORY'?'Ver categoría':'Ver colección'}} ↗</a>
   @if(section.presentation==='CAROUSEL'&&section.products.length>1){<button type="button" (click)="shift(-1)" aria-label="Productos anteriores">‹</button><button type="button" (click)="shift(1)" aria-label="Productos siguientes">›</button>}</div></div>
  @if(section.presentation==='CAROUSEL'){
   <div #track class="track" [class.three]="section.visibleCount===3" [class.four]="section.visibleCount!==3">
    @for(product of section.products;track product.id){<app-product-card [product]="product" />}
   </div>
  } @else {<div class="grid">@for(product of section.products;track product.id){<app-product-card [product]="product" [horizontal]="true" />}</div>}
 </section>
}`,styles:[`
:host{display:block}.products-section,.visual{margin:0 3%;padding:30px 0 45px}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.heading h2{font:clamp(25px,2.7vw,38px) Georgia,serif;margin:0;color:#14243e}.heading-actions{display:flex;align-items:center;gap:10px}.heading-actions>a{color:#805a2c;text-decoration:underline;text-underline-offset:5px;font-size:14px;white-space:nowrap}.heading-actions button{width:44px;height:44px;flex:0 0 44px;border-radius:50%;background:#14243e;color:white;font-size:26px;line-height:1}.heading-actions button:focus-visible,.visual-cta:focus-visible{outline:3px solid #d1a969;outline-offset:3px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.track{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;overscroll-behavior-inline:contain;padding-bottom:8px}.track>app-product-card{flex:0 0 calc((100% - 54px)/4);scroll-snap-align:start}.track.three>app-product-card{flex-basis:calc((100% - 36px)/3)}.visual{position:relative;min-height:370px;background:#eee9e1;border-radius:12px;overflow:hidden;padding:24px}.visual-images{display:flex;align-items:center;justify-content:center;gap:16px;min-height:370px}.visual-images img{width:min(31%,330px);height:370px;object-fit:contain;filter:drop-shadow(0 8px 15px #14243e22)}.visual-cta{position:absolute;left:50%;bottom:25px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:12px;min-height:48px;padding:0 24px;border-radius:6px;background:#14243e;color:white;white-space:nowrap;font-weight:700;text-decoration:none;box-shadow:0 5px 15px #14243e4d}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.track>app-product-card,.track.three>app-product-card{flex-basis:calc((100% - 18px)/2)}}@media(max-width:650px){.products-section,.visual{margin:0 16px;padding:24px 0}.heading{align-items:flex-start}.heading-actions>a{display:none}.track>app-product-card,.track.three>app-product-card{flex-basis:82%}.grid{grid-template-columns:1fr}.visual{padding:16px;min-height:280px}.visual-images{min-height:280px;gap:4px}.visual-images img{height:275px;width:48%}.visual-images img:nth-child(n+3){display:none}.visual-cta{bottom:18px}}
`]})
export class HomeProductSectionComponent implements OnInit,OnDestroy {
 @Input({required:true}) section!:PublishedHomeSection;
 @ViewChild('track') track?:ElementRef<HTMLElement>;
 paused=false;
 private timer?:ReturnType<typeof setInterval>;
 ngOnInit(){if(this.section.presentation!=='CAROUSEL'||!this.section.autoRotate||this.section.products.length<2||typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  this.timer=setInterval(()=>{if(!this.paused&&!document.hidden)this.shift(1);},5500);
 }
 ngOnDestroy(){if(this.timer)clearInterval(this.timer);}
 sectionLink(){return this.section.kind==='CATEGORY'&&this.section.sourceSlug?['/categoria',this.section.sourceSlug]:this.section.kind==='COLLECTION'&&this.section.sourceSlug?['/coleccion',this.section.sourceSlug]:['/catalogo'];}
 image(product:Product){
  const media=product.content?.media??[];
  const stock=product.content?.variants?.find(variant=>variant.enabled&&(variant.available??0)>0);
  const color=Object.entries(stock?.attributes??{}).find(([key])=>key.toLowerCase()==='color')?.[1];
  const assigned=media.filter(item=>item.color_value);
  const matching=color?assigned.filter(item=>item.color_value?.toLowerCase()===color.toLowerCase()):[];
  const chosen=matching.find(item=>item.is_primary)??matching[0]??(assigned.length?undefined:media.find(item=>item.is_primary)??media[0]);
  return safeImage(chosen?.urls.large??chosen?.urls.medium??(assigned.length?null:product.content?.imageUrl));
 }
 visualProducts(){return this.section.products.filter(product=>!!this.image(product)).slice(0,3);}
 shift(direction:number){const element=this.track?.nativeElement;if(!element)return;const max=element.scrollWidth-element.clientWidth;if(max<2)return;const left=direction>0&&element.scrollLeft>=max-3?0:direction<0&&element.scrollLeft<=3?max:Math.max(0,Math.min(max,element.scrollLeft+direction*element.clientWidth));element.scrollTo({left,behavior:'smooth'});}
}
