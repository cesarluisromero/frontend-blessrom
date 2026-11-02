import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CartService } from './cart.service';
import { Category, Collection, money, safeImage } from '../../../../shared/commerce';
import { AnalyticsService } from './analytics.service';
type ChatMessage = { role: 'user' | 'assistant'; content: string; products?: AssistantProduct[] };
type AssistantProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  price: number | string;
  available: number;
};
type AssistantResponse = { reply: string; products: AssistantProduct[]; poweredByAi: boolean };
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly chatOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly collections = signal<Collection[]>([]);
  readonly chatBusy = signal(false);
  readonly chatError = signal('');
  readonly failedProductImages = signal<ReadonlySet<string>>(new Set());
  readonly money = money;
  readonly messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy el asistente de Blessrom. Puedo ayudarte a encontrar prendas disponibles, conocer precios, promociones y opciones de envío.',
    },
  ]);
  draft = '';
  readonly cart = inject(CartService);
  readonly analytics = inject(AnalyticsService);
  private readonly http = inject(HttpClient);

  constructor() {
    this.http
      .get<Category[]>('/api/v1/categories')
      .subscribe({ next: (value) => this.categories.set(value) });
    this.http
      .get<Collection[]>('/api/v1/collections')
      .subscribe({ next: (value) => this.collections.set(value) });
  }

  productImage(product: AssistantProduct): string | null {
    return this.failedProductImages().has(product.id) ? null : safeImage(product.imageUrl);
  }

  markProductImageAsFailed(productId: string): void {
    this.failedProductImages.update((ids) => new Set([...ids, productId]));
  }

  async send(prompt?: string) {
    const message = (prompt ?? this.draft).trim();
    if (!message || this.chatBusy()) return;
    const previous = this.messages();
    this.messages.set([...previous, { role: 'user', content: message }]);
    this.draft = '';
    this.chatBusy.set(true);
    this.chatError.set('');
    this.analytics.assistant('message');
    try {
      const history = previous.slice(-8).map(({ role, content }) => ({ role, content }));
      const response = await firstValueFrom(
        this.http.post<AssistantResponse>('/api/v1/assistant/messages', { message, history }),
      );
      this.messages.update((items) => [
        ...items,
        { role: 'assistant', content: response.reply, products: response.products },
      ]);
      if (response.products.length)
        this.analytics.assistant('recommendation', response.products.length);
    } catch {
      this.chatError.set(
        'No pude responder en este momento. Inténtalo nuevamente o explora el catálogo.',
      );
    } finally {
      this.chatBusy.set(false);
    }
  }
}
