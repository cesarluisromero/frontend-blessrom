import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth';
@Component({selector:'app-login',imports:[RouterLink],template:`
<main class="login"><p class="eyebrow">Blessrom · Equipo</p><h1>Tu tienda empieza aquí.</h1>
<p>Inicia sesión para gestionar productos, precios y publicaciones.</p>
@if(auth.error()){<p role="alert">{{auth.error()}}</p>}
@if(auth.admin()){<a routerLink="/productos" class="button">Ir a productos</a>}
@else if(auth.authenticated()){<p role="alert">Tu cuenta no tiene el rol de administrador de Blessrom.</p><button (click)="auth.logout()">Cerrar sesión</button>}
@else {<button (click)="auth.login()" [disabled]="!!auth.error()">Iniciar sesión</button>}
<p class="muted">El acceso se realiza en el servidor de identidad de Blessrom.</p></main>`,
styles:[`.login{max-width:720px;margin:60px auto;padding:35px}.login h1{font-size:48px}.login p{margin:24px 0}`]})
export class Login {readonly auth=inject(AuthService);}
