import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private router = inject(Router);

  goToSection(fragment: string) {
    // If not on the homepage (URL is not exactly '/' or does not start with '/?'), navigate home first
    if (this.router.url !== '/' && !this.router.url.startsWith('/?')) {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          const element = document.querySelector(fragment);
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    } else {
      // Already on homepage, just scroll
      const element = document.querySelector(fragment);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}