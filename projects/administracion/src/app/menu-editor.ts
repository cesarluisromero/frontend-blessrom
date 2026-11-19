import { Component, inject, signal } from '@angular/core';
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
 <p>Selecciona las categorías y su orden de aparición. Solo se mostrarán públicamente si tienen productos disponibles.</p>
 <div class="choices">@for(category of categories();track category.id){<label class="choice"><input type="checkbox" [checked]="group.categoryIds.includes(category.id)" [disabled]="!group.categoryIds.includes(category.id)&&usedByOtherGroup(category.id,group.id)" (change)="toggle(group,category.id,$any($event.target).checked)"/><span>{{category.parent_id?'↳ ':''}}{{category.name}}</span></label>}</div>
 <div class="selected"><strong>Orden en el panel</strong>@for(id of group.categoryIds;track id;let index=$index){<div><span>{{categoryName(id)}}</span><button class="secondary" type="button" (click)="moveCategory(group,index,-1)" [disabled]="index===0" [attr.aria-label]="'Subir '+categoryName(id)">↑</button><button class="secondary" type="button" (click)="moveCategory(group,index,1)" [disabled]="index===group.categoryIds.length-1" [attr.aria-label]="'Bajar '+categoryName(id)">↓</button><button class="secondary" type="button" (click)="toggle(group,id,false)" [attr.aria-label]="'Quitar '+categoryName(id)">Quitar</button></div>}</div>
</section>}
<div class="toolbar"><button type="button" (click)="save()" [disabled]="busy()">Guardar borrador</button><button type="button" (click)="publish()" [disabled]="busy()||!saved()">Publicar menú</button></div>
}
</main>`,styles:[`
.editor{max-width:1100px;margin:auto;padding:32px 28px 80px}.eyebrow{letter-spacing:.14em;color:#986522;font-size:12px}h1{font:clamp(32px,4vw,48px) Georgia,serif;color:#14243e}h2{font:27px Georgia,serif;margin:0}p{line-height:1.5}.toolbar,.group-head,.group-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.toolbar{justify-content:space-between;margin:24px 0}.group-head{justify-content:space-between}.group-card{background:#fff;border:1px solid #d9e1ea;border-radius:14px;padding:24px;margin:18px 0}.group-card>label{display:block;font-weight:600;margin:20px 0 8px}.group-card>input{width:100%;padding:13px;border:1px solid #adbed1;border-radius:7px}.choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}.choice{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid #d9e1ea;border-radius:8px;min-height:44px}.choice input{width:18px;height:18px}.selected{margin-top:20px;display:grid;gap:7px}.selected>div{display:flex;align-items:center;gap:7px}.selected>div span{min-width:180px}.selected button,.group-actions button{min-width:44px;min-height:44px}.error{color:#a22626}.notice{color:#12613c}@media(max-width:600px){.editor{padding:24px 16px 72px}.choices{grid-template-columns:1fr}.group-card{padding:16px}}
` ]})
export class MenuEditor {
 private readonly http=inject(HttpClient);
 readonly categories=signal<Category[]>([]);
 readonly loading=signal(true);
 readonly busy=signal(false);
 readonly saved=signal(false);
 readonly error=signal('');
 readonly notice=signal('');
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
 async save(){if(this.busy())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.put<MenuAdmin>('/api/v1/storefront-menu/admin/draft',{version:this.version,groups:this.groups}));this.version=data.version;this.saved.set(true);this.notice.set('Borrador guardado. El menú público todavía no cambia.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el menú. Tus cambios siguen aquí.':'No se pudo guardar el borrador.');}finally{this.busy.set(false);}}
 async publish(){if(this.busy()||!this.saved())return;this.busy.set(true);this.error.set('');try{const data=await firstValueFrom(this.http.post<MenuAdmin>('/api/v1/storefront-menu/admin/publish',{version:this.version}));this.version=data.version;this.notice.set('Menú publicado en la tienda.');}catch(e){this.error.set((e as {status?:number}).status===409?'Otro administrador cambió el menú. Tus cambios siguen aquí.':'Revisa que cada grupo tenga nombre y al menos una categoría activa.');}finally{this.busy.set(false);}}
}
