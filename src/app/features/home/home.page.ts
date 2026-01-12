import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  add,
  alertCircleOutline,
  batteryDeadOutline,
  calendarOutline,
  closeCircle,
  documentTextOutline,
  filterOutline,
  happyOutline,
  helpBuoyOutline,
  searchOutline,
  settingsOutline,
  statsChartOutline,
  timeOutline,
} from 'ionicons/icons';

import {
  InfiniteScrollCustomEvent,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonRippleEffect,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';

import { AddEventModalComponent } from 'src/app/components/add-event-modal/add-event-modal.component';
import { EventDetailModalComponent } from 'src/app/components/event-detail-modal/event-detail-modal.component';
import { StatsModalComponent } from 'src/app/components/stats-modal/stats-modal.component';
import { SelfOpsEvent, SelfOpsEventType } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonLabel,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSearchbar,
    IonButtons,
    IonButton,
    IonChip,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    IonRippleEffect,
  ],
  template: `
    <ion-header
      [translucent]="false"
      class="ion-padding ion-no-border header-solid"
    >
      <ion-toolbar>
        <ion-title class="brand-title">
          <span class="text-gradient">SelfOps</span><span class="dot">.</span>
        </ion-title>

        <ion-buttons slot="end">
          <ion-button (click)="goToSettings()" color="medium">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <div class="dashboard-container">
        <div class="header-action-row">
          <div class="greeting-box">
            <p class="date-label">
              <ion-icon name="calendar-outline"></ion-icon>
              {{ today | date : 'EEEE, dd/MM' }}
            </p>
            <h1 class="greeting-title">{{ getGreeting() }}</h1>
          </div>

          <div
            class="stats-btn-wrapper ion-activatable ripple-parent"
            (click)="openStats()"
          >
            <ion-icon name="stats-chart-outline"></ion-icon>
            <ion-ripple-effect></ion-ripple-effect>
          </div>
        </div>

        <div class="stats-grid">
          @for (type of eventTypes; track type) { @let conf =
          getEventConfig(type);
          <div
            class="mini-card ion-activatable ripple-parent"
            [class.active]="filterType() === type"
            (click)="handleFilterChange(type)"
          >
            <div
              class="icon-box"
              [style.background]="'var(--ion-color-' + conf.color + ')'"
            >
              <ion-icon
                [name]="conf.icon"
                style="color: #ffffff; font-size: 18px;"
              ></ion-icon>
            </div>
            <div class="stat-info">
              <span class="stat-count">{{ getCountByType(type) }}</span>
              <span class="stat-label">{{ conf.label }}</span>
            </div>
            <ion-ripple-effect></ion-ripple-effect>
          </div>
          }
        </div>

        <div class="search-section">
          <ion-searchbar
            placeholder="Tìm nhật ký..."
            [debounce]="300"
            (ionInput)="handleSearch($event)"
            class="custom-searchbar"
            mode="ios"
          ></ion-searchbar>

          @if (filterType() !== 'ALL') {
          <div class="filter-indicator">
            <ion-chip color="dark" (click)="handleFilterChange('ALL')">
              <ion-icon name="close-circle"></ion-icon>
              <ion-label
                >Đang lọc: {{ getEventConfig(filterType()).label }}</ion-label
              >
            </ion-chip>
          </div>
          }
        </div>
      </div>
    </ion-header>

    <ion-content [fullscreen]="true" class="main-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="list-spacer"></div>

      <ion-list lines="none" class="timeline-list">
        @for (event of displayEvents(); track event.uuid) { @let config =
        getEventConfig(event.type);

        <div
          class="timeline-item ion-activatable ripple-parent"
          (click)="openDetail(event)"
        >
          <div
            class="color-strip"
            [style.background]="'var(--ion-color-' + config.color + ')'"
          ></div>

          <div class="item-content">
            <div class="item-header">
              <span
                class="item-type"
                [style.color]="'var(--ion-color-' + config.color + ')'"
              >
                {{ config.label }}
              </span>
              <span class="item-time">
                {{ event.created_at | date : 'HH:mm' }}
              </span>
            </div>

            <h3 class="item-context">{{ event.context }}</h3>

            @if (event.emotion) {
            <div class="item-footer">
              <span class="emotion-tag">{{ event.emotion }}</span>
            </div>
            }
          </div>
          <ion-ripple-effect></ion-ripple-effect>
        </div>
        } @empty { @if (!isLoading() && events().length === 0) {
        <div class="empty-state">
          <div class="icon-circle">
            <ion-icon
              [name]="
                searchQuery() ? 'search-outline' : 'document-text-outline'
              "
            ></ion-icon>
          </div>
          <h3>{{ searchQuery() ? 'Không tìm thấy' : 'Trang giấy trắng' }}</h3>
          <p>
            {{
              searchQuery()
                ? 'Thử từ khóa khác xem sao.'
                : 'Hành trình vạn dặm bắt đầu từ dòng code đầu tiên.'
            }}
          </p>
        </div>
        } }
      </ion-list>

      <ion-infinite-scroll
        threshold="100px"
        (ionInfinite)="onIonInfinite($event)"
        [disabled]="isEndOfData()"
      >
        <ion-infinite-scroll-content
          loadingSpinner="bubbles"
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="openAddModal()" class="custom-fab">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      /* HEADER & TOOLBAR */
      .header-solid {
        background: var(--ion-background-color);
        border-bottom: 1px solid var(--ion-color-step-100, #e0e0e0);
      }
      ion-toolbar {
        --background: var(--ion-background-color);
        --min-height: 56px;
      }
      .dashboard-container {
        background-color: var(--ion-background-color);
        padding: 0 16px 12px 16px;
        position: relative;
        z-index: 10;
      }

      /* --- BRANDING PRO --- */
      .brand-title {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.5px;
        padding-inline: 0;
      }

      .text-gradient {
        background: linear-gradient(
          135deg,
          var(--ion-color-primary) 0%,
          #8b5cf6 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-block;
      }

      .dot {
        color: var(--ion-color-primary);
        font-size: 1.8rem;
        line-height: 0;
        margin-left: 1px;
      }

      /* --- GREETING & STATS --- */
      .header-action-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      .greeting-box {
        flex: 1;
      }
      .date-label {
        margin: 0 0 4px 0;
        font-size: 0.8rem;
        color: var(--ion-color-medium);
        display: flex;
        align-items: center;
        gap: 4px;
        text-transform: capitalize;
        font-weight: 600;
      }
      .greeting-title {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--ion-text-color);
        letter-spacing: -0.5px;
        line-height: 1.1;
      }

      /* 👇 STATS BUTTON */
      .stats-btn-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--ion-card-background);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        color: var(--ion-color-primary);
        font-size: 1.4rem;
        border: 1px solid var(--ion-color-step-150, #e0e0e0);
        animation: pulse-glow 3s infinite ease-in-out;
        transition: transform 0.1s;
      }
      .stats-btn-wrapper:active {
        transform: scale(0.95);
      }
      :host-context(body.dark) .stats-btn-wrapper {
        border-color: var(--ion-color-step-250);
        color: var(--ion-color-primary-tint);
      }
      @keyframes pulse-glow {
        0%,
        100% {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
            0 0 0 rgba(var(--ion-color-primary-rgb), 0);
        }
        50% {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
            0 0 16px rgba(var(--ion-color-primary-rgb), 0.3);
          border-color: rgba(var(--ion-color-primary-rgb), 0.4);
        }
      }

      /* WIDGET GRID */
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-bottom: 16px;
      }
      .mini-card {
        background: var(--ion-card-background);
        border-radius: 14px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border: 1px solid var(--ion-color-light-shade);
        position: relative;
        overflow: hidden;
        transition: all 0.2s ease;
      }
      :host-context(body.dark) .mini-card {
        border-color: var(--ion-color-step-150);
      }
      .mini-card.active {
        background: var(--ion-color-light);
        border-color: var(--ion-color-medium);
        transform: translateY(-2px);
      }
      .icon-box {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
        font-size: 1rem;
        /* Thêm shadow nhẹ cho box */
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .stat-count {
        display: block;
        font-size: 1.15rem;
        font-weight: 700;
        line-height: 1.1;
      }
      .stat-label {
        font-size: 0.65rem;
        color: var(--ion-color-medium);
      }

      /* SEARCH BAR */
      .custom-searchbar {
        --background: var(--ion-color-step-50, #f2f2f7);
        --color: var(--ion-text-color);
        --placeholder-color: var(--ion-color-medium);
        --icon-color: var(--ion-color-medium);
        --border-radius: 12px;
        --box-shadow: none;
        padding-inline: 0;
        height: 46px;
      }
      :host-context(body.dark) .custom-searchbar {
        --background: var(--ion-color-step-100);
      }
      .filter-indicator {
        margin-top: 10px;
      }

      /* CONTENT */
      .main-content {
        --background: var(--ion-background-color);
      }
      .list-spacer {
        height: 16px;
      }
      .timeline-list {
        padding: 0 16px 80px 16px;
        background: transparent;
      }

      .timeline-item {
        background: var(--ion-card-background);
        border-radius: 16px;
        margin-bottom: 12px;
        position: relative;
        overflow: hidden;
        display: flex;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        min-height: 90px;
        border: 1px solid transparent;
        transition: transform 0.1s;
      }
      :host-context(body.dark) .timeline-item {
        border-color: var(--ion-color-step-100);
      }
      .timeline-item:active {
        transform: scale(0.98);
      }

      .color-strip {
        width: 5px;
        flex-shrink: 0;
      }
      .item-content {
        padding: 14px 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .item-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .item-time {
        color: var(--ion-color-medium);
        font-weight: 500;
      }
      .item-context {
        margin: 0 0 8px 0;
        font-size: 1rem;
        font-weight: 500;
        line-height: 1.5;
        color: var(--ion-text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .emotion-tag {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        background: var(--ion-color-light);
        padding: 4px 10px;
        border-radius: 6px;
        font-style: italic;
        display: inline-block;
      }

      /* FIX: Nút FAB tránh thanh điều hướng */
      ion-fab[vertical='bottom'] {
        bottom: calc(20px + var(--ion-safe-area-bottom));
      }
      .custom-fab {
        --background: var(--ion-text-color);
        --color: var(--ion-background-color);
        --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }

      .empty-state {
        text-align: center;
        padding-top: 60px;
        opacity: 0.8;
      }
      .icon-circle {
        width: 70px;
        height: 70px;
        background: var(--ion-color-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px auto;
        font-size: 32px;
        color: var(--ion-color-medium);
      }
    `,
  ],
})
export class HomePage implements OnInit, ViewWillEnter {
  // Logic giữ nguyên
  private router = inject(Router);
  private db = inject(DatabaseService);
  private modalCtrl = inject(ModalController);
  private lastLoadTime = 0;

