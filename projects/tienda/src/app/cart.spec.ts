import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {describe,it,expect,beforeEach,afterEach,vi} from 'vitest';
import {CartService} from './cart.service';
describe('Cart flow',()=>{
 let service:CartService;let http:HttpTestingController;
 beforeEach(()=>{localStorage.clear();TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});service=TestBed.inject(CartService);http=TestBed.inject(HttpTestingController);});
 afterEach(()=>{http.verify();TestBed.resetTestingModule();localStorage.clear();});
 it('creates a cart and keeps its private token out of the request body',async()=>{
  const task=service.set('11111111-1111-1111-1111-111111111111',2);
  const create=http.expectOne('/api/v1/carts');expect(create.request.body).toBeNull();create.flush({id:'cart',accessToken:'secret',expiresAt:'2099-01-01T00:00:00Z'});
  await new Promise(r=>setTimeout(r,0));const set=http.expectOne('/api/v1/carts/cart/items/11111111-1111-1111-1111-111111111111');
  expect(set.request.headers.get('X-Cart-Token')).toBe('secret');expect(set.request.body).toEqual({quantity:2});
  set.flush({id:'cart',status:'ACTIVE',expiresAt:'2099-01-01T00:00:00Z',items:[{variantId:'v',sku:'S',quantity:2,available:true}]});await task;expect(service.count()).toBe(2);
 });
 it('uses one idempotency key when checkout is retried',async()=>{
  localStorage.setItem('blessrom-cart-v1',JSON.stringify({id:'cart',token:'secret',expiresAt:'2099-01-01T00:00:00Z'}));
  TestBed.resetTestingModule();TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});service=TestBed.inject(CartService);http=TestBed.inject(HttpTestingController);
  http.expectOne('/api/v1/carts/cart').flush({id:'cart',status:'ACTIVE',expiresAt:'2099-01-01T00:00:00Z',items:[]});await vi.waitFor(()=>expect(service.busy()).toBe(false));
  const input={recipient:'Ana',email:'ana@example.com',phone:'999999999',address:'Tarapoto',districtCode:'220901',quoteFingerprint:'a'.repeat(64)};
  const first=service.checkout(input);await new Promise(r=>setTimeout(r,0));const one=http.expectOne('/api/v1/carts/cart/checkout');const key=one.request.headers.get('Idempotency-Key');one.flush({id:'order'});await first;
  const second=service.checkout(input);await new Promise(r=>setTimeout(r,0));const two=http.expectOne('/api/v1/carts/cart/checkout');expect(two.request.headers.get('Idempotency-Key')).toBe(key);two.flush({id:'order'});await second;
 });
});
