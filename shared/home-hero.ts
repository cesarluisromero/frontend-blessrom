import { DecimalPipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category, Collection, HomeContent, HomeLink, HomeSlideContent, ProductMedia, safeImage } from './commerce';
import { isFixedHomeCover } from './home-cover';

export const DEFAULT_HOME: HomeContent = {
  eyebrow: 'Esencia natural. Actitud urbana.',
  title: 'Tu estilo. Tu naturaleza.',
  description: 'Prendas para acompañarte a tu ritmo. Descubre una nueva mirada al estilo cotidiano.',
  heroAssetId: null,
  heroAlt: '',
  frameX: 50,
  frameY: 40,
  primary: { label: 'Explorar catálogo', target: { type: 'catalog' } },
  secondary: { label: 'Ver colecciones', target: { type: 'collections' } },
  shortcuts: [],
};

export interface HomeSlide {
  content: HomeContent | HomeSlideContent;
  media: ProductMedia | null;
  mobileMedia?: ProductMedia | null;
  label?: string;
}

@Component({
  selector: 'app-home-hero',
  imports: [RouterLink, DecimalPipe],
  styleUrl: './home-hero.scss',
  template: `
    @if (current(); as slide) {
      <section class="home-slider" [class.preview]="preview" [class.mobile-preview]="preview && forceMobile"
        (mouseenter)="pauseOnHover=true" (mouseleave)="pauseOnHover=false"
        (focusin)="pauseOnHover=true" (focusout)="pauseOnHover=false"
        (touchstart)="startSwipe($event)" (touchend)="endSwipe($event)"
        aria-roledescription="carrusel" aria-label="Promociones de Blessrom">
        <div class="hero-image">
          @if (image(displayMedia(slide)?.urls?.large); as src) {
            @if (legacyBackdrop(slide)) {
              <img class="backdrop" aria-hidden="true" alt="" [src]="src" [style.object-position]="position(slide)">
            }
            <picture>
              @if (!preview && slide.mobileMedia) {
                <source media="(max-width:650px)" [srcset]="srcset(slide.mobileMedia)" sizes="100vw">
              }
              <img class="photo" [src]="src" [attr.srcset]="srcset(displayMedia(slide))" sizes="100vw"
                [alt]="slide.content.heroAlt || displayMedia(slide)?.alt_text || slide.content.title"
                [style.object-position]="position(slide)" [attr.fetchpriority]="index() === 0 ? 'high' : null">
            </picture>
          } @else {
            <div class="landscape" role="img" aria-label="Paisaje abstracto inspirado en Tarapoto">
              <span class="sun"></span><span class="hill back"></span><span class="hill front"></span>
            </div>
          }
        </div>
        <div class="shade"></div>
        @if (slides.length > 1 && !preview) {
          <button type="button" class="nav-arrow previous" (click)="previous()" aria-label="Diapositiva anterior">‹</button>
          <button type="button" class="nav-arrow next" (click)="next()" aria-label="Diapositiva siguiente">›</button>
        }
        <div class="hero-copy" aria-live="polite">
          <p class="hero-eyebrow">{{ slide.content.eyebrow }}</p>
          <h1>{{ slide.content.title }}</h1>
          <p class="hero-description">{{ slide.content.description }}</p>
          <div class="hero-actions">
            @if (link(slide.content.primary); as primary) {
              @if (preview) { <span class="hero-primary">{{ slide.content.primary.label }}</span> }
              @else {
                <a class="hero-primary" [routerLink]="primary.path" [fragment]="primary.fragment">
                  {{ slide.content.primary.label }} <span aria-hidden="true">↗</span>
                </a>
              }
            }
            @if (slide.content.secondary; as secondary) {
              @if (link(secondary); as target) {
                @if (preview) { <span class="hero-secondary">{{ secondary.label }}</span> }
                @else { <a class="hero-secondary" [routerLink]="target.path" [fragment]="target.fragment">{{ secondary.label }} →</a> }
              }
            }
          </div>
        </div>
        @if (slides.length > 1 && !preview) {
          <div class="slider-controls" aria-label="Controles del carrusel">
            <span>{{ index() + 1 | number:'2.0-0' }} / {{ slides.length | number:'2.0-0' }}</span>
            <div class="progress" aria-label="Diapositivas">
              @for (item of slides; track $index) {
                <button type="button" [class.active]="$index === index()" (click)="go($index)"
                  [attr.aria-label]="'Ir a ' + ($index + 1)" [attr.aria-current]="$index === index() ? 'true' : null"></button>
              }
            </div>
            <button type="button" class="pause" (click)="togglePause()"
              [attr.aria-label]="paused ? 'Reanudar carrusel' : 'Pausar carrusel'">{{ paused ? '▶ Reanudar' : 'Ⅱ Pausar' }}</button>
          </div>
        }
      </section>
    }
    @if (slides.length > 1 && !preview) {
      <nav class="slide-tabs" aria-label="Secciones destacadas">
        @for (slide of slides; track $index) {
          <button type="button" [class.active]="$index === index()" (click)="go($index)">
            {{ slide.label || slide.content.eyebrow }}
          </button>
        }
      </nav>
    }
  `,
})
export class HomeHero implements OnInit, OnDestroy {
  @Input() content: HomeContent = DEFAULT_HOME;
  @Input() media: ProductMedia | null | undefined = null;
  @Input() categories: Category[] = [];
  @Input() collections: Collection[] = [];
  @Input() preview = false;
  @Input() forceMobile = false;
  @Input() slides: HomeSlide[] = [];

