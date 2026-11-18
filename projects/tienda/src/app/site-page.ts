import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SiteInformation, SITE_PAGE_KEYS } from '../../../../shared/site-information';

@Component({
  selector: 'app-site-page', imports: [RouterLink],
  template: `<main class="page"><a routerLink="/">Inicio</a><article>@if (page(); as content) {
    <h1>{{content.title}}</h1><p class="body">{{content.body || 'Contenido pendiente de publicación.'}}</p>
  } @else if (error()) { <p role="alert">{{error()}}</p> }</article></main>`,
  styles: [`.page{max-width:850px;margin:0 auto;padding:48px 24px 96px;min-height:55vh}.page>a{color:#a46e2d}.page h1{font:clamp(2rem,5vw,3.5rem) Georgia,serif;color:#14243e}.body{white-space:pre-wrap;line-height:1.8;font-size:1.05rem;color:#24344d}`]
})
export class SitePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  readonly page = signal<{title:string;body:string}|null>(null);
  readonly error = signal('');
  constructor() {
    this.route.paramMap.subscribe(async params => {
      const key = params.get('slug') as keyof SiteInformation['pages'];
      this.page.set(null);
      const contact = this.route.snapshot.data['contact'] === true;
      if (!contact && !SITE_PAGE_KEYS.includes(key)) { this.error.set('Página no encontrada.'); return; }
      try { const info = await firstValueFrom(this.http.get<SiteInformation>('/api/v1/site-information'));
        const page = contact ? {title:'Contacto',body:[info.contactBody?.trim(),info.address,...info.phones].filter(Boolean).join('\n\n')} : info.pages[key];
        this.page.set(page); document.title = `${page.title} | Blessrom`;
      } catch { this.error.set('No se pudo cargar la página.'); }
    });
  }
}
