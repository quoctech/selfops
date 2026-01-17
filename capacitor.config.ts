import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'io.selfops.app',
  appName: 'Self Ops',
  webDir: 'www',

  backgroundColor: '#09090b',
  initialFocus: false,

  android: {
    zoomEnabled: false,
    webContentsDebuggingEnabled: false,
    initialFocus: false,
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    Keyboard: {
      style: KeyboardStyle.Dark,
    },

    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0f172a',
    },
  },
};

export default config;
