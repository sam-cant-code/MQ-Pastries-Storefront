import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';

export interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  noindex?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private siteName = 'MQ Pastries';
  private defaultImage = `${environment.siteUrl}/logo.png`; // Uses existing logo as default
  
  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  updateSeoTags(config: SeoConfig) {
    // If title already includes siteName, don't append it again
    const fullTitle = config.title.includes(this.siteName) 
      ? config.title 
      : `${config.title} | ${this.siteName}`;
      
    const url = config.url ? `${environment.siteUrl}${config.url}` : environment.siteUrl;
    const image = config.image ? `${environment.siteUrl}${config.image}` : this.defaultImage;

    // Title
    this.titleService.setTitle(fullTitle);

    // General Meta Tags
    this.metaService.updateTag({ name: 'description', content: config.description });

    // Open Graph
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:site_name', content: this.siteName });

    // Twitter
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });

    // Canonical
    this.updateCanonicalUrl(url);

    // Indexing
    if (config.noindex) {
      this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
    }
  }

  private updateCanonicalUrl(url: string) {
    let link: HTMLLinkElement | null = this.doc.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  addJsonLd(schema: any) {
    let script: HTMLScriptElement | null = this.doc.querySelector('script[type="application/ld+json"]');
    if (script) {
       script.remove();
    }
    script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    this.doc.head.appendChild(script);
  }
}
