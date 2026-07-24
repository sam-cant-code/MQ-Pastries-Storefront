import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
export class App {
  protected readonly title = signal('mq-pastries');
  protected cartService = inject(CartService);
}
