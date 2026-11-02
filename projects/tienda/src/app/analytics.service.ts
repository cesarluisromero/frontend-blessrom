import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CartLine, Order, Product } from '../../../../shared/commerce';

type Consent = 'accepted' | 'rejected' | null;
type DataLayerEvent = { event: string; [key: string]: unknown };
declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

const CONSENT_KEY = 'blessrom-analytics-consent-v1';
const PURCHASE_KEY = 'blessrom-analytics-purchases-v1';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly containerId = this.readContainerId();
  readonly consent = signal<Consent>(this.readConsent());
  constructor() {
    if (this.consent() === 'accepted') this.enable();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) =>
        this.track('page_view', {
          page_path: this.cleanPath(event.urlAfterRedirects),
          page_title: this.document.title,
        }),
      );
  }
  accept(): void {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    this.consent.set('accepted');
    this.enable();
    this.track('consent_update', { analytics_storage: 'granted' });
    this.track('page_view', {
      page_path: this.cleanPath(this.router.url),
      page_title: this.document.title,
    });
  }
  reject(): void {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    this.consent.set('rejected');
  }
  resetConsent(): void {
    localStorage.removeItem(CONSENT_KEY);
    this.consent.set(null);
  }
  track(event: string, parameters: Record<string, unknown> = {}): void {
    if (this.consent() !== 'accepted') return;
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...parameters });
  }
  viewItem(product: Product): void {
    const content = product.content;
    if (!content) return;
    const variants = content.variants.filter((item) => item.enabled);
    const price = this.minPrice(variants.map((item) => item.price));
    this.track('view_item', {
      currency: 'PEN',
      value: price,
      items: [{ item_id: product.id, item_name: content.name, item_category: product.slug, price }],
    });
  }
  addToCart(product: Product, variantId: string, quantity: number): void {
    const content = product.content;
    const variant = content?.variants.find((item) => item.id === variantId);
    if (!content || !variant) return;
    this.track('add_to_cart', {
      currency: 'PEN',
      value: Number(variant.price) * quantity,
      items: [
        {
          item_id: variantId,
          item_name: content.name,
          item_variant: variant.sku,
          price: Number(variant.price),
          quantity,
        },
      ],
    });
  }
  viewCart(items: CartLine[]): void {
    this.track('view_cart', this.cartPayload(items));
  }
  removeFromCart(item: CartLine): void {
    this.track('remove_from_cart', {
      currency: 'PEN',
      value: Number(item.lineTotal ?? 0),
      items: [this.cartItem(item)],
    });
  }
  beginCheckout(items: CartLine[], value: number, coupon?: string | null): void {
    this.track('begin_checkout', {
      ...this.cartPayload(items),
      value,
      coupon: coupon || undefined,
    });
  }
  addPaymentInfo(order: Order, method: string): void {
    this.track('add_payment_info', {
      currency: order.currency,
      value: Number(order.total),
      payment_type: method,
      items: this.orderItems(order),
    });
  }
  purchase(order: Order): void {
    if (this.consent() !== 'accepted') return;
    if (this.wasPurchased(order.id)) return;
    this.track('purchase', {
      transaction_id: order.id,
      currency: order.currency,
      value: Number(order.total),
      shipping: Number(order.shipping),
      coupon: order.coupon_code || undefined,
      items: this.orderItems(order),
    });
    this.rememberPurchase(order.id);
  }
  search(term: string, results: number): void {
    this.track('search', { search_term: term.slice(0, 100), results_count: results });
  }
  assistant(action: 'open' | 'message' | 'recommendation', products = 0): void {
    this.track('assistant_interaction', { assistant_action: action, products_count: products });
  }
  private enable(): void {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: 'consent_default',
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    if (!this.containerId || this.document.getElementById('blessrom-gtm')) return;
    const script = this.document.createElement('script');
    script.id = 'blessrom-gtm';
    script.async = true;
    script.src =
      'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(this.containerId);
    this.document.head.appendChild(script);
  }
  private readContainerId(): string {
    const value =
      this.document
        .querySelector<HTMLMetaElement>('meta[name="blessrom-gtm-id"]')
        ?.content.trim() ?? '';
    return /^GTM-[A-Z0-9]+$/.test(value) ? value : '';
  }
  private readConsent(): Consent {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  }
  private cleanPath(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
  private minPrice(values: (string | number)[]): number {
    const numbers = values.map(Number).filter(Number.isFinite);
    return numbers.length ? Math.min(...numbers) : 0;
  }
  private cartItem(item: CartLine) {
    return {
      item_id: item.variantId,
      item_name: item.name ?? item.sku,
      item_variant: item.sku,
      price: Number(item.unitPrice ?? 0),
      quantity: item.quantity,
    };
  }
  private cartPayload(items: CartLine[]) {
    return {
      currency: 'PEN',
      value: items.reduce((total, item) => total + Number(item.lineTotal ?? 0), 0),
      items: items.map((item) => this.cartItem(item)),
    };
  }
  private orderItems(order: Order) {
    return order.items.map((item) => ({
      item_id: item.variant_id,
      item_name: item.name,
      item_variant: item.sku,
      price: Number(item.unit_price),
      quantity: item.quantity,
    }));
  }
  private purchasedIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem(PURCHASE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  }
  private wasPurchased(id: string): boolean {
    return this.purchasedIds().includes(id);
  }
  private rememberPurchase(id: string): void {
    localStorage.setItem(
      PURCHASE_KEY,
      JSON.stringify([...new Set([...this.purchasedIds(), id])].slice(-50)),
    );
  }
}
