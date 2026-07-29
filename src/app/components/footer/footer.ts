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
  }
}