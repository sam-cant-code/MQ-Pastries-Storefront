import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.css',
})
export class Testimonials implements OnInit, OnDestroy {
  testimonials = [
    {
      quote: 'Truly one of the best brownies in town! We always enjoy your cakes and brownies — they have never let us down. Excited to try many more of your delicious creations!',
      name: 'Varsha',
      title: 'Verified Customer'
    },
    {
      quote: 'I ordered a cake and brownies for my daughter\'s birthday and received them right on time — excellent packing. Thanks a lot!',
      name: 'Swetha',
      title: 'Verified Customer'
    },
    {
      quote: 'Your chocolate truffle cake was terrific — so moist and fudgy, with just the right bitterness and mild sweetness. My kids went crazy after tasting it. Thanks a lot!',
      name: 'Verified Customer',
      title: ''
    },
    {
      quote: 'It was perfect — I ate nearly 80% of the cake myself! It was moist throughout and citrusy just like I remembered. Really good, thank you!',
      name: 'Verified Customer',
      title: ''
    },
    {
      quote: 'Absolutely awesome pineapple cake! It has a rich pineapple aroma, a soft and moist texture, and an amazing taste that makes every bite enjoyable.',
      name: 'Verified Customer',
      title: ''
    }
  ];

  currentIndex = signal(0);
  isVisible = signal(true);
  private rotationTimer: any;

  private readonly DISPLAY_DURATION = 7000;
  private readonly FADE_DURATION = 400;

  ngOnInit() {
    this.rotationTimer = setInterval(() => {
      this.rotate();
    }, this.DISPLAY_DURATION);
  }

  ngOnDestroy() {
    if (this.rotationTimer) clearInterval(this.rotationTimer);
  }

  private rotate() {
    this.isVisible.set(false);
    setTimeout(() => {
      const len = this.testimonials.length;
      this.currentIndex.set((this.currentIndex() + 1) % len);
      this.isVisible.set(true);
    }, this.FADE_DURATION);
  }
}