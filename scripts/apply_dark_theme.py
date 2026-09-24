import re

css_path = r'app\market-theme.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update :root
old_root = """:root {
  --navy: #14324a;
  --navy-dark: #081824;
  --ink: #14202b;
  --muted: #687786;
  --line: #dce5eb;
  --bg: #edf3f1;
  --green: #008f5f;
  --red: #d33f49;
  --gain: #008f5f;
  --loss: #d33f49;
  --amber: #b87912;
  --terminal: #0a141d;
  --surface: #ffffff;
}"""

new_root = """:root {
  --navy: #08171d;
  --navy-dark: #050d12;
  --ink: #eaf1f5;
  --muted: #8da4b4;
  --line: rgba(255, 255, 255, 0.08);
  --bg: #060e14;
  --green: #00e599;
  --red: #ff3b56;
  --gain: #00e599;
  --loss: #ff3b56;
  --amber: #f3dfae;
  --gold: #e6c987;
  --terminal: #071217;
  --surface: #0a1820;
  --surface-soft: #0d222b;
}"""

if old_root in css:
    css = css.replace(old_root, new_root, 1)
    print("[OK] Replaced :root")
else:
    print("[FAIL] Could not find old_root")

# 2. Update body and app-shell
old_body = """body {
  background:
    linear-gradient(90deg, rgba(13, 58, 45, .055) 1px, transparent 1px),
    linear-gradient(0deg, rgba(13, 58, 45, .045) 1px, transparent 1px),
    linear-gradient(135deg, #f5faf7 0%, #e9f2ef 48%, #f7f3ea 100%);
  background-size: 44px 44px, 44px 44px, auto;
}

.app-shell {
  background:
    linear-gradient(120deg, rgba(0, 143, 95, .08), transparent 32%),
    linear-gradient(280deg, rgba(211, 63, 73, .08), transparent 34%);
}"""

new_body = """body {
  background:
    radial-gradient(circle at 18% 18%, rgba(0, 229, 153, 0.08) 0%, transparent 45%),
    radial-gradient(circle at 82% 82%, rgba(230, 201, 135, 0.07) 0%, transparent 45%),
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(145deg, #050d12 0%, #08171d 45%, #0b1e24 75%, #061116 100%);
  background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px, auto;
  color: #e2ecf2;
}

.app-shell {
  background: transparent;
}"""

if old_body in css:
    css = css.replace(old_body, new_body, 1)
    print("[OK] Replaced body and app-shell")
else:
    print("[FAIL] Could not find old_body")

# 3. Update dark theme shell
old_dark_block = """.modern-shell[data-theme="dark"] {
  background:
    linear-gradient(90deg, rgba(132, 164, 154, .08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(132, 164, 154, .06) 1px, transparent 1px),
    linear-gradient(135deg, #07111a 0%, #101d25 52%, #11180f 100%);
  color: #e6edf2;
}"""

new_dark_block = """.modern-shell[data-theme="dark"],
.modern-shell {
  background:
    radial-gradient(circle at 18% 18%, rgba(0, 229, 153, 0.08) 0%, transparent 45%),
    radial-gradient(circle at 82% 82%, rgba(230, 201, 135, 0.07) 0%, transparent 45%),
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(145deg, #050d12 0%, #08171d 45%, #0b1e24 75%, #061116 100%);
  background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px, auto;
  color: #e2ecf2;
}"""

if old_dark_block in css:
    css = css.replace(old_dark_block, new_dark_block, 1)
    print("[OK] Replaced modern-shell background")
else:
    print("[FAIL] Could not find old_dark_block")

# 4. Enhance modern-shell dark elements
old_dark_header = """.modern-shell[data-theme="dark"] .app-header {
  background: rgba(8, 19, 27, .94);
  border-bottom-color: #243848;
}"""

new_dark_header = """.modern-shell[data-theme="dark"] .app-header,
.modern-shell .app-header {
  background: rgba(8, 20, 27, 0.94);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}"""

if old_dark_header in css:
    css = css.replace(old_dark_header, new_dark_header, 1)
    print("[OK] Replaced app-header")
else:
    print("[FAIL] Could not find old_dark_header")

# 5. Enhance modern-shell cards, panels, inputs
old_cards = """.modern-shell[data-theme="dark"] .brand-card,
.modern-shell[data-theme="dark"] .panel,
.modern-shell[data-theme="dark"] .search-form,
.modern-shell[data-theme="dark"] .table-wrap,
.modern-shell[data-theme="dark"] .snapshot-tile,
.modern-shell[data-theme="dark"] .swing-mode,
.modern-shell[data-theme="dark"] input,
.modern-shell[data-theme="dark"] textarea,
.modern-shell[data-theme="dark"] select {
  background: rgba(16, 30, 40, .96);
  border-color: #284051;
  color: #e6edf2;
}"""

