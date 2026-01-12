import { DatePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonRippleEffect,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  bulbOutline,
  checkmarkDoneOutline,
  timeOutline,
} from 'ionicons/icons';
import { EventDetailModalComponent } from 'src/app/components/event-detail-modal/event-detail-modal.component';

import { SelfOpsEvent } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

@Component({
  selector: 'app-reflect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    UpperCasePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonBadge,
    IonIcon,
    IonRippleEffect,
    IonSkeletonText,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Góc nhìn lại ({{ pendingEvents().length }})</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="loadData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (isLoading()) {
      <div class="list-container">
        @for (i of [1,2,3]; track i) {
        <div class="reflect-card skeleton-card">
          <div class="card-top">
            <ion-skeleton-text
              animated
              style="width: 60px; height: 20px; border-radius: 4px;"
            ></ion-skeleton-text>
            <ion-skeleton-text
              animated
              style="width: 40px; height: 16px;"
            ></ion-skeleton-text>
          </div>
          <div class="card-body">
            <ion-skeleton-text
              animated
              style="width: 100%; height: 16px; margin-bottom: 6px;"
            ></ion-skeleton-text>
            <ion-skeleton-text
              animated
              style="width: 80%; height: 16px;"
            ></ion-skeleton-text>
          </div>
          <div class="card-footer">
            <ion-skeleton-text
              animated
              style="width: 80px; height: 16px; margin-left: auto;"
            ></ion-skeleton-text>
          </div>
        </div>
        }
      </div>
      } @else if (pendingEvents().length === 0) {
      <div class="empty-state fade-in">
        <div class="illustration">
          <ion-icon name="bulb-outline"></ion-icon>
        </div>
        <h3>Tâm trí thảnh thơi</h3>
        <p>Bạn đã hoàn thành tất cả các bài học.</p>
      </div>
      } @else {
      <div class="list-container fade-in">
        @for (evt of pendingEvents(); track evt.uuid) {
        <div
          class="reflect-card ion-activatable ripple-parent"
          (click)="openReflectModal(evt)"
        >
          <ion-ripple-effect></ion-ripple-effect>

          <div class="card-top">
            <ion-badge [color]="getTypeColor(evt.type)" mode="ios">
              {{ evt.type | uppercase }}
            </ion-badge>

            <div class="due-date">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ evt.review_due_date | date : 'dd/MM' }}</span>
            </div>
          </div>

          <div class="card-body">
            <p class="context truncate-text">
              {{ evt.context }}
            </p>
          </div>

          <div class="card-footer">
            <span class="cta-text">Viết bài học</span>
            <ion-icon name="arrow-forward-outline"></ion-icon>
          </div>
        </div>
        }
      </div>
      }
    </ion-content>
  `,
  styles: [
    `
      /* Container cho list để dễ quản lý layout */
      .list-container {
        display: flex;
        flex-direction: column;
        gap: 16px; /* Khoảng cách giữa các card */
        padding-bottom: 24px;
      }

      /* --- EMPTY STATE --- */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 70vh;
        text-align: center;
        padding: 20px;
      }
      .empty-state .illustration {
        font-size: 64px;
        color: var(--ion-color-warning);
        margin-bottom: 24px;
        background: rgba(
          var(--ion-color-warning-rgb),
          0.1
        ); /* Dùng RGB var để làm mờ */
        border-radius: 50%;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(var(--ion-color-warning-rgb), 0.15);
      }
      .empty-state h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ion-text-color);
        margin-bottom: 8px;
      }
      .empty-state p {
        color: var(--ion-color-medium);
        font-size: 0.95rem;
        max-width: 250px;
        line-height: 1.5;
      }

      /* --- CARD DESIGN --- */
      .reflect-card {
        background: var(--ion-card-background);
        border-radius: 16px;
        padding: 16px;
        position: relative;
        overflow: hidden; /* Để ripple không bị tràn ra ngoài */

        /* Modern Shadow & Border */
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        border: 1px solid var(--ion-color-light-shade);
        transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      }

      /* Hiệu ứng khi nhấn giữ */
      .reflect-card:active {
        transform: scale(0.98);
      }

      /* Dark Mode Tự Động (Dựa trên biến Ionic) */
      /* Không cần :host-context nữa nếu dùng var chuẩn */

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .due-date {
        font-size: 0.85rem;
        color: var(--ion-color-danger);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(var(--ion-color-danger-rgb), 0.08);
        padding: 4px 10px;
        border-radius: 20px;
      }

      .card-body {
        margin-bottom: 16px;
      }

      .context {
        font-size: 1.05rem;
        line-height: 1.6;
        color: var(--ion-text-color);
        margin: 0;

        /* Cắt dòng mượt mà */
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        border-top: 1px dashed var(--ion-color-step-150, #e0e0e0);
        padding-top: 12px;
        color: var(--ion-color-primary);
        font-weight: 600;
        font-size: 0.9rem;
      }

      /* --- UTILS --- */
      .ripple-parent {
        position: relative;
        overflow: hidden;
      }

      .skeleton-card {
        border-color: transparent;
        box-shadow: none;
        background: var(--ion-item-background); /* Nền skeleton khác chút */
      }

      /* Animation Fade In */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .fade-in {
        animation: fadeIn 0.4s ease-out forwards;
      }
    `,
  ],
})
export class ReflectPage implements ViewWillEnter {
  private db = inject(DatabaseService);
  private modalCtrl = inject(ModalController);

  // Signals
  pendingEvents = signal<SelfOpsEvent[]>([]);
  isLoading = signal(true); // Mặc định true để hiện Skeleton ngay lúc vào

  constructor() {
    addIcons({
      timeOutline,
      arrowForwardOutline,
      checkmarkDoneOutline,
      bulbOutline,
    });
  }

  async ionViewWillEnter() {
    this.loadData();
  }

  async loadData(event?: any) {
    // Nếu là pull-to-refresh thì không cần hiện skeleton
    if (!event) this.isLoading.set(true);

    try {
      const data = await this.db.getPendingReviews();
      this.pendingEvents.set(data);
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
      if (event) event.target.complete();
    }
  }

  async openReflectModal(event: SelfOpsEvent) {
    const modal = await this.modalCtrl.create({
      component: EventDetailModalComponent,
      componentProps: { event },
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    if (role === 'saved' || role === 'deleted') {
      this.loadData();
    }
  }

  getTypeColor(type: string) {
    return AppUtils.getTypeConfig(type).color;
  }
}
