import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html'
})
export class Menu implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  categories = category_list;
  pastries = signal<Product[]>([]);
  isLoading = signal(true);
  
  failedImages = new Set<string>();
  selectedCategory = signal<string>('All');

  filteredPastries = computed(() => {
    const category = this.selectedCategory();
    const allPastries = this.pastries();
    
    if (category === 'All') {
      return allPastries;
    }
    return allPastries.filter(p => p.category === category);
  });

  ngOnInit() {
    this.http.get<Product[]>(`${environment.apiUrl}/public/products`).subscribe({
      next: (data) => {
        const groupedMap = new Map<string, Product>();
        data.forEach(p => {
            const key = p.groupName || p.name;
            if (!groupedMap.has(key)) {
               groupedMap.set(key, p);
            }
        });
        this.pastries.set(Array.from(groupedMap.values()));
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
