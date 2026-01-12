import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // TabsPage đóng vai trò là "khung xương" chứa IonTabs
    loadComponent: () => import('./layout/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'reflect',
        loadComponent: () =>
          import('./features/reflect/reflect.page').then((m) => m.ReflectPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.page').then(
            (m) => m.SettingsPage
          ),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  // Fallback nếu user gõ bậy bạ đường dẫn
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
