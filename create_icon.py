#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # 画像を作成
    img = Image.new('RGB', (size, size), color='#4F46E5')
    draw = ImageDraw.Draw(img)
    
    # テキストを描画
    font_size = int(size * 0.35)
    try:
        # システムフォントを使用
        font = ImageFont.truetype('/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc', font_size)
    except:
        font = ImageFont.load_default()
    
    text = "研修"
    # テキストの位置を中央に
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) / 2
    y = (size - text_height) / 2 - bbox[1]
    
    draw.text((x, y), text, fill='white', font=font)
    
    # 保存
    img.save(filename)
    print(f'✅ {filename} を作成しました')

# アイコンを作成
os.chdir('public')
create_icon(192, 'icon-192x192.png')
create_icon(512, 'icon-512x512.png')
