import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { category_list } from '../../data/assets';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  category: string;
  unit: string;
  groupName?: string;
}

interface ProductGroupCard {
  groupName: string;
  category: string;
  image: string;
  minPrice: number;
  flavorsCount: number;
  flavors: string[];
  flavorPreview: string;
  remainingFlavorsCount: number;
  sampleProductId: string;
}

const FLAVOR_PREVIEW_LIMIT = 3;
const INITIAL_VISIBLE_ROWS = 12; // ~3 rows at 4 columns
const LOAD_MORE_STEP = 8; // ~2 rows at 4 columns

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html'
})
export class Menu implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  categories = signal<{name: string}[]>([]);
  pastries = signal<ProductGroupCard[]>([]);
  isLoading = signal(true);
  
  failedImages = new Set<string>();
  selectedCategory = signal<string>('All');
  visibleCount = signal<number>(INITIAL_VISIBLE_ROWS);

  allFilteredPastries = computed(() => {
    const category = this.selectedCategory();
    const allPastries = this.pastries();
    
    if (category === 'All') {
      return allPastries;
    }
    return allPastries.filter(p => p.category === category);
  });

  filteredPastries = computed(() =>
    this.allFilteredPastries().slice(0, this.visibleCount())
  );

  hasMorePastries = computed(() =>
    this.visibleCount() < this.allFilteredPastries().length
  );

  ngOnInit() {
    // Pick up a category passed in via query params (e.g. from a product page breadcrumb)
    this.route.queryParamMap.subscribe(params => {
      const category = params.get('category');
      if (category) {
        this.selectedCategory.set(category);
        this.visibleCount.set(INITIAL_VISIBLE_ROWS);
      }
    });

    // Fetch Categories
    this.http.get<{name: string}[]>(`${environment.apiUrl}/public/categories`).subscribe({
      next: (cats) => {
        this.categories.set(cats);
        if (cats.length > 0 && this.selectedCategory() === 'All') {
          // Keep All or select first? Let's keep All
        }
      },
      error: (err) => console.error('Failed to load categories', err)
    });

    // Fetch Products and group them
    this.http.get<Product[]>(`${environment.apiUrl}/public/products`).subscribe({
      next: (data) => {
        // Only consider published products if status is available in public API (assuming backend filters it or we handle it here, we'll assume backend sends all or we don't have status here yet, wait, we can just group).
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
          const first = prods[0];
          const flavors = prods.map(p => p.name);
          const previewFlavors = flavors.slice(0, FLAVOR_PREVIEW_LIMIT);
          const remaining = flavors.length - previewFlavors.length;

          cards.push({
            groupName: key,
            category: first.category,
            image: first.image,
            minPrice: Math.min(...prods.map(p => p.price)),
            flavorsCount: prods.length,
            flavors,
            flavorPreview: previewFlavors.join(' • '),
            remainingFlavorsCount: remaining,
            sampleProductId: first.id
          });
        });

        this.pastries.set(cards);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load products from backend:', err);
        this.isLoading.set(false);
      }
    });
  }

  setCategory(category: string) {
    this.selectedCategory.set(category);
    this.visibleCount.set(INITIAL_VISIBLE_ROWS);
  }

  loadMorePastries() {
    this.visibleCount.set(this.visibleCount() + LOAD_MORE_STEP);
  }

  onImageError(event: any, imageSrc: string) {
    event.target.style.display = 'none';
    this.failedImages.add(imageSrc);
  }

  hasImageFailed(imageSrc: string): boolean {
    return this.failedImages.has(imageSrc);
  }

  goToProduct(id: string) {
    this.router.navigate(['/product', id]);
  }
}