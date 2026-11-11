import { Routes } from '@angular/router';
import { adminGuard } from './auth';
export const routes:Routes=[
 {path:'login',loadComponent:()=>import('./login').then(m=>m.Login),title:'Iniciar sesión | Blessrom'},
 {path:'',canActivate:[adminGuard],loadComponent:()=>import('./dashboard').then(m=>m.Dashboard),title:'Administración | Blessrom'},
 {path:'productos/portada',canActivate:[adminGuard],loadComponent:()=>import('./storefront-home').then(m=>m.StorefrontHomeEditor),title:'Portada | Blessrom'},
 {path:'productos',canActivate:[adminGuard],loadComponent:()=>import('./products').then(m=>m.Products),title:'Productos | Blessrom'},
 {path:'productos/categorias',canActivate:[adminGuard],loadComponent:()=>import('./catalog-editor').then(m=>m.CatalogEditor),data:{kind:'category'},title:'Categorías | Blessrom'},
 {path:'productos/colecciones',canActivate:[adminGuard],loadComponent:()=>import('./catalog-editor').then(m=>m.CatalogEditor),data:{kind:'collection'},title:'Colecciones | Blessrom'},
 {path:'productos/tallas',canActivate:[adminGuard],loadComponent:()=>import('./catalog-editor').then(m=>m.CatalogEditor),data:{kind:'size'},title:'Tallas | Blessrom'},
 {path:'productos/colores',canActivate:[adminGuard],loadComponent:()=>import('./catalog-editor').then(m=>m.CatalogEditor),data:{kind:'color'},title:'Colores | Blessrom'},
 {path:'inventario',canActivate:[adminGuard],loadComponent:()=>import('./inventory').then(m=>m.Inventory),title:'Inventario | Blessrom'},
 {path:'promociones',canActivate:[adminGuard],loadComponent:()=>import('./promotions').then(m=>m.Promotions),title:'Promociones | Blessrom'},
 {path:'pedidos',canActivate:[adminGuard],loadComponent:()=>import('./orders').then(m=>m.Orders),title:'Pedidos y envíos | Blessrom'},
 {path:'pedidos/:id',canActivate:[adminGuard],loadComponent:()=>import('./orders').then(m=>m.Orders),title:'Detalle de pedido | Blessrom'},
 {path:'**',redirectTo:''}
];
