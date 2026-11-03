import {Component,inject,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {ActivityEvent,OperationalActions,Page,errorMessage,money} from '../../../../shared/commerce';
interface Summary{orders:number;paid_orders:number;sales:number|string;discounts:number|string;refunds:number|string;average_ticket:number|string}
interface RecentOrder{id:string;orderNumber?:string;status:string;total:string;created_at:string;payment_status?:string;payment_method?:string}
interface CriticalStock{variant_id:string;sku:string;name:string;on_hand:number;reserved:number;available:number}
interface Report{days:number;timezone?:string;summary:Summary;daily:{day:string;sales:number|string}[];actions?:OperationalActions;recentActivity?:ActivityEvent[];criticalInventory:CriticalStock[];criticalInventoryCount?:number}
@Component({selector:'app-dashboard',imports:[RouterLink,DatePipe,FormsModule],templateUrl:'./dashboard.html',styleUrl:'./dashboard.scss'})
export class Dashboard {
 private http=inject(HttpClient);readonly report=signal<Report|null>(null);readonly recent=signal<RecentOrder[]>([]);readonly busy=signal(false);readonly error=signal('');days=30;readonly money=money;
 constructor(){void this.load();}
 async load(){if(this.busy())return;this.busy.set(true);this.error.set('');try{const [report,orders]=await Promise.all([firstValueFrom(this.http.get<Report>('/api/v1/admin/reports/dashboard',{params:{days:this.days}})),firstValueFrom(this.http.get<Page<RecentOrder>>('/api/v1/admin/orders',{params:{page:0,size:5}}))]);this.report.set(report);this.recent.set(orders.items);}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 status(s:string){return ({PENDING_PAYMENT:'Pendiente de pago',PAYMENT_CONFIRMED:'Pago confirmado',PREPARING:'En preparación',READY_TO_SHIP:'Listo para enviar',SHIPPED:'Enviado',DELIVERED:'Entregado',EXPIRED:'Reserva vencida',CANCELLED:'Cancelado'} as Record<string,string>)[s]??s;}
 activityLink(event:ActivityEvent){return event.entityType==='order'?['/pedidos',event.entityId]:event.entityType==='inventory'?['/inventario']:event.entityType==='storefront'?['/productos/portada']:['/productos'];}
}
