import { Component } from '@angular/core';
import { Hero } from '../hero/hero';
import { Menu } from '../menu/menu';
import { About } from '../about/about';
import { Features } from '../features/features';
import { Testimonials } from '../testimonials/testimonials';
import { Visit } from '../visit/visit';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero, Menu, About, Features, Testimonials, Visit],
  templateUrl: './home.html'
})
export class Home {}
