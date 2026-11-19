import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Category } from '../../../../shared/commerce';
import { MenuAdmin, MenuGroup } from '../../../../shared/storefront-menu';

@Component({selector:'app-menu-editor',imports:[FormsModule],template:`
<main class="editor"><p class="eyebrow">TIENDA / NAVEGACIÓN</p><h1>Configurar menú</h1>
<p>Define los grupos, sus nombres y las categorías que aparecerán en el panel. La tienda cambia únicamente al publicar.</p>
@if(error()){<p class="error" role="alert">{{error()}}</p>}@if(notice()){<p class="notice" role="status">{{notice()}}</p>}
@if(loading()){<p>Cargando menú…</p>}@else{
<div class="toolbar"><button type="button" (click)="add()" [disabled]="groups.length>=8||busy()">Agregar grupo</button><span>{{groups.length}} / 8 grupos</span></div>
@for(group of groups;track group.id;let i=$index){<section class="group-card">
 <div class="group-head"><h2>Grupo {{i+1}}</h2><div class="group-actions"><button class="secondary" type="button" (click)="move(i,-1)" [disabled]="i===0" [attr.aria-label]="'Subir '+group.title">↑</button><button class="secondary" type="button" (click)="move(i,1)" [disabled]="i===groups.length-1" [attr.aria-label]="'Bajar '+group.title">↓</button><button class="secondary" type="button" (click)="remove(i)">Quitar</button></div></div>
 <label [for]="'menu-title-'+i">Nombre de la agrupación</label><input [id]="'menu-title-'+i" [(ngModel)]="group.title" maxlength="80" (ngModelChange)="changed()" placeholder="Ej. Ropa de mujer" />
 <p>Solo se mostrarán públicamente las categorías con productos disponibles.</p>
 <button class="secondary" type="button" (click)="openPicker(group)">Agregar categorías</button>
 <div class="selected"><strong>Categorías seleccionadas ({{group.categoryIds.length}})</strong>@for(id of group.categoryIds;track id;let index=$index){<div><span>{{categoryName(id)}}</span><button class="secondary" type="button" (click)="moveCategory(group,index,-1)" [disabled]="index===0" [attr.aria-label]="'Subir '+categoryName(id)">↑</button><button class="secondary" type="button" (click)="moveCategory(group,index,1)" [disabled]="index===group.categoryIds.length-1" [attr.aria-label]="'Bajar '+categoryName(id)">↓</button><button class="secondary" type="button" (click)="toggle(group,id,false)" [attr.aria-label]="'Quitar '+categoryName(id)">Quitar</button></div>}@empty{<p>Aún no hay categorías en este grupo.</p>}</div>
</section>}
<div class="toolbar"><button type="button" (click)="save()" [disabled]="busy()">Guardar borrador</button><button type="button" (click)="publish()" [disabled]="busy()||!saved()">Publicar menú</button></div>
}
<dialog #categoryDialog class="category-dialog" (close)="pickerGroup.set(null)"><div class="dialog-head"><h2>Agregar categorías</h2><button type="button" class="secondary" (click)="categoryDialog.close()" aria-label="Cerrar">×</button></div>
<p>Busca y selecciona varias categorías. Las asignadas a otro grupo no se pueden elegir.</p>
<div class="picker-filters"><label>Buscar<input type="search" [(ngModel)]="categoryQuery" placeholder="Nombre de categoría" /></label><label>Categoría padre<select [(ngModel)]="parentFilter"><option value="">Todas</option>@for(parent of parentCategories();track parent.id){<option [value]="parent.id">{{parent.name}}</option>}</select></label></div>
<div class="picker-list">@for(category of filteredCategories();track category.id){<label class="choice"><input type="checkbox" [checked]="pickerGroup()?.categoryIds?.includes(category.id)" [disabled]="!pickerGroup()?.categoryIds?.includes(category.id)&&(!pickerGroup()||usedByOtherGroup(category.id,pickerGroup()!.id)||pickerGroup()!.categoryIds.length>=30)" (change)="togglePicker(category.id,$any($event.target).checked)"/><span>{{categoryPath(category)}}</span></label>}@empty{<p>No hay categorías con ese criterio.</p>}</div>
<div class="dialog-actions"><span>{{pickerGroup()?.categoryIds?.length??0}} / 30 seleccionadas</span><button type="button" (click)="categoryDialog.close()">Listo</button></div></dialog>
</main>`,styles:[`
.editor{max-width:1100px;margin:auto;padding:32px 28px 80px}.eyebrow{letter-spacing:.14em;color:#986522;font-size:12px}h1{font:clamp(32px,4vw,48px) Georgia,serif;color:#14243e}h2{font:27px Georgia,serif;margin:0}p{line-height:1.5}.toolbar,.group-head,.group-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.toolbar{justify-content:space-between;margin:24px 0}.group-head{justify-content:space-between}.group-card{background:#fff;border:1px solid #d9e1ea;border-radius:14px;padding:24px;margin:18px 0}.group-card>label{display:block;font-weight:600;margin:20px 0 8px}.group-card>input{width:100%;padding:13px;border:1px solid #adbed1;border-radius:7px}.selected{margin-top:20px;display:grid;gap:7px}.selected>div{display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid #edf0f4}.selected>div span{flex:1;min-width:0}.selected button,.group-actions button{min-width:44px;min-height:44px}.category-dialog{width:min(650px,calc(100vw - 24px));max-height:min(720px,90dvh);border:1px solid #d9e1ea;border-radius:14px;padding:22px;color:#14243e}.category-dialog::backdrop{background:#101b2cb3}.dialog-head,.dialog-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.dialog-head button{min-width:44px;min-height:44px}.picker-filters{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.picker-filters label{display:grid;gap:6px}.picker-filters input,.picker-filters select{width:100%;min-height:44px;border:1px solid #adbed1;border-radius:7px;padding:8px}.picker-list{max-height:min(420px,48dvh);overflow-y:auto;display:grid;gap:5px;align-content:start}.choice{display:flex;align-items:center;gap:9px;padding:9px;border:1px solid #d9e1ea;border-radius:8px;min-height:44px}.choice input{width:18px;height:18px;flex:0 0 18px}.dialog-actions{margin-top:18px}.error{color:#a22626}.notice{color:#12613c}@media(max-width:600px){.editor{padding:24px 16px 72px}.group-card{padding:16px}.picker-filters{grid-template-columns:1fr}.category-dialog{padding:16px}}
` ]})
export class MenuEditor {
 @ViewChild('categoryDialog') private categoryDialog?:ElementRef<HTMLDialogElement>;
 private readonly http=inject(HttpClient);
 readonly categories=signal<Category[]>([]);
 readonly loading=signal(true);
 readonly busy=signal(false);
 readonly saved=signal(false);
 readonly error=signal('');
 readonly notice=signal('');
 readonly pickerGroup=signal<MenuGroup|null>(null);
 categoryQuery='';
 parentFilter='';
 groups:MenuGroup[]=[];
 version=0;
 constructor(){void this.load();}
 async load(){this.loading.set(true);try{const [data,categories]=await Promise.all([firstValueFrom(this.http.get<MenuAdmin>('/api/v1/storefront-menu/admin')),firstValueFrom(this.http.get<Category[]>('/api/v1/admin/categories'))]);this.version=data.version;this.groups=structuredClone(data.draft);this.categories.set(categories.filter(category=>category.active));this.saved.set(true);}catch(e){this.error.set((e as {status?:number}).status===404?'Despliega el backend con la migración V29 para configurar el menú.':'No se pudo cargar la configuración del menú.');}finally{this.loading.set(false);}}
 changed(){this.saved.set(false);this.notice.set('');}
 add(){this.groups.push({id:crypto.randomUUID(),title:'',categoryIds:[]});this.changed();}
 remove(index:number){this.groups.splice(index,1);this.changed();}
 move(index:number,step:number){[this.groups[index],this.groups[index+step]]=[this.groups[index+step],this.groups[index]];this.changed();}
 toggle(group:MenuGroup,id:string,checked:boolean){if(checked){if(group.categoryIds.length<30&&!this.usedByOtherGroup(id,group.id))group.categoryIds.push(id);}else group.categoryIds=group.categoryIds.filter(value=>value!==id);this.changed();}
 moveCategory(group:MenuGroup,index:number,step:number){[group.categoryIds[index],group.categoryIds[index+step]]=[group.categoryIds[index+step],group.categoryIds[index]];this.changed();}
 usedByOtherGroup(id:string,groupId:string){return this.groups.some(group=>group.id!==groupId&&group.categoryIds.includes(id));}
 categoryName(id:string){return this.categories().find(category=>category.id===id)?.name??'Categoría eliminada';}
 categoryPath(category:Category){const names=[category.name];let parent=category.parent_id;const seen=new Set([category.id]);while(parent&&!seen.has(parent)){seen.add(parent);const found=this.categories().find(item=>item.id===parent);if(!found)break;names.unshift(found.name);parent=found.parent_id;}return names.join(' / ');}
 parentCategories(){return this.categories().filter(category=>!category.parent_id);}
 filteredCategories(){const query=this.categoryQuery.trim().toLocaleLowerCase('es');return this.categories().filter(category=>(!this.parentFilter||category.id===this.parentFilter||this.isDescendant(category,this.parentFilter))&&(!query||this.categoryPath(category).toLocaleLowerCase('es').includes(query)));}
 private isDescendant(category:Category,parentId:string){let id=category.parent_id;const seen=new Set<string>();while(id&&!seen.has(id)){if(id===parentId)return true;seen.add(id);id=this.categories().find(item=>item.id===id)?.parent_id??null;}return false;}
 openPicker(group:MenuGroup){this.pickerGroup.set(group);this.categoryQuery='';this.parentFilter='';this.categoryDialog?.nativeElement.showModal();}
 togglePicker(id:string,checked:boolean){const group=this.pickerGroup();if(group)this.toggle(group,id,checked);}
 async save(){if(this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<MenuAdmin>('/api/v1/storefront-menu/admin/draft',{version:this.version,groups:this.groups}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. El menú público todavía no cambia.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el menú. Tus cambios siguen aquí.':'No se pudo guardar el borrador.');}finally{this.busy.set(false);}}
 async publish(){if(this.busy()||!this.saved())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.post<MenuAdmin>('/api/v1/storefront-menu/admin/publish',{version:this.version}));this.version=data.version;this.notice.set('Menú publicado en la tienda.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el menú. Tus cambios siguen aquí.':'Revisa que cada grupo tenga nombre y al menos una categoría activa.');}finally{this.busy.set(false);}}
}
