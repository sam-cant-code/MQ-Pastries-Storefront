import { Routes } from '@angular/router';
import { ProductDetails } from './components/product-details/product-details';
import { Home } from './components/home/home';
import { AllergenGuide } from './components/allergen-guide/allergen-guide';
import { Accessibility } from './components/accessibility/accessibility';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'product/:id', component: ProductDetails },
  { path: 'allergens', component: AllergenGuide },
  { path: 'accessibility', component: Accessibility }
];