new_cards = """.modern-shell[data-theme="dark"] .brand-card,
.modern-shell[data-theme="dark"] .panel,
.modern-shell[data-theme="dark"] .search-form,
.modern-shell[data-theme="dark"] .table-wrap,
.modern-shell[data-theme="dark"] .snapshot-tile,
.modern-shell[data-theme="dark"] .swing-mode,
.modern-shell[data-theme="dark"] input,
.modern-shell[data-theme="dark"] textarea,
.modern-shell[data-theme="dark"] select,
.modern-shell .panel,
.modern-shell .search-form,
.modern-shell .table-wrap,
.modern-shell .snapshot-tile,
.modern-shell .swing-mode,
.modern-shell input,
.modern-shell textarea,
.modern-shell select {
  background: rgba(10, 24, 32, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e6edf2;
}

.modern-shell .brand-card .brand-logo,
.modern-shell[data-theme="dark"] .brand-card .brand-logo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(230, 201, 135, 0.45);
  box-shadow: 0 0 16px rgba(0, 229, 153, 0.2);
  background: #07151d;
  padding: 2px;
  object-fit: cover;
}"""

if old_cards in css:
    css = css.replace(old_cards, new_cards, 1)
    print("[OK] Replaced cards & inputs")
else:
    print("[FAIL] Could not find old_cards")

# 6. Brand card titles
old_brand_title = """.modern-shell[data-theme="dark"] .brand-card strong {
  color: #ff9aa6;
}"""

new_brand_title = """.modern-shell[data-theme="dark"] .brand-card strong,
.modern-shell .brand-card strong {
  color: #ffffff;
}

.modern-shell[data-theme="dark"] .brand-card small,
.modern-shell .brand-card small {
  color: #e6c987;
  font-weight: 600;
}"""

if old_brand_title in css:
    css = css.replace(old_brand_title, new_brand_title, 1)
    print("[OK] Replaced brand title")
else:
    print("[FAIL] Could not find old_brand_title")

# 7. Main nav items
old_nav = """.modern-shell[data-theme="dark"] .main-nav .nav-item {
  color: #bdd9ff;
  background: transparent;
}

.modern-shell[data-theme="dark"] .main-nav {
  background: rgba(15, 30, 41, .68);
  border-color: #263f50;
}

.modern-shell[data-theme="dark"] .main-nav .nav-item:hover {
  background: rgba(82, 139, 167, .16);
}

.modern-shell[data-theme="dark"] .main-nav .nav-item.active {
  background: linear-gradient(135deg, #148099, #1b8b68);
  color: #fff;
}"""

new_nav = """.modern-shell[data-theme="dark"] .main-nav .nav-item,
.modern-shell .main-nav .nav-item {
  color: #9cb4c4;
  background: transparent;
}

.modern-shell[data-theme="dark"] .main-nav,
.modern-shell .main-nav {
  background: rgba(10, 24, 32, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.modern-shell[data-theme="dark"] .main-nav .nav-item:hover,
.modern-shell .main-nav .nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.modern-shell[data-theme="dark"] .main-nav .nav-item.active,
.modern-shell .main-nav .nav-item.active {
  background: rgba(0, 229, 153, 0.12);
  color: #00e599;
  border: 1px solid rgba(0, 229, 153, 0.35);
  box-shadow: 0 0 16px rgba(0, 229, 153, 0.2);
}"""

if old_nav in css:
    css = css.replace(old_nav, new_nav, 1)
    print("[OK] Replaced main nav")
else:
    print("[FAIL] Could not find old_nav")

# 8. Tables, pills, buttons in dark shell
old_th = """.modern-shell[data-theme="dark"] th,
.modern-shell[data-theme="dark"] .secondary,
.modern-shell[data-theme="dark"] .pill,
.modern-shell[data-theme="dark"] .count-badge {
  background: #152634;
  color: #8fa5b4;
}"""

new_th = """.modern-shell[data-theme="dark"] th,
.modern-shell th {
  background: #08161e;
  color: #8da4b4;
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
}"""

if old_th in css:
    css = css.replace(old_th, new_th, 1)
    print("[OK] Replaced th, secondary, pills")
else:
    print("[FAIL] Could not find old_th")

# 9. Update login styles with large logo and 1st Anniversary Medallion
old_login_brand = """.anniversary-brand-img {
  width: 44px !important;
  height: 44px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  border: 1.5px solid rgba(230, 201, 135, 0.45) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5) !important;
  background: #091a21 !important;
  padding: 2px !important;
  flex-shrink: 0 !important;
}

.anniversary-brand-text {
  display: flex !important;
  flex-direction: column !important;
}

.anniversary-brand-title {
  font-family: "Noto Sans Tamil", sans-serif !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  line-height: 1.2 !important;
  letter-spacing: -0.2px !important;
}

.anniversary-brand-sub {
  font-size: 9px !important;
  letter-spacing: 2px !important;
  font-weight: 700 !important;
  color: #e6c987 !important;
  margin-top: 2px !important;
}"""

