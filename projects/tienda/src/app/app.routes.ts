import { Routes } from '@angular/router';
export const routes:Routes=[
 {path:'',loadComponent:()=>import('./home').then(m=>m.Home),title:'Blessrom | Tu estilo, tu naturaleza'},
 {path:'catalogo',loadComponent:()=>import('./catalog').then(m=>m.Catalog),title:'Catálogo | Blessrom'},
 {path:'producto/:id',loadComponent:()=>import('./product').then(m=>m.Product),title:'Producto | Blessrom'},
 {path:'carrito',loadComponent:()=>import('./cart').then(m=>m.CartPage),title:'Carrito | Blessrom'},
 {path:'checkout',loadComponent:()=>import('./checkout').then(m=>m.Checkout),title:'Finalizar compra | Blessrom'},
 {path:'pedido/:id',loadComponent:()=>import('./order').then(m=>m.OrderPage),title:'Pedido | Blessrom'},
 {path:'**',redirectTo:''}
];
