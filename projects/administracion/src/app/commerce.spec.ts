import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { AuthService,authInterceptor,adminGuard } from './auth';
import { Products } from './products';
import { Orders } from './orders';
import { NgForm } from '@angular/forms';
describe('Authentication boundary',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 function setup(admin=true){
  const auth={accessToken:vi.fn().mockResolvedValue('test-token'),admin:()=>admin};
  TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withInterceptors([authInterceptor])),provideHttpClientTesting(),{provide:AuthService,useValue:auth}]});
  return {auth,http:TestBed.inject(HttpClient),controller:TestBed.inject(HttpTestingController)};
 }
 it('attaches a refreshed token to relative administrative requests',async()=>{
  const {auth,http,controller}=setup();
  const pending=firstValueFrom(http.get('/api/v1/admin/products'));
  await vi.waitFor(()=>expect(auth.accessToken).toHaveBeenCalledOnce());
  const req=controller.expectOne('/api/v1/admin/products');
  expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
  req.flush({items:[]});await pending;controller.verify();
 });
 it('does not leak the token to public or external endpoints',async()=>{
  const {auth,http,controller}=setup();
  for(const url of ['/api/v1/products','https://example.org/api/v1/admin/products']){
   const pending=firstValueFrom(http.get(url));const req=controller.expectOne(url);
   expect(req.request.headers.has('Authorization')).toBe(false);req.flush({});await pending;
  }
  expect(auth.accessToken).not.toHaveBeenCalled();controller.verify();
 });
 it('blocks requests when token refresh fails',async()=>{
  const {auth,http,controller}=setup();auth.accessToken.mockRejectedValue(new Error('expired'));
  await expect(firstValueFrom(http.get('/api/v1/admin/products'))).rejects.toThrow('expired');
  controller.expectNone('/api/v1/admin/products');controller.verify();
 });
 it('redirects a user without the admin role',()=>{
  setup(false);const result=TestBed.runInInjectionContext(()=>adminGuard({} as never,{} as never));
  expect(result).toBeInstanceOf(UrlTree);
  expect(String(result)).toBe('/login');
 });
 it('allows an administrator',()=>{
  setup();expect(TestBed.runInInjectionContext(()=>adminGuard({} as never,{} as never))).toBe(true);
 });
});
describe('Order lifecycle',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('sends the current version and the next valid status',async()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  const page=TestBed.runInInjectionContext(()=>new Orders());
  const controller=TestBed.inject(HttpTestingController);
  controller.expectOne(r=>r.url==='/api/v1/admin/orders').flush({items:[],total:0,page:0,size:20});
  controller.expectOne('/api/v1/admin/shipping-rates').flush([]);
  await vi.waitFor(()=>expect(page.busy()).toBe(false));
  page.selected.set({id:'order-1',version:4,status:'PAYMENT_CONFIRMED',currency:'PEN',subtotal:'10.00',shipping:'0.00',total:'10.00',customer:{recipient:'Cliente',email:'cliente@example.com',phone:'999999999',address:'Tarapoto',districtCode:'220901',districtName:'Tarapoto'},created_at:'2026-10-29T00:00:00Z',reservation_expires_at:'2026-10-29T01:00:00Z',items:[],history:[],payment:null});
  const pending=page.advance();
  const req=controller.expectOne('/api/v1/admin/orders/order-1/status');
  expect(req.request.body).toEqual({version:4,status:'PREPARING'});
  req.flush({...page.selected(),version:5,status:'PREPARING'});
  let reload=controller.match(r=>r.url==='/api/v1/admin/orders');
  await vi.waitFor(()=>{if(!reload.length)reload=controller.match(r=>r.url==='/api/v1/admin/orders');expect(reload.length).toBe(1);});
  reload[0].flush({items:[],total:0,page:0,size:20});
  await pending;
  expect(page.selected()?.version).toBe(5);
  expect(page.selected()?.status).toBe('PREPARING');controller.verify();
 });
});
describe('Draft publication',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 async function setup(){
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  const page=TestBed.runInInjectionContext(()=>new Products());
  const controller=TestBed.inject(HttpTestingController);
  controller.expectOne('/api/v1/categories').flush([]);
  await vi.waitFor(()=>expect(controller.match(r=>r.url==='/api/v1/admin/products').map(r=>{r.flush({items:[],total:0,page:0,size:12});return r;}).length).toBe(1));
  await vi.waitFor(()=>expect(page.busy()).toBe(false));
  return {page,controller};
 }
 it('does not publish unsaved changes',async()=>{
  const {page,controller}=await setup();
  page.selected.set({id:'one',slug:'one',version:2,archived:false,draft:{name:'Prenda',description:'',categoryId:'category',imageUrl:null,variants:[]}});
  await page.publish({dirty:true} as NgForm);
  controller.expectNone('/api/v1/admin/products/one/publish');controller.verify();
 });
 it('keeps a local draft when the backend reports a version conflict',async()=>{
  const {page,controller}=await setup();
  page.selected.set({id:'one',slug:'one',version:2,archived:false});
  page.draft={name:'Mi cambio sin guardar',description:'',categoryId:'category',imageUrl:null,variants:[{sku:'SKU',price:35,enabled:true,attributes:{talla:'M'}}]};
  const pending=page.save({invalid:false} as NgForm);
  const req=controller.expectOne('/api/v1/admin/products/one/draft');
  expect(req.request.body.version).toBe(2);
  req.flush({message:'La información cambió; vuelve a consultarla.'},{status:409,statusText:'Conflict'});
  await pending;
  expect(page.draft.name).toBe('Mi cambio sin guardar');
  expect(page.selected()?.version).toBe(2);
  expect(page.error()).toContain('información cambió');controller.verify();
 });
});
