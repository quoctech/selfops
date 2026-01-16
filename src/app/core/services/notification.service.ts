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
  // Cấu hình ID và Key lưu trữ
  private readonly CHANNEL_ID = 'selfops_core_reminder';
  private readonly REMINDER_ID = 101; // ID cố định cho lịch hàng ngày (để dễ cancel)
  private readonly TEST_ID = 999; // ID cho thông báo test
  private readonly STORAGE_KEY = 'selfops_config_v1';

  // Random Content để người dùng đỡ nhàm chán
  private readonly GREETINGS = [
    // 1. Nhóm: Nhẹ nhàng, xả stress cuối ngày
    {
      title: '🌙 Gác lại âu lo',
      body: 'Viết ra những điều còn vướng bận để đêm nay ngủ thật ngon nhé.',
    },
    {
      title: '🧹 Dọn dẹp tâm trí',
      body: 'Sắp xếp lại những suy nghĩ ngổn ngang để ngày mai nhẹ nhàng hơn.',
    },

    // 2. Nhóm: Ghi nhận, biết ơn (Gratitude)
    {
      title: '✨ Điều nhỏ bé diệu kỳ',
      body: 'Hôm nay có khoảnh khắc nào làm bạn mỉm cười không?',
    },
    {
      title: '💎 Đừng để ngày trôi qua',
      body: 'Có bài học quý giá nào hôm nay mà bạn muốn lưu giữ mãi?',
    },

    // 3. Nhóm: Phát triển bản thân (Growth)
    {
      title: '🌱 Mỗi ngày 1% tốt hơn',
      body: 'Nhìn lại xem hôm nay bạn đã làm tốt hơn hôm qua điều gì?',
    },
    {
      title: '🚀 Tiếp thêm động lực',
      body: 'Bạn đang tiến gần hơn đến mục tiêu rồi. Ghi lại hành trình nhé!',
    },

    // 4. Nhóm: Soi chiếu, định hướng (Reflection)
    {
      title: '🧭 La bàn cuộc sống',
      body: 'Những quyết định hôm nay có đưa bạn đến đúng nơi mình muốn?',
    },
    {
      title: '📖 Khép lại chương hôm nay',
      body: 'Nếu đặt tên cho ngày hôm nay, bạn sẽ gọi nó là gì?',
    },

    // 5. Nhóm: Thân thiện, nhắc nhở (Friendly Reminder)
    {
      title: '📝 Nhật ký đang đợi',
      body: 'Dành 2 phút cho bản thân nhé. Hôm nay của bạn thế nào?',
    },
    {
      title: '🧘 Phút giây tĩnh lặng',
      body: 'Tạm dừng một chút, hít thở sâu và nhìn lại một ngày đã qua.',
    },
  ];

  constructor() {}

  /**
   * 1. Đảm bảo quyền & Tạo kênh thông báo (Quan trọng cho Android 8+)
   */
  async ensurePermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') {
      console.warn('⚠️ Notifications không hoạt động trên Web');
      return false;
    }

    try {
      // BƯỚC 1: Tạo Channel trước (Bắt buộc để nổ chuông/rung trên Android)
      await LocalNotifications.createChannel({
        id: this.CHANNEL_ID,
        name: 'Nhắc nhở SelfOps',
        description: 'Nhắc nhở review hàng ngày',
        importance: 5, // 5 = High (Bung popup)
        visibility: 1, // 1 = Public (Hiện trên màn hình khóa)
        vibration: true,
        sound: undefined, // Dùng âm thanh mặc định của hệ thống
      });

      // BƯỚC 2: Kiểm tra quyền
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return true;

      // BƯỚC 3: Xin quyền nếu chưa có (Đặc biệt cho Android 13+)
      const request = await LocalNotifications.requestPermissions();
      return request.display === 'granted';
    } catch (e) {
      console.error('❌ Lỗi xin quyền thông báo:', e);
      return false;
    }
  }

  /**
   * 2. Lên lịch nhắc nhở hàng ngày (Daily Loop)
   */
  async scheduleDailyReminder(hour: number, minute: number) {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) return;

    await this.cancelAllPending();

    const content =
      this.GREETINGS[Math.floor(Math.random() * this.GREETINGS.length)];

    // FIX LOGIC THỜI GIAN: Tính toán chính xác thời điểm nổ tiếp theo
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hour, minute, 0, 0);

    // Nếu thời gian đặt < thời gian hiện tại -> Set cho ngày mai
    // Ví dụ: Bây giờ 21:00, đặt 20:55 -> Phải nổ vào 20:55 ngày mai
    if (targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const options: ScheduleOptions = {
      notifications: [
        {
          id: this.REMINDER_ID,
          title: content.title,
          body: content.body,
          channelId: this.CHANNEL_ID,

          // CẤU HÌNH MỚI: Dùng 'at' + 'every' ổn định hơn trên Android
          schedule: {
            at: targetTime, // Thời điểm nổ chính xác đầu tiên
            every: 'day', // Lặp lại mỗi ngày
            allowWhileIdle: true, // Nổ ngay cả khi máy ngủ (Doze mode)
          },

          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#0f172a',
        } as any,
      ],
    };

    try {
      await LocalNotifications.schedule(options);
      await this.saveSettings(true, hour, minute);

      // Log ra để debug xem nó tính toán ngày nào
      console.log(
        `✅ [SelfOps] Đã đặt lịch. Lần nổ kế tiếp: ${targetTime.toLocaleString()}`
      );
    } catch (error) {
      console.error('❌ [SelfOps] Lỗi đặt lịch:', error);
    }
  }

  /**
   * 3. Gửi thông báo Test (Delay 5s)
   * Dùng để kiểm tra xem quyền/icon có hoạt động không
   */
  async scheduleTest() {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) return;

    // Nổ sau 5 giây (để kịp tắt app test background)
    const triggerDate = new Date(Date.now() + 5000);

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.TEST_ID,
            title: '🔔 Kiểm tra hệ thống',
            body: 'SelfOps đã sẵn sàng vận hành! (Test thành công)',
            channelId: this.CHANNEL_ID,
            schedule: { at: triggerDate }, // Nổ 1 lần duy nhất
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#22c55e', // Màu xanh success
          } as any,
        ],
      });
      console.log('✅ Đã lên lịch test sau 5s');
    } catch (error) {
      console.error('❌ Lỗi schedule test:', error);
    }
  }

  /**
   * 4. Hủy nhắc nhở
   */
  async cancelAllPending() {
    // Chỉ hủy ID Reminder chính, không hủy các thông báo khác của hệ thống
    const pending = await LocalNotifications.getPending();
    const target = pending.notifications.filter(
      (n) => n.id === this.REMINDER_ID
    );

    if (target.length > 0) {
      await LocalNotifications.cancel({ notifications: target });
    }

    // Cập nhật trạng thái OFF vào bộ nhớ
    const current = await this.getSettings();
    await this.saveSettings(false, current.hour, current.minute);
  }

  /**
   * 5. Quản lý cài đặt (Lưu vào Disk)
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
    // Mặc định: Tắt, 21:00
    return { isEnabled: false, hour: 21, minute: 0 };
  }

  private async saveSettings(isEnabled: boolean, hour: number, minute: number) {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify({ isEnabled, hour, minute }),
    });
  }
}
