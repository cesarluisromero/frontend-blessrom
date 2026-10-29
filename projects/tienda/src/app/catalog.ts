import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Component({
 selector:'app-catalog',
 template:`<main><p class="eyebrow">Blessrom / Catálogo</p><h1>Descubre lo que viene.</h1><p>Estamos preparando la experiencia de catálogo de Blessrom.</p><section aria-live="polite"><h2>Conexión con la tienda</h2><p>{{status()}}</p><button (click)="check()" [disabled]="loading()">Comprobar conexión</button></section></main>`,
 styles:[`main{max-width:1100px;margin:auto;padding:60px 6%;min-height:60vh}h1{font-size:44px}section{margin-top:40px;background:white;padding:28px;border:1px solid var(--line);border-radius:8px}`]
})
export class Catalog {
 private readonly http=inject(HttpClient);
 readonly status=signal('Comprobando disponibilidad del servicio…');
 readonly loading=signal(false);
 constructor(){this.check();}
 check(){this.loading.set(true);this.http.get<{brand:string;currency:string}>('/api/v1/system').subscribe({
 next:data=>{this.status.set(data.brand+' está disponible · Moneda '+data.currency);this.loading.set(false);},
 error:()=>{this.status.set('No pudimos conectar. Vuelve a intentarlo en unos momentos.');this.loading.set(false);}
 });}
}