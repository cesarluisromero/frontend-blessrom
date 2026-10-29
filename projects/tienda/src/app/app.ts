import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CartService } from './cart.service';
@Component({
 selector:'app-root', imports:[RouterLink,RouterOutlet],
 templateUrl:'./app.html', styleUrl:'./app.scss'
})
export class App {
 readonly chatOpen = signal(false);
 readonly cart=inject(CartService);
}
