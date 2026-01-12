import { AsyncPipe } from '@angular/common'; // 👈 1. Import AsyncPipe
import { Component, inject } from '@angular/core';
import {
  IonBadge,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline, repeatOutline, settingsOutline } from 'ionicons/icons';
import { DatabaseService } from 'src/app/core/services/database/database.service'; // 👈 3. Import Service

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonBadge,
    AsyncPipe, // 👈 Khai báo import
  ],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="ion-no-border">
        <ion-tab-button tab="home">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>Timeline</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="reflect">
          <div class="icon-wrapper">
            <ion-icon name="repeat-outline"></ion-icon>

            @if ((pendingCount$ | async); as count) { @if (count > 0) {
            <ion-badge color="danger" class="notify-badge">{{
              count
            }}</ion-badge>
            } }
          </div>
          <ion-label>Phản chiếu</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Cài đặt</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [
    `
      ion-tab-bar {
        --background: var(--ion-background-color);
        --border-color: var(--ion-color-step-150);
        padding-top: 5px;
        height: 60px; /* Fix chiều cao cố định cho chuẩn */
        backdrop-filter: blur(10px);
        background: rgba(var(--ion-background-color-rgb), 0.85);
        border-top: 0.5px solid var(--ion-color-step-150);
      }

      ion-tab-button {
        --color-selected: var(--ion-color-primary);
      }

      /* FIX LỆCH: Làm cho wrapper hành xử giống hệt icon bình thường */
      .icon-wrapper {
        position: relative;
        display: flex; /* Giúp căn giữa icon bên trong */
        justify-content: center;
        align-items: center;
        font-size: 24px; /* Kích thước chuẩn của icon tab */
        width: 100%; /* Chiếm hết chiều ngang nút để dễ căn */
        height: 26px; /* Chiều cao cố định tương đương icon */
        margin-bottom: 2px; /* Khoảng cách với Label bên dưới */
      }

      /* Chỉnh lại icon bên trong wrapper để nó không bị sai size */
      .icon-wrapper ion-icon {
        font-size: 24px;
      }

      /* Badge số tròn */
      .notify-badge {
        position: absolute;
        top: -4px; /* Tinh chỉnh lại vị trí */
        right: calc(50% - 18px); /* Mẹo: Căn từ giữa ra phải một chút */
        border-radius: 50%;
        font-size: 0.6rem;
        padding: 0;
        min-width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        border: 2px solid var(--ion-background-color);
      }
    `,
  ],
})
export class TabsPage {
  // Inject Service
  private db = inject(DatabaseService);

  // Lấy Stream số lượng
  pendingCount$ = this.db.pendingCount$;

  constructor() {
    addIcons({ listOutline, repeatOutline, settingsOutline });
  }
}
