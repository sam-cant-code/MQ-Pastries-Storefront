import { Routes } from '@angular/router';
import { ProductDetails } from './components/product-details/product-details';
import { Home } from './components/home/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'product/:id', component: ProductDetails }
];
