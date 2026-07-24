import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  cartService = inject(CartService);
  private router = inject(Router);

  isLightMode = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url.includes('/product/'))
    ),
    { initialValue: this.router.url.includes('/product/') }
  );

  goHome(fragment?: string) {
    if (fragment) {
      if (this.router.url.includes('/product/')) {
        this.router.navigate(['/']).then(() => {
          setTimeout(() => {
             const element = document.querySelector(fragment);
             if (element) element.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });
      } else {
        const element = document.querySelector(fragment);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      this.router.navigate(['/']).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }
}
