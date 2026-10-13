#!/usr/bin/env python3
"""Rebuild assets/og-portfolio.svg (the link-preview thumbnail source).

    pip install pillow && python3 scripts/build-og-svg.py

Sophia ("nerd" edition): public/images/sophia/method-presenter-still.webp with
the pointer wand erased (assets/sophia/nerd-base.png), plus vector glasses and a
pen tucked behind her ear. The base art is embedded as a PNG data URI so the
SVG renders identically in sharp/librsvg (scripts/generate-og.mjs) and in a
browser. Edit the vector parts below, then run this and `npm run build`.
"""
import base64, io
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
base = Image.open(ROOT / 'assets' / 'sophia' / 'nerd-base.png').convert('RGBA')
buf = io.BytesIO()
base.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(buf, 'PNG', optimize=True)
DATA = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

# Face geometry in sprite pixels (640 x 704): iris centres and head tilt.
TILT = 24.5

SOPHIA = f'''
    <g id="sophia" transform="translate(600 6) scale(.885)">
      <image href="{DATA}" width="640" height="704"/>

      <!-- pen tucked behind the right ear: the ear is redrawn over its barrel -->
      <g id="pen" transform="translate(356 176) rotate(-24)">
        <path d="M0 5.5 L-16 5.5 L-30 0 L-16 -5.5 L0 -5.5Z" fill="#cfd3dc" stroke="#6c7280" stroke-width="1.2" stroke-linejoin="round"/>
        <rect x="0" y="-6.5" width="38" height="13" rx="4" fill="#1c2144" stroke="#0e1230" stroke-width="1.2"/>
        <rect x="38" y="-7.5" width="100" height="15" rx="6" fill="#26306b" stroke="#0e1230" stroke-width="1.2"/>
        <rect x="44" y="-7.5" width="5" height="15" fill="#d9a441"/>
        <path d="M54 -7.5 H118 V-12 H54Z" fill="#d9a441" stroke="#8a6420" stroke-width="1" rx="2"/>
        <path d="M44 -3 H130" stroke="#6b7ad6" stroke-width="2" stroke-linecap="round" opacity=".55"/>
      </g>
      <clipPath id="ear"><polygon points="402,176 408,150 430,128 480,108 510,104 506,150 488,200 462,236 444,252 424,236 410,208"/></clipPath>
      <image href="{DATA}" width="640" height="704" clip-path="url(#ear)"/>

      <!-- glasses: drawn upright, rotated with the head -->
      <g id="glasses" transform="translate(308 257.5) rotate({TILT})" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-72 -9 L-98 -17 M72 -9 L96 -19" stroke="#15162a" stroke-width="5.5"/>
        <rect x="-73" y="-29" width="66" height="58" rx="17" fill="#cfe6ff" fill-opacity=".18" stroke="#15162a" stroke-width="6.5"/>
        <rect x="7" y="-29" width="66" height="58" rx="17" fill="#cfe6ff" fill-opacity=".18" stroke="#15162a" stroke-width="6.5"/>
        <path d="M-7 -9 Q0 -15 7 -9" stroke="#15162a" stroke-width="6"/>
        <path d="M-62 -18 L-48 -24 M18 -18 L32 -24" stroke="#ffffff" stroke-width="3.2" opacity=".85"/>
        <path d="M-62 -9 L-58 -11 M18 -9 L22 -11" stroke="#ffffff" stroke-width="2.4" opacity=".7"/>
        <g transform="rotate(-8 0 -5)"><rect x="-9" y="-12" width="18" height="9" rx="1.5" fill="#f4efe2" stroke="#b9b09a" stroke-width="1"/><path d="M-5 -9.5h10M-5 -6.5h8" stroke="#c9c1ab" stroke-width="1"/></g>
      </g>
    </g>'''

SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff7e8"/>
      <stop offset="0.54" stop-color="#f6e9d2"/>
      <stop offset="1" stop-color="#d9b89d"/>
    </linearGradient>
    <radialGradient id="halo" cx="50%" cy="46%" r="50%">
      <stop offset="0" stop-color="#fffdf6" stop-opacity="0.95"/>
      <stop offset="0.62" stop-color="#f9ecd2" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#f1d9b6" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="9"/>
      <feOffset dx="0" dy="10" result="offsetblur"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="pixels" width="26" height="26" patternUnits="userSpaceOnUse">
      <rect width="26" height="26" fill="none"/>
      <rect width="12" height="12" fill="#3f302a" opacity="0.08"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#paper)"/>
  <rect width="1200" height="630" fill="url(#pixels)" opacity="0.24"/>

  <!-- stage behind Sophia -->
  <circle cx="900" cy="318" r="318" fill="url(#halo)"/>
  <circle cx="900" cy="318" r="262" fill="none" stroke="#b58659" stroke-width="1.4" opacity="0.38"/>
  <circle cx="900" cy="318" r="300" fill="none" stroke="#b58659" stroke-width="1" stroke-dasharray="2 9" opacity="0.5"/>
  <g fill="#b58659" opacity="0.55">
    <path d="M668 150l5 14 14 5-14 5-5 14-5-14-14-5 14-5z"/>
    <path d="M1130 96l4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/>
    <path d="M1118 470l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z"/>
  </g>
  <g fill="#8e6a58" font-family="DejaVu Sans Mono, monospace" font-size="19" opacity="0.5" letter-spacing="1">
    <text x="640" y="560" transform="rotate(-7 640 560)">E = mc²</text>
    <text x="1000" y="64" transform="rotate(5 1000 64)">1 + 1 = 10</text>
    <text x="1096" y="392" transform="rotate(-5 1096 392)">42</text>
  </g>

  <!-- editorial label -->
  <text x="68" y="78" fill="#8e6a58" font-family="DejaVu Sans Mono, monospace" font-size="14" letter-spacing="7">TEMPORA SCRIBUNT</text>
  <line x1="276" y1="73" x2="340" y2="73" stroke="#9f7f6f" stroke-width="1" opacity="0.65"/>

  <!-- identity -->
  <text x="66" y="220" fill="#3e2119" font-family="Georgia, 'Times New Roman', serif" font-size="82" letter-spacing="-3">Kauê Alencar</text>
  <text x="70" y="270" fill="#4b2d25" font-family="Georgia, 'Times New Roman', serif" font-size="30">Escrita · Documentação · Informação</text>
  <text x="70" y="336" fill="#72594d" font-family="DejaVu Sans Mono, monospace" font-size="17" letter-spacing="1.4">
    <tspan x="70" dy="0">Ideias organizadas.</tspan>
    <tspan x="70" dy="28">Conhecimento que permanece.</tspan>
    <tspan x="70" dy="28">Um olhar mais atento sobre a realidade.</tspan>
  </text>

  <line x1="70" y1="438" x2="70" y2="505" stroke="#6a4a3d" stroke-width="2"/>
  <text x="94" y="448" fill="#75594d" font-family="DejaVu Sans Mono, monospace" font-size="13" letter-spacing="5">
    <tspan x="94" dy="0">FILOSOFIA</tspan>
    <tspan x="94" dy="24">LINGUÍSTICA</tspan>
    <tspan x="94" dy="24">NEUROCIÊNCIA</tspan>
    <tspan x="94" dy="24">FÍSICA</tspan>
  </text>
  <g transform="translate(69 538)" fill="#3f302a">
    <rect x="0" y="10" width="12" height="12"/>
    <rect x="12" y="0" width="12" height="12"/>
    <rect x="12" y="20" width="12" height="12"/>
    <rect x="24" y="10" width="12" height="12"/>
  </g>
  <text x="122" y="551" fill="#7e6254" font-family="DejaVu Sans Mono, monospace" font-size="13" letter-spacing="4">VERITAS · ORDO · PERMANENTIA</text>

  <!-- Sophia, nerd edition -->
  <g filter="url(#softShadow)">{SOPHIA}
  </g>
</svg>
'''
(ROOT / 'assets' / 'og-portfolio.svg').write_text(SVG, encoding='utf-8')
print('wrote assets/og-portfolio.svg', len(SVG) // 1024, 'KB')
