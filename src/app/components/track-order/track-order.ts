import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface OrderItem {
  id: string;
  quantity: number;
  variantName: string | null;
  priceAtPurchase: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
  };
}

interface Order {
  id: string;
  customerName: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  address: string;
  pincode: string;
  borzoOrderId: string | null;
  pickup: boolean;
  items: OrderItem[];
  createdAt: string;
}

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#fdfbf7] pt-24 pb-12 font-['Inter']">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="bg-white rounded-2xl shadow-sm border border-[#f1e8d5] p-4 sm:p-6 md:p-10">
          <div class="text-center mb-6 sm:mb-8">
            <h1 class="text-2xl sm:text-3xl font-['Playfair_Display'] text-[#2b2121] mb-2">Track Your Order</h1>
            <p class="text-xs sm:text-sm text-gray-500">Order ID: <span class="break-all">{{ orderId }}</span></p>
          </div>

          <div *ngIf="isLoading()" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8b7355]"></div>
          </div>

          <div *ngIf="error()" class="bg-red-50 text-red-800 p-4 rounded-lg text-center">
            {{ error() }}
          </div>

          <div *ngIf="order() as o" class="space-y-8">
            <!-- Status Timeline -->
            <div class="relative py-4">
              <div class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <div class="h-1 w-full bg-gray-200 rounded-full"></div>
                <div class="absolute h-1 left-0 bg-[#8b7355] rounded-full transition-all duration-500"
                     [style.width]="getProgressWidth(o.status, o.pickup)"></div>
              </div>
              
              <div class="relative flex justify-between">
                <div *ngFor="let step of getSteps(o)" class="flex flex-col items-center">
                  <div class="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 sm:border-4 border-white z-10 transition-colors duration-300 text-xs sm:text-base"
                       [ngClass]="isStepCompleted(step.status, o.status, o.pickup) ? 'bg-[#8b7355] text-white' : 'bg-gray-200 text-gray-400'">
                    <i [class]="step.icon"></i>
                  </div>
                  <div class="mt-2 text-[9px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-wider text-center max-w-[65px] sm:max-w-[80px] leading-tight"
                       [ngClass]="isStepCompleted(step.status, o.status, o.pickup) ? 'text-[#8b7355]' : 'text-gray-400'">
                    {{ step.label }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Order Details -->
            <div class="bg-[#fdfbf7] p-4 sm:p-6 rounded-xl border border-[#f1e8d5]">
              <h3 class="font-['Playfair_Display'] text-lg sm:text-xl text-[#2b2121] mb-4 border-b border-[#f1e8d5] pb-2">Order Summary</h3>
              
              <div class="space-y-4 mb-6">
                <div *ngFor="let item of o.items" class="flex justify-between items-start sm:items-center">
                  <div class="flex items-center space-x-3 sm:space-x-4">
                    <img *ngIf="item.product.imageUrl" [src]="item.product.imageUrl" class="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md" alt="{{ item.product.name }}">
                    <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-md flex items-center justify-center" *ngIf="!item.product.imageUrl">
                      <i class="fas fa-image text-gray-300 text-sm sm:text-base"></i>
                    </div>
                    <div>
                      <p class="font-medium text-sm sm:text-base text-[#2b2121] leading-tight mb-0.5">{{ item.product.name }}</p>
                      <p class="text-[11px] sm:text-sm text-gray-500" *ngIf="item.variantName">{{ item.variantName }}</p>
                      <p class="text-[11px] sm:text-sm text-gray-500">Qty: {{ item.quantity }}</p>
                    </div>
                  </div>
                  <p class="font-medium text-sm sm:text-base mt-1 sm:mt-0">₹{{ item.priceAtPurchase * item.quantity }}</p>
                </div>
              </div>
              
              <div class="border-t border-[#f1e8d5] pt-4 space-y-2">
                <div class="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>₹{{ o.shippingCost }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg text-[#2b2121] pt-2">
                  <span>Total</span>
                  <span>₹{{ o.totalAmount }}</span>
                </div>
              </div>
            </div>
            
            <div class="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div class="bg-white p-4 sm:p-6 rounded-xl border border-[#f1e8d5] shadow-sm">
                <h3 class="font-semibold text-sm sm:text-base text-[#2b2121] mb-2 sm:mb-3 flex items-center">
                  <i *ngIf="!o.pickup" class="fas fa-map-marker-alt text-[#8b7355] mr-2"></i>
                  <i *ngIf="o.pickup" class="fas fa-store text-[#8b7355] mr-2"></i>
                  {{ o.pickup ? 'Pickup Details' : 'Delivery Details' }}
                </h3>
                <ng-container *ngIf="!o.pickup">
                  <p class="text-gray-600 text-[13px] sm:text-sm whitespace-pre-line">{{ o.address }}</p>
                  <p class="text-gray-600 text-[13px] sm:text-sm mt-1">Pincode: {{ o.pincode }}</p>
                </ng-container>
                <ng-container *ngIf="o.pickup">
                  <p class="text-gray-600 text-[13px] sm:text-sm">Pick up your order at our store:</p>
                  <p class="text-gray-600 text-[13px] sm:text-sm mt-1 font-semibold">Santara Magan Place 1 Rd, Hulimavu, Bengaluru, Karnataka 560076</p>
                </ng-container>
              </div>
              
              <div class="bg-white p-4 sm:p-6 rounded-xl border border-[#f1e8d5] shadow-sm">
                <h3 class="font-semibold text-sm sm:text-base text-[#2b2121] mb-2 sm:mb-3 flex items-center"><i class="fas fa-info-circle text-[#8b7355] mr-2"></i> Need Help?</h3>
                <p class="text-gray-600 text-[13px] sm:text-sm">If you have any questions about your order, please contact our support team.</p>
                <a href="mailto:mqpastries@gmail.com" class="text-[#8b7355] font-medium text-[13px] sm:text-sm mt-2 inline-block hover:underline">Contact Support</a>
              </div>
            </div>
            
            <!-- Borzo Delivery Partner (Optional Display) -->
            <div *ngIf="o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED'" class="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start space-x-3">
               <i class="fas fa-truck text-blue-500 mt-1 text-lg"></i>
               <div>
                  <h4 class="font-semibold text-blue-900">Delivery Partner</h4>
                  <p class="text-blue-800 text-sm mt-1">Your order is being handled by Borzo Delivery.</p>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class TrackOrder implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/public/orders`;
  private pollingInterval: any;

  orderId: string = '';
  order = signal<Order | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  getSteps(order: Order) {
    return [
      { status: 'PAID', label: 'Confirmed', icon: 'fas fa-check' },
      { status: 'PREPARING', label: 'Preparing', icon: 'fas fa-cookie-bite' },
      { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: 'fas fa-box-open' },
      { status: 'DELIVERED', label: 'Picked Up', icon: 'fas fa-hand-holding-heart' }
    ];
  }

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.fetchOrder();
      // Poll every 1 minute so admin changes reflect without overwhelming the server
      this.pollingInterval = setInterval(() => {
        this.fetchOrder(true);
      }, 60000);
    } else {
      this.error.set('Invalid order ID');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  fetchOrder(isPolling = false) {
    this.http.get<Order>(`${this.apiUrl}/${this.orderId}`).subscribe({
      next: (data) => {
        this.order.set(data);
        if (!isPolling) this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching order:', err);
        if (!isPolling) {
          this.error.set(err.error?.error || 'Could not find order. Please check the ID and try again.');
          this.isLoading.set(false);
        }
      }
    });
  }

  isStepCompleted(stepStatus: string, currentStatus: string, isPickup: boolean): boolean {
    if (currentStatus === 'FAILED') return false;
    if (currentStatus === 'DELIVERED') return true;
    
    // We treat OUT_FOR_DELIVERY same as READY_FOR_PICKUP in timeline just in case legacy orders use it
    if (currentStatus === 'OUT_FOR_DELIVERY') currentStatus = 'READY_FOR_PICKUP';
    
    const orderStatuses = ['PENDING', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERED'];
      
    const stepIdx = orderStatuses.indexOf(stepStatus);
    const currentIdx = orderStatuses.indexOf(currentStatus);
    return stepIdx <= currentIdx;
  }

  getProgressWidth(currentStatus: string, isPickup: boolean): string {
    if (currentStatus === 'FAILED' || currentStatus === 'PENDING') return '0%';
    
    if (currentStatus === 'PAID') return '0%';
    if (currentStatus === 'PREPARING') return '33%';
    if (currentStatus === 'READY_FOR_PICKUP' || currentStatus === 'OUT_FOR_DELIVERY') return '66%';
    if (currentStatus === 'DELIVERED') return '100%';
    
    return '0%';
  }
}
