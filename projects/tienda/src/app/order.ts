import { Component, effect, signal, inject, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Order, errorMessage, money } from '../../../../shared/commerce';
import { AnalyticsService } from './analytics.service';
import { StorefrontService } from './storefront.service';
interface SavedOrder {
  order: Order;
  token: string;
}
@Component({
  selector: 'app-order',
  imports: [RouterLink, DatePipe, FormsModule],
  template: `<main>
    @if (error()) {
      <p class="alert" role="alert">{{ error() }}</p>
    }
    @if (order(); as o) {
      <p class="eyebrow">Pedido recibido</p>
      <h1>Gracias por tu compra</h1>
      <p>
        Pedido <strong>{{ o.orderNumber ?? o.id }}</strong>
      </p>
      <p>
        Estado: <strong>{{ status(o.status) }}</strong>
      </p>
      <p>
        @if(o.status === 'PENDING_PAYMENT'){La reserva vence: {{ o.reservation_expires_at | date: 'dd/MM/yyyy HH:mm' : '-0500' }} (Perú)}
      </p>
      <section>
        @for (i of o.items; track i.variant_id) {
          <p>
            {{ i.quantity }} × {{ i.name }} <strong>{{ money(i.line_total) }}</strong>
          </p>
        }
        <p>
          Subtotal <strong>{{ money(o.subtotal) }}</strong>
        </p>
        @if (+(o.discount ?? 0) > 0) {
          <p>
            Descuento
            @if (o.coupon_code) {
              ({{ o.coupon_code }})
            }
            <strong>-{{ money(o.discount ?? 0) }}</strong>
          </p>
        }
        <p>
          Envío <strong>{{ money(o.shipping) }}</strong>
        </p>
        <h2>Total: {{ money(o.total) }}</h2>
      </section>
      @if (o.status === 'PENDING_PAYMENT') {
        @if (o.payment; as p) {
          <section>
            <h2>Pago: {{ paymentStatus(p.status) }}</h2>
            <p>
              Método <strong>{{ method(p.method) }}</strong>
            </p>
            @if (p.reference) {
              <p>
                Referencia <strong>{{ p.reference }}</strong>
              </p>
            }
            @if (p.review_note) {
              <p>
                Observación <strong>{{ p.review_note }}</strong>
              </p>
            }
            @if (p.method === 'MERCADO_PAGO' && p.status === 'PENDING_PROVIDER' && p.checkout_url) {
              <a class="button" [href]="p.checkout_url">Continuar pago en Mercado Pago</a>
            }
          </section>
          @if (p.status === 'REJECTED') {
            <p>Corrige los datos y vuelve a enviar el pago.</p>
          }
        }
        @if (!o.payment || o.payment.status === 'REJECTED') {
          @if(paymentEnabled('MERCADO_PAGO')){<section class="online">
            <h2>Pago en línea</h2>
            <p>Tarjetas, Yape y medios disponibles en Mercado Pago.</p>
            <button type="button" [disabled]="busy()" (click)="startMercadoPago()">
              Pagar con Mercado Pago
            </button>
          </section>}
          @if(hasManualPayment()){
          <form #paymentForm="ngForm" (ngSubmit)="submitPayment(paymentForm)">
            <fieldset [disabled]="busy()">
              <h2>O registrar un pago manual</h2>
              <label
                >Método<select name="method" [(ngModel)]="paymentMethod" required>
                  <option value="" disabled>Selecciona un medio de pago</option>
                  @if(paymentEnabled('YAPE')){<option value="YAPE">Yape</option>}
                  @if(paymentEnabled('PLIN')){<option value="PLIN">Plin</option>}
                  @if(paymentEnabled('BANK_TRANSFER')){<option value="BANK_TRANSFER">Transferencia bancaria</option>}
                  @if(paymentEnabled('CASH_ON_DELIVERY')){<option value="CASH_ON_DELIVERY">Pago contra entrega</option>}
                </select></label
              >
              @if (paymentMethod !== 'CASH_ON_DELIVERY') {
                <label
                  >Número de operación o referencia<input
                    name="reference"
                    [(ngModel)]="reference"
                    maxlength="100"
                    required /></label
                ><label
                  >Comprobante (JPG, PNG o WebP; máximo 1 MB)<input
                    name="proofFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="selectProof($event)"
                    required
                /></label>
              }
              <button
                type="submit"
                [disabled]="paymentForm.invalid || (paymentMethod !== 'CASH_ON_DELIVERY' && !proof)"
              >
                Enviar para revisión
              </button>
            </fieldset>
          </form>}
        }
        <button class="cancel" [disabled]="busy()" (click)="cancel()">
          Cancelar pedido y liberar stock
        </button>
      }
      <a class="button" routerLink="/catalogo">Seguir comprando</a>
    } @else {
      <h1>Pedido creado</h1>
      <p>
        La información privada del pedido ya no está disponible en esta pestaña. Conserva el código
        mostrado al finalizar.
      </p>
      <a routerLink="/">Ir al inicio</a>
    }
  </main>`,
  styles: [
    `
      main {
        max-width: 850px;
        margin: auto;
        padding: 50px 6%;
        min-height: 65vh;
      }
      section,
      form {
        background: white;
        border: 1px solid var(--line);
        padding: 25px;
        margin: 25px 0;
      }
      section p {
        display: flex;
        justify-content: space-between;
      }
      label {
        display: grid;
        gap: 7px;
        margin: 14px 0;
      }
      input,
      select {
        padding: 12px;
        border: 1px solid var(--line);
      }
      .cancel {
        background: #8b2b25;
        margin: 15px 15px 15px 0;
      }
      .online {
        border-color: #1f5aa6;
      }
    `,
  ],
})
export class OrderPage implements OnDestroy {
  private http = inject(HttpClient);
  readonly storefront = inject(StorefrontService);
  private analytics = inject(AnalyticsService);
  private id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private saved = this.read();
  order = signal<Order | null>(this.saved?.order ?? null);
  busy = signal(false);
  error = signal('');
  paymentMethod = '';
  reference = '';
  proof: string | null = null;
  proofType: string | null = null;
  readonly money = money;
  private polling:ReturnType<typeof setInterval>|null=null;
  private readonly trackPurchase = effect(() => {
    const order = this.order();
    if (order && (order.status === 'PAYMENT_CONFIRMED' || order.payment?.status === 'APPROVED'))
      this.analytics.purchase(order);
  });
  constructor() {
    if (this.saved) void this.refresh();
    this.polling=setInterval(()=>{if(document.visibilityState==='visible'&&this.order()?.status==='PENDING_PAYMENT')void this.refresh();},20000);
  }
  ngOnDestroy(){if(this.polling)clearInterval(this.polling);}
  paymentEnabled(method:string){return this.storefront.data()?.paymentMethods?.includes(method)??false;}
  hasManualPayment(){return ['YAPE','PLIN','BANK_TRANSFER','CASH_ON_DELIVERY'].some(method=>this.paymentEnabled(method));}
  private read() {
    try {
      return JSON.parse(
        sessionStorage.getItem('blessrom-order-' + this.id) ?? 'null',
      ) as SavedOrder | null;
    } catch {
      return null;
    }
  }
  status(s: string) {
    return (
      (
        {
          PENDING_PAYMENT: 'Pendiente de pago',
          PAYMENT_CONFIRMED: 'Pago confirmado',
          PREPARING: 'En preparación',
          READY_TO_SHIP: 'Listo para enviar',
          SHIPPED: 'Enviado',
          DELIVERED: 'Entregado',
          CANCELLED: 'Cancelado',
          EXPIRED: 'Reserva vencida',
        } as Record<string, string>
      )[s] ?? s
    );
  }
  paymentStatus(s: string) {
    return (
      (
        {
          PENDING_PROVIDER: 'Esperando pago',
          SUBMITTED: 'En revisión',
          APPROVED: 'Aprobado',
          REJECTED: 'Observado',
        } as Record<string, string>
      )[s] ?? s
    );
  }
  method(s: string) {
    return (
      (
        {
          MERCADO_PAGO: 'Mercado Pago',
          YAPE: 'Yape',
          PLIN: 'Plin',
          BANK_TRANSFER: 'Transferencia bancaria',
          CASH_ON_DELIVERY: 'Pago contra entrega',
        } as Record<string, string>
      )[s] ?? s
    );
  }
  private headers() {
    return new HttpHeaders({ 'X-Cart-Token': this.saved?.token ?? '' });
  }
  async refresh() {
    if (!this.saved) return;
    try {
      this.save(
        await firstValueFrom(
          this.http.get<Order>('/api/v1/orders/' + this.id, { headers: this.headers() }),
        ),
      );
    } catch {
      /* Conserva el pedido guardado si la actualización falla. */
    }
  }
  async startMercadoPago() {
    if (!this.saved) return;
    this.analytics.addPaymentInfo(this.saved.order, 'MERCADO_PAGO');
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(
        this.http.post<{ checkoutUrl: string }>(
          '/api/v1/payments/mercado-pago/orders/' + this.id + '/checkout',
          null,
          { headers: this.headers() },
        ),
      );
      location.assign(response.checkoutUrl);
    } catch (e) {
      this.error.set(errorMessage(e));
      this.busy.set(false);
    }
  }
  selectProof(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.proof = null;
    this.proofType = null;
    if (!file) return;
    if (file.size > 1048576 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('El comprobante debe ser JPG, PNG o WebP y pesar como máximo 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.proof = String(reader.result).split(',')[1] ?? null;
      this.proofType = file.type;
    };
    reader.readAsDataURL(file);
  }
  private save(order: Order) {
    this.order.set(order);
    if (this.saved) {
      this.saved.order = order;
      sessionStorage.setItem('blessrom-order-' + this.id, JSON.stringify(this.saved));
    }
  }
  async submitPayment(form: NgForm) {
    if (!this.saved || form.invalid || (this.paymentMethod !== 'CASH_ON_DELIVERY' && !this.proof))
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.analytics.addPaymentInfo(this.saved.order, this.paymentMethod);
      const order = await firstValueFrom(
        this.http.post<Order>(
          '/api/v1/orders/' + this.id + '/payment',
          {
            method: this.paymentMethod,
            reference: this.reference || null,
            proofContentType: this.proofType,
            proof: this.proof,
          },
          { headers: this.headers() },
        ),
      );
      this.save(order);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  async cancel() {
    if (!this.saved || !confirm('¿Cancelar el pedido y liberar las unidades reservadas?')) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.save(
        await firstValueFrom(
          this.http.post<Order>('/api/v1/orders/' + this.id + '/cancel', null, {
            headers: this.headers(),
          }),
        ),
      );
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
