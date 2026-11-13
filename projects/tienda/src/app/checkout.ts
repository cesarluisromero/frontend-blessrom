import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { Quote, ShippingRate, errorMessage, money } from '../../../../shared/commerce';
import { CustomerAuthService } from './auth';
import type { Address } from './account';
import { AnalyticsService } from './analytics.service';
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  template: `<main>
    <a routerLink="/carrito">← Volver al carrito</a>
    <p class="eyebrow">Entrega y confirmación</p>
    <h1>Finalizar compra</h1>
    @if (error()) {
      <p class="alert" role="alert">{{ error() }}</p>
    }
    <div class="columns">
      <form #form="ngForm" (ngSubmit)="confirm(form)">
        <fieldset [disabled]="busy()">
          <label
            >Nombre de quien recibe <span class="required-mark">*</span><input
              name="recipient"
              [(ngModel)]="recipient"
              #recipientField="ngModel"
              [class.invalid]="recipientField.invalid && (recipientField.touched || validationAttempted)"
              maxlength="150"
              required
          />@if (recipientField.invalid && (recipientField.touched || validationAttempted)) { <small class="field-error">Ingresa el nombre de quien recibe.</small> }</label>
          <label
            >Correo electrónico <span class="required-mark">*</span><input
              name="email"
              [(ngModel)]="email"
              #emailField="ngModel"
              [class.invalid]="emailField.invalid && (emailField.touched || validationAttempted)"
              type="email"
              email
              maxlength="254"
              required
          />@if (emailField.invalid && (emailField.touched || validationAttempted)) { <small class="field-error">{{ emailField.errors?.['email'] ? 'Ingresa un correo electrónico válido.' : 'Ingresa tu correo electrónico.' }}</small> }</label>
          <label
            >Teléfono <span class="required-mark">*</span><input name="phone" [(ngModel)]="phone" #phoneField="ngModel" [class.invalid]="phoneField.invalid && (phoneField.touched || validationAttempted)" pattern="[0-9+ ()-]{7,30}" required
          />@if (phoneField.invalid && (phoneField.touched || validationAttempted)) { <small class="field-error">{{ phoneField.errors?.['pattern'] ? 'Ingresa un teléfono válido.' : 'Ingresa tu teléfono.' }}</small> }</label>
          <label
            >Dirección completa <span class="required-mark">*</span><textarea
              name="address"
              [(ngModel)]="address"
              #addressField="ngModel"
              [class.invalid]="addressField.invalid && (addressField.touched || validationAttempted)"
              maxlength="500"
              required
            ></textarea>
            @if (addressField.invalid && (addressField.touched || validationAttempted)) { <small class="field-error">Ingresa la dirección completa.</small> }
          </label>
          <label
            >Departamento <span class="required-mark">*</span><select
              name="department"
              [(ngModel)]="department"
              #departmentField="ngModel"
              [class.invalid]="departmentField.invalid && (departmentField.touched || validationAttempted)"
              (ngModelChange)="selectDepartment()"
              required
            >
              <option value="">Selecciona el departamento</option>
              @for (name of departments(); track name) {
                <option [value]="name">{{ name }}</option>
              }
            </select>@if (departmentField.invalid && (departmentField.touched || validationAttempted)) { <small class="field-error">Selecciona un departamento.</small> }</label
          >
          <label
            >Provincia <span class="required-mark">*</span><select
              name="province"
              [(ngModel)]="province"
              #provinceField="ngModel"
              [class.invalid]="provinceField.invalid && (provinceField.touched || validationAttempted)"
              (ngModelChange)="selectProvince()"
              required
            >
              <option value="">Selecciona la provincia</option>
              @for (name of provinces(); track name) {
                <option [value]="name">{{ name }}</option>
              }
            </select>@if (provinceField.invalid && (provinceField.touched || validationAttempted)) { <small class="field-error">Selecciona una provincia.</small> }</label
          >
          <label
            >Distrito <span class="required-mark">*</span><select
              name="district"
              [(ngModel)]="district"
              #districtField="ngModel"
              [class.invalid]="districtField.invalid && (districtField.touched || validationAttempted)"
              (ngModelChange)="invalidateQuote()"
              required
            >
              <option value="">Selecciona el distrito</option>
              @for (r of districts(); track r.id) {
                <option [value]="r.district_code">
                  {{ r.district_name }} · {{ money(r.amount) }}
                </option>
              }
            </select>@if (districtField.invalid && (districtField.touched || validationAttempted)) { <small class="field-error">Selecciona un distrito.</small> }</label
          >
          <label class="check coupon-toggle"><input type="checkbox" name="useCoupon" [(ngModel)]="useCoupon" (ngModelChange)="toggleCoupon()" />Tengo un cupón</label>
          @if (useCoupon) {
          <label
            >Cupón <span class="required-mark">*</span><input
              name="coupon"
              [(ngModel)]="coupon"
              #couponField="ngModel"
              [class.invalid]="couponField.invalid && (couponField.touched || validationAttempted)"
              (ngModelChange)="invalidateQuote()"
              maxlength="30"
              placeholder="Ej. BIENVENIDA10"
              required
          />@if (couponField.invalid && (couponField.touched || validationAttempted)) { <small class="field-error">Ingresa el código del cupón.</small> }</label>
          }
          <button type="button" class="calculate-button" (click)="calculate(form)">
            {{ useCoupon ? 'Aplicar cupón y calcular total' : 'Calcular total' }}
          </button>
          @if (quote; as q) {
            <section>
              <p>
                Subtotal <strong>{{ money(q.subtotal) }}</strong>
              </p>
              @if (+(q.discount ?? 0) > 0) {
                <p>
                  Descuento
                  @if (q.couponCode) {
                    ({{ q.couponCode }})
                  }
                  <strong>-{{ money(q.discount ?? 0) }}</strong>
                </p>
              }
              <p>
                Envío a {{ q.districtName }} <strong>{{ money(q.shipping) }}</strong>
              </p>
              <p>
                Total <strong>{{ money(q.total) }}</strong>
              </p>
            </section>
            <label class="check"
              ><input type="checkbox" name="confirmed" [(ngModel)]="confirmed" />Confirmo los
              productos, la dirección y el total.</label
            >
            <button type="submit" [disabled]="form.invalid || !confirmed">Crear pedido</button
            ><small
              >El stock quedará reservado durante 30 minutos. En el siguiente paso registrarás el
              medio de pago.</small
            >
          }
        </fieldset>
      </form>
      <aside>
        <h2>Resumen</h2>
        @for (i of cart.cart()?.items ?? []; track i.variantId) {
          <p>
            {{ i.quantity }} × {{ i.name }} <strong>{{ money(i.lineTotal || 0) }}</strong>
          </p>
        }
      </aside>
    </div>
  </main>`,
  styleUrl: './checkout.scss',
})
export class Checkout {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(CustomerAuthService);
  private analytics = inject(AnalyticsService);
  readonly cart = inject(CartService);
  rates = signal<ShippingRate[]>([]);
  busy = signal(false);
  error = signal('');
  quote: Quote | null = null;
  recipient = '';
  email = '';
  phone = '';
  address = '';
  department = '';
  province = '';
  district = '';
  coupon = '';
  useCoupon = false;
  validationAttempted = false;
  confirmed = false;
  readonly money = money;
  constructor() {
    void this.cart.recoverOrder().then(o=>{if(o&&this.cart.token()){sessionStorage.setItem('blessrom-order-'+o.id,JSON.stringify({order:o,token:this.cart.token()}));this.cart.clear();void this.router.navigate(['/pedido',o.id]);}}).catch(()=>{});
    this.http.get<ShippingRate[]>('/api/v1/shipping-rates').subscribe({
      next: (r) => {
        this.rates.set(r);
        if (this.auth.authenticated()) void this.prefill();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  departments() {
    return [...new Set(this.rates().map((r) => r.department_name))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
  }
  provinces() {
    return [
      ...new Set(
        this.rates()
          .filter((r) => r.department_name === this.department)
          .map((r) => r.province_name),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'));
  }
  districts() {
    return this.rates().filter(
      (r) => r.department_name === this.department && r.province_name === this.province,
    );
  }
  invalidateQuote() {
    this.quote = null;
    this.confirmed = false;
  }
  toggleCoupon() {
    if (!this.useCoupon) this.coupon = '';
    this.invalidateQuote();
  }
  selectDepartment() {
    this.province = '';
    this.district = '';
    this.invalidateQuote();
  }
  selectProvince() {
    this.district = '';
    this.invalidateQuote();
  }
  private async prefill() {
    try {
      const [p, addresses] = await Promise.all([
        firstValueFrom(
          this.http.get<{ email: string; first_name: string; last_name: string; phone: string }>(
            '/api/v1/account',
          ),
        ),
        firstValueFrom(this.http.get<Address[]>('/api/v1/account/addresses')),
      ]);
      const a = addresses.find((x) => x.is_default);
      this.recipient = a?.recipient ?? [p.first_name, p.last_name].filter(Boolean).join(' ');
      this.email = p.email ?? '';
      this.phone = a?.phone ?? p.phone ?? '';
      this.address = a?.address ?? '';
      const rate = this.rates().find((r) => r.district_code === a?.district_code);
      this.department = rate?.department_name ?? '';
      this.province = rate?.province_name ?? '';
      this.district = rate?.district_code ?? '';
    } catch {
      /* La compra invitada sigue disponible si el perfil no se puede cargar. */
    }
  }
  async calculate(form: NgForm) {
    this.validationAttempted = true;
    if (form.invalid || (this.useCoupon && !this.coupon.trim())) {
      form.control.markAllAsTouched();
      this.error.set('Completa los campos marcados en rojo para calcular el total.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      this.quote = await this.cart.quote(this.district, this.useCoupon ? this.coupon.trim() : '');
      this.analytics.beginCheckout(
        this.cart.cart()?.items ?? [],
        Number(this.quote.total),
        this.quote.couponCode,
      );
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
  async confirm(form: NgForm) {
    this.validationAttempted = true;
    if (form.invalid || !this.quote || !this.confirmed) {
      form.control.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const token = this.cart.token();
      const o = await this.cart.checkout({
        recipient: this.recipient,
        email: this.email,
        phone: this.phone,
        address: this.address,
        districtCode: this.district,
        quoteFingerprint: this.quote.fingerprint,
        couponCode: this.quote.couponCode,
      });
      sessionStorage.setItem('blessrom-order-' + o.id, JSON.stringify({ order: o, token }));
      this.cart.clear();
      await this.router.navigate(['/pedido', o.id]);
    } catch (e) {
      try {const o=await this.cart.recoverOrder();if(o&&this.cart.token()){sessionStorage.setItem('blessrom-order-'+o.id,JSON.stringify({order:o,token:this.cart.token()}));this.cart.clear();await this.router.navigate(['/pedido',o.id]);return;}}catch{/* Conserva el carrito y la clave para reintentar. */}
      this.quote = null;
      this.confirmed = false;
      this.error.set(errorMessage(e) + ' Calcula nuevamente el total.');
    } finally {
      this.busy.set(false);
    }
  }
}
