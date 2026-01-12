import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Self Ops',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      // launchShowDuration: 2000, // Hiện trong 2 giây
      launchAutoHide: true, // Tự động tắt
      backgroundColor: '#0f172a', // Màu nền trùng khớp
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false, // Tắt cái vòng xoay xoay cũ kỹ đi cho sang
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0f172a',
    },
  },
};

export default config;
