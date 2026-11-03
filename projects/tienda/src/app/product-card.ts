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
      <div class="copy"><h3>{{content.name}}</h3><p class="price">Desde {{price()}}</p><div class="attributes">@for(value of attributes();track value){<span>{{value}}</span>}</div><span class="details">Ver detalles <span aria-hidden="true">↗</span></span></div>
    </a>
  }
`, styles: [`
:host{display:block;min-width:0}.product-card{display:block;background:white;border:1px solid var(--line);border-radius:8px;overflow:hidden;height:100%}.picture{background:#eeede9;overflow:hidden}.picture img,.placeholder{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center top;height:auto;transition:transform .25s}.product-card:hover img{transform:scale(1.025)}.placeholder{display:grid;place-items:center;color:#68717d;font-size:12px}.copy{padding:18px}h3{font-family:Arial,sans-serif;font-weight:600;font-size:17px;line-height:1.35;margin:0 0 12px}.price{margin:0 0 12px;font-size:16px}.attributes{display:flex;gap:6px;flex-wrap:wrap;min-height:22px;margin-bottom:20px}.attributes span{font-size:10px;border:1px solid var(--line);border-radius:16px;padding:3px 7px;color:#5c6879}.details{color:#805a2c;text-decoration:underline;text-underline-offset:4px;font-size:13px;display:flex;justify-content:space-between;align-items:center}.horizontal{display:grid;grid-template-columns:48% 1fr}.horizontal .picture img,.horizontal .placeholder{height:100%;min-height:220px;object-fit:cover}.horizontal .copy{padding:22px 18px;display:flex;flex-direction:column}.horizontal .details{margin-top:auto}.horizontal h3{font-size:18px}@media(max-width:600px){.copy{padding:12px}h3{font-size:14px}.price{font-size:14px}.attributes{margin-bottom:12px;gap:4px}.attributes span{font-size:9px}.horizontal .copy{padding:16px}.horizontal h3{font-size:16px}.horizontal .picture img{min-height:200px}}
`] })
export class ProductCard {
  @Input({ required: true }) product!: Product;
  @Input() horizontal = false;
  media() { return this.product.content?.media?.find(item => item.is_primary) ?? this.product.content?.media?.[0]; }
  image() { return safeImage(this.media()?.urls.medium ?? this.product.content?.imageUrl); }
  srcset() { return mediaSrcset(this.media()); }
  price() { const prices = this.product.content?.variants.filter(item => item.enabled).map(item => Number(item.price)) ?? []; return money(prices.length ? Math.min(...prices) : 0); }
  attributes() { return [...new Set(this.product.content?.variants.filter(item => item.enabled).flatMap(item => Object.values(item.attributes)) ?? [])].slice(0, 4); }
}
