import { Component, OnInit, inject } from '@angular/core';
import { Hero } from '../hero/hero';
import { Menu } from '../menu/menu';
import { About } from '../about/about';
import { Features } from '../features/features';
import { Testimonials } from '../testimonials/testimonials';
import { Visit } from '../visit/visit';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero, Menu, About, Features, Testimonials, Visit],
  templateUrl: './home.html'
})
export class Home implements OnInit {
  private seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.addJsonLd({
      "@context": "https://schema.org",
      "@type": "Bakery",
      "name": "MQ Pastries",
      "image": `${environment.siteUrl}/logo.png`,
      "url": environment.siteUrl,
      "telephone": "+919940712586",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "[Insert Address]",
        "addressLocality": "Bangalore",
        "addressCountry": "IN"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ],
          "opens": "09:00",
          "closes": "18:00"
        }
      ],
      "priceRange": "$$"
    });
  }
}
