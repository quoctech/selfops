export enum SelfOpsEventType {
  DECISION = 'DECISION',
  MISTAKE = 'MISTAKE',
  STRESS = 'STRESS',
}

export interface SelfOpsEvent {
  uuid: string;
  type: SelfOpsEventType;
  context: string; // Nội dung chính
  emotion: string; // Cảm xúc (Vui, buồn...)

  tags: string[]; // Danh sách tag
  meta_data: Record<string, any>; // Dữ liệu mở rộng (JSON)

  reflection?: string | null; // Suy ngẫm (Review)
  actual_outcome?: string; // Kết quả thực tế

  is_reviewed: boolean; // Đã review chưa
  review_due_date: number; // Hạn review (Timestamp)
  created_at: number; // Ngày tạo
  updated_at?: number; // Ngày cập nhật (Optional)
}

// Cấu hình hiển thị (Config) cho từng loại
export const EVENT_CONFIG = {
  [SelfOpsEventType.DECISION]: {
    label: 'Quyết định',
    icon: 'help-buoy-outline',
    color: 'primary',
  },
  [SelfOpsEventType.MISTAKE]: {
    label: 'Sự cố / Bài học',
    icon: 'alert-circle-outline',
    color: 'danger',
  },
  [SelfOpsEventType.STRESS]: {
    label: 'Căng thẳng',
    icon: 'battery-dead-outline',
    color: 'warning',
  },
};

// 1. Định nghĩa hằng số thời gian (7 ngày tính bằng mili-giây)
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
