import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Order } from '../../../../shared/commerce';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    localStorage.clear();
    window.dataLayer = [];
    document
      .querySelector<HTMLMetaElement>('meta[name="blessrom-gtm-id"]')
      ?.setAttribute('content', '');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(AnalyticsService);
  });

  it('does not collect events before consent', () => {
    service.search('polo azul', 2);
    expect(window.dataLayer).toEqual([]);
  });

  it('collects anonymous search data after consent', () => {
    service.accept();
    service.search('polo azul', 2);
    expect(window.dataLayer?.at(-1)).toEqual({
      event: 'search',
      search_term: 'polo azul',
      results_count: 2,
    });
  });

  it('records a purchase only once', () => {
    const order = {
      id: 'order-1',
      status: 'PAYMENT_CONFIRMED',
      currency: 'PEN',
      subtotal: '59.90',
      shipping: '0',
      total: '59.90',
      customer: {
        recipient: 'Cliente',
        email: 'cliente@example.com',
        phone: '999999999',
        address: 'Dirección privada',
        districtCode: '220901',
      },
      created_at: '2026-11-02T00:00:00Z',
      reservation_expires_at: '2026-11-02T00:30:00Z',
      items: [
        {
          variant_id: 'variant-1',
          sku: 'POLO-AZUL-M',
          name: 'Polo azul',
          attributes: { color: 'Azul', talla: 'M' },
          quantity: 1,
          unit_price: '59.90',
          line_total: '59.90',
        },
      ],
      history: [],
      payment: null,
      version: 1,
    } satisfies Order;

    service.accept();
    service.purchase(order);
    service.purchase(order);
    expect(window.dataLayer?.filter((item) => item.event === 'purchase').length).toBe(1);
    expect(JSON.stringify(window.dataLayer)).not.toContain('cliente@example.com');
    expect(JSON.stringify(window.dataLayer)).not.toContain('Dirección privada');
  });
});
