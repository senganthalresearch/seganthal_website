with open(r'app\market-theme.css', 'r', encoding='utf-8') as f:
    css = f.read()

target = """  .anniversary-pillars {
    grid-template-columns: 1fr !important;
  }"""

replacement = """  .anniversary-brand-img {
    width: 56px !important;
    height: 56px !important;
  }

  .anniversary-celebration-hero {
    flex-direction: column !important;
    text-align: center !important;
    gap: 14px !important;
  }

  .anniversary-medallion-badge {
    margin: 0 auto !important;
  }

  .anniversary-tamil-slogan {
    justify-content: center !important;
    text-align: center !important;
  }

  .anniversary-kicker-badge {
    justify-content: center !important;
  }

  .anniversary-pillars {
    grid-template-columns: 1fr !important;
  }"""

if target in css:
    css = css.replace(target, replacement, 1)
    with open(r'app\market-theme.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Mobile celebration hero styles added successfully")
else:
    print("Target not found")
