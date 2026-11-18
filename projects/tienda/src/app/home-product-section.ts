import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublishedHomeSection } from '../../../../shared/home-sections';
import { safeImage } from '../../../../shared/commerce';
import { ProductCard } from './product-card';

@Component({selector:'app-home-product-section',imports:[RouterLink,ProductCard],template:`
@if(section.presentation==='VISUAL'){
 @if(coverDesktop();as desktop){<section class="visual" [attr.aria-label]="section.title">
  <h2 class="sr-only">{{section.title}}</h2>
  <picture>@if(coverMobile();as mobile){<source media="(max-width:650px)" [srcset]="mobile">}<img [src]="desktop" [alt]="section.desktopMedia?.alt_text || section.title" loading="lazy" width="2160" height="720"></picture>
  <a class="visual-cta" [routerLink]="sectionLink()">{{section.ctaLabel?.trim() || (section.kind==='CATEGORY'?'Ver categoría':'Ver colección')}} <span aria-hidden="true">↗</span></a>
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
:host{display:block;min-width:0;max-width:100%}.products-section,.visual{margin:0 3%;padding:30px 0 45px;min-width:0}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}.heading h2{font:clamp(25px,2.7vw,38px) Georgia,serif;margin:0;color:#14243e}.heading-actions{display:flex;align-items:center;gap:10px}.heading-actions>a{color:#805a2c;text-decoration:underline;text-underline-offset:5px;font-size:14px;white-space:nowrap}.heading-actions button{width:44px;height:44px;flex:0 0 44px;border-radius:50%;background:#14243e;color:white;font-size:26px;line-height:1}.heading-actions button:focus-visible,.visual-cta:focus-visible{outline:3px solid #d1a969;outline-offset:3px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.track{display:flex;width:100%;min-width:0;max-width:100%;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-inline:contain;padding-bottom:8px}.track::-webkit-scrollbar{display:none}.track>app-product-card{flex:0 0 calc((100% - 54px)/4);scroll-snap-align:start}.track.three>app-product-card{flex-basis:calc((100% - 36px)/3)}.visual{position:relative;overflow:hidden;padding:0;background:#eee9e1;border-radius:12px;aspect-ratio:3/1}.visual picture,.visual picture img{display:block;width:100%;height:100%}.visual picture img{object-fit:cover}.visual-cta{position:absolute;left:50%;bottom:25px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:12px;min-height:48px;padding:0 24px;border-radius:6px;background:#14243e;color:white;white-space:nowrap;font-weight:700;text-decoration:none;box-shadow:0 5px 15px #14243e4d}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.track>app-product-card,.track.three>app-product-card{flex-basis:calc((100% - 18px)/2)}}@media(max-width:650px){.products-section{margin:0 16px;padding:24px 0}.visual{margin:0 16px;aspect-ratio:4/5}.heading{align-items:flex-start}.heading-actions>a{display:none}.track>app-product-card,.track.three>app-product-card{flex-basis:82%}.grid{grid-template-columns:1fr}.visual-cta{bottom:18px}}
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
 coverDesktop(){return safeImage(this.section.desktopMedia?.urls.original);}
 coverMobile(){return safeImage(this.section.mobileMedia?.urls.original);}
 shift(direction:number){const element=this.track?.nativeElement;if(!element)return;const max=element.scrollWidth-element.clientWidth;if(max<2)return;const left=direction>0&&element.scrollLeft>=max-3?0:direction<0&&element.scrollLeft<=3?max:Math.max(0,Math.min(max,element.scrollLeft+direction*element.clientWidth));element.scrollTo({left,behavior:'smooth'});}
}
