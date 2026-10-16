#!/usr/bin/env python3
"""Monta as páginas estáticas do site a partir de src/pages/*.html.

Cada página começa com um bloco de metadados:
    <!--
    title: ...
    description: ...
    nav: inicio|tratamentos|desporto|sobre
    stage: home|vertebra|flex|logo   (opcional, ativa o motor 3D)
    -->
Marcadores disponíveis: {{icon:nome}}, {{wa}} (link WhatsApp padrão),
{{wa:mensagem}} (link WhatsApp com mensagem própria).
Uso: python3 src/build.py
"""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'site'
SITE_URL = 'https://ricardolento.pt'

BUSINESS = {
    'name': 'Ricardo Lento — Quiropata & Massagista',
    'phone_display': '968 313 194',
    'phone': '+351968313194',
    'wa': '351968313194',
    'email': 'geral@ricardolento.pt',
    'street': 'Rua Damião de Góis, 98',
    'postal': '4460-292',
    'city': 'Senhora da Hora, Matosinhos',
    'maps': 'https://maps.google.com/?cid=17417412413387027526',
    'instagram': 'https://www.instagram.com/ricardolentoqm/',
    'facebook': 'https://www.facebook.com/rl.quiropata/',
}
WA_DEFAULT = 'Olá Ricardo! Gostaria de marcar uma consulta. Qual a próxima disponibilidade?'

ICONS = {
    'wa': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z"/></svg>',
    'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
    'pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    'mail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    'ig': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
    'fb': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.76 0-4.5 1.79-4.5 4.6V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V8.8c0-.53.27-.8.8-.8H14Z"/></svg>',
    'info': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    'eye': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    'chat': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/></svg>',
    'heart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
}

NAV = [
    ('inicio', 'index.html', 'Início'),
    ('tratamentos', 'tratamentos.html', 'Tratamentos'),
    ('desporto', 'desporto.html', 'Desporto'),
    ('sobre', 'sobre.html', 'Sobre &amp; Contacto'),
]


def ver(rel):
    """Versão curta do ficheiro, para o browser descarregar sempre a última alteração."""
    return hashlib.md5((OUT / rel).read_bytes()).hexdigest()[:8]


def wa(msg=WA_DEFAULT):
    return f"https://wa.me/{BUSINESS['wa']}?text={quote(msg)}"


def head(meta):
    title = meta['title']
    desc = meta['description']
    page = meta.get('file', 'index.html')
    canonical = SITE_URL + ('/' if page == 'index.html' else '/' + page)
    ld = {
        '@context': 'https://schema.org',
        '@type': ['LocalBusiness', 'HealthAndBeautyBusiness'],
        'name': BUSINESS['name'],
        'image': SITE_URL + '/assets/brand/logo-rl-original.png',
        'telephone': BUSINESS['phone'],
        'email': BUSINESS['email'],
        'url': SITE_URL,
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': BUSINESS['street'],
            'postalCode': BUSINESS['postal'],
            'addressLocality': 'Matosinhos',
            'addressRegion': 'Porto',
            'addressCountry': 'PT',
        },
        'geo': {'@type': 'GeoCoordinates', 'latitude': 41.1887831, 'longitude': -8.6662164},
        'sameAs': [BUSINESS['instagram'], BUSINESS['facebook']],
        'hasMap': BUSINESS['maps'],
    }
    importmap = ''
    if meta.get('stage'):
        importmap = (
            '<script type="importmap">{"imports":{"three":"./vendor/three/three.module.min.js",'
            '"three/addons/":"./vendor/three/addons/"}}</script>'
        )
    return f"""<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#070d1d">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE_URL}/assets/brand/og-image.jpg">
<link rel="icon" type="image/png" href="assets/brand/favicon.png">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v={ver('assets/css/style.css')}">
{importmap}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
"""


