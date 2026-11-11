import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute} from '@angular/router';
import {Subject} from 'rxjs';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {Product} from './product';
import {CartService} from './cart.service';
import {SeoService} from './seo.service';
import {AnalyticsService} from './analytics.service';
import type {Variant} from '../../../../shared/commerce';
afterEach(()=>TestBed.resetTestingModule());
function setup(variants:Variant[]){
 TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:ActivatedRoute,useValue:{paramMap:new Subject()}},{provide:CartService,useValue:{cart:()=>null}},{provide:SeoService,useValue:{update:vi.fn()}},{provide:AnalyticsService,useValue:{}}]});
 const page=TestBed.runInInjectionContext(()=>new Product());page.product.set({id:'product',slug:'polo',version:1,archived:false,content:{name:'Polo',description:'',categoryId:'category',imageUrl:null,variants}});return page;
}
function variant(id:string,color:string,size:string,available=2):Variant{return {id,sku:id,attributes:{color,talla:size},enabled:true,price:25,available};}
describe('Color y talla',()=>{
 it('filtra la galería por color y conserva la miniatura al cambiar talla',()=>{
   const page=setup([variant('blue-m','Azul','M'),variant('blue-l','Azul','L'),variant('black-s','Negro','S')]);
   const product=page.product()!;
   const urls={original:'',large:'',medium:'',thumbnail:''};
   const front={id:'front',alt_text:null,is_primary:true,color_value:'Azul',urls};
   const back={...front,id:'back',is_primary:false};
   page.product.set({...product,content:{...product.content!,media:[front,back]}});
   page.choose('color','Azul');
   expect(page.gallery()).toEqual([front,back]);
   expect(page.activeMedia()).toBe(front);
   page.selectMedia(back);
   page.choose('talla','L');
   expect(page.activeMedia()).toBe(back);
   page.choose('color','Negro');
   expect(page.gallery()).toEqual([]);
   expect(page.mainImage()).toBeNull();
 });
 it('muestra solo tallas del color y no cambia de color al elegir talla',()=>{const page=setup([variant('green-m','Verde','M'),variant('pink-l','Rosado','L'),variant('pink-s','Rosado','S',0)]);page.choose('color','Verde');expect(page.attributeValues('talla')).toEqual(['M']);page.choose('color','Rosado');expect(page.attributeValues('talla')).toEqual(['L','S']);expect(page.attributeAvailable('talla','S')).toBe(false);page.choose('talla','M');expect(page.selected()['color']).toBe('Rosado');expect(page.selectedVariant()?.id).toBe('pink-l');});
 it('exige elegir un SKU cuando los atributos coinciden',()=>{const page=setup([variant('one','Azul','M'),variant('two','Azul','M')]);page.choose('color','Azul');expect(page.selectedVariant()).toBeNull();page.chooseVariant('two');expect(page.selectedVariant()?.id).toBe('two');});
});
