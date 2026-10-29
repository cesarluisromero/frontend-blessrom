import { Injectable, signal, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import Keycloak from 'keycloak-js';

@Injectable({providedIn:'root'})
export class AuthService {
 private readonly keycloak=new Keycloak({url:'https://mifacebook-mcp.duckdns.org/auth',realm:'blessrom',clientId:'blessrom-admin'});
 readonly authenticated=signal(false);
 readonly admin=signal(false);
 readonly username=signal('');
 readonly error=signal('');
 private sync(){this.authenticated.set(!!this.keycloak.authenticated);this.admin.set(this.keycloak.hasRealmRole('admin'));this.username.set(this.keycloak.tokenParsed?.['preferred_username'] ?? '');}
 async init(){
  this.keycloak.onAuthLogout=()=>this.sync();
  this.keycloak.onAuthRefreshSuccess=()=>this.sync();
  try {await this.keycloak.init({pkceMethod:'S256',checkLoginIframe:false,redirectUri:location.origin+'/',responseMode:'fragment'});this.sync();}
  catch{this.error.set('No se pudo iniciar la autenticación. Recarga la página para reintentar.');}
 }
 async login(){try{await this.keycloak.login({redirectUri:location.origin+'/'});}catch{this.error.set('No se pudo abrir el inicio de sesión.');}}
 async logout(){try{await this.keycloak.logout({redirectUri:location.origin+'/login'});}catch{this.error.set('No se pudo cerrar la sesión en el servidor. Inténtalo nuevamente.');}}
 async accessToken(){
  if(!this.authenticated()||!this.admin()) throw new HttpErrorResponse({status:403});
  try{await this.keycloak.updateToken(30);this.sync();}
  catch{this.keycloak.clearToken();this.sync();throw new HttpErrorResponse({status:401});}
  if(!this.admin()||!this.keycloak.token) throw new HttpErrorResponse({status:403});
  return this.keycloak.token;
 }
}
export const adminGuard:CanActivateFn=()=>inject(AuthService).admin() || inject(Router).createUrlTree(['/login']);
export const authInterceptor:HttpInterceptorFn=(req,next)=>{
 // Never attach credentials to image hosts, the identity provider or arbitrary URLs.
 if(!req.url.startsWith('/api/v1/admin/')) return next(req);
 return from(inject(AuthService).accessToken()).pipe(switchMap(token=>next(req.clone({setHeaders:{Authorization:'Bearer '+token}}))));
};
