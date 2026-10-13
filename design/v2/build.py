#!/usr/bin/env python3
"""Genera tokens.css, figma-variables.json y «Sorbo Design System v2.html»
a partir de tokens.json, README.md y components/*. Ejecutar desde la raíz:

    python3 design/v2/build.py
"""
import html
import json
import math
import re
from pathlib import Path

BASE = Path(__file__).parent
t = json.loads((BASE / 'tokens.json').read_text())
themes = [th['id'] for th in t['color']['themes']]
toks = {x['name']: x for x in t['color']['tokens']}
esc = html.escape


# ── Color ────────────────────────────────────────────────────────────────────
def raw(name, theme):
    v = toks[name]['value']
    return v if isinstance(v, str) else v.get(theme, v[themes[0]])


def resolve(name, theme):
    v = raw(name, theme)
    m = re.fullmatch(r'\{(.+)\}', v)
    return resolve(m.group(1), theme) if m else v


def cssval(name, theme):
    v = raw(name, theme)
    m = re.fullmatch(r'\{(.+)\}', v)
    return f'var(--{m.group(1)})' if m else v


def oklch_to_rgb(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l_, m_, s_ = L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    lin = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    enc = lambda c: 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    return [min(1, max(0, enc(c))) for c in lin]


def to_rgba(value):
    if value.startswith('#'):
        h = value.lstrip('#')
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
    else:
        L, C, H = [float(x) for x in re.findall(r'[\d.]+', value)[:3]]
        rgb, a = oklch_to_rgb(L, C, H), 1
    return {k: round(v, 4) for k, v in zip('rgb', rgb)} | {'a': round(a, 4)}


# ── tokens.css ───────────────────────────────────────────────────────────────
def color_block(theme, indent='  '):
    lines = [f'{indent}--{n}: {cssval(n, theme)};' for n in toks]
    for x in t.get('shadow', {}).get('tokens', []):
        v = x['value'][theme] if isinstance(x['value'], dict) else x['value']
        lines.append(f'{indent}--{x["name"]}: {v};')
    return '\n'.join(lines)


static = [f'  --font-{k}: {v};' for k, v in t['type']['families'].items()]
for fam in ('spacing', 'radius', 'size'):
    static += [f'  --{x["name"]}: {x["value"]};' for x in t[fam]['tokens']]

classes = []
for g in t['type']['groups']:
    for s in g['styles']:
        props = [f'font-family: var(--font-{s.get("family", g["family"])})', f'font-size: {s["fontSize"]}',
                 f'line-height: {s["lineHeight"]}', f'font-weight: {s["fontWeight"]}']
        if 'letterSpacing' in s:
            props.append(f'letter-spacing: {s["letterSpacing"]}')
        if 'fontStyle' in s:
            props.append(f'font-style: {s["fontStyle"]}')
        if s['name'] == 'card-eyebrow':
            props.append('text-transform: uppercase')
        classes.append(f'.{s["name"]} {{ ' + '; '.join(props) + '; }')

css = f"""/* Sorbo Design System v2 — generado por design/v2/build.py desde tokens.json. No editar a mano. */
@import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap");

:root, [data-theme="light"] {{
{color_block('light')}
}}

[data-theme="dark"] {{
{color_block('dark')}
}}

@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
{color_block('dark', '    ')}
  }}
}}

:root {{
{chr(10).join(static)}
}}

{chr(10).join(classes)}
"""
(BASE / 'tokens.css').write_text(css)

# ── figma-variables.json ─────────────────────────────────────────────────────
mode = {'light': 'Claro', 'dark': 'Oscuro'}
cvars = [{'name': f'color/{n}', 'type': 'COLOR',
          'valuesByMode': {mode[th]: to_rgba(resolve(n, th)) for th in themes},
          'description': toks[n]['usage']} for n in toks]
fvars = [{'name': f'{fam}/{x["name"]}', 'type': 'FLOAT',
          'valuesByMode': {'Default': float(x['value'].rstrip('px'))}, 'description': x['usage']}
         for fam in ('spacing', 'radius', 'size') for x in t[fam]['tokens']]
(BASE / 'figma-variables.json').write_text(json.dumps({'collections': [
    {'name': 'Sorbo v2 · Color', 'modes': ['Claro', 'Oscuro'], 'variables': cvars},
    {'name': 'Sorbo v2 · Medidas', 'modes': ['Default'], 'variables': fvars}]}, ensure_ascii=False, indent=2))


# ── Página autocontenida ─────────────────────────────────────────────────────
def inline(s):
    s = esc(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', s)


def md(src):
    out, lines, i = [], src.strip().split('\n'), 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        m = re.match(r'(#{1,3}) (.*)', line)
        if m:
            tag = {1: 'h2', 2: 'h3', 3: 'h4'}[len(m.group(1))]
            out.append(f'<{tag}>{inline(m.group(2))}</{tag}>')
            i += 1
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                if not re.match(r'\|\s*-', lines[i]):
                    rows.append([c.strip() for c in lines[i].strip('|').split('|')])
                i += 1
            head = ''.join(f'<th>{inline(c)}</th>' for c in rows[0])
            body = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[1:])
            out.append(f'<div class="tw"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')
            continue
        if re.match(r'(- |\d+\. )', line):
            tag = 'ol' if re.match(r'\d+\. ', line) else 'ul'
            items = []
            while i < len(lines) and re.match(r'(- |\d+\. )', lines[i]):
                items.append(re.sub(r'^(- |\d+\. )', '', lines[i]))
                i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>')
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r'(#|\||- |\d+\. )', lines[i]):
            para.append(lines[i])
            i += 1
        out.append(f'<p>{inline(" ".join(para))}</p>')
    return '\n'.join(out)


