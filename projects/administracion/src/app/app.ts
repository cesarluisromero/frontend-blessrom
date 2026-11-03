import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth';
@Component({selector:'app-root',imports:[RouterLink,RouterLinkActive,RouterOutlet,FormsModule],templateUrl:'./app.html',styleUrl:'./app.scss'})
export class App {readonly auth=inject(AuthService);readonly menuOpen=signal(false);private router=inject(Router);query='';search(){this.menuOpen.set(false);void this.router.navigate(['/productos'],{queryParams:{q:this.query.trim()||null}});}}
