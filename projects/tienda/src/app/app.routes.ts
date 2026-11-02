import { Routes } from '@angular/router';
import {accountGuard} from './auth';
export const routes:Routes=[
 {path:'',loadComponent:()=>import('./home').then(m=>m.Home),title:'Blessrom | Tu estilo, tu naturaleza'},
 {path:'catalogo',loadComponent:()=>import('./catalog').then(m=>m.Catalog),title:'Catálogo | Blessrom'},
 {path:'coleccion/:slug',data:{kind:'collection'},loadComponent:()=>import('./merchandising-page').then(m=>m.MerchandisingPage),title:'Colección | Blessrom'},
 {path:'categoria/:slug',data:{kind:'category'},loadComponent:()=>import('./merchandising-page').then(m=>m.MerchandisingPage),title:'Categoría | Blessrom'},
 {path:'producto/:id',loadComponent:()=>import('./product').then(m=>m.Product),title:'Producto | Blessrom'},
 {path:'carrito',loadComponent:()=>import('./cart').then(m=>m.CartPage),title:'Carrito | Blessrom'},
 {path:'checkout',loadComponent:()=>import('./checkout').then(m=>m.Checkout),title:'Finalizar compra | Blessrom'},
 {path:'pedido/:id',loadComponent:()=>import('./order').then(m=>m.OrderPage),title:'Pedido | Blessrom'},
 {path:'cuenta',loadComponent:()=>import('./account').then(m=>m.AccountPage),title:'Mi cuenta | Blessrom'},
 {path:'cuenta/pedidos/:id',canActivate:[accountGuard],loadComponent:()=>import('./account-order').then(m=>m.AccountOrderPage),title:'Mi pedido | Blessrom'},
 {path:'**',redirectTo:''}
];