def swatches():
    return '\n'.join(
        f'<div class="sw"><div class="chips"><span style="background:{resolve(n, "light")}"></span>'
        f'<span style="background:{resolve(n, "dark")}"></span></div><b>{esc(n)}</b>'
        f'<code>{esc(resolve(n, "light"))} · {esc(resolve(n, "dark"))}</code><p>{esc(x["usage"])}</p></div>'
        for n, x in toks.items())


def typescale():
    return '\n'.join(
        f'<div class="ts"><div class="{s["name"]}">{esc(s.get("sample", s["name"]))}</div>'
        f'<code>{s["name"]} · {s["fontSize"]}/{s["lineHeight"]} · {s["fontWeight"]}</code><p>{esc(s.get("usage", ""))}</p></div>'
        for g in t['type']['groups'] for s in g['styles'])


def measures():
    out = []
    for fam, label in (('spacing', 'Espaciado'), ('radius', 'Radios'), ('size', 'Medidas táctiles')):
        rows = ''.join(f'<tr><td><code>{x["name"]}</code></td><td>{x["value"]}</td><td>{esc(x["usage"])}</td></tr>'
                       for x in t[fam]['tokens'])
        out.append(f'<h3>{label}</h3><div class="tw"><table>{rows}</table></div>')
    return '\n'.join(out)


def frame_doc(path):
    src = path.read_text()
    return src.split('\n', 1)[1].replace('</head>', f'<style>{css}</style></head>', 1), src.splitlines()[0]


def components():
    out = []
    for d in sorted(p for p in (BASE / 'components').iterdir() if p.is_dir() and p.name != 'Cover'):
        doc, marker = frame_doc(d / 'preview.html')
        h = int(re.search(r'height=(\d+)', marker).group(1))
        guide = (d / 'README.md').read_text().split('\n', 2)[2] if (d / 'README.md').exists() else ''
        out.append(f'<section class="comp" id="{d.name}"><h3>{d.name}</h3>'
                   f'<iframe title="Vista previa de {d.name}" srcdoc="{esc(doc, quote=True)}" style="height:{h + 20}px"></iframe>'
                   f'<div class="guide">{md(guide)}</div></section>')
    return '\n'.join(out)


