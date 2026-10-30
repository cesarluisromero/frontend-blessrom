import {Component,inject,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule,NgForm} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {Order,Page,ShippingRate,errorMessage,money} from '../../../../shared/commerce';
interface OrderSummary {id:string;version:number;status:string;currency:string;total:string;created_at:string;reservation_expires_at:string}
@Component({selector:'app-orders',imports:[FormsModule,DatePipe],templateUrl:'./orders.html',styleUrl:'./products.scss'})
export class Orders {
 private http=inject(HttpClient);orders=signal<OrderSummary[]>([]);rates=signal<ShippingRate[]>([]);selected=signal<Order|null>(null);busy=signal(false);error=signal('');notice=signal('');total=signal(0);page=0;
 districtCode='';districtName='';amount:number|null=null;active=true;editing:ShippingRate|null=null;readonly money=money;
 constructor(){void this.load();}
 status(s:string){return ({PENDING_PAYMENT:'Pendiente de pago',PAYMENT_CONFIRMED:'Pago confirmado',PREPARING:'En preparación',SHIPPED:'Enviado',DELIVERED:'Entregado',CANCELLED:'Cancelado',EXPIRED:'Reserva vencida'} as Record<string,string>)[s]??s;}
 next(s:string){return ({PAYMENT_CONFIRMED:{status:'PREPARING',label:'Iniciar preparación'},PREPARING:{status:'SHIPPED',label:'Marcar como enviado'},SHIPPED:{status:'DELIVERED',label:'Marcar como entregado'}} as Record<string,{status:string;label:string}>)[s];}
 paymentStatus(s:string){return ({SUBMITTED:'Pendiente de revisión',APPROVED:'Aprobado',REJECTED:'Rechazado'} as Record<string,string>)[s]??s;}
 method(s:string){return ({YAPE:'Yape',PLIN:'Plin',BANK_TRANSFER:'Transferencia bancaria',CASH_ON_DELIVERY:'Pago contra entrega'} as Record<string,string>)[s]??s;}
 notificationStatus(s:string){return ({PENDING:'Pendiente',SENT:'Enviado',FAILED:'Fallido'} as Record<string,string>)[s]??s;}
 private async run(fn:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');this.notice.set('');try{await fn();}catch(e){this.error.set(errorMessage(e));}finally{this.busy.set(false);}}
 async load(){await this.run(async()=>{await Promise.all([this.loadOrders(),this.loadRates()]);});}
 private async loadOrders(){const p=await firstValueFrom(this.http.get<Page<OrderSummary>>('/api/v1/admin/orders',{params:{page:this.page,size:20}}));this.orders.set(p.items);this.total.set(p.total);}
 private async loadRates(){this.rates.set(await firstValueFrom(this.http.get<ShippingRate[]>('/api/v1/admin/shipping-rates')));}
 async pageTo(page:number){if(page<0)return;this.page=page;await this.run(()=>this.loadOrders());}
 async open(id:string){await this.run(async()=>this.selected.set(await firstValueFrom(this.http.get<Order>('/api/v1/admin/orders/'+id))));}
 async advance(){const order=this.selected(),next=order&&this.next(order.status);if(!order||!next)return;if(next.status==='PAYMENT_CONFIRMED'&&!confirm('¿Confirmas que el pago fue recibido? Esta acción descontará definitivamente las unidades reservadas del inventario.'))return;await this.run(async()=>{const updated=await firstValueFrom(this.http.post<Order>('/api/v1/admin/orders/'+order.id+'/status',{version:order.version,status:next.status}));this.selected.set(updated);await this.loadOrders();this.notice.set('Pedido actualizado a: '+this.status(updated.status)+'.');});}
 async reviewPayment(decision:'APPROVED'|'REJECTED'){const order=this.selected(),payment=order?.payment;if(!order||!payment)return;let note:string|null=null;if(decision==='APPROVED'){if(!confirm('¿Aprobar el pago o acuerdo de pago? Se descontará el inventario reservado.'))return;}else{note=prompt('Indica al cliente qué debe corregir:','Comprobante o referencia no válidos.');if(note===null)return;}await this.run(async()=>{const updated=await firstValueFrom(this.http.post<Order>('/api/v1/admin/orders/'+order.id+'/payment/review',{paymentVersion:payment.version,orderVersion:order.version,decision,note}));this.selected.set(updated);await this.loadOrders();this.notice.set(decision==='APPROVED'?'Pago aprobado.':'Pago observado.');});}
 async viewProof(){const order=this.selected();if(!order?.payment?.has_proof)return;await this.run(async()=>{const blob=await firstValueFrom(this.http.get('/api/v1/admin/orders/'+order.id+'/payment/proof',{responseType:'blob'}));const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);});}
 edit(r:ShippingRate){this.editing=r;this.districtCode=r.district_code;this.districtName=r.district_name;this.amount=Number(r.amount);this.active=r.active;}
 reset(form?:NgForm){this.editing=null;this.districtCode='';this.districtName='';this.amount=null;this.active=true;form?.resetForm({active:true});}
 async saveRate(form:NgForm){if(form.invalid||this.amount===null)return;await this.run(async()=>{const rate={districtCode:this.districtCode,districtName:this.districtName,amount:this.amount,active:this.active};if(this.editing)await firstValueFrom(this.http.put('/api/v1/admin/shipping-rates/'+this.editing.id,{version:this.editing.version,rate}));else await firstValueFrom(this.http.post('/api/v1/admin/shipping-rates',rate));await this.loadRates();this.reset(form);this.notice.set('Tarifa de envío guardada.');});}
}
