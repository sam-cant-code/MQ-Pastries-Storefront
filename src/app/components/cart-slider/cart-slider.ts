import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';

declare var Razorpay: any;

@Component({
  selector: 'app-cart-slider',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cart-slider.html'
})
export class CartSlider implements OnDestroy {
  cartService = inject(CartService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  checkoutForm: FormGroup;
  isProcessing = signal(false);
  verificationStatus = signal<'none' | 'sending' | 'sent' | 'verified'>('none');
  deliveryCost = signal<number>(0);
  calculatingShipping = signal<boolean>(false);
  private verificationInterval: any;

  constructor() {
    this.checkoutForm = this.fb.group({
      isPickup: [false],
      deliveryType: ['standard'],
      customerName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern('^56[0-9]{4}$')]]
    });

    this.checkoutForm.get('isPickup')?.valueChanges.subscribe(isPickup => {
      if (isPickup) {
        this.checkoutForm.get('address')?.clearValidators();
        this.checkoutForm.get('pincode')?.clearValidators();
      } else {
        this.checkoutForm.get('address')?.setValidators([Validators.required]);
        this.checkoutForm.get('pincode')?.setValidators([Validators.required, Validators.pattern('^56[0-9]{4}$')]);
      }
      this.checkoutForm.get('address')?.updateValueAndValidity();
      this.checkoutForm.get('pincode')?.updateValueAndValidity();
    });

    this.checkoutForm.valueChanges.subscribe(val => {
      if (val.isPickup) {
        this.deliveryCost.set(0);
        return;
      }
      
      const pincodeControl = this.checkoutForm.get('pincode');
      if (pincodeControl?.valid && val.pincode) {
        this.calculateShippingCost(val.pincode, val.address, val.deliveryType);
      } else {
        this.deliveryCost.set(0);
      }
    });
  }

  isLateForDelivery(): boolean {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 9;
  }

  private calculateShippingCost(pincode: string, address: string, deliveryType: string) {
    this.calculatingShipping.set(true);
    const totalQty = this.cartService.getItems().reduce((sum, item) => sum + item.quantity, 0);
    this.http.post<{shippingCost: number}>(`${environment.apiUrl}/public/orders/calculate-shipping`, {
      pincode, address, deliveryType, totalQty
    }).subscribe({
      next: (res) => {
        this.deliveryCost.set(res.shippingCost);
        this.calculatingShipping.set(false);
        this.checkoutForm.get('address')?.setErrors(null);
      },
      error: (err) => {
        this.deliveryCost.set(0);
        this.calculatingShipping.set(false);
        const errorMsg = err.error?.error || 'Invalid address or delivery not possible.';
        this.cartService.showToast(errorMsg, 'Error');
        this.checkoutForm.get('address')?.setErrors({ invalidAddress: true });
      }
    });
  }

  removeItem(cartId: string) {
    this.cartService.removeFromCart(cartId);
  }

  modifyItem(cartId: string, productId: string) {
    this.cartService.closeCart();
    this.router.navigate(['/product', productId], { queryParams: { modify: cartId } });
  }

  ngOnDestroy() {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
    }
  }

  async processCheckout() {
    if (this.checkoutForm.invalid || this.cartService.getItems().length === 0) {
      if (!this.checkoutForm.value.isPickup && this.checkoutForm.controls['pincode'].errors?.['pattern']) {
        this.cartService.showToast('Sorry, we currently only deliver within Bangalore (Pincode 56xxxx).', 'Error');
      }
      return;
    }
    
    // Check if email is already verified
    const email = this.checkoutForm.value.email;
    this.isProcessing.set(true);
    this.http.get<{verified: boolean}>(`${environment.apiUrl}/public/orders/check-verification?email=${email}`)
      .subscribe({
        next: (res) => {
          if (res.verified) {
            this.verificationStatus.set('verified');
            this.createOrder();
          } else {
            this.sendVerificationEmail(email);
          }
        },
        error: () => this.sendVerificationEmail(email)
      });
  }

  private sendVerificationEmail(email: string) {
    this.verificationStatus.set('sending');
    this.http.post(`${environment.apiUrl}/public/orders/send-verification-email`, { email })
      .subscribe({
        next: () => {
          this.verificationStatus.set('sent');
          this.isProcessing.set(false);
          this.cartService.showToast('Verification email sent. Please check your inbox.', 'Info');
          this.pollVerification(email);
        },
        error: (err) => {
          console.error(err);
          this.verificationStatus.set('none');
          this.isProcessing.set(false);
          this.cartService.showToast('Failed to send verification email.', 'Error');
        }
      });
  }

  private pollVerification(email: string) {
    if (this.verificationInterval) clearInterval(this.verificationInterval);
    this.verificationInterval = setInterval(() => {
      this.http.get<{verified: boolean}>(`${environment.apiUrl}/public/orders/check-verification?email=${email}`)
        .subscribe({
          next: (res) => {
            if (res.verified) {
              clearInterval(this.verificationInterval);
              this.verificationStatus.set('verified');
              this.cartService.showToast('Email verified successfully!', 'Success');
              this.createOrder();
            }
          }
        });
    }, 3000);
  }

  private createOrder() {
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
            this.cartService.showToast('Failed to initialize payment. Please try again.', 'Error');
            this.isProcessing.set(false);
            this.verificationStatus.set('none');
          }
        });
    } catch (e) {
      this.isProcessing.set(false);
      this.verificationStatus.set('none');
    }
  }

  private openRazorpay(orderRes: any) {
    const options = {
      key: environment.razorpayKey,
      amount: Math.round(orderRes.amount * 100),
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
      this.cartService.showToast('Payment Failed! ' + response.error.description, 'Error');
      this.isProcessing.set(false);
    });
    rzp.open();
  }

  private verifyPayment(paymentData: any) {
    this.http.post(`${environment.apiUrl}/public/orders/verify-payment`, paymentData)
      .subscribe({
        next: (res) => {
          this.cartService.showToast('Payment Successful! Your order has been placed.', 'Success');
          this.cartService.clearCart();
          this.cartService.closeCart();
          this.checkoutForm.reset();
          this.isProcessing.set(false);
          this.router.navigate(['/order-success']);
        },
        error: (err) => {
          console.error(err);
          this.cartService.showToast('Payment verification failed.', 'Error');
          this.isProcessing.set(false);
        }
      });
  }
}
