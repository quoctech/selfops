#!/bin/bash

adb kill-server && pkill -f emulator


set -e

# ================== CẤU HÌNH ==================
SDK_PATH="$HOME/Android/Sdk"
AVD_NAME="Pixel_5"

ADB_BIN="$SDK_PATH/platform-tools/adb"
EMULATOR_BIN="$SDK_PATH/emulator/emulator"

# ================== CHECK SDK ==================
if [ ! -x "$ADB_BIN" ] || [ ! -x "$EMULATOR_BIN" ]; then
    echo "❌ Không tìm thấy adb hoặc emulator"
    echo "👉 Kiểm tra SDK_PATH: $SDK_PATH"
    exit 1
fi

# ================== KILL ADB / EMULATOR CŨ ==================
echo "🧹 Dọn adb & emulator cũ..."
"$ADB_BIN" kill-server || true
pkill -f emulator || true
sleep 2

# ================== KHỞI ĐỘNG EMULATOR ==================
echo "🤖 Khởi động emulator: $AVD_NAME"

"$EMULATOR_BIN" \
  -avd "$AVD_NAME" \
  -no-snapshot-load \
  -no-boot-anim \
  -gpu swiftshader_indirect \
  -netdelay none \
  -netspeed full \
  >/dev/null 2>&1 &

# ================== ĐỢI EMULATOR KẾT NỐI ADB ==================
echo "⏳ Đợi emulator kết nối adb..."
"$ADB_BIN" start-server
"$ADB_BIN" wait-for-device

# ================== FIX DEVICE OFFLINE ==================
echo "🔄 Restart adb để tránh device offline..."
"$ADB_BIN" kill-server
"$ADB_BIN" start-server
sleep 3

# ================== ĐỢI ADB Ở TRẠNG THÁI DEVICE ==================
echo "⏳ Đợi adb ở trạng thái 'device'..."

ADB_STATE="offline"
WAITED=0
MAX_WAIT=120

until [ "$ADB_STATE" = "device" ] || [ $WAITED -ge $MAX_WAIT ]; do
    ADB_STATE=$("$ADB_BIN" devices | awk '/emulator/{print $2}')
    sleep 2
    WAITED=$((WAITED + 2))
    echo "   ↪ adb state: $ADB_STATE"
done

if [ "$ADB_STATE" != "device" ]; then
    echo "❌ Emulator vẫn offline"
    exit 1
fi

echo "✅ adb đã sẵn sàng"

# ================== ĐỢI ANDROID BOOT XONG ==================
echo "⏳ Đợi Android boot hoàn toàn..."

BOOT_COMPLETED=""
WAITED=0
MAX_WAIT=180

until [ "$BOOT_COMPLETED" = "1" ] || [ $WAITED -ge $MAX_WAIT ]; do
    BOOT_COMPLETED=$("$ADB_BIN" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    sleep 2
    WAITED=$((WAITED + 2))
    echo "   ↪ sys.boot_completed=$BOOT_COMPLETED"
done

if [ "$BOOT_COMPLETED" != "1" ]; then
    echo "❌ Android boot quá lâu (> ${MAX_WAIT}s)"
    exit 1
fi

echo "✅ Emulator đã sẵn sàng"
sleep 5

# ================== SET ENV CHO IONIC ==================
echo "🛠️ Thiết lập môi trường Android..."

export ANDROID_HOME="$SDK_PATH"
export ANDROID_SDK_ROOT="$SDK_PATH"
export PATH="$PATH:$SDK_PATH/platform-tools:$SDK_PATH/emulator"

# ================== CHẠY IONIC ==================
echo "🚀 Chạy Ionic Android (hot reload)"
echo "--------------------------------"

ionic cap run android -l --external "$@"
