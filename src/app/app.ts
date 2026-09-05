import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs';
import { SeoService } from './services/seo.service';
import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { SignaturePastries } from './components/signature-pastries/signature-pastries';
import { Menu } from './components/menu/menu';
import { About } from './components/about/about';
import { Features } from './components/features/features';
import { Testimonials } from './components/testimonials/testimonials';
import { Footer } from './components/footer/footer';
import { CartSlider } from './components/cart-slider/cart-slider';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, CartSlider],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('mq-pastries');
  protected cartService = inject(CartService);
  protected router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private seoService = inject(SeoService);

  ngOnInit() {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map((route) => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      filter((route) => route.outlet === 'primary'),
      mergeMap((route) => route.data)
    ).subscribe((data) => {
      if (data['seo']) {
        this.seoService.updateSeoTags(data['seo']);
      }
    });
  }
}