def header(active):
    current = ' aria-current="page"'
    links = '\n'.join(
        f'<li><a href="{href}"{current if key == active else ""}>{label}</a></li>'
        for key, href, label in NAV
    )
    mlinks = '\n'.join(
        f'<a class="big" href="{href}">{label.replace("&amp; Contacto", "&amp; <em>Contacto</em>") if key == "sobre" else label}</a>'
        for key, href, label in NAV
    )
    veil = ''.join(f'<i style="--i:{i}"></i>' for i in range(8))
    return f"""<div class="page-veil" aria-hidden="true"><div class="veil-spine">{veil}</div></div>
<header class="site-header">
  <div class="wrap">
    <nav class="nav" aria-label="Principal">
      <a class="brand" href="index.html" aria-label="Ricardo Lento — página inicial">
        <img src="assets/brand/logo-rl-light.png" alt="" width="46" height="46">
        <span>Ricardo Lento<small>Quiropata &amp; Massagista</small></span>
      </a>
      <ul class="nav-links">
{links}
      </ul>
      <a class="btn btn--wa" href="{wa()}" target="_blank" rel="noopener">{ICONS['wa']} Marcar consulta</a>
      <button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span><span></span></button>
    </nav>
  </div>
</header>
<div class="mobile-menu" aria-label="Menu">
{mlinks}
  <a class="btn btn--wa" href="{wa()}" target="_blank" rel="noopener">{ICONS['wa']} Marcar no WhatsApp</a>
  <div class="mm-foot">{BUSINESS['street']} · {BUSINESS['city']}<br><a href="tel:{BUSINESS['phone']}">{BUSINESS['phone_display']}</a></div>
</div>
"""


def footer(stage):
    scripts = """<script src="vendor/gsap.min.js"></script>
<script src="vendor/ScrollTrigger.min.js"></script>
<script src="vendor/lenis.min.js"></script>
<script src="assets/js/main.js?v=""" + ver('assets/js/main.js') + """"></script>"""
    if stage:
        scripts += f'\n<script type="module" src="assets/js/spine3d.js?v={ver("assets/js/spine3d.js")}"></script>'
    nav = '\n'.join(f'<li><a href="{href}">{label}</a></li>' for _, href, label in NAV)
    return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <img src="assets/brand/logo-rl-light.png" alt="Ricardo Lento — Quiropata &amp; Massagista" width="92" height="92">
        <p class="tagline">Prevenção · Terapia · Reabilitação</p>
      </div>
      <div>
        <h4>Navegação</h4>
        <ul>{nav}</ul>
      </div>
      <div>
        <h4>Contactos</h4>
        <ul>
          <li><a href="{wa()}" target="_blank" rel="noopener">WhatsApp · {BUSINESS['phone_display']}</a></li>
          <li><a href="tel:{BUSINESS['phone']}">Ligar · {BUSINESS['phone_display']}</a></li>
          <li><a href="mailto:{BUSINESS['email']}">{BUSINESS['email']}</a></li>
        </ul>
      </div>
      <div>
        <h4>Consultório</h4>
        <ul>
          <li><a href="{BUSINESS['maps']}" target="_blank" rel="noopener">{BUSINESS['street']}<br>{BUSINESS['postal']} {BUSINESS['city']}</a></li>
        </ul>
        <div class="socials" style="margin-top:18px">
          <a href="{BUSINESS['instagram']}" target="_blank" rel="noopener" aria-label="Instagram">{ICONS['ig']}</a>
          <a href="{BUSINESS['facebook']}" target="_blank" rel="noopener" aria-label="Facebook">{ICONS['fb']}</a>
        </div>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span data-year>2026</span> Ricardo Lento — Quiropata &amp; Massagista</span>
      <span>Design e desenvolvimento <a href="https://aconectaweb.com/" target="_blank" rel="noopener"><b>ConectaWeb</b></a></span>
    </div>
  </div>
</footer>
<div class="mobile-cta"><a class="btn btn--wa" href="{wa()}" target="_blank" rel="noopener">{ICONS['wa']} Marcar consulta no WhatsApp</a></div>
{scripts}
</body>
</html>
"""


def render(src: Path):
    raw = src.read_text(encoding='utf-8')
    m = re.match(r'\s*<!--(.*?)-->\s*', raw, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        k, v = line.split(':', 1)
        meta[k.strip()] = v.strip()
    meta['file'] = src.name
    body = raw[m.end():]
    body = re.sub(r'\{\{icon:(\w+)\}\}', lambda mm: ICONS[mm.group(1)], body)
    body = re.sub(r'\{\{wa:(.+?)\}\}', lambda mm: wa(mm.group(1)), body)
    body = body.replace('{{wa}}', wa())
    for k, v in BUSINESS.items():
        body = body.replace('{{' + k + '}}', v)
    html = head(meta) + f'<body class="grain page-{meta["nav"]}">\n' + header(meta['nav']) + body + footer(meta.get('stage'))
    (OUT / src.name).write_text(html, encoding='utf-8')
    print('ok', src.name)


if __name__ == '__main__':
    for p in sorted((ROOT / 'pages').glob('*.html')):
        render(p)
