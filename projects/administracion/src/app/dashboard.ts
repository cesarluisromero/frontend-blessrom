import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth';
@Component({selector:'app-dashboard',imports:[RouterLink],template:`
<main><p class="eyebrow">Tu negocio, en un solo lugar</p><h1>Bienvenido, {{auth.username()}}.</h1>
<p>Crea un borrador, revisa sus variantes y publícalo cuando esté listo para la tienda.</p>
<a class="button" routerLink="/productos">Gestionar productos →</a>
<p><a routerLink="/inventario">Gestionar inventario →</a></p><section><h2>Del borrador a la tienda</h2><ol><li>Crea una categoría.</li><li>Guarda el producto con sus precios, imagen y variantes.</li><li>Publica para hacerlo visible en blessrom.com.</li></ol>
<p class="muted">Publicar no agrega existencias. Registra entradas y salidas desde Inventario. Las compras se incorporarán en próximas entregas.</p></section></main>`,
styles:[`main{padding:40px;max-width:1000px}h1{font-size:40px}section{margin-top:35px;padding:25px;background:white;border:1px solid var(--line)}li{padding:8px}`]})
export class Dashboard {readonly auth=inject(AuthService);}
