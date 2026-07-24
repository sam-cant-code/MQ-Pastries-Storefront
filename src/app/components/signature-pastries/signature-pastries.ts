import { Component } from '@angular/core';
import { PastryCard } from '../pastry-card/pastry-card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signature-pastries',
  imports: [CommonModule, PastryCard],
  templateUrl: './signature-pastries.html',
})
export class SignaturePastries {
  pastries = [
    {
      name: 'Artisan Croissant',
      description: 'Perfectly flaky, buttery layers baked to a golden brown.',
      price: '$5.00',
      image: '/croissant_pastry.jpg'
    },
    {
      name: 'Chocolate Eclair',
      description: 'Choux pastry filled with rich vanilla cream and topped with gold leaf.',
      price: '$6.50',
      image: '/eclair_pastry.jpg'
    },
    {
      name: 'Seasonal Fruit Tart',
      description: 'Crisp buttery shell filled with vanilla custard and fresh berries.',
      price: '$7.00',
      image: '/tart_pastry.jpg'
    }
  ];
}
