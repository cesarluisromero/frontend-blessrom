import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {describe,it,expect,beforeEach,afterEach} from 'vitest';
import {Inventory} from './inventory';
describe('Inventory adjustments',()=>{
 let page:Inventory;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);page=TestBed.runInInjectionContext(()=>new Inventory());http.expectOne(r=>r.url==='/api/v1/admin/products').flush({items:[],total:0});});
 afterEach(()=>http.verify());
 async function ready(){await new Promise(r=>setTimeout(r,0));page.variantId='v1';page.stock.set({variant_id:'v1',on_hand:10,reserved:3,available:7,version:4});page.quantity=2;page.reason='Recepción';page.confirmed=true;}
 it('prevents consuming reserved units and rejects fractional quantities',async()=>{await ready();page.direction='out';page.quantity=8;await page.adjust();expect(page.valid()).toBe(false);http.expectNone(r=>r.method==='POST');page.quantity=7;expect(page.valid()).toBe(true);page.quantity=1.5;expect(page.valid()).toBe(false);});
 it('sends signed delta and current version, and refreshes history',async()=>{await ready();page.direction='out';const task=page.adjust();const req=http.expectOne('/api/v1/admin/inventory/v1/adjustments');expect(req.request.body).toEqual({version:4,delta:-2,reason:'Recepción'});req.flush({variant_id:'v1',on_hand:8,reserved:3,available:5,version:5});await new Promise(r=>setTimeout(r,0));http.expectOne(r=>r.url.endsWith('/movements')).flush([]);await task;expect(page.stock()?.available).toBe(5);expect(page.quantity).toBeNull();});
 it('blocks retry after a version conflict until stock is reloaded',async()=>{await ready();const task=page.adjust();http.expectOne('/api/v1/admin/inventory/v1/adjustments').flush({message:'Conflicto'},{status:409,statusText:'Conflict'});await task;expect(page.stale()).toBe(true);expect(page.quantity).toBe(2);page.confirmed=true;await page.adjust();http.expectNone(r=>r.method==='POST');expect(page.stock()?.version).toBe(4);});
});