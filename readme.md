# SelfOps – Project Specifications

**Vision:** Hệ điều hành cá nhân theo hướng Local-first & Privacy-first.
**Tech Stack:** Ionic 8 (Angular) + Capacitor + SQLite.

---

## 🧱 MODULE 1: CORE - EVENT MANAGEMENT (Quản lý Sự kiện)

_Đây là module lõi, nơi dữ liệu được sinh ra._

### 1.1. Create Event (Quick Add)

Mục tiêu: Ghi nhận sự kiện dưới 30s.

- **Support Types:**
  1.  **Decision (Quyết định):** Ghi lại bối cảnh ra quyết định.
  2.  **Mistake (Sai lầm):** Ghi lại sự cố, lỗi lầm.
  3.  **Stress/Energy (Căng thẳng):** Theo dõi trạng thái tinh thần.
  4.  **Interaction (Giao tiếp):** Ghi lại các cuộc hội thoại quan trọng (B2B).
- **Common Fields (Chung):**
  - `Context` (Textarea): Nội dung chính / Bối cảnh.
  - `Tags/Emotion` (Chips): Cảm xúc lúc ghi (Vui, Lo, Giận, Gấp...).
  - `Timestamp`: Thời gian xảy ra (Cho phép chỉnh lùi thời gian).
  - `Attachments`: Ảnh (Optional - Giai đoạn 2).
- **Dynamic Fields (Riêng biệt):**
  - _Decision:_ Options considered, Expected Outcome.
  - _Mistake:_ Trigger (Nguyên nhân kích hoạt), Warning Signs (Dấu hiệu bị bỏ qua).
  - _Stress:_ Level (Slider 1-10), Source (Work, Family, Health).
  - _Interaction:_ Partner Name, Key Takeaways.

### 1.2. Event History (List)

- **View Modes:**
  - Timeline View (Mặc định): Sắp xếp mới nhất lên đầu.
  - Calendar View (Giai đoạn 2).
- **Filters:**
  - Theo Type (Chỉ xem Mistake, Chỉ xem Decision...).
  - Theo Date Range.
  - Theo Tags.
- **Actions:**
  - Edit (Sửa nội dung).
  - Delete (Xóa mềm/cứng).
  - Search (Full-text search context).

---

## 🔁 MODULE 2: REFLECTION SYSTEM (Hệ thống Phản chiếu)

_Module tạo ra giá trị giữ chân người dùng (Retention)._

### 2.1. Scheduler (Tự động)

- Logic tự động tạo nhắc nhở Review cho mỗi Event sau:
  - 7 ngày (Review nóng).
  - 30 ngày (Review xu hướng).
  - 90 ngày (Review chiến lược).

### 2.2. Reflection Inbox & Detail

- **Inbox:** Danh sách các Event "đến hạn" phải review hôm nay.
- **Review Flow (Màn hình chi tiết):**
  - **Read-only Area:** Hiển thị lại Context & Emotion cũ (để user nhớ lại).
  - **Input Area:**
    - `Actual Outcome`: Kết quả thực tế so với kỳ vọng?
    - `Lesson Learned`: Bài học rút ra?
    - `Re-rate`: Đánh giá lại quyết định đó (Đúng/Sai).
- **Actions:** Snooze (Nhắc lại sau), Dismiss (Bỏ qua không review).

---

## 📊 MODULE 3: DASHBOARD & DAILY INDEX

_Màn hình Home - Tổng quan sức khỏe tinh thần._

### 3.1. Quick Stats

- Số lượng Event đã ghi trong tuần.
- Số lượng Event chờ Review.
- Streak (Chuỗi ngày ghi chép liên tục).

### 3.2. Day Quality Index (Chấm điểm ngày)

- **Daily Check-in:** Hỏi 1 lần vào cuối ngày (hoặc sáng hôm sau).
- **Question:** "Hôm nay đáng sống bao nhiêu %?" (Slider 0-100%).
- **Primary Reason:** Chọn tag hoặc note ngắn (Vì làm được việc, Vì cãi nhau...).

### 3.3. Active Commitments (Lời hứa)

- List các lời hứa đang chạy ("Tuần này ngủ sớm", "Không uống rượu").
- Check-box: Đã làm / Chưa làm.

---

## 📈 MODULE 4: INSIGHTS & ANALYTICS (Giai đoạn 2)

_Biến dữ liệu thành biểu đồ._

### 4.1. Stress Map (Bản đồ căng thẳng)

- **Time Heatmap:** Stress thường xuất hiện lúc mấy giờ? Thứ mấy?
- **Source Chart:** Biểu đồ tròn nguồn gốc Stress (Do việc, Do người...).

### 4.2. Mistake Patterns

- Top các "Cảm xúc" dẫn đến sai lầm (VD: 80% sai lầm khi "Vội vàng").
- Tần suất lặp lại của các Trigger.

---

## ⚙️ MODULE 5: SETTINGS & DATA PRIVACY

_Module đảm bảo tính an toàn và tin cậy (Trust)._

### 5.1. Data Management (Local-first)

- **Export Data:** Xuất toàn bộ DB ra file `.json` hoặc `.csv`.
- **Import Data:** Restore từ file backup.
- **Nuke Button:** Xóa toàn bộ dữ liệu vĩnh viễn (Panic button).

### 5.2. App Security

- App Lock: Mã PIN / Biometrics (FaceID/TouchID).

### 5.3. Sync (PowerSync)

- Login / Register.
- Toggle Sync: On/Off (Mặc định Off để bảo mật).

---

## 💰 MODULE 6: MONETIZATION

_Chiến lược kiếm tiền._

### 6.1. Free Tier

- Giới hạn: 50 Events.
- Tính năng: Core + Dashboard cơ bản.
- Sync: Local only.

### 6.2. Pro Tier (Subscription)

- Unlimited Events.
- Full Insights (Stress Map, Patterns).
- Multi-device Sync.

---

## 💾 DATABASE SCHEMA (Draft SQLite)

```sql
-- Bảng chính lưu trữ sự kiện
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, -- UUID
    type TEXT NOT NULL, -- 'DECISION', 'MISTAKE', 'STRESS', 'INTERACTION'
    context TEXT,
    tags TEXT, -- JSON Array: ["Anxious", "Rushed"]
    created_at INTEGER,

    -- Dynamic Data (Lưu JSON string để linh hoạt các loại event khác nhau)
    -- Decision: { "options": [], "expectation": "" }
    -- Stress: { "level": 8, "source": "Work" }
    meta_data TEXT,

    -- Phần Reflection
    is_reviewed BOOLEAN DEFAULT 0,
    review_due_date INTEGER, -- Thời điểm cần review tiếp theo
    reflection_note TEXT,
    actual_outcome TEXT,
    updated_at INTEGER
);

-- Bảng lưu chỉ số ngày
CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY,
    date_str TEXT UNIQUE, -- Format YYYY-MM-DD
    score INTEGER, -- 0-100
    reason TEXT,
    created_at INTEGER
);
```
