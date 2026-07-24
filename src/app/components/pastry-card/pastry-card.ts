import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pastry-card',
  imports: [],
  templateUrl: './pastry-card.html',
})
export class PastryCard {
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() price: string = '';
  @Input() image: string = '';
}
