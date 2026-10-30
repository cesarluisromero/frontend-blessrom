import {Injectable,signal,inject} from '@angular/core';
import {CanActivateFn,Router} from '@angular/router';
import {HttpErrorResponse,HttpInterceptorFn} from '@angular/common/http';
import {from,switchMap} from 'rxjs';
import Keycloak from 'keycloak-js';

@Injectable({providedIn:'root'})
export class CustomerAuthService {
 private readonly keycloak=new Keycloak({url:'https://mifacebook-mcp.duckdns.org/auth',realm:'blessrom',clientId:'blessrom-storefront'});
 readonly authenticated=signal(false);
 readonly username=signal('');
 readonly error=signal('');
 private sync(){this.authenticated.set(!!this.keycloak.authenticated);this.username.set(this.keycloak.tokenParsed?.['preferred_username']??'');}
 async init(){
  this.keycloak.onAuthLogout=()=>this.sync();
  this.keycloak.onAuthRefreshSuccess=()=>this.sync();
  try{await this.keycloak.init({pkceMethod:'S256',checkLoginIframe:false,redirectUri:location.origin+'/cuenta',responseMode:'fragment'});this.sync();}
  catch{this.error.set('La cuenta no está disponible por el momento. Puedes continuar comprando como invitado.');}
 }
 async login(){await this.keycloak.login({redirectUri:location.origin+'/cuenta'});}
 async register(){await this.keycloak.register({redirectUri:location.origin+'/cuenta'});}
 async logout(){await this.keycloak.logout({redirectUri:location.origin+'/'});}
 claims(){return this.keycloak.tokenParsed??{};}
 async accessToken(){
  if(!this.authenticated())throw new HttpErrorResponse({status:401});
  try{await this.keycloak.updateToken(30);this.sync();}
  catch{this.keycloak.clearToken();this.sync();throw new HttpErrorResponse({status:401});}
  if(!this.keycloak.token)throw new HttpErrorResponse({status:401});
  return this.keycloak.token;
 }
}

export const accountGuard:CanActivateFn=()=>inject(CustomerAuthService).authenticated()||inject(Router).createUrlTree(['/cuenta']);
export const customerAuthInterceptor:HttpInterceptorFn=(req,next)=>{
 const auth=inject(CustomerAuthService);
 const checkout=/^\/api\/v1\/carts\/[^/]+\/checkout$/.test(req.url);
 if(!auth.authenticated()||(!req.url.startsWith('/api/v1/account')&&!checkout))return next(req);
 return from(auth.accessToken()).pipe(switchMap(token=>next(req.clone({setHeaders:{Authorization:'Bearer '+token}}))));
};
