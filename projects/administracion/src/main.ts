import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { AuthService } from './app/auth';
const auth=new AuthService();
// Keycloak consumes the OIDC callback before the Angular router starts.
auth.init().then(()=>bootstrapApplication(App,{...appConfig,providers:[...appConfig.providers,{provide:AuthService,useValue:auth}]}))
.catch(()=>{document.body.textContent='No se pudo iniciar Blessrom. Recarga la página.';});
