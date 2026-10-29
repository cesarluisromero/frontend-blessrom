import { Routes } from '@angular/router';
export const routes:Routes=[
 {path:'',loadComponent:()=>import('./home').then(m=>m.Home),title:'Blessrom | Tu estilo, tu naturaleza'},
 {path:'catalogo',loadComponent:()=>import('./catalog').then(m=>m.Catalog),title:'Catálogo | Blessrom'},
 {path:'producto/:id',loadComponent:()=>import('./product').then(m=>m.Product),title:'Producto | Blessrom'},
 {path:'**',redirectTo:''}
];