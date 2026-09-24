with open(r'app\market-theme.css', 'r', encoding='utf-8') as f:
    css = f.read()

target = """.modern-shell[data-theme="dark"] th,
.modern-shell[data-theme="dark"] .secondary,
.modern-shell[data-theme="dark"] .pill,
.modern-shell[data-theme="dark"] .count-badge {
  background: #152634;
  color: #d1dde4;
}"""

replacement = """.modern-shell[data-theme="dark"] th,
.modern-shell th {
  background: #08161e;
  color: #8da4b4;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modern-shell[data-theme="dark"] td,
.modern-shell td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modern-shell[data-theme="dark"] .secondary,
.modern-shell .secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2ecf2;
}

.modern-shell[data-theme="dark"] .pill,
.modern-shell[data-theme="dark"] .count-badge,
.modern-shell .pill,
.modern-shell .count-badge {
  background: rgba(255, 255, 255, 0.06);
  color: #c9d8e2;
}

.modern-shell[data-theme="dark"] .primary,
.modern-shell .primary {
  background: #00e599;
  color: #04140e;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(0, 229, 153, 0.3);
}

.modern-shell[data-theme="dark"] .primary:hover:not(:disabled),
.modern-shell .primary:hover:not(:disabled) {
  background: #25ffb1;
  box-shadow: 0 6px 20px rgba(0, 229, 153, 0.45);
}"""

if target in css:
    css = css.replace(target, replacement, 1)
    with open(r'app\market-theme.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Replaced table and button styling successfully")
else:
    print("Target not found")
