import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import { SeoService } from '../../services/seo.service';
import { environment } from '../../../environments/environment';
interface Variant {
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  category: string;
  unit: string;
  groupName?: string;
  galleryImages?: string[];
  hasEgglessOption?: boolean;
  hasPackingOption?: boolean;
  packingOptions?: { name: string; image?: string; description?: string }[];
  variants?: Variant[];
  selectedVariant?: Variant;
  allowCustomMessage?: boolean;
}

interface ProductGroupCard {
  groupName: string;
  category: string;
  image: string;
  minPrice: number;
  flavorsCount: number;
  flavors: string[];
  sampleProductId: string;
}

const SUGGESTED_PAGE_SIZE = 4;

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-details.html'
})
export class ProductDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cartService = inject(CartService);
  private seoService = inject(SeoService);

  isLoading = signal(true);
  productFamily = signal<Product[]>([]);
  selectedFlavor = signal<Product | null>(null);
  selectedMainImage = signal<string>('');

  // Full pool of suggestions for the current product, plus how many are currently revealed
  allSuggestedProducts = signal<ProductGroupCard[]>([]);
  visibleSuggestedCount = signal(SUGGESTED_PAGE_SIZE);

  suggestedProducts = computed(() =>
    this.allSuggestedProducts().slice(0, this.visibleSuggestedCount())
  );

  hasMoreSuggested = computed(() =>
    this.visibleSuggestedCount() < this.allSuggestedProducts().length
  );

  modifyCartId = signal<string | null>(null);
  hasUnsavedChanges = signal(false);

  isEggless = signal(false);
  isDescriptionExpanded = signal(false);
  customMessage = signal<string>('');
  selectedPacking = signal<{name: string, image?: string, description?: string} | null>(null);

  updateCustomMessage(event: any) {
    this.customMessage.set(event.target.value);
    this.hasUnsavedChanges.set(true);
  }

  selectPacking(packing: any) {
    this.selectedPacking.set(packing);
    this.hasUnsavedChanges.set(true);
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (this.modifyCartId() && this.hasUnsavedChanges()) {
      $event.returnValue = true;
    }
  }

  toggleEggless() {
    this.isEggless.set(!this.isEggless());
    this.hasUnsavedChanges.set(true);
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const modifyId = params.get('modify');
      this.modifyCartId.set(modifyId);
      if (modifyId && modifyId.includes('(Eggless)')) {
        this.isEggless.set(true);
      } else {
        this.isEggless.set(false);
      }
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        // Clear suggestions when navigating to a new product
        this.allSuggestedProducts.set([]);
        this.visibleSuggestedCount.set(SUGGESTED_PAGE_SIZE);
        this.fetchProductDetails(id);
      }
    });
  }

  fetchProductDetails(id: string) {
    this.isLoading.set(true);
    this.http.get<Product[]>(`${environment.apiUrl}/public/products/${id}/details`).subscribe({
      next: (data) => {
        const processed = data.map(p => {
          let variants: Variant[] = [{ name: p.unit, price: p.price }];
          if (p.variants && p.variants.length > 0) {
            variants = [...variants, ...p.variants];
          }

          // Sort Size pills ascending by price (lowest price first)
          variants = [...variants].sort((a, b) => a.price - b.price);

          let selected = variants[0];
          
          // If we are modifying, try to match the selected variant based on the modifyId
          const modifyId = this.modifyCartId();
          if (modifyId) {
             const baseVariantName = modifyId.split('-').slice(1).join('-').replace(' (Eggless)', '');
             const found = variants.find(v => v.name === baseVariantName);
             if (found) selected = found;
          }

          return { ...p, variants, selectedVariant: selected };
        });

        // Sort Flavor pills ascending by base price (lowest price first)
        processed.sort((a, b) => a.price - b.price);

        this.productFamily.set(processed);

        // Default to the cheapest flavor, unless we're modifying an existing cart item
        // (in which case keep showing the flavor that was actually added to cart).
        const modifyId = this.modifyCartId();
        const mainProduct = modifyId
          ? (processed.find(p => p.id === id) || processed[0])
          : processed[0];

        this.selectFlavor(mainProduct);
        this.fetchSuggestedProducts(mainProduct.groupName || mainProduct.name);
        
        this.seoService.updateSeoTags({
          title: mainProduct.name,
          description: mainProduct.description,
          image: mainProduct.image,
          url: `/product/${mainProduct.id}`
        });

        this.seoService.addJsonLd({
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": mainProduct.name,
          "image": mainProduct.image,
          "description": mainProduct.description,
          "offers": {
            "@type": "Offer",
            "url": `${environment.siteUrl}/product/${mainProduct.id}`,
            "priceCurrency": "INR",
            "price": mainProduct.price,
            "availability": "https://schema.org/InStock"
          }
        });

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  fetchSuggestedProducts(currentGroup: string) {
    this.http.get<Product[]>(`${environment.apiUrl}/public/products`).subscribe({
      next: (data) => {
          const groupedMap = new Map<string, Product[]>();
          data.forEach(p => {
              const key = p.groupName || p.name;
              if (!groupedMap.has(key)) {
                 groupedMap.set(key, []);
              }
              groupedMap.get(key)!.push(p);
          });
          
          const cards: ProductGroupCard[] = [];
          groupedMap.forEach((prods, key) => {
            if (key !== currentGroup) {
              const first = prods[0];
              cards.push({
                groupName: key,
                category: first.category,
                image: first.image,
                minPrice: Math.min(...prods.map(p => p.price)),
                flavorsCount: prods.length,
                flavors: prods.map(p => p.name),
                sampleProductId: first.id
              });
            }
          });
          
          const shuffled = cards.sort(() => 0.5 - Math.random());
          this.allSuggestedProducts.set(shuffled);
          this.visibleSuggestedCount.set(SUGGESTED_PAGE_SIZE);
      }
    });
  }

  loadMoreSuggested() {
    this.visibleSuggestedCount.set(this.visibleSuggestedCount() + SUGGESTED_PAGE_SIZE);
  }

  goToProduct(id: string) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.router.navigate(['/product', id]);
  }

  selectFlavor(product: Product) {
    if (this.selectedFlavor() && this.selectedFlavor()?.id !== product.id) {
      this.hasUnsavedChanges.set(true);
    }
    this.selectedFlavor.set(product);
    this.selectedMainImage.set(product.image);
  }

  setMainImage(imgUrl: string) {
    this.selectedMainImage.set(imgUrl);
  }

  getAllImages(): string[] {
    const product = this.selectedFlavor();
    if (!product) return [];
    
    const images: string[] = [];
    if (product.image) images.push(product.image);
    if (product.galleryImages && product.galleryImages.length > 0) {
      images.push(...product.galleryImages);
    }
    return images;
  }

  nextImage(event: Event) {
    event.stopPropagation();
    const imgs = this.getAllImages();
    if (imgs.length <= 1) return;
    const currentIdx = imgs.indexOf(this.selectedMainImage());
    const idx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = (idx + 1) % imgs.length;
    this.selectedMainImage.set(imgs[nextIdx]);
  }

  prevImage(event: Event) {
    event.stopPropagation();
    const imgs = this.getAllImages();
    if (imgs.length <= 1) return;
    const currentIdx = imgs.indexOf(this.selectedMainImage());
    const idx = currentIdx >= 0 ? currentIdx : 0;
    const prevIdx = (idx - 1 + imgs.length) % imgs.length;
    this.selectedMainImage.set(imgs[prevIdx]);
  }

  onSizeChange(index: number) {
    const current = this.selectedFlavor();
    if (current && current.variants) {
      if (current.selectedVariant !== current.variants[index]) {
        this.hasUnsavedChanges.set(true);
      }
      current.selectedVariant = current.variants[index];
    }
  }

  addToCart() {
    const current = this.selectedFlavor();
    if (current && current.selectedVariant) {
      if (this.modifyCartId()) {
        this.cartService.removeFromCart(this.modifyCartId()!);
        // Clear the parameter so they don't modify again without intending to
        this.router.navigate([], { queryParams: { modify: null }, queryParamsHandling: 'merge' });
      }
      
      const variantToAdd = { ...current.selectedVariant };
      if (this.isEggless() && current.hasEgglessOption) {
        variantToAdd.name += ' (Eggless)';
      }

      const packing = this.selectedPacking();
      this.cartService.addToCart(current, variantToAdd, 1, this.customMessage(), packing?.name);
      this.customMessage.set(''); // Clear it after adding
      this.selectedPacking.set(null);
    }
  }
  
  goBack() {
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        const element = document.querySelector('#menu');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    });
  }

  goToCategory(category: string) {
    this.router.navigate(['/'], { queryParams: { category } }).then(() => {
      setTimeout(() => {
        const element = document.querySelector('#menu');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    });
  }
}