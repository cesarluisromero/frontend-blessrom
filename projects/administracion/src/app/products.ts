import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Category, Content, Product, Page, errorMessage, money } from '../../../../shared/commerce';
@Component({selector:'app-products',imports:[FormsModule],templateUrl:'./products.html',styleUrl:'./products.scss'})
export class Products {
 private readonly http=inject(HttpClient);
 readonly items=signal<Product[]>([]);readonly categories=signal<Category[]>([]);
 readonly selected=signal<Product|null>(null);readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');
 readonly total=signal(0);page=0;readonly size=12;
 slug='';categoryName='';categorySlug='';draft:Content=this.blank();
 readonly money=money; readonly confirmedArchive=signal(false);
 constructor(){void this.load();}
 private blank():Content{return {name:'',description:'',categoryId:'',imageUrl:null,variants:[{sku:'',price:0.01,enabled:true,attributes:{talla:'',color:''}}]};}
 private async run(action:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');this.notice.set('');try{await action();}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 private async refreshList(){const data=await firstValueFrom(this.http.get<Page<Product>>('/api/v1/admin/products',{params:{page:this.page,size:this.size}}));this.items.set(data.items);this.total.set(data.total);}
 async load(){await this.run(async()=>{this.categories.set(await firstValueFrom(this.http.get<Category[]>('/api/v1/categories')));await this.refreshList();});}
 name(p:Product){return (p.draft??p.published)?.name??p.slug;}
 state(p:Product){return p.archived?'Archivado':p.draft?(p.published?'Cambios sin publicar':'Borrador'):'Publicado';}
 newProduct(form:NgForm){if(form.dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;this.selected.set(null);this.slug='';this.draft=this.blank();this.confirmedArchive.set(false);form.form.markAsPristine();form.form.markAsUntouched();this.error.set('');this.notice.set('');}
 async open(p:Product,form:NgForm){if(form.dirty&&!confirm('¿Descartar los cambios sin guardar?'))return;await this.run(async()=>{const data=await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+p.id));this.setProduct(data);form.form.markAsPristine();});}
 private setProduct(p:Product){this.selected.set(p);this.slug=p.slug;this.draft=structuredClone(p.draft??p.published??this.blank());this.confirmedArchive.set(false);}
 addVariant(form:NgForm){if(this.draft.variants.length>=50)return;this.draft.variants.push({sku:'',attributes:{talla:'',color:''},price:0.01,enabled:true});form.form.markAsDirty();}
 removeVariant(index:number,form:NgForm){this.draft.variants.splice(index,1);form.form.markAsDirty();}
 private payload():Content{return {...this.draft,imageUrl:this.draft.imageUrl?.trim()||null,
 variants:this.draft.variants.map(v=>({sku:v.sku.trim(),price:Number(v.price),enabled:v.enabled,attributes:Object.fromEntries(Object.entries(v.attributes).filter(([,value])=>value.trim()).map(([key,value])=>[key,value.trim()]))}))};}
 async save(form:NgForm){if(form.invalid||this.busy())return;await this.run(async()=>{const p=this.selected();const draft=this.payload();
 const result=await firstValueFrom(p?this.http.put<Product>('/api/v1/admin/products/'+p.id+'/draft',{version:p.version,draft}):this.http.post<Product>('/api/v1/admin/products',{slug:this.slug,draft}));
 this.setProduct(result);form.form.markAsPristine();await this.refreshList();this.notice.set('Borrador guardado. Publícalo para mostrar los cambios en la tienda.');});}
 async publish(form:NgForm){const p=this.selected();if(!p?.draft||form.dirty||this.busy())return;await this.run(async()=>{this.setProduct(await firstValueFrom(this.http.post<Product>('/api/v1/admin/products/'+p.id+'/publish',{version:p.version})));form.form.markAsPristine();await this.refreshList();this.notice.set('Producto publicado. Ya está disponible en la tienda.');});}
 async archive(form:NgForm){const p=this.selected();if(!p||!this.confirmedArchive()||this.busy())return;await this.run(async()=>{await firstValueFrom(this.http.delete('/api/v1/admin/products/'+p.id,{params:{version:p.version}}));this.setProduct(await firstValueFrom(this.http.get<Product>('/api/v1/admin/products/'+p.id)));form.form.markAsPristine();await this.refreshList();this.notice.set('Producto archivado; dejó de mostrarse en la tienda.');});}
 async createCategory(form:NgForm){if(form.invalid||this.busy())return;await this.run(async()=>{const c=await firstValueFrom(this.http.post<Category>('/api/v1/admin/categories',{name:this.categoryName,slug:this.categorySlug}));this.categories.update(rows=>[...rows,c]);this.categoryName='';this.categorySlug='';form.resetForm();this.notice.set('Categoría creada. Ya puedes seleccionarla en el producto.');});}
 async changePage(delta:number){if(this.busy())return;this.page+=delta;await this.run(()=>this.refreshList());}
}
