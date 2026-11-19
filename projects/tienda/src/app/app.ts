import { Component, DestroyRef, computed, signal, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, firstValueFrom, of, switchMap, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from './cart.service';
import { Category, Collection, money, safeImage } from '../../../../shared/commerce';
import { AnalyticsService } from './analytics.service';
import { StorefrontService } from './storefront.service';
import { SiteInformation } from '../../../../shared/site-information';
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
type SearchSuggestion = { id: string; name: string; thumbnailUrl?: string | null; imageAlt?: string | null };
type SearchSuggestionsResponse = { items: SearchSuggestion[] };
type CategoryNode = { category: Category; children: CategoryNode[] };
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly siteInformation = signal<SiteInformation | null>(null);
  readonly chatOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly expandedCategories = signal<ReadonlySet<string>>(new Set());
  readonly storefront = inject(StorefrontService);
  readonly categories = this.storefront.categories;
  readonly categoryTree = computed<CategoryNode[]>(() => {
    const categories = this.categories();
    const byId = new Map(categories.map(category => [category.id, {category, children: [] as CategoryNode[]}]));
    const roots: CategoryNode[] = [];
    for (const category of categories) {
      const node = byId.get(category.id)!;
      const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
      if (parent && parent !== node) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  });
  readonly displayMenuGroups = computed(() => {
    const configured = this.storefront.menuGroups();
    const byId = new Map(this.categories().map(category => [category.id, category]));
    if (configured !== null) return configured.map(group => ({id:group.id,title:group.title,categories:group.categoryIds.map(id => byId.get(id)).filter((category):category is Category => !!category)})).filter(group => group.categories.length);
    return this.categoryTree().map(node => ({id:node.category.id,title:node.category.name,categories:[node.category,...node.children.map(child => child.category)]}));
  });
  readonly collections = this.storefront.collections;
  readonly transactional = signal(false);
  readonly chatBusy = signal(false);
  readonly chatError = signal('');
  readonly failedProductImages = signal<ReadonlySet<string>>(new Set());
  readonly suggestions = signal<SearchSuggestion[]>([]);
  readonly suggestionsOpen = signal(false);
  readonly suggestionsLoading = signal(false);
  readonly activeSuggestionIndex = signal(-1);
  readonly failedSuggestionImages = signal<ReadonlySet<string>>(new Set());
  readonly money = money;
  readonly messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy el asistente de Blessrom. Puedo ayudarte a encontrar prendas disponibles, conocer precios, promociones y opciones de envío.',
    },
  ]);
  draft = '';
  searchTerm = '';
  readonly cart = inject(CartService);
  readonly analytics = inject(AnalyticsService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly suggestionInput = new Subject<string>();

  toggleCategory(id:string) {
    this.expandedCategories.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  openDesktopMenu(menu:HTMLDetailsElement) {
    if (!matchMedia('(hover: hover) and (min-width: 601px)').matches) return;
    menu.open = true;
  }

  closeDesktopNavigation() {
    if (!matchMedia('(hover: hover) and (min-width: 601px)').matches) return;
    this.closeNavigationMenus();
  }

  closeNavigationMenus() {
    this.menuOpen.set(false);
    document.getElementById('storefront-nav')?.querySelectorAll<HTMLDetailsElement>('details[name="storefront-navigation"]').forEach(menu=>menu.open=false);
  }

  constructor() {
    this.http.get<SiteInformation>('/api/v1/site-information').subscribe({next: content => this.siteInformation.set(content)});
    this.suggestionInput.pipe(debounceTime(300), distinctUntilChanged(), switchMap(query => {
      if (query.length < 2) return of<SearchSuggestionsResponse>({ items: [] });
      this.suggestionsLoading.set(true);
      return this.http.get<SearchSuggestionsResponse>('/api/v1/products/suggestions', { params: { q: query } }).pipe(catchError(() => of({ items: [] })));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      this.suggestions.set(response.items.slice(0, 6));
      this.activeSuggestionIndex.set(-1);
      this.suggestionsLoading.set(false);
      if (this.searchTerm.trim().length >= 2) this.suggestionsOpen.set(true);
    });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.closeNavigationMenus();
      this.expandedCategories.set(new Set());
      this.chatOpen.set(false);
      this.transactional.set(/^\/(carrito|checkout|pedido)(\/|$)/.test(this.router.url));
      this.searchTerm = this.router.parseUrl(this.router.url).queryParams['q'] ?? '';
      this.suggestionsOpen.set(false);
      this.suggestions.set([]);
    });
  }

  search() {
    this.suggestionsOpen.set(false);
    void this.router.navigate(['/catalogo'], { queryParams: { q: this.searchTerm.trim() || null } });
  }

  searchInputChanged() {
    const query = this.searchTerm.trim();
    this.suggestionsOpen.set(query.length >= 2);
    this.suggestionsLoading.set(query.length >= 2);
    if (query.length < 2) { this.suggestions.set([]); this.activeSuggestionIndex.set(-1); }
    this.suggestionInput.next(query);
  }

  suggestionKeydown(event: KeyboardEvent) {
    const count = this.suggestions().length;
    if (event.key === 'Escape') { event.preventDefault(); this.suggestionsOpen.set(false); return; }
    if (event.key === 'ArrowDown' && count) { event.preventDefault(); this.suggestionsOpen.set(true); this.activeSuggestionIndex.update(index => (index + 1) % count); return; }
    if (event.key === 'ArrowUp' && count) { event.preventDefault(); this.suggestionsOpen.set(true); this.activeSuggestionIndex.update(index => (index <= 0 ? count - 1 : index - 1)); return; }
    if (event.key === 'Enter' && this.suggestionsOpen() && this.activeSuggestionIndex() >= 0) { event.preventDefault(); const suggestion = this.suggestions()[this.activeSuggestionIndex()]; if (suggestion) void this.router.navigate(['/producto', suggestion.id]); this.suggestionsOpen.set(false); }
  }

  scheduleSuggestionsClose() { setTimeout(() => this.suggestionsOpen.set(false), 120); }
  selectSuggestion() { this.suggestionsOpen.set(false); }
  activeSuggestionId() { const index = this.activeSuggestionIndex(); return index >= 0 ? 'search-suggestion-' + index : null; }
  markSuggestionImageFailed(id: string) { this.failedSuggestionImages.update(ids => new Set([...ids, id])); }

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
