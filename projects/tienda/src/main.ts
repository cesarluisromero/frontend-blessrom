import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { CustomerAuthService } from './app/auth';
const auth=new CustomerAuthService();
auth.init().finally(()=>bootstrapApplication(App,{...appConfig,providers:[...appConfig.providers,{provide:CustomerAuthService,useValue:auth}]}).catch(err=>console.error(err)));
