import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product, ProductMedia, money, safeImage } from '../../../../shared/commerce';

export function mediaSrcset(media?: ProductMedia | null): string | null {
  if (!media) return null;
  return (['thumbnail', 'medium', 'large'] as const).map((key, index) => {
    const url = safeImage(media.urls[key]);
    return url ? `${url} ${[320, 720, 1200][index]}w` : null;
  }).filter(Boolean).join(', ') || null;
}

@Component({ selector: 'app-product-card', imports: [RouterLink], template: `
  @if(product.content; as content) {
    <a class="product-card" [class.horizontal]="horizontal" [routerLink]="['/producto',product.id]">
      <div class="picture">@if(image();as url){<img [src]="url" [attr.srcset]="srcset()" [attr.sizes]="horizontal ? '(max-width:600px) 42vw, 18vw' : '(max-width:600px) 46vw, (max-width:1000px) 30vw, 22vw'" [alt]="media()?.alt_text || content.name" loading="lazy" width="480" height="600">}@else{<div class="placeholder">Fotografía pendiente</div>}</div>
      <div class="copy"><h3>{{content.name}}</h3><p class="price">Desde {{price()}}</p><div class="attributes">@for(value of colors();track value){<span class="color-option" [style.background-color]="colorStyle(value)" [attr.title]="value"><span>{{value}}</span></span>}</div><span class="details">Ver detalles <span aria-hidden="true">↗</span></span></div>
    </a>
  }
`, styles: [`
:host{display:block;min-width:0}.product-card{display:block;background:white;border:1px solid var(--line);border-radius:8px;overflow:hidden;height:100%}.picture{background:#eeede9;overflow:hidden}.picture img,.placeholder{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center top;height:auto;transition:transform .25s}.product-card:hover img{transform:scale(1.025)}.placeholder{display:grid;place-items:center;color:#68717d;font-size:12px}.copy{padding:18px}h3{font-family:Arial,sans-serif;font-weight:600;font-size:17px;line-height:1.35;margin:0 0 12px}.price{margin:0 0 12px;font-size:16px}.attributes{display:flex;gap:6px;flex-wrap:wrap;min-height:22px;margin-bottom:20px}.color-option{display:inline-flex;align-items:center;justify-content:center;min-width:38px;min-height:24px;border:1px solid #c8d0da;border-radius:16px;padding:2px 8px;color:#14243e;box-shadow:inset 0 0 0 1px #ffffff80}.color-option span{font-size:10px;background:#ffffffcc;border-radius:10px;padding:2px 4px}.details{color:#805a2c;text-decoration:underline;text-underline-offset:4px;font-size:13px;display:flex;justify-content:space-between;align-items:center}.horizontal{display:grid;grid-template-columns:48% 1fr}.horizontal .picture img,.horizontal .placeholder{height:100%;min-height:220px;object-fit:cover}.horizontal .copy{padding:22px 18px;display:flex;flex-direction:column}.horizontal .details{margin-top:auto}.horizontal h3{font-size:18px}@media(max-width:600px){.copy{padding:12px}h3{font-size:14px}.price{font-size:14px}.attributes{margin-bottom:12px;gap:4px}.color-option{font-size:9px}.horizontal .copy{padding:16px}.horizontal h3{font-size:16px}.horizontal .picture img{min-height:200px}}
`] })
export class ProductCard {
  @Input({ required: true }) product!: Product;
  @Input() horizontal = false;
  media() { return this.product.content?.media?.find(item => item.is_primary) ?? this.product.content?.media?.[0]; }
  image() { return safeImage(this.media()?.urls.medium ?? this.product.content?.imageUrl); }
  srcset() { return mediaSrcset(this.media()); }
  price() { const prices = this.product.content?.variants.filter(item => item.enabled).map(item => Number(item.price)) ?? []; return money(prices.length ? Math.min(...prices) : 0); }
  colors() { const variants = this.product.content?.variants.filter(item => item.enabled) ?? []; const key = Object.keys(variants[0]?.attributes ?? {}).find(item => item.toLowerCase() === 'color'); return key ? [...new Set(variants.map(item => item.attributes[key]).filter(Boolean))] : []; }
  colorStyle(value:string) { const named:Record<string,string> = {rojo:'#c62828',azul:'#24579b',verde:'#3f6b4b',negro:'#202124',blanco:'#f8f8f8',amarillo:'#e0ad24',rosado:'#d77a91',morado:'#7653a6',gris:'#8b929b',beige:'#c7ad82',marron:'#8b5e3c',cafe:'#8b5e3c',naranja:'#d97828'}; const normalized=value.trim().toLowerCase(); return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : named[normalized] ?? '#dfe4ea'; }
}
