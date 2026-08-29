import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
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

const CATEGORY_EMOJIS: Record<string, string> = {
  'Brownies': '/emojis/brownies.png',
  'Tea Cakes': '/emojis/tea_cakes.png',
  'Cookies': '/emojis/cookies.png',
  'Cakes': '/emojis/cakes.png',
  'Savories': '/emojis/savories.png',
  'Special': '/emojis/special.png',
  'All': '/emojis/all.png'
};

const CATEGORY_SCALES: Record<string, number> = {
  'Brownies': 1.7,
  'Tea Cakes': 1.3,
  'Cookies': 0.9,
  'Cakes': 1.35,
  'Savories': 0.9,
  'Special': 1,
  'All': 1
};

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
  
  getEmoji(categoryName: string): string {
    return CATEGORY_EMOJIS[categoryName] || '/emojis/default.png'; // default to default image
  }
  
  getEmojiScale(categoryName: string): number {
    return CATEGORY_SCALES[categoryName] || 1;
  }
  
  categories = signal<{name: string}[]>([]);
  pastries = signal<ProductGroupCard[]>([]);
  isLoading = signal(true);
  
  failedImages = new Set<string>();
  selectedCategory = signal<string>('All');
  searchQuery = signal<string>('');
  isSearchFocused = signal<boolean>(false);
  visibleCount = signal<number>(INITIAL_VISIBLE_ROWS);

  allFilteredPastries = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    let result = this.pastries();
    
    if (category !== 'All') {
      result = result.filter(p => p.category === category);
    }
    
    if (query) {
      result = result.filter(p => 
        p.groupName.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query) ||
        p.flavors.some(f => f.toLowerCase().includes(query))
      );
    }
    
    return result;
  });

  filteredPastries = computed(() =>
    this.allFilteredPastries().slice(0, this.visibleCount())
  );

  hasMorePastries = computed(() =>
    this.visibleCount() < this.allFilteredPastries().length
  );

  isStickyHidden = signal(false);
  private lastScrollPosition = 0;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Only apply auto-hide on mobile screens (lg is 1024px in Tailwind)
    if (window.innerWidth >= 1024) {
      if (this.isStickyHidden()) this.isStickyHidden.set(false);
      return;
    }

    // Do not hide if the user is currently typing in the search bar
    if (this.isSearchFocused()) {
      if (this.isStickyHidden()) this.isStickyHidden.set(false);
      this.lastScrollPosition = window.scrollY;
      return;
    }

    const currentScroll = window.scrollY;
    
    // Calculate where the menu actually starts so we don't hide it prematurely
    let triggerPoint = 300;
    const menuEl = document.getElementById('menu-layout');
    if (menuEl) {
      triggerPoint = menuEl.getBoundingClientRect().top + window.scrollY;
    }

    // Use a threshold so tiny movements don't hide/show the menu
    const scrollDelta = currentScroll - this.lastScrollPosition;

    // Only hide if we are scrolling down significantly, and we've scrolled past the menu's top position
    if (currentScroll > triggerPoint && scrollDelta > 15) {
      this.isStickyHidden.set(true);
      this.lastScrollPosition = currentScroll;
    } else if (scrollDelta < -15 || currentScroll <= triggerPoint) {
      this.isStickyHidden.set(false);
      this.lastScrollPosition = currentScroll;
    }
  }

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
        // Sort flavors ascending by price so the cheapest shows first everywhere
        const sortedProds = [...prods].sort((a, b) => a.price - b.price);
        const first = sortedProds[0];
        const flavors = sortedProds.map(p => p.name);
        const previewFlavors = flavors.slice(0, FLAVOR_PREVIEW_LIMIT);
        const remaining = flavors.length - previewFlavors.length;

        cards.push({
          groupName: key,
          category: first.category,
          image: first.image,
          minPrice: Math.min(...sortedProds.map(p => p.price)),
          flavorsCount: sortedProds.length,
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

  updateSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(INITIAL_VISIBLE_ROWS);
  }

  loadMorePastries() {
    this.visibleCount.set(this.visibleCount() + LOAD_MORE_STEP);
  }

  onImageError(event: any, imageSrc: string) {
    event.target.style.display = 'none';
    this.failedImages.add(imageSrc);
  }

  onEmojiError(event: any) {
    event.target.style.display = 'none';
  }

  hasImageFailed(imageSrc: string): boolean {
    return this.failedImages.has(imageSrc);
  }

  goToProduct(id: string) {
    this.router.navigate(['/product', id]);
  }
}