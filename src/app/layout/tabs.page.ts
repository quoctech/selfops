import { Component } from '@angular/core';
import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { listOutline, repeatOutline, settingsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="ion-no-border">
        <ion-tab-button tab="home">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>Timeline</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="reflect">
          <ion-icon name="repeat-outline"></ion-icon>
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
        height: 65px;
        /* Hiệu ứng mờ nhẹ cho thanh Tab theo trend hiện đại */
        backdrop-filter: blur(10px);
        background: rgba(var(--ion-background-color-rgb), 0.8);
      }
      ion-tab-button {
        --color-selected: var(--ion-color-primary);
      }
    `,
  ],
})
export class TabsPage {
  constructor() {
    addIcons({ listOutline, repeatOutline, settingsOutline });
  }
}
