import {Component,inject,signal} from '@angular/core';
import {FormsModule,NgForm} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Promotion,errorMessage,money} from '../../../../shared/commerce';

@Component({selector:'app-promotions',imports:[FormsModule],templateUrl:'./promotions.html',styleUrl:'./products.scss'})
export class Promotions {
 private readonly http=inject(HttpClient);
 readonly items=signal<Promotion[]>([]);readonly selected=signal<Promotion|null>(null);readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');readonly money=money;
 name='';code='';discountType:'PERCENT'|'FIXED'='PERCENT';discountValue=10;minimumSubtotal=0;usageLimit:number|null=null;startsAt='';endsAt='';active=true;
 constructor(){this.newPromotion();void this.load();}
 private async run(action:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');this.notice.set('');try{await action();}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async load(){await this.run(async()=>this.items.set(await firstValueFrom(this.http.get<Promotion[]>('/api/v1/admin/promotions'))));}
 newPromotion(form?:NgForm){this.selected.set(null);this.name='';this.code='';this.discountType='PERCENT';this.discountValue=10;this.minimumSubtotal=0;this.usageLimit=null;const now=new Date();const end=new Date(now);end.setMonth(end.getMonth()+1);this.startsAt=this.local(now);this.endsAt=this.local(end);this.active=true;form?.resetForm();}
 edit(p:Promotion,form:NgForm){this.selected.set(p);this.name=p.name;this.code=p.code;this.discountType=p.discount_type;this.discountValue=Number(p.discount_value);this.minimumSubtotal=Number(p.minimum_subtotal);this.usageLimit=p.usage_limit;this.startsAt=this.local(new Date(p.starts_at));this.endsAt=this.local(new Date(p.ends_at));this.active=p.active;form.form.markAsPristine();}
 private local(date:Date){const shifted=new Date(date.getTime()-date.getTimezoneOffset()*60000);return shifted.toISOString().slice(0,16);}
 private payload(){return {name:this.name.trim(),code:this.code.trim().toUpperCase(),discountType:this.discountType,discountValue:Number(this.discountValue),minimumSubtotal:Number(this.minimumSubtotal),usageLimit:this.usageLimit===null||this.usageLimit===undefined?null:Number(this.usageLimit),startsAt:new Date(this.startsAt).toISOString(),endsAt:new Date(this.endsAt).toISOString(),active:this.active};}
 async save(form:NgForm){if(form.invalid||this.busy())return;await this.run(async()=>{const current=this.selected();const promotion=this.payload();const result=await firstValueFrom(current?this.http.put<Promotion>('/api/v1/admin/promotions/'+current.id,{version:current.version,promotion}):this.http.post<Promotion>('/api/v1/admin/promotions',promotion));this.selected.set(result);await this.refresh();form.form.markAsPristine();this.notice.set(current?'Promoción actualizada.':'Promoción creada y disponible según su vigencia.');});}
 private async refresh(){this.items.set(await firstValueFrom(this.http.get<Promotion[]>('/api/v1/admin/promotions')));}
 state(p:Promotion){const now=Date.now();if(!p.active)return 'Inactiva';if(new Date(p.starts_at).getTime()>now)return 'Programada';if(new Date(p.ends_at).getTime()<now)return 'Finalizada';if(p.usage_limit!==null&&p.usage_count>=p.usage_limit)return 'Agotada';return 'Activa';}
 discount(p:Promotion){return p.discount_type==='PERCENT'?`${p.discount_value}%`:money(p.discount_value);}
}
