import { Routes } from '@angular/router';
import { adminGuard } from './auth';
export const routes:Routes=[
 {path:'login',loadComponent:()=>import('./login').then(m=>m.Login),title:'Iniciar sesión | Blessrom'},
 {path:'',canActivate:[adminGuard],loadComponent:()=>import('./dashboard').then(m=>m.Dashboard),title:'Administración | Blessrom'},
 {path:'productos',canActivate:[adminGuard],loadComponent:()=>import('./products').then(m=>m.Products),title:'Productos | Blessrom'},
 {path:'**',redirectTo:''}
];
