import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Component({
 selector:'app-dashboard',
 template:`<main><p class="eyebrow">Tu negocio, en un solo lugar</p><h1>Bienvenido a Blessrom.</h1><p class="muted">Este es el punto de partida para gestionar tu tienda.</p><div class="cards"><section><span>CONEXIÓN</span><h2>{{status()}}</h2><p>Disponibilidad de la API de Blessrom.</p><button (click)="check()" [disabled]="loading()">Actualizar estado</button></section><section><span>ACCESO DEL EQUIPO</span><h2>Inicio de sesión pendiente</h2><p>La integración con Keycloak se configurará antes de habilitar la gestión comercial.</p></section></div><section class="next"><h2>Lo que construiremos aquí</h2><p>Gestionar productos, imágenes, precios, existencias y pedidos desde una interfaz diseñada para tu equipo.</p><p class="muted">Esta pantalla no concede acceso administrativo ni permite modificar datos del negocio.</p></section></main>`,
 styles:[`main{padding:45px;max-width:1200px}h1{font-size:42px;margin-bottom:16px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:35px 0}section{padding:28px;background:white;border:1px solid var(--line);border-radius:8px}section>span{font-size:11px;letter-spacing:1.5px;color:var(--gold)}section p{font-size:14px;color:#5c6879}.next{background:#eef2f8}@media(max-width:800px){main{padding:25px}.cards{grid-template-columns:1fr}}`]
})
export class Dashboard {
 private readonly http=inject(HttpClient);
 readonly status=signal('Comprobando…');readonly loading=signal(false);
 constructor(){this.check();}
 check(){this.loading.set(true);this.http.get('/api/v1/system').subscribe({next:()=>{this.status.set('API disponible');this.loading.set(false);},error:()=>{this.status.set('No disponible');this.loading.set(false);}});}
}