import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  ScheduleOptions,
} from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly CHANNEL_ID = 'selfops_core_reminder';
  private readonly REMINDER_ID = 101; // ID cố định cho lịch nhắc nhở
  private readonly TEST_ID = 999; // ID cho việc test
  private readonly SYNC_ID = 888; // ID cho thông báo tức thời
  private readonly STORAGE_KEY = 'selfops_config_v1';

  // Danh sách câu từ tối ưu UX để random (tránh nhàm chán cho người dùng)
  private readonly GREETINGS = [
    {
      title: '🧠 Đã đến lúc Review rồi',
      body: 'Dành 2 phút để soi chiếu các quyết định hôm nay nhé.',
    },
    {
      title: '📝 Nhật ký vận hành',
      body: 'Hôm nay có sai lầm nào cần "Debug" không bạn?',
    },
    {
      title: '🚀 SelfOps nhắc bạn',
      body: 'Đừng để những bài học quý giá hôm nay bị lãng quên.',
    },
    {
      title: '🎯 Tổng kết ngày sống',
      body: 'Bạn đã tiến gần hơn mục tiêu bao nhiêu bước rồi?',
    },
  ];

  constructor() {}

  /**
   * Đảm bảo quyền và Kênh thông báo (Chuẩn Android 14-16)
   */
  async ensurePermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') return false;

    // 1. Tạo Channel (Quan trọng để nổ chuông và rung trên Android)
    await LocalNotifications.createChannel({
      id: this.CHANNEL_ID,
      name: 'Nhắc nhở Phản tư (Core Ops)',
      description: 'Thông báo nhắc bạn review quyết định và bài học mỗi ngày',
      importance: 5,
      visibility: 1,
      vibration: true,
    });

    // 2. Kiểm tra và xin quyền
    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') return true;

    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  }

  /**
   * Lên lịch nhắc nhở hàng ngày (Daily Reminder)
   */
  async scheduleDailyReminder(hour: number, minute: number) {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) return;

    // Hủy các lịch cũ để không bị nổ trùng lặp
    await this.cancelAllPending();

    // Lấy ngẫu nhiên nội dung để user không thấy nhàm chán
    const content =
      this.GREETINGS[Math.floor(Math.random() * this.GREETINGS.length)];

    const options: ScheduleOptions = {
      notifications: [
        {
          id: this.REMINDER_ID,
          title: content.title,
          body: content.body,
          channelId: this.CHANNEL_ID,
          schedule: {
            on: { hour, minute },
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_icon_config_sample',
          color: '#0f172a',
        } as any,
      ],
    };

    try {
      await LocalNotifications.schedule(options);
      await this.saveSettings(true, hour, minute);
      console.log(`✅ [SelfOps] Đã đặt lịch nhắc nhở lúc ${hour}:${minute}`);
    } catch (error) {
      console.error('❌ [SelfOps] Lỗi đặt lịch:', error);
    }
  }

  /**
   * Gửi thông báo test ngay lập tức
   */
  async scheduleTest() {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: this.TEST_ID,
          title: '🔔 Hệ thống thông báo: OK',
          body: 'SelfOps đã sẵn sàng vận hành trên Android của bạn!',
          channelId: this.CHANNEL_ID,
          smallIcon: 'ic_stat_icon_config_sample',
          color: '#0f172a',
        } as any,
      ],
    });
  }

  /**
   * Thông báo xác nhận khi user bật settings
   */
  async notifySuccessSync() {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: this.SYNC_ID,
          title: '✅ Đã kích hoạt nhắc nhở',
          body: 'Dữ liệu vận hành của bạn sẽ được soi chiếu hàng ngày.',
          channelId: this.CHANNEL_ID,
          smallIcon: 'ic_stat_icon_config_sample',
          color: '#0f172a',
        } as any,
      ],
    });
  }

  /**
   * Hủy tất cả thông báo đang chờ
   */
  async cancelAllPending() {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
    // Cập nhật trạng thái vào bộ nhớ nhưng vẫn giữ giờ cũ để UI không bị reset
    const current = await this.getSettings();
    await this.saveSettings(false, current.hour, current.minute);
  }

  /**
   * Quản lý bộ nhớ cài đặt (Preferences)
   */
  async getSettings() {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });
    if (value) {
      return JSON.parse(value) as {
        isEnabled: boolean;
        hour: number;
        minute: number;
      };
    }
    return { isEnabled: false, hour: 21, minute: 0 };
  }

  private async saveSettings(isEnabled: boolean, hour: number, minute: number) {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify({ isEnabled, hour, minute }),
    });
  }
}