  events = signal<SelfOpsEvent[]>([]);
  currentPage = 0;
  readonly PAGE_SIZE = 20;
  isLoading = signal(false);
  isEndOfData = signal(false);

  searchQuery = signal('');
  filterType = signal<SelfOpsEventType | 'ALL'>('ALL');

  today = Date.now();
  eventTypes = Object.values(SelfOpsEventType);

  displayEvents = computed(() => {
    const all = this.events();
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.filterType();

    return all.filter((ev) => {
      const matchType = type === 'ALL' || ev.type === type;
      const matchText =
        query === '' ||
        ev.context.toLowerCase().includes(query) ||
        ev.emotion?.toLowerCase().includes(query);
      return matchType && matchText;
    });
  });

  constructor() {
    addIcons({
      add,
      helpBuoyOutline,
      alertCircleOutline,
      batteryDeadOutline,
      timeOutline,
      searchOutline,
      statsChartOutline,
      settingsOutline,
      documentTextOutline,
      happyOutline,
      filterOutline,
      calendarOutline,
      closeCircle,
    });
  }

  ngOnInit() {
    this.db.dbReady$.subscribe((isReady) => {
      if (isReady) this.loadData(true);
    });
  }

  async ionViewWillEnter() {
    const now = Date.now();
    // Nếu vừa load cách đây dưới 500ms thì bỏ qua (Debounce)
    if (now - this.lastLoadTime < 500) return;
    this.lastLoadTime = now;
    await this.loadData();
  }

