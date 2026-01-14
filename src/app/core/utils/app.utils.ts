import { EVENT_CONFIG, SelfOpsEventType } from '../models/event.type';

export class AppUtils {
  // Map cấu hình hiển thị (Label tiếng Việt + Màu sắc)
  private static readonly TYPE_CONFIG: Record<
    string,
    { label: string; color: string }
  > = {
    DECISION: { label: 'Quyết định', color: 'primary' }, // Xanh dương
    MISTAKE: { label: 'Sai lầm', color: 'danger' }, // Đỏ
    STRESS: { label: 'Căng thẳng', color: 'warning' }, // Vàng
    LEARNING: { label: 'Bài học', color: 'success' }, // Xanh lá
    IDEA: { label: 'Ý tưởng', color: 'tertiary' }, // Tím/Indigo
  };

  static getTypeLabel(type: string): string {
    return (this.TYPE_CONFIG[type]?.label || type).toUpperCase();
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

  // Tạo UUID thủ công (An toàn cho mọi môi trường)
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static getTodayKey(): string {
    // YYYY-MM-DD
    return new Date().toISOString().split('T')[0];
  }

  static getNow(): number {
    return Date.now();
  }
}
