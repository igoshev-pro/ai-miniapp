#!/usr/bin/env bash
# Разносит логотип заказчика по всем местам, где он нужен. Ничего не рисует
# и не векторизует: берёт картинку как есть, только масштабирует и жмёт.
#
# Вход:  public/brand/logo.png   — оригинал (квадрат, чёрный фон, любой размер)
# Выход: public/icons/icon-512.png, icon-192.png       — иконка PWA (как есть)
#        public/icons/icon-maskable-512.png, -192.png  — с полями под Android-маску
#        public/icons/apple-touch-icon.png + копия в корне public/
#        public/brand/mark-256.png                     — для шапки и макета телефона
#        src/app/icon.png                              — фавикон (Next подхватит сам)
#
# Запуск из ai-miniapp:  bash scripts/brand.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/brand/logo.png
[ -f "$SRC" ] || { echo "нет $SRC — положи оригинал логотипа туда"; exit 1; }

sq() { # квадрат заданного размера, фон чёрный, картинка вписана целиком
  ffmpeg -v error -y -i "$SRC" -vf "scale=$1:$1:force_original_aspect_ratio=decrease,pad=$1:$1:(ow-iw)/2:(oh-ih)/2:black,format=rgb24" "$2"
}
padded() { # для maskable: содержимое на 78% холста, остальное чёрное поле
  local inner=$(( $1 * 78 / 100 ))
  ffmpeg -v error -y -i "$SRC" -vf "scale=$inner:$inner:force_original_aspect_ratio=decrease,pad=$1:$1:(ow-iw)/2:(oh-ih)/2:black,format=rgb24" "$2"
}

sq 512 public/icons/icon-512.png
sq 192 public/icons/icon-192.png
padded 512 public/icons/icon-maskable-512.png
padded 192 public/icons/icon-maskable-192.png
sq 180 public/icons/apple-touch-icon.png
cp public/icons/apple-touch-icon.png public/apple-touch-icon.png
cp public/icons/apple-touch-icon.png public/apple-touch-icon-precomposed.png
sq 256 public/brand/mark-256.png
sq 64  src/app/icon.png
ffmpeg -v error -y -i "$SRC" -vf "scale=64:64,format=rgba" -f ico src/app/favicon.ico
rm -f public/icons/icon.svg
echo "готово:"; ls -la public/icons/*.png public/brand/mark-256.png src/app/icon.png | awk '{printf "  %-44s %5.0f KB\n", $9, $5/1024}'