  async handleRefresh(event: any) {
    await this.loadData(true);
    event.target.complete();
  }

  async loadData(reset: boolean = false, event?: InfiniteScrollCustomEvent) {
    if (this.isLoading() && !reset) return;

    this.isLoading.set(true);

    if (reset) {
      this.currentPage = 0;
      this.isEndOfData.set(false);
      this.events.set([]);
    }

    try {
      const newEvents = await this.db.getEventsPaging(
        this.currentPage,
        this.PAGE_SIZE
      );
      if (newEvents.length < this.PAGE_SIZE) this.isEndOfData.set(true);

      if (reset) {
        this.events.set(newEvents);
      } else {
        this.events.update((old) => [...old, ...newEvents]);
      }

      if (newEvents.length > 0) this.currentPage++;
    } catch (error) {
      console.error('Load error', error);
    } finally {
      this.isLoading.set(false);
      if (event) event.target.complete();
    }
  }

  async onIonInfinite(ev: any) {
    await this.loadData(false, ev);
  }

  getGreeting() {
    const hours = new Date().getHours();
    if (hours < 12) return 'Chào buổi sáng';
    if (hours < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getCountByType(type: SelfOpsEventType) {
    return this.events().filter((e) => e.type === type).length;
  }

  handleFilterChange(type: SelfOpsEventType | 'ALL') {
    this.filterType.set(this.filterType() === type ? 'ALL' : type);
  }

  handleSearch(ev: any) {
    this.searchQuery.set(ev.detail.value);
  }

  getEventConfig(type: string | SelfOpsEventType) {
    return AppUtils.getTypeConfig(type);
  }

  async openAddModal() {
    const modal = await this.modalCtrl.create({
      component: AddEventModalComponent,
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') this.loadData(true);
  }

  async openDetail(event: any) {
    const modal = await this.modalCtrl.create({
      component: EventDetailModalComponent,
      componentProps: { event },
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'saved' || role === 'deleted') this.loadData(true);
  }

  async openStats() {
    const allEvents = await this.db.getAllEvents();
    const modal = await this.modalCtrl.create({
      component: StatsModalComponent,
      componentProps: { events: allEvents },
    });
    await modal.present();
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }
}
