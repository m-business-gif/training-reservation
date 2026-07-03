#!/usr/bin/env python3
"""
MarkdownをHTMLに変換するスクリプト
その後、ブラウザでPDF出力できます
"""

import markdown
import os

# Markdownファイルを読み込み
with open('MANUAL_COMPLETE.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# MarkdownをHTMLに変換
html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code', 'codehilite'])

# HTMLテンプレート
html_template = f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>研修予約システム 完全マニュアル</title>
    <style>
        @media print {{
            @page {{
                margin: 2cm;
            }}
        }}
        body {{
            font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }}
        h1 {{
            color: #4F46E5;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 10px;
            margin-top: 40px;
        }}
        h2 {{
            color: #6366F1;
            border-left: 5px solid #6366F1;
            padding-left: 15px;
            margin-top: 30px;
        }}
        h3 {{
            color: #818CF8;
            margin-top: 25px;
        }}
        code {{
            background-color: #F3F4F6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Monaco", "Consolas", monospace;
            font-size: 0.9em;
        }}
        pre {{
            background-color: #1F2937;
            color: #F3F4F6;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
        }}
        pre code {{
            background-color: transparent;
            color: #F3F4F6;
            padding: 0;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #D1D5DB;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #4F46E5;
            color: white;
            font-weight: bold;
        }}
        tr:nth-child(even) {{
            background-color: #F9FAFB;
        }}
        blockquote {{
            border-left: 4px solid #6366F1;
            padding-left: 20px;
            margin: 20px 0;
            color: #6B7280;
            font-style: italic;
        }}
        a {{
            color: #4F46E5;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .page-break {{
            page-break-after: always;
        }}
        hr {{
            border: none;
            border-top: 2px solid #E5E7EB;
            margin: 40px 0;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
"""

# HTMLファイルを保存
with open('MANUAL_COMPLETE.html', 'w', encoding='utf-8') as f:
    f.write(html_template)

print("✅ HTMLファイルを作成しました: MANUAL_COMPLETE.html")
print("")
print("📄 PDF化する方法:")
print("1. MANUAL_COMPLETE.html をブラウザで開く")
print("2. ファイル → 印刷（Cmd+P）")
print("3. 送信先で「PDFに保存」を選択")
print("4. 「保存」ボタンをクリック")
