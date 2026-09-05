import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-slider.html'
})
export class CartSlider {
  cartService = inject(CartService);
  private router = inject(Router);

  removeItem(cartId: string) {
    this.cartService.removeFromCart(cartId);
  }

  updateQuantity(cartId: string, quantity: number) {
    this.cartService.updateQuantity(cartId, quantity);
  }

  modifyItem(cartId: string, productId: string) {
    this.cartService.closeCart();
    this.router.navigate(['/product', productId], { queryParams: { modify: cartId } });
  }

  proceedToCheckout() {
    this.cartService.closeCart();
    this.router.navigate(['/checkout']);
  }
}
