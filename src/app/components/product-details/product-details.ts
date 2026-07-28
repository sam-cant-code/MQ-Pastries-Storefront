import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
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
  variants?: Variant[];
  selectedVariant?: Variant;
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

  isLoading = signal(true);
  productFamily = signal<Product[]>([]);
  selectedFlavor = signal<Product | null>(null);
  selectedMainImage = signal<string>('');

  suggestedProducts = signal<ProductGroupCard[]>([]);
  modifyCartId = signal<string | null>(null);

  isEggless = signal(false);

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
        this.suggestedProducts.set([]);
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

        this.productFamily.set(processed);
        const mainProduct = processed.find(p => p.id === id) || processed[0];
        this.selectFlavor(mainProduct);
        this.fetchSuggestedProducts(mainProduct.groupName || mainProduct.name);
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
          this.suggestedProducts.set(shuffled.slice(0, 4));
      }
    });
  }

  goToProduct(id: string) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.router.navigate(['/product', id]);
  }

  selectFlavor(product: Product) {
    this.selectedFlavor.set(product);
    this.selectedMainImage.set(product.image);
  }

  setMainImage(imgUrl: string) {
    this.selectedMainImage.set(imgUrl);
  }

  onSizeChange(index: number) {
    const current = this.selectedFlavor();
    if (current && current.variants) {
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

      this.cartService.addToCart(current, variantToAdd, 1);
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
    this.goBack();
  }
}