import {Component,inject,signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {errorMessage,money} from '../../../../shared/commerce';
import {AuthService} from './auth';

interface MetricSummary {orders:number;paid_orders:number;sales:number|string;discounts:number|string;refunds:number|string;average_ticket:number|string}
interface Daily {day:string;orders:number;paid_orders:number;sales:number|string}
interface CountRow {status:string;total:number;amount?:number|string}
interface TopProduct {sku:string;name:string;units:number;sales:number|string}
interface CouponRow {code:string;orders:number;discount:number|string;sales:number|string}
interface CriticalStock {variant_id:string;sku:string;name:string;on_hand:number;reserved:number;available:number}
interface Report {days:number;summary:MetricSummary;daily:Daily[];statuses:CountRow[];topProducts:TopProduct[];coupons:CouponRow[];returns:CountRow[];criticalInventory:CriticalStock[]}

@Component({selector:'app-dashboard',templateUrl:'./dashboard.html',styleUrl:'./dashboard.scss'})
export class Dashboard {
 readonly auth=inject(AuthService);private readonly http=inject(HttpClient);
 readonly report=signal<Report|null>(null);readonly busy=signal(false);readonly error=signal('');days=30;readonly money=money;
 constructor(){void this.load();}
 async load(){if(this.busy())return;this.busy.set(true);this.error.set('');try{this.report.set(await firstValueFrom(this.http.get<Report>('/api/v1/admin/reports/dashboard',{params:{days:this.days}})));}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 number(value:number|string){return new Intl.NumberFormat('es-PE').format(Number(value));}
 maxSales(rows:Daily[]){return Math.max(1,...rows.map(row=>Number(row.sales)));}
 width(value:number|string,max:number){return `${Math.max(2,Number(value)*100/max)}%`;}
 day(value:string){return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short'}).format(new Date(value+'T12:00:00'));}
 status(value:string){return ({PENDING_PAYMENT:'Pendiente de pago',PAYMENT_CONFIRMED:'Pago confirmado',PREPARING:'En preparación',READY_TO_SHIP:'Listo para enviar',SHIPPED:'Enviado',DELIVERED:'Entregado',CANCELLED:'Cancelado',EXPIRED:'Expirado',REQUESTED:'Solicitada',APPROVED:'Aprobada',REJECTED:'Rechazada',RECEIVED:'Recibida',REFUNDED:'Reembolsada',EXCHANGED:'Cambiada'} as Record<string,string>)[value]??value;}
}