new_login_brand = """.anniversary-brand-img {
  width: 68px !important;
  height: 68px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  border: 2px solid rgba(230, 201, 135, 0.55) !important;
  box-shadow: 0 0 24px rgba(0, 229, 153, 0.22), 0 6px 18px rgba(0, 0, 0, 0.55) !important;
  background: #08171f !important;
  padding: 3px !important;
  flex-shrink: 0 !important;
  transition: transform 0.2s ease !important;
}

.anniversary-brand:hover .anniversary-brand-img {
  transform: scale(1.04) !important;
}

.anniversary-brand-text {
  display: flex !important;
  flex-direction: column !important;
}

.anniversary-brand-title {
  font-family: "Noto Sans Tamil", sans-serif !important;
  font-size: 21px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  line-height: 1.2 !important;
  letter-spacing: -0.2px !important;
}

.anniversary-brand-sub {
  font-size: 9.5px !important;
  letter-spacing: 2.2px !important;
  font-weight: 700 !important;
  color: #e6c987 !important;
  margin-top: 3px !important;
}

/* 1st Anniversary Hero Celebration Showcase */
.anniversary-celebration-hero {
  display: flex !important;
  align-items: center !important;
  gap: 20px !important;
  margin-bottom: 2px !important;
}

.anniversary-medallion-badge {
  position: relative !important;
  width: 130px !important;
  min-width: 130px !important;
  height: 130px !important;
  border-radius: 50% !important;
  border: 1.5px solid rgba(230, 201, 135, 0.4) !important;
  background: radial-gradient(circle, rgba(230, 201, 135, 0.16) 0%, rgba(0, 229, 153, 0.05) 55%, transparent 72%) !important;
  box-shadow: 0 0 35px rgba(230, 201, 135, 0.22), inset 0 0 20px rgba(230, 201, 135, 0.12) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  isolation: isolate !important;
  flex-shrink: 0 !important;
  animation: anniversary-arrive 0.9s cubic-bezier(0.16, 1, 0.3, 1) both !important;
}

.anniversary-orbit-ring {
  position: absolute !important;
  inset: 6px !important;
  border-radius: 50% !important;
  border: 1px dashed rgba(230, 201, 135, 0.45) !important;
  animation: anniversary-orbit 14s linear infinite !important;
}

.anniversary-orbit-ring::after {
  content: "" !important;
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  width: 7px !important;
  height: 7px !important;
  background: #ffe1a0 !important;
  border-radius: 50% !important;
  box-shadow: 0 0 10px #ffe1a0, 0 0 20px #e6c987 !important;
}

.anniversary-sparkle {
  position: absolute !important;
  color: #f6e2b2 !important;
  animation: anniversary-twinkle 2.5s ease-in-out infinite !important;
}

.spark-one {
  right: -2px !important;
  top: 16px !important;
  width: 17px !important;
  height: 17px !important;
}

.spark-two {
  left: 2px !important;
  bottom: 14px !important;
  width: 13px !important;
  height: 13px !important;
  animation-delay: 0.8s !important;
}

.anniversary-one-num {
  font-family: Georgia, serif !important;
  font-size: 54px !important;
  line-height: 1 !important;
  color: #f3dfae !important;
  letter-spacing: -3px !important;
  text-shadow: 0 2px 20px rgba(230, 201, 135, 0.4) !important;
}

.anniversary-one-num sup {
  font-size: 15px !important;
  vertical-align: super !important;
  margin-left: 2px !important;
  letter-spacing: 0 !important;
}

.anniversary-anniv-label {
  font-size: 8px !important;
  letter-spacing: 2.8px !important;
  font-weight: 700 !important;
  color: #f1dfb3 !important;
  margin-top: 1px !important;
}

.anniversary-anniv-milestone {
  font-size: 6px !important;
  letter-spacing: 1.4px !important;
  font-weight: 600 !important;
  color: #9bb7a8 !important;
  margin-top: 2px !important;
}

.anniversary-hero-headline-wrap {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}

.anniversary-headline-text {
  font-family: Georgia, "Plus Jakarta Sans", serif !important;
  font-size: clamp(24px, 2.7vw, 36px) !important;
  font-weight: 400 !important;
  line-height: 1.15 !important;
  letter-spacing: -0.8px !important;
  margin: 0 !important;
  color: #ffffff !important;
}

@keyframes anniversary-orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes anniversary-twinkle {
  0%, 100% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}

@keyframes anniversary-arrive {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}"""

if old_login_brand in css:
    css = css.replace(old_login_brand, new_login_brand, 1)
    print("[OK] Replaced login brand & added 1st Anniversary Medallion")
else:
    print("[FAIL] Could not find old_login_brand")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("market-theme.css updated successfully!")
