import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Category, Collection, Storefront } from '../../../../shared/commerce';

@Injectable({ providedIn: 'root' })
export class StorefrontService {
  private readonly http = inject(HttpClient);
  readonly data = signal<Storefront | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly collections = signal<Collection[]>([]);
  readonly error = signal(false);
  constructor() {
    this.reload();
    this.http.get<Category[]>('/api/v1/categories').subscribe({ next: value => this.categories.set(value), error: () => {} });
    this.http.get<Collection[]>('/api/v1/collections').subscribe({ next: value => this.collections.set(value), error: () => {} });
  }
  reload() {
    this.error.set(false);
    this.http.get<Storefront>('/api/v1/storefront').subscribe({ next: value => this.data.set(value), error: () => this.error.set(true) });
  }
}
