import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import { CartService } from './cart.service';
type ChatMessage={role:'user'|'assistant';content:string;products?:AssistantProduct[]};
type AssistantProduct={id:string;slug:string;name:string;imageUrl?:string;price:number|string;available:number};
type AssistantResponse={reply:string;products:AssistantProduct[];poweredByAi:boolean};
@Component({
 selector:'app-root', imports:[RouterLink,RouterOutlet,FormsModule],
 templateUrl:'./app.html', styleUrl:'./app.scss'
})
export class App {
 readonly chatOpen = signal(false);
 readonly chatBusy = signal(false);
 readonly chatError = signal('');
 readonly messages=signal<ChatMessage[]>([{role:'assistant',content:'¡Hola! Soy el asistente de Blessrom. Puedo ayudarte a encontrar prendas disponibles, conocer precios, promociones y opciones de envío.'}]);
 draft='';
 readonly cart=inject(CartService);
 private readonly http=inject(HttpClient);

 async send(prompt?:string){
  const message=(prompt??this.draft).trim();
  if(!message||this.chatBusy())return;
  const previous=this.messages();
  this.messages.set([...previous,{role:'user',content:message}]);this.draft='';this.chatBusy.set(true);this.chatError.set('');
  try{
   const history=previous.slice(-8).map(({role,content})=>({role,content}));
   const response=await firstValueFrom(this.http.post<AssistantResponse>('/api/v1/assistant/messages',{message,history}));
   this.messages.update(items=>[...items,{role:'assistant',content:response.reply,products:response.products}]);
  }catch{
   this.chatError.set('No pude responder en este momento. Inténtalo nuevamente o explora el catálogo.');
  }finally{this.chatBusy.set(false);}
 }
}
