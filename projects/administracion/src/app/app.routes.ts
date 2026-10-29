import { Routes } from '@angular/router';
export const routes: Routes = [
 {path:'',loadComponent:()=>import('./dashboard').then(m=>m.Dashboard),title:'Administración | Blessrom'},
 {path:'**',redirectTo:''}
];