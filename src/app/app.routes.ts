import { Routes, CanDeactivateFn } from '@angular/router';
import { ProductDetails } from './components/product-details/product-details';
import { Home } from './components/home/home';
import { PrivacyPolicy } from './components/privacy-policy/privacy-policy';
import { Terms } from './components/terms/terms';
import { Accessibility } from './components/accessibility/accessibility';
import { OrderSuccess } from './components/order-success/order-success';
import { TrackOrder } from './components/track-order/track-order';
import { NotFound } from './components/not-found/not-found';

export const unsavedChangesGuard: CanDeactivateFn<ProductDetails> = (component, currentRoute, currentState, nextState) => {
  if (component.modifyCartId() && component.hasUnsavedChanges()) {
    if (nextState.url.split('?')[0] === currentState.url.split('?')[0]) {
      return true;
    }
    return confirm("Are you sure you don't want to save your changes?");
  }
  return true;
};

export const routes: Routes = [
  { path: '', component: Home, data: { seo: { title: 'Artisan Handcrafted Pastries', description: 'Handcrafted desserts made with love, right from my home kitchen to your table in Bangalore.', url: '' } } },
  { path: 'product/:id', component: ProductDetails, canDeactivate: [unsavedChangesGuard] },
  { path: 'privacy-policy', component: PrivacyPolicy, data: { seo: { title: 'Privacy Policy', description: 'Privacy policy for MQ Pastries.', url: '/privacy-policy' } } },
  { path: 'terms', component: Terms, data: { seo: { title: 'Terms of Service', description: 'Terms of service for MQ Pastries.', url: '/terms' } } },
  { path: 'accessibility', component: Accessibility, data: { seo: { title: 'Accessibility Statement', description: 'Accessibility statement for MQ Pastries.', url: '/accessibility' } } },
  { path: 'order-success', component: OrderSuccess, data: { seo: { title: 'Order Success', description: 'Your order was successful.', noindex: true } } },
  { path: 'track-order/:id', component: TrackOrder, data: { seo: { title: 'Track Order', description: 'Track your MQ Pastries order.', noindex: true } } },
  { path: '**', component: NotFound, data: { seo: { title: 'Page Not Found', description: 'This page could not be found.', noindex: true } } }
];