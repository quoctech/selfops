import { EVENT_CONFIG, SelfOpsEventType } from '../models/event.type';

export class AppUtils {
  // Tạo UUID thủ công (An toàn cho mọi môi trường)
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Lấy Config UI theo Type
  static getTypeConfig(type: string | SelfOpsEventType) {
    // Ép kiểu về Enum để lấy config, nếu không khớp trả về default
    const config = EVENT_CONFIG[type as SelfOpsEventType];
    return config || { label: 'Khác', icon: 'time-outline', color: 'medium' };
  }

  // Tách chuỗi emotion thành mảng
  static parseEmotions(emotionStr: string | null | undefined): string[] {
    if (!emotionStr) return [];
    return emotionStr
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e !== '');
  }
}
