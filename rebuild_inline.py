#!/usr/bin/env python3
"""Re-inline JS source files into index.html inline <script> blocks."""
import re, os

JS_DIR = os.path.join(os.path.dirname(__file__), 'js')
HTML_FILE = os.path.join(os.path.dirname(__file__), 'index.html')

with open(HTML_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# Map: marker comment → filename
js_files = [
    'db.js', 'ui.js', 'automations.js', 'dashboard.js', 'tasks.js',
    'projects.js', 'team.js', 'whatsapp.js', 'gantt.js', 'calendar.js',
    'reports.js', 'settings.js', 'app.js'
]

for fname in js_files:
    fpath = os.path.join(JS_DIR, fname)
    if not os.path.exists(fpath):
        print(f'SKIP (not found): {fname}')
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        new_content = f.read()

    # Match <script>// fname\n...content...\n</script>
    pattern = r'(<script>// ' + re.escape(fname) + r'\n)(.*?)(</script>)'
    replacement = r'\g<1>' + new_content.replace('\\', r'\\').replace('\g', r'\g') + r'\3'

    # Use a function-based replacement to avoid backreference issues
    def make_replacer(content):
        def replacer(m):
            return m.group(1) + content + m.group(3)
        return replacer

    new_html, count = re.subn(pattern, make_replacer(new_content), html, flags=re.DOTALL)
    if count == 0:
        print(f'WARNING: no match found for {fname}')
    else:
        html = new_html
        print(f'OK: {fname} ({count} replacement)')

with open(HTML_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print('Done.')