cover_doc, _ = frame_doc(BASE / 'components' / 'Cover' / 'preview.html')
page = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sorbo Design System v2</title>
<style>
{css}
body {{ margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-ui); }}
.wrap {{ max-width: 1040px; margin: 0 auto; padding: 32px 16px 80px; display: flex; flex-direction: column; gap: 48px; }}
header.top {{ display: flex; justify-content: space-between; align-items: center; gap: 16px; }}
nav.toc {{ display: flex; flex-wrap: wrap; gap: 8px; }}
nav.toc a {{ font-size: 14px; color: var(--ink); background: var(--surface); padding: 8px 12px; border-radius: var(--radius-pill); text-decoration: none; }}
button.theme {{ height: 40px; padding: 0 14px; border: 0; border-radius: var(--radius-md); background: var(--surface); color: var(--ink); font: 600 14px var(--font-ui); cursor: pointer; }}
h2 {{ font: 400 34px/36px var(--font-display); margin: 0 0 16px; }}
h3 {{ font: 600 16px/22px var(--font-ui); margin: 24px 0 8px; }}
.cover {{ width: 100%; aspect-ratio: 960 / 288; border: 0; border-radius: var(--radius-lg); overflow: hidden; }}
.readme {{ font: 400 15px/24px var(--font-ui); background: var(--surface); padding: 20px; border-radius: var(--radius-lg); max-height: 560px; overflow: auto; }}
.readme h2 {{ font: 400 28px/32px var(--font-display); margin: 0 0 8px; }} .readme h3 {{ margin-top: 20px; }} .readme h4 {{ font-size: 14px; margin: 16px 0 4px; }}
th {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }}
.sw {{ background: var(--surface); border-radius: var(--radius-lg); padding: 12px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }}
.sw .chips {{ display: flex; height: 56px; border-radius: var(--radius-sm); overflow: hidden; outline: 1px solid var(--line); }}
.sw .chips span {{ flex: 1; }}
.sw b {{ font-size: 14px; }} .sw p, .ts p {{ margin: 0; font-size: 12px; line-height: 16px; color: var(--ink-soft); }}
code {{ font: 500 12px/16px var(--font-data); color: var(--ink-soft); }}
.ts {{ border-bottom: 1px solid var(--line); padding: 14px 0; display: flex; flex-direction: column; gap: 4px; }}
.tw {{ overflow-x: auto; }} table {{ border-collapse: collapse; width: 100%; font-size: 14px; }}
td {{ padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }}
.comp iframe {{ width: 100%; border: 0; border-radius: var(--radius-lg); background: var(--bg); outline: 1px solid var(--line); }}
.guide {{ font-size: 14px; line-height: 21px; max-width: 70ch; }} .guide p {{ margin: 8px 0; }}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <nav class="toc" aria-label="Secciones"><a href="#marca">Marca</a><a href="#color">Color</a><a href="#tipo">Tipografía</a><a href="#medidas">Medidas</a><a href="#componentes">Componentes</a></nav>
    <button class="theme" type="button" id="themeBtn">Tema oscuro</button>
  </header>
  <iframe class="cover" title="Portada Sorbo" srcdoc="{esc(cover_doc, quote=True)}"></iframe>
  <section id="marca"><h2>Guía de marca</h2><div class="readme">{md((BASE / 'README.md').read_text())}</div></section>
  <section id="color"><h2>Color</h2><p style="color:var(--ink-soft);margin:0 0 12px">Cada muestra: claro a la izquierda, oscuro a la derecha.</p><div class="grid">{swatches()}</div></section>
  <section id="tipo"><h2>Tipografía</h2>{typescale()}</section>
  <section id="medidas"><h2>Medidas</h2>{measures()}</section>
  <section id="componentes"><h2>Componentes</h2>{components()}</section>
</div>
<script>
(function () {{
  var dark = false, btn = document.getElementById('themeBtn');
  function apply() {{
    var th = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', th);
    document.querySelectorAll('iframe').forEach(function (f) {{
      try {{ f.contentDocument.documentElement.setAttribute('data-theme', th); }} catch (e) {{}}
    }});
    btn.textContent = dark ? 'Tema claro' : 'Tema oscuro';
  }}
  btn.addEventListener('click', function () {{ dark = !dark; apply(); }});
  document.querySelectorAll('iframe').forEach(function (f) {{ f.addEventListener('load', apply); }});
  apply();
}})();
</script>
</body>
</html>
"""
(BASE / 'Sorbo Design System v2.html').write_text(page)
print('design/v2: tokens.css, figma-variables.json y la página regenerados')
