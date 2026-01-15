import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import {
  IonBadge,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline, repeatOutline, settingsOutline } from 'ionicons/icons';
import { DatabaseService } from 'src/app/core/services/database/database.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
  template: `
    <ion-tabs>
      <ion-tab-bar
        slot="bottom"
        class="ion-no-border custom-tab-bar"
        [style.display]="isKeyboardVisible() ? 'none' : 'flex'"
      >
        <ion-tab-button tab="home">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>Timeline</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="reflect">
          <div class="icon-wrapper">
            <ion-icon name="repeat-outline"></ion-icon>

            @if (pendingCount() > 0) {
            <ion-badge color="danger" class="notify-badge">
              {{ pendingCount() }}
            </ion-badge>
            }
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
      .custom-tab-bar {
        --background: var(--ion-background-color);
        --border-color: var(--ion-border-color, #e0e0e0);

        padding-top: 6px;
        padding-bottom: 4px;
        height: 60px;

        /* Hiệu ứng kính mờ (Frosted Glass) */
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        background: rgba(var(--ion-background-color-rgb), 0.85);

        border-top: 0.5px solid var(--ion-border-color);
        transition: transform 0.2s ease;
      }

      ion-tab-button {
        --color-selected: var(--ion-color-primary);
        --color: var(--ion-color-medium);
      }

      .icon-wrapper {
        position: relative;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        overflow: visible;
      }

      .icon-wrapper ion-icon {
        font-size: 24px;
        margin-bottom: 2px;
      }

      /* Badge Notification */
      .notify-badge {
        position: absolute;
        top: -4px;
        right: -8px;

        min-width: 18px;
        height: 18px;
        border-radius: 50%; /* Tròn xoe */
        padding: 0 4px;

        font-size: 10px;
        font-weight: 700;

        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ion-color-danger);
        color: white;

        /* Không dùng cứng #fff vì Dark Mode sẽ bị lộ viền trắng xấu */
        border: 2px solid var(--ion-background-color);
        box-sizing: content-box;
      }
    `,
  ],
})
export class TabsPage implements OnInit, OnDestroy {
  private db = inject(DatabaseService);
  private platform = inject(Platform);

  // State quản lý hiển thị Keyboard
  isKeyboardVisible = signal(false);

  // Chuyển Observable thành Signal (Code gọn hơn, không cần | async)
  pendingCount = toSignal(this.db.pendingCount$, { initialValue: 0 });

  private listeners: PluginListenerHandle[] = [];

  constructor() {
    addIcons({ listOutline, repeatOutline, settingsOutline });
  }

  ngOnInit() {
    if (this.platform.is('capacitor')) {
      this.initKeyboardListeners();
    }
  }

  ngOnDestroy() {
    // Dọn dẹp listener khi component bị hủy (tránh memory leak)
    this.listeners.forEach((h) => h.remove());
  }

  async initKeyboardListeners() {
    // Dùng 'keyboardWillShow' (sắp hiện) để ẩn Tab ngay lập tức -> Mượt hơn
    const showListener = await Keyboard.addListener('keyboardWillShow', () => {
      this.isKeyboardVisible.set(true);
    });

    // Dùng 'keyboardWillHide' (sắp ẩn) để hiện Tab lại
    const hideListener = await Keyboard.addListener('keyboardWillHide', () => {
      this.isKeyboardVisible.set(false);
    });

    this.listeners.push(showListener, hideListener);
  }
}
