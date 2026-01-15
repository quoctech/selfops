import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonRippleEffect,
  IonSegment,
  IonSegmentButton,
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
  fileTrayFullOutline,
  timeOutline,
  trophyOutline,
} from 'ionicons/icons';
import { EventDetailModalComponent } from 'src/app/components/event-detail-modal/event-detail-modal.component';

import { SelfOpsEvent } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

type FilterType = 'PENDING' | 'REVIEWED';

@Component({
  selector: 'app-reflect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonBadge,
    IonIcon,
    IonRippleEffect,
    IonSkeletonText,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="ion-padding">
        <ion-title>
          Góc nhìn lại @if (totalPendingBadge() > 0) {
          <span class="count-badge">({{ totalPendingBadge() }})</span>
          }
        </ion-title>
      </ion-toolbar>

      <ion-toolbar class="segment-toolbar">
        <ion-segment
          [value]="filterStatus()"
          (ionChange)="onFilterChange($event)"
          mode="ios"
        >
          <ion-segment-button value="PENDING">
            <ion-label>Chưa review</ion-label>
          </ion-segment-button>
          <ion-segment-button value="REVIEWED">
            <ion-label>Đã review</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding-horizontal">
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (isLoading()) {
      <div class="list-container">
        @for (i of [1,2,3,4,5]; track i) {
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
        </div>
        }
      </div>
      } @else if (displayList().length === 0) {
      <div class="empty-state fade-in">
        <div class="illustration">
          <ion-icon
            [name]="
              filterStatus() === 'PENDING'
                ? 'bulb-outline'
                : 'file-tray-full-outline'
            "
          ></ion-icon>
        </div>
        <h3>
          {{
            filterStatus() === 'PENDING'
              ? 'Tâm trí thảnh thơi'
              : 'Chưa có bài học nào'
          }}
        </h3>
        <p>
          {{
            filterStatus() === 'PENDING'
              ? 'Bạn đã hoàn thành tất cả các bài học.'
              : 'Hãy review các sự kiện để lưu lại bài học.'
          }}
        </p>
      </div>
      } @else {
      <div class="list-container fade-in">
        @for (evt of displayList(); track evt.uuid) {
        <div
          class="reflect-card ion-activatable ripple-parent"
          [class.reviewed-card]="filterStatus() === 'REVIEWED'"
          (click)="openReflectModal(evt)"
        >
          <ion-ripple-effect></ion-ripple-effect>

          <div class="card-top">
            <ion-badge [color]="getTypeColor(evt.type)" mode="ios">
              {{ getTypeLabel(evt.type) }}
            </ion-badge>

            @if (filterStatus() === 'PENDING') {
            <div class="due-date pending">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ evt.review_due_date | date : 'dd/MM' }}</span>
            </div>
            } @else {
            <div class="due-date reviewed">
              <ion-icon name="checkmark-done-outline"></ion-icon>
              <span>{{
                evt.updated_at || evt.created_at | date : 'dd/MM'
              }}</span>
            </div>
            }
          </div>

          <div class="card-body">
            <p class="context truncate-text">
              {{ evt.context }}
            </p>
          </div>

          <div class="card-footer">
            @if (filterStatus() === 'PENDING') {
            <span class="cta-text">Viết bài học</span>
            <ion-icon name="arrow-forward-outline"></ion-icon>
            } @else {
            <span class="cta-text reviewed-text">Xem lại bài học</span>
            <ion-icon name="trophy-outline"></ion-icon>
            }
          </div>
        </div>
        }
      </div>

      <ion-infinite-scroll
        threshold="100px"
        (ionInfinite)="onIonInfinite($event)"
        [disabled]="isEndOfData()"
      >
        <ion-infinite-scroll-content
          loadingSpinner="bubbles"
          loadingText="Đang tải thêm..."
        >
        </ion-infinite-scroll-content>
      </ion-infinite-scroll>
      }
    </ion-content>
  `,
  styles: [
    `
      /* --- HEADER & SEGMENT --- */
      ion-header {
        border: none !important;
      }
      ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }

      ion-toolbar::part(background) {
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
      }

      .count-badge {
        font-weight: 400;
        opacity: 0.7;
        font-size: 0.9em;
      }
      .segment-toolbar {
        padding: 0 16px 8px 16px;
        --min-height: auto;
      }
      ion-segment {
        background: var(--ion-item-background);
        border-radius: 12px;
        padding: 4px;
        height: 44px;
      }
      ion-segment-button {
        --indicator-color: var(--ion-color-light);
        --color: var(--ion-color-medium);
        --color-checked: var(--ion-text-color);
        --border-radius: 8px;
        font-weight: 600;
        min-height: 36px;
      }
      /* Style riêng cho tab Đã review khi active */
      ion-segment-button[value='REVIEWED'][class*='segment-button-checked'] {
        --color-checked: var(--ion-color-success);
        --indicator-color: rgba(var(--ion-color-success-rgb), 0.1);
      }

      /* --- LIST CONTAINER --- */
      .list-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 16px;
        padding-bottom: 30px;
      }

      /* --- CARD DESIGN --- */
      .reflect-card {
        background: var(--ion-card-background);
        border-radius: 18px;
        padding: 16px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        border: 1px solid var(--ion-color-light-shade);
        transition: transform 0.1s;
      }
      .reflect-card:active {
        transform: scale(0.98);
      }

      /* Reviewed Card Style (Nhẹ nhàng hơn) */
      .reflect-card.reviewed-card {
        border-color: rgba(var(--ion-color-success-rgb), 0.2);
        background: linear-gradient(
          to bottom right,
          var(--ion-card-background),
          rgba(var(--ion-color-success-rgb), 0.03)
        );
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      /* Date Badges */
      .due-date {
        font-size: 0.8rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border-radius: 20px;
      }
      .due-date.pending {
        color: var(--ion-color-danger);
        background: rgba(var(--ion-color-danger-rgb), 0.08);
      }
      .due-date.reviewed {
        color: var(--ion-color-success);
        background: rgba(var(--ion-color-success-rgb), 0.1);
      }

      .card-body {
        margin-bottom: 16px;
      }
      .context {
        font-size: 1.05rem;
        line-height: 1.5;
        color: var(--ion-text-color);
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Footer & CTA */
      .card-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        border-top: 1px dashed var(--ion-color-light-shade);
        padding-top: 12px;
        color: var(--ion-color-primary);
        font-weight: 600;
        font-size: 0.9rem;
      }
      .cta-text.reviewed-text {
        color: var(--ion-color-success);
      }
      .reflect-card.reviewed-card ion-icon {
        color: var(--ion-color-success);
      }

      /* --- EMPTY STATE --- */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
        padding: 20px;
      }
      .empty-state .illustration {
        font-size: 56px;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
        background: var(--ion-color-light);
        border-radius: 50%;
        width: 100px;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .empty-state h3 {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--ion-text-color);
        margin-bottom: 8px;
      }
      .empty-state p {
        color: var(--ion-color-medium);
        font-size: 0.95rem;
      }

      /* SKELETON */
      .skeleton-card {
        border-color: transparent;
        box-shadow: none;
        background: var(--ion-item-background);
      }

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
        animation: fadeIn 0.3s ease-out forwards;
      }
    `,
  ],
})
export class ReflectPage implements ViewWillEnter {
  private databaseService = inject(DatabaseService);
  private modalCtrl = inject(ModalController);

  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  // --- STATE ---
  filterStatus = signal<FilterType>('PENDING');
  isLoading = signal(true);

  // Dữ liệu đã load từ DB (Theo tab hiện tại)
  loadedEvents = signal<SelfOpsEvent[]>([]);

  // Tổng số pending (Cho badge header)
  totalPendingBadge = signal(0);

  // Dữ liệu gốc (Toàn bộ từ DB)
  private allEvents = signal<SelfOpsEvent[]>([]);

  // Pagination State (Client-side slicing)
  private PAGE_SIZE = 20;
  currentPage = signal(1);

  // --- COMPUTED VALUES ---
  // Lọc data gốc theo tab hiện tại
  filteredEvents = computed(() => {
    const status = this.filterStatus();
    const all = this.allEvents();

    if (status === 'PENDING') {
      // Lọc các cái chưa review
      return all
        .filter((e) => !e.is_reviewed)
        .sort((a, b) => a.review_due_date - b.review_due_date); // Ưu tiên hết hạn trước
    } else {
      // Lọc các cái đã review
      return all
        .filter((e) => e.is_reviewed)
        .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0)); // Mới review lên đầu
    }
  });

  // Cắt danh sách để hiển thị (Pagination)
  displayList = computed(() => {
    const list = this.loadedEvents();
    const limit = this.currentPage() * this.PAGE_SIZE;
    return list.slice(0, limit);
  });

  // Kiểm tra xem đã load hết chưa
  isEndOfData = computed(() => {
    return this.displayList().length >= this.loadedEvents().length;
  });

  constructor() {
    addIcons({
      timeOutline,
      arrowForwardOutline,
      checkmarkDoneOutline,
      bulbOutline,
      fileTrayFullOutline,
      trophyOutline,
    });
  }

  async ionViewWillEnter() {
    this.loadData();
  }

  async loadData(event?: any) {
    if (!event) this.isLoading.set(true);

    try {
      const isReviewed = this.filterStatus() === 'REVIEWED';
      const [data, count] = await Promise.all([
        this.databaseService.getEventsByReviewStatus(isReviewed),
        this.databaseService.getPendingCount(),
      ]);

      this.loadedEvents.set(data);
      this.totalPendingBadge.set(count);

      this.currentPage.set(1);

      // Reset Infinite Scroll
      if (this.infiniteScroll) this.infiniteScroll.disabled = false;
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
      if (event) event.target.complete();
    }
  }

  async doRefresh(event: any) {
    await this.loadData(event);
  }

  onFilterChange(event: any) {
    this.filterStatus.set(event.detail.value);
    this.loadData();
  }

  onIonInfinite(ev: any) {
    setTimeout(() => {
      this.currentPage.update((p) => p + 1);
      ev.target.complete();
      if (this.isEndOfData()) ev.target.disabled = true;
    }, 200);

    // Giả lập delay mạng chút xíu cho mượt (optional) hoặc load ngay
    setTimeout(() => {
      this.currentPage.update((p) => p + 1);
      ev.target.complete();
      if (this.isEndOfData()) ev.target.disabled = true;
    }, 200);
  }

  async openReflectModal(event: SelfOpsEvent) {
    const modal = await this.modalCtrl.create({
      component: EventDetailModalComponent,
      componentProps: { event },
    });

    await modal.present();
    const { role } = await modal.onWillDismiss();

    // Nếu có thay đổi (save/delete), reload lại data để cập nhật list
    if (role === 'saved' || role === 'deleted') {
      this.loadData();
    }
  }

  getTypeColor(type: string) {
    return AppUtils.getTypeConfig(type).color;
  }

  getTypeLabel(type: string) {
    return AppUtils.getTypeLabel(type);
  }
}
