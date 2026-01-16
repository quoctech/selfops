#!/bin/bash
set -e

# ================== CẤU HÌNH ==================
SDK_PATH="$HOME/Android/Sdk"
ADB_BIN="$SDK_PATH/platform-tools/adb"

# ================== CHECK SDK ==================
if [ ! -x "$ADB_BIN" ]; then
    echo "❌ Không tìm thấy adb"
    echo "👉 Kiểm tra SDK_PATH: $SDK_PATH"
    exit 1
fi

# ================== KIỂM TRA THIẾT BỊ ==================
echo "🔍 Đang quét thiết bị thật..."

"$ADB_BIN" start-server

# Lấy ID của thiết bị đang kết nối (bỏ qua dòng List... và dòng trống)
# Lệnh này sẽ lấy thiết bị đầu tiên tìm thấy (ví dụ: e67fd9a9)
DEVICE_ID=$("$ADB_BIN" devices | grep -w "device" | grep -v "emulator" | head -n 1 | awk '{print $1}')

if [ -z "$DEVICE_ID" ]; then
    echo "❌ Không tìm thấy thiết bị thật nào đang kết nối!"
    echo "👉 Hãy chắc chắn bạn đã bật 'USB Debugging' trên điện thoại."
    echo "👉 Kiểm tra lại cáp kết nối."
    
    # Check xem có thiết bị nào unauthorized không (chưa bấm Tin cậy trên điện thoại)
    UNAUTH_DEVICE=$("$ADB_BIN" devices | grep "unauthorized" | head -n 1)
    if [ ! -z "$UNAUTH_DEVICE" ]; then
        echo "⚠️  PHÁT HIỆN THIẾT BỊ CHƯA CẤP QUYỀN!"
        echo "👉 Mở điện thoại và bấm 'Allow' (Cho phép) trong hộp thoại USB Debugging."
    fi
    exit 1
fi

echo "✅ Đã tìm thấy thiết bị: $DEVICE_ID"

# ================== SET ENV CHO IONIC ==================
echo "🛠️ Thiết lập môi trường Android..."

export ANDROID_HOME="$SDK_PATH"
export ANDROID_SDK_ROOT="$SDK_PATH"
export PATH="$PATH:$SDK_PATH/platform-tools"

# ================== CHẠY IONIC ==================
echo "🚀 Chạy Ionic trên thiết bị thật ($DEVICE_ID)"
echo "⚠️  LƯU Ý: Điện thoại và Laptop phải chung mạng Wifi để Hot Reload hoạt động!"
echo "--------------------------------"

# --target: Chỉ định rõ ID thiết bị để không bị nhầm nếu đang bật cả máy ảo
ionic cap run android -l --external --target="$DEVICE_ID" "$@"