import { Injectable, signal, computed } from '@angular/core';

export interface CartItem {
  cartId: string;
  productId: string;
  variantName: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  customMessage?: string;
  packingName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = signal<CartItem[]>([]);
  isCartOpen = signal(false);

  // Computed properties
  totalItems = computed(() => this.cartItems().reduce((sum, item) => sum + item.quantity, 0));
  totalPrice = computed(() => this.cartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0));

  constructor() {
    this.loadCart();
  }

  getItems() {
    return this.cartItems();
  }

  toastMessage = signal<{message: string, action: string} | null>(null);

  addToCart(product: any, variant: any, quantity: number = 1, customMessage?: string, packingOptionName?: string) {
    const items = [...this.cartItems()];
    let cartId = `${product.id}-${variant.name}`;
    if (customMessage) {
      cartId += `-${customMessage}`;
    }
    if (packingOptionName) {
      cartId += `-${packingOptionName}`;
    }
    const existing = items.find(i => i.cartId === cartId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        cartId: cartId,
        productId: product.id,
        variantName: variant.name,
        name: product.name,
        price: variant.price,
        quantity: quantity,
        image: product.image,
        customMessage: customMessage,
        packingName: packingOptionName
      });
    }

    this.cartItems.set(items);
    this.saveCart();
    
    if (existing) {
      this.showToast(`${product.name} (${variant.name}) added to cart x${existing.quantity}`);
    } else {
      this.showToast(`${product.name} (${variant.name}) added to cart`);
    }
  }

  showToast(message: string, action: string = 'View Cart') {
    this.toastMessage.set({ message, action });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  removeFromCart(cartId: string) {
    const items = this.cartItems().filter(i => i.cartId !== cartId);
    this.cartItems.set(items);
    this.saveCart();
  }

  updateQuantity(cartId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(cartId);
      return;
    }
    const items = [...this.cartItems()];
    const existing = items.find(i => i.cartId === cartId);
    if (existing) {
      existing.quantity = quantity;
      this.cartItems.set(items);
      this.saveCart();
    }
  }

  clearCart() {
    this.cartItems.set([]);
    this.saveCart();
  }

  toggleCart() {
    this.isCartOpen.set(!this.isCartOpen());
  }

  openCart() {
    this.isCartOpen.set(true);
  }

  closeCart() {
    this.isCartOpen.set(false);
  }

  private saveCart() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mq_cart', JSON.stringify(this.cartItems()));
    }
  }

  private loadCart() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mq_cart');
      if (saved) {
        try {
          this.cartItems.set(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse cart from local storage', e);
        }
      }
    }
  }
}
