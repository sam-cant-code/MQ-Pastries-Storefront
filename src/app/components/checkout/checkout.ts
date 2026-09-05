import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

declare var Razorpay: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './checkout.html'
})
export class Checkout implements OnInit, OnDestroy {
  cartService = inject(CartService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  checkoutForm: FormGroup;
  isProcessing = signal(false);
  verificationStatus = signal<'none' | 'sending' | 'sent' | 'verified'>('none');
  deliveryCost = signal<number>(0);
  calculatingShipping = signal<boolean>(false);
  hasCreamBasedItems = signal<boolean>(false);
  creamBasedItemNames = signal<string>('');
  
  standardCost = signal<number | null>(null);
  courierCost = signal<number | null>(null);
  private lastCalculatedPincode = '';
  private lastCalculatedAddress = '';

  private verificationInterval: any;

  addressPincodeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const isPickup = control.get('isPickup')?.value;
    if (isPickup) return null;
    
    const pincode = control.get('pincode')?.value;
    const address = control.get('address')?.value;
    
    if (pincode && address && !address.includes(pincode)) {
      return { pincodeMismatch: true };
    }
    return null;
  };

  constructor() {
    this.checkoutForm = this.fb.group({
      isPickup: [{ value: false, disabled: false }],
      deliveryType: ['standard'],
      customerName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern('^56[0-9]{4}$')]]
    }, { validators: this.addressPincodeValidator });

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
        this.standardCost.set(null);
        this.courierCost.set(null);
        return;
      }
      
      if (this.standardCost() !== null && this.courierCost() !== null) {
        this.deliveryCost.set(val.deliveryType === 'courier' ? this.courierCost()! : this.standardCost()!);
      }

      const pincodeControl = this.checkoutForm.get('pincode');
      const addressControl = this.checkoutForm.get('address');
      const address = val.address || '';
      
      if (pincodeControl?.valid && val.pincode && address.trim().length > 0) {
        this.calculateShippingCost(val.pincode, address);
      } else {
        if (this.lastCalculatedAddress !== address || this.lastCalculatedPincode !== val.pincode) {
          this.standardCost.set(null);
          this.courierCost.set(null);
          this.deliveryCost.set(0);
          this.lastCalculatedAddress = '';
          this.lastCalculatedPincode = '';
        }
      }
    });
  }

  ngOnInit() {
    const items = this.cartService.getItems();
    if (items.length === 0) {
      this.router.navigate(['/']);
      return;
    }

    const creamItems = items.filter(item => item.isCreamBased);
    if (creamItems.length > 0) {
      this.hasCreamBasedItems.set(true);
      this.creamBasedItemNames.set(creamItems.map(i => i.name).join(', '));
      // Force standard delivery if courier is not allowed
      this.checkoutForm.patchValue({ deliveryType: 'standard' });
    }
  }

  isLateForDelivery(): boolean {
    const hour = new Date().getHours();
    return hour >= 20 || hour < 9;
  }

  private calculateShippingCost(pincode: string, address: string) {
    if (this.lastCalculatedPincode === pincode && this.lastCalculatedAddress === address) return;
    
    this.lastCalculatedPincode = pincode;
    this.lastCalculatedAddress = address;

    this.calculatingShipping.set(true);
    
    const items = this.cartService.getItems().map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      variantName: item.variantName
    }));

    const reqStandard = this.http.post<{shippingCost: number}>(`${environment.apiUrl}/public/orders/calculate-shipping`, {
      pincode, address, deliveryType: 'standard', items
    });
    
    const reqCourier = this.http.post<{shippingCost: number}>(`${environment.apiUrl}/public/orders/calculate-shipping`, {
      pincode, address, deliveryType: 'courier', items
    });

    forkJoin({
      standard: reqStandard,
      courier: reqCourier
    }).subscribe({
      next: (res) => {
        this.standardCost.set(res.standard.shippingCost);
        this.courierCost.set(res.courier.shippingCost);
        
        const type = this.checkoutForm.get('deliveryType')?.value || 'standard';
        this.deliveryCost.set(type === 'courier' ? res.courier.shippingCost : res.standard.shippingCost);
        
        this.calculatingShipping.set(false);
        this.checkoutForm.get('address')?.setErrors(null);
      },
      error: (err) => {
        this.standardCost.set(null);
        this.courierCost.set(null);
        this.deliveryCost.set(0);
        this.calculatingShipping.set(false);
        const errorMsg = err.error?.error || 'Invalid address or delivery not possible.';
        this.cartService.showToast(errorMsg, 'Error');
        this.checkoutForm.get('address')?.setErrors({ invalidAddress: true });
        this.lastCalculatedAddress = ''; // Allow retry
        this.lastCalculatedPincode = '';
      }
    });
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
        variantName: item.variantName,
        customMessage: item.customMessage
      }))
    };

    try {
      this.http.post<any>(`${environment.apiUrl}/public/orders/create-payment`, orderData)
        .subscribe({
          next: (res) => this.openRazorpay(res),
          error: (err) => {
            console.error('Failed to create order', err);
            const errorMsg = err.error?.error || 'Failed to initialize payment. Please try again.';
            this.cartService.showToast(errorMsg, 'Error');
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
        color: '#3B2921'
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
          const errorMsg = err.error?.error || 'Payment verification failed.';
          this.cartService.showToast(errorMsg, 'Error');
          this.isProcessing.set(false);
        }
      });
  }
}
