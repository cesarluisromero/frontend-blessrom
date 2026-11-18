import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category, Collection, HomeContent, HomeLink, HomeSlideContent, HomeSlideTransition, ProductMedia, safeImage } from './commerce';
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
  slideIntervalSeconds: 6,
  slideTransition: 'FADE',
};

export interface HomeSlide {
  content: HomeContent | HomeSlideContent;
  media: ProductMedia | null;
  mobileMedia?: ProductMedia | null;
  label?: string;
}

@Component({
  selector: 'app-home-hero',
  imports: [RouterLink],
  styleUrl: './home-hero.scss',
  template: `
    @if (current(); as slide) {
      <section class="home-slider" [class.preview]="preview" [class.mobile-preview]="preview && forceMobile" [class]="transitionClass()"
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
        @if (hasVisibleCopy(slide) && slide.content.overlayEnabled !== false) { <div class="shade" [style.--overlay-rgb]="overlayRgb(slide)" [style.--overlay-alpha]="overlayAlpha(slide)" [style.--overlay-coverage]="overlayCoverage(slide)"></div> }
        @if (slides.length > 1 && !preview) {
          <button type="button" class="nav-arrow previous" (click)="previous()" aria-label="Diapositiva anterior">‹</button>
          <button type="button" class="nav-arrow next" (click)="next()" aria-label="Diapositiva siguiente">›</button>
        }
        @if (hasVisibleCopy(slide)) { <div class="hero-copy" aria-live="polite">
          @if (slide.content.eyebrow?.trim()) { <p class="hero-eyebrow">{{ slide.content.eyebrow }}</p> }
          @if (slide.content.title?.trim()) { <h1>{{ slide.content.title }}</h1> }
          @if (slide.content.description?.trim()) { <p class="hero-description">{{ slide.content.description }}</p> }
          @if (slide.content.primary?.label?.trim() || slide.content.secondary?.label?.trim()) { <div class="hero-actions">
            @if (slide.content.primary?.label?.trim() && link(slide.content.primary); as primary) {
              @if (preview) { <span class="hero-primary">{{ slide.content.primary.label }}</span> }
              @else {
                <a class="hero-primary" [routerLink]="primary.path" [fragment]="primary.fragment">
                  {{ slide.content.primary.label }} <span aria-hidden="true">↗</span>
                </a>
              }
            }
            @if (slide.content.secondary?.label?.trim() && slide.content.secondary; as secondary) {
              @if (link(secondary); as target) {
                @if (preview) { <span class="hero-secondary">{{ secondary.label }}</span> }
                @else { <a class="hero-secondary" [routerLink]="target.path" [fragment]="target.fragment">{{ secondary.label }} →</a> }
              }
            }
          </div> }
        </div> }
        @if (slides.length > 1 && !preview) {
          <button type="button" class="pause-accessible" (click)="togglePause()"
            [attr.aria-label]="paused ? 'Reanudar carrusel' : 'Pausar carrusel'">{{ paused ? 'Reanudar carrusel' : 'Pausar carrusel' }}</button>
        }
      </section>
    }
  `,
})
export class HomeHero implements OnInit, OnDestroy {
  hasVisibleCopy(slide: HomeSlide): boolean {
    const content = slide.content;
    return !!(content.eyebrow?.trim() || content.title?.trim() || content.description?.trim()
      || content.primary?.label?.trim() || content.secondary?.label?.trim());
  }
  overlayRgb(slide: HomeSlide): string {
    const hex = /^#[0-9a-f]{6}$/i.test(slide.content.overlayColor ?? '') ? slide.content.overlayColor! : '#07182f';
    return [1,3,5].map(offset => parseInt(hex.slice(offset,offset+2),16)).join(' ');
  }
  overlayAlpha(slide: HomeSlide): number { return Math.max(0,Math.min(100,slide.content.overlayOpacity ?? 95))/100; }
  overlayCoverage(slide: HomeSlide): string { return Math.max(20,Math.min(100,slide.content.overlayCoverage ?? 75))+'%'; }
  @Input() content: HomeContent = DEFAULT_HOME;
  @Input() media: ProductMedia | null | undefined = null;
  @Input() categories: Category[] = [];
  @Input() collections: Collection[] = [];
  @Input() preview = false;
  @Input() forceMobile = false;
  @Input() slides: HomeSlide[] = [];
  @Input() slideIntervalSeconds = 6;
  @Input() slideTransition: HomeSlideTransition = 'FADE';

  readonly index = signal(0);
  readonly transitionStep = signal(0);
  readonly image = safeImage;
  paused = false;
  pauseOnHover = false;
  private timer?: ReturnType<typeof setInterval>;
  private touchX: number | null = null;

  ngOnInit() {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (this.preview || this.slides.length <= 1 || reduce) return;
    const seconds = Number.isInteger(this.slideIntervalSeconds) && this.slideIntervalSeconds >= 3 && this.slideIntervalSeconds <= 30 ? this.slideIntervalSeconds : 6;
    this.timer = setInterval(() => {
      if (!this.paused && !this.pauseOnHover && !document.hidden) this.next();
    }, seconds * 1000);
  }

  ngOnDestroy() { if (this.timer !== undefined) clearInterval(this.timer); }
  current(): HomeSlide { return this.slides[this.index()] ?? this.slides[0] ?? { content: this.content, media: this.media ?? null }; }
  go(index: number) { const next=Math.max(0,Math.min(index,this.slides.length-1));if(next!==this.index()){this.index.set(next);this.transitionStep.update(step=>step+1);} }
  transitionClass() { return this.preview || !this.transitionStep() ? '' : 'transition-'+this.slideTransition.toLowerCase()+'-'+this.transitionStep()%2; }
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