  readonly index = signal(0);
  readonly image = safeImage;
  paused = false;
  pauseOnHover = false;
  private timer?: ReturnType<typeof setInterval>;
  private touchX: number | null = null;

  ngOnInit() {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (this.preview || this.slides.length <= 1 || reduce) return;
    this.timer = setInterval(() => {
      if (!this.paused && !this.pauseOnHover) this.next();
    }, 6000);
  }

  ngOnDestroy() { if (this.timer !== undefined) clearInterval(this.timer); }
  current(): HomeSlide { return this.slides[this.index()] ?? this.slides[0] ?? { content: this.content, media: this.media ?? null }; }
  go(index: number) { this.index.set(Math.max(0, Math.min(index, this.slides.length - 1))); }
  next() { if (this.slides.length) this.go((this.index() + 1) % this.slides.length); }
  previous() { if (this.slides.length) this.go((this.index() + this.slides.length - 1) % this.slides.length); }
  togglePause() { this.paused = !this.paused; }

  startSwipe(event: TouchEvent) {
    this.touchX = event.changedTouches[0]?.clientX ?? null;
    this.pauseOnHover = true;
  }
  endSwipe(event: TouchEvent) {
    const end = event.changedTouches[0]?.clientX;
    if (this.touchX !== null && end !== undefined && Math.abs(end - this.touchX) > 45) {
      if (end < this.touchX) this.next();
      else this.previous();
    }
    this.touchX = null;
    this.pauseOnHover = false;
  }

  displayMedia(slide: HomeSlide) { return this.forceMobile && slide.mobileMedia ? slide.mobileMedia : slide.media; }
  legacyBackdrop(slide: HomeSlide) { return !this.forceMobile && !isFixedHomeCover(slide.media, 'DESKTOP'); }
  position(slide: HomeSlide) { return slide.content.frameX + '% ' + slide.content.frameY + '%'; }

  link(item: HomeLink): { path: string; fragment?: string } | null {
    switch (item?.target?.type) {
      case 'catalog': return { path: '/catalogo' };
      case 'collections': return { path: '/', fragment: 'colecciones' };
      case 'category': {
        const category = this.categories.find(value => value.id === item.target.id);
        return category ? { path: '/categoria/' + category.slug } : null;
      }
      case 'collection': {
        const collection = this.collections.find(value => value.id === item.target.id);
        return collection ? { path: '/coleccion/' + collection.slug } : null;
      }
      default: return null;
    }
  }

  srcset(media: ProductMedia | null | undefined) {
    const sources = new Map<number, string>();
    for (const object of media?.objects ?? []) {
      const url = safeImage(media?.urls[object.variant]);
      if (url && object.width > 0) sources.set(object.width, url);
    }
    if (sources.size) return [...sources].sort(([a], [b]) => a - b).map(([width, url]) => url + ' ' + width + 'w').join(', ');
    return safeImage(media?.urls.large) ?? '';
  }
}
