import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { environment } from '../../environments/environment';

declare var Razorpay: any;

@Component({
  selector: 'app-cart-slider',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cart-slider.html'
})
export class CartSlider {
  cartService = inject(CartService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  checkoutForm: FormGroup;
  isProcessing = signal(false);

  constructor() {
    this.checkoutForm = this.fb.group({
      customerName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required]
    });
  }

  removeItem(cartId: string) {
    this.cartService.removeFromCart(cartId);
  }

  modifyItem(cartId: string, productId: string) {
    this.cartService.closeCart();
    this.router.navigate(['/product', productId], { queryParams: { modify: cartId } });
  }

  async processCheckout() {
    if (this.checkoutForm.invalid || this.cartService.getItems().length === 0) return;
    
    this.isProcessing.set(true);
    const orderData = {
      ...this.checkoutForm.value,
      items: this.cartService.getItems().map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variantName: item.variantName
      }))
    };

    try {
      this.http.post<any>(`${environment.apiUrl}/public/orders/create-payment`, orderData)
        .subscribe({
          next: (res) => this.openRazorpay(res),
          error: (err) => {
            console.error('Failed to create order', err);
            alert('Failed to initialize payment. Please try again.');
            this.isProcessing.set(false);
          }
        });
    } catch (e) {
      this.isProcessing.set(false);
    }
  }

  private openRazorpay(orderRes: any) {
    const options = {
      key: 'rzp_test_dummykey', // TODO: User needs to update this
      amount: orderRes.amount * 100,
      currency: orderRes.currency,
      name: 'MQ Pastries',
      description: 'Your delicious order',
      order_id: orderRes.razorpayOrderId,
      handler: (response: any) => {
        this.verifyPayment(response);
      },
      prefill: {
        name: this.checkoutForm.value.customerName,
        email: this.checkoutForm.value.email,
        contact: this.checkoutForm.value.phone
      },
      theme: {
        color: '#3B2921' // espresso-900
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      alert('Payment Failed! ' + response.error.description);
      this.isProcessing.set(false);
    });
    rzp.open();
  }

  private verifyPayment(paymentData: any) {
    this.http.post(`${environment.apiUrl}/public/orders/verify-payment`, paymentData)
      .subscribe({
        next: (res) => {
          alert('Payment Successful! Your order has been placed.');
          this.cartService.clearCart();
          this.cartService.closeCart();
          this.checkoutForm.reset();
          this.isProcessing.set(false);
        },
        error: (err) => {
          console.error(err);
          alert('Payment verification failed.');
          this.isProcessing.set(false);
        }
      });
  }
}
