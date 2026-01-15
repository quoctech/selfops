import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
import { DatabaseService } from 'src/app/core/services/database/database.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonBadge,
    AsyncPipe,
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
        height: 60px;
        backdrop-filter: blur(10px);
        background: rgba(var(--ion-background-color-rgb), 0.85);
        border-top: 0.5px solid var(--ion-color-step-150);
      }

      ion-tab-button {
        --color-selected: var(--ion-color-primary);
      }

      .icon-wrapper {
        position: relative;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        overflow: visible; /* Để badge văng ra ngoài không bị che */
      }

      /* Chỉnh lại icon bên trong wrapper để nó không bị sai size */
      .icon-wrapper ion-icon {
        font-size: 24px;
      }

      /* Badge số tròn */
      .notify-badge {
        position: absolute;
        top: -2px;
        right: -8px;

        min-width: 16px;
        height: 16px;
        border-radius: 10px;
        padding: 0 4px;

        font-size: 10px;
        font-weight: 700;

        display: flex;
        align-items: center;
        justify-content: center;

        background: var(--ion-color-danger);
        color: white;
        border: 2px solid var(--ion-tab-bar-background, #fff);
      }
    `,
  ],
})
export class TabsPage {
  private db = inject(DatabaseService);

  // Lấy Stream số lượng
  pendingCount$ = this.db.pendingCount$;

  constructor() {
    addIcons({ listOutline, repeatOutline, settingsOutline });
  }
}
