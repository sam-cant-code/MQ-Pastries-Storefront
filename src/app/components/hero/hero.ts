import { Component, OnInit, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-hero',
  imports: [],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero implements OnInit, OnDestroy {
  headlines = [
    { line1: '100% Homemade.', line2: 'Baked Fresh Every Morning.' },
    { line1: 'Crafted with Love.', line2: 'Baked to Delight.' },
    { line1: 'From Our Oven', line2: 'to Your Table.' },
    { line1: 'Wholesome Ingredients.', line2: 'Unforgettable Flavors.' }
  ];

  currentIndex = signal(0);
  isVisible = signal(true);
  private isPaused = false;
  private rotationTimer: any;

  private readonly DISPLAY_DURATION = 6000; // time each headline stays up
  private readonly FADE_DURATION = 400;     // fade out/in duration (ms)

  ngOnInit() {
    this.rotationTimer = setInterval(() => {
      if (!this.isPaused) this.rotateHeadline();
    }, this.DISPLAY_DURATION);
  }

  ngOnDestroy() {
    if (this.rotationTimer) clearInterval(this.rotationTimer);
  }

  private rotateHeadline() {
    this.isVisible.set(false); // start fade out
    setTimeout(() => {
      this.currentIndex.set((this.currentIndex() + 1) % this.headlines.length);
      this.isVisible.set(true); // fade back in with new text
    }, this.FADE_DURATION);
  }

  onMouseEnter() { this.isPaused = true; }
  onMouseLeave() { this.isPaused = false; }

  scrollToMenu(event: Event) {
    event.preventDefault();
    const element = document.querySelector('#menu');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}