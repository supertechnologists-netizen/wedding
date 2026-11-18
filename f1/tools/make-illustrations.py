#!/usr/bin/env python3
"""Generates the placeholder illustrations in f1/public/img/ (flat vector SVG, no external assets).
They are only stand-ins until the couple uploads real photos in the admin panel.
Usage: python3 f1/tools/make-illustrations.py"""
import os, math, random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img')
os.makedirs(OUT, exist_ok=True)

INK = '#2b1d18'
SKIN_B, SKIN_G = '#f7d4be', '#ecbf9f'
HAIR_B, HAIR_G = '#7a4a2e', '#3a2a22'
RED, PAPAYA, BLUE, TEAL, PINK, SKY, GREEN, GOLD = '#E8002D', '#FF8000', '#3671C6', '#27F4D2', '#FF87BC', '#64C4FF', '#229971', '#ffd166'


def heart(cx, cy, s, fill, op=1, rot=0):
    return (f'<path transform="translate({cx} {cy}) rotate({rot}) scale({s / 24})" opacity="{op}" fill="{fill}" '
            'd="M0 9.6S-8.4 4.5-10.2-1C-11.4-4.8-9-8.3-5.4-8.3c2.2 0 3.9 1.2 5.4 3.2 1.5-2 3.2-3.2 5.4-3.2 3.6 0 6 3.5 4.8 7.3C8.4 4.5 0 9.6 0 9.6Z"/>')


# ---------------------------------------------------------------- people
def face(eyes='open', mouth='smile', lashes=False):
    o = []
    if eyes == 'open':
        for sx in (-1, 1):
            o.append(f'<ellipse cx="{16 * sx}" cy="4" rx="4.6" ry="6.2" fill="{INK}"/><circle cx="{16 * sx + 1.6}" cy="1.4" r="1.7" fill="#fff"/>')
            o.append(f'<path d="M{16 * sx - 6} -9 Q{16 * sx} -13 {16 * sx + 6} -9" stroke="{INK}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>')
            if lashes:
                o.append(f'<path d="M{16 * sx + 5 * sx} 0 l{4 * sx} -3" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>')
    else:  # closed happy eyes ^ ^
        for sx in (-1, 1):
            o.append(f'<path d="M{16 * sx - 7} 6 Q{16 * sx} -3 {16 * sx + 7} 6" stroke="{INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>')
            if lashes:
                o.append(f'<path d="M{16 * sx + 7 * sx} 5 l{4 * sx} -1" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>')
    o.append('<ellipse cx="-27" cy="17" rx="8" ry="5" fill="#ff7f98" opacity=".5"/><ellipse cx="27" cy="17" rx="8" ry="5" fill="#ff7f98" opacity=".5"/>')
    o.append(f'<path d="M-1.5 9 Q1 13 -1 15" stroke="#c98f74" stroke-width="2" fill="none" stroke-linecap="round"/>')
    if mouth == 'open':
        o.append('<path d="M-10 21 Q0 35 10 21 Z" fill="#a8323f"/><path d="M-6 27 Q0 31 6 27 Q0 33 -6 27Z" fill="#ff8fa0"/>')
    elif mouth == 'o':
        o.append('<ellipse cx="0" cy="25" rx="5" ry="6.5" fill="#a8323f"/>')
    else:
        o.append(f'<path d="M-9 21 Q0 29 9 21" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    return ''.join(o)


def hair_back(kind, style):
    if kind == 'bride':
        if style == 'bun':
            return f'<circle cx="0" cy="-46" r="20" fill="{HAIR_B}"/>'
        return f'<path d="M-50 -4C-56 -58 56 -58 50 -4L56 84C40 100-40 100-56 84Z" fill="{HAIR_B}"/>'
    return ''


def hair_front(kind, style):
    if kind == 'bride':
        return (f'<path d="M-47 2C-52 -50 36 -66 48 -8C38 -30 14 -40-8 -30C-22 -24-36 -14-47 2Z" fill="{HAIR_B}"/>'
                f'<path d="M-10 -36C-2 -30 4 -24 6 -16" stroke="#9a6440" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>')
    return (f'<path d="M-45 -2C-52 -46-16 -66 18 -58C44 -52 52 -30 46 -4C42 -22 34 -30 16 -32C-2 -28-14 -38-24 -30C-34 -24-40 -14-45 -2Z" fill="{HAIR_G}"/>'
            f'<path d="M-4 -52C10 -50 22 -46 30 -38" stroke="#5a4236" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>')


def torso(outfit, kind):
    skin = SKIN_B if kind == 'bride' else SKIN_G
    o = [f'<rect x="-12" y="30" width="24" height="34" rx="8" fill="{skin}"/>']
    body = 'M-72 330L-70 170C-72 104-58 70-22 62L22 62C58 70 72 104 70 170L72 330Z'
    if outfit == 'gown':
        o.append(f'<path d="{body}" fill="{skin}"/>')
        o.append('<path d="M-64 330L-54 96Q-28 84 0 100Q28 84 54 96L64 330Z" fill="#fffdf9"/>')
        o.append('<path d="M-54 96Q-28 84 0 100Q28 84 54 96" stroke="#eadfd2" stroke-width="3" fill="none"/>')
        o.append('<path d="M-40 130Q0 118 40 130" stroke="#f0e6da" stroke-width="2.5" fill="none"/>')
        o.append('<circle cx="0" cy="74" r="3" fill="#fff" stroke="#e5d6c6"/>')
    elif outfit == 'suit':
        o.append(f'<path d="{body}" fill="#1f1f27"/>')
        o.append('<path d="M-20 62L0 118L20 62Z" fill="#fff"/>')
        o.append('<path d="M-22 62L-6 120L-30 92Z M22 62L6 120L30 92Z" fill="#2c2c37"/>')
        o.append('<path d="M-13 66L0 72L-13 78Z M13 66L0 72L13 78Z" fill="#141418"/><circle cx="0" cy="72" r="3" fill="#141418"/>')
        o.append(f'<circle cx="38" cy="96" r="7" fill="{RED}"/><circle cx="38" cy="96" r="3" fill="#ff8aa0"/><path d="M34 103l-6 6" stroke="{GREEN}" stroke-width="3" stroke-linecap="round"/>')
    elif outfit.startswith('race'):
        c1, c2 = {'race_white': ('#fbfbfd', RED), 'race_red': (RED, '#fff'), 'race_papaya': (PAPAYA, '#1f2a44'), 'race_blue': (BLUE, '#ffd166')}[outfit]
        o.append(f'<path d="{body}" fill="{c1}"/>')
        o.append(f'<path d="M-72 330L-70 170C-71 120-64 96-50 80L-38 86C-48 104-52 130-52 330Z M72 330L70 170C71 120 64 96 50 80L38 86C48 104 52 130 52 330Z" fill="{c2}"/>')
        o.append(f'<path d="M-16 58H16V70Q0 78-16 70Z" fill="{c2}"/>')
        o.append(f'<path d="M0 74V330" stroke="{c2}" stroke-width="2.5" opacity=".6"/>')
        o.append(f'<rect x="14" y="98" width="22" height="11" rx="2.5" fill="{c2}" opacity=".9"/><rect x="-36" y="98" width="18" height="8" rx="2" fill="{c2}" opacity=".55"/>')
        o.append(heart(-27, 125, 13, c2, .9))
    elif outfit == 'dress_pink':
        o.append(f'<path d="{body}" fill="{skin}"/>')
        o.append(f'<path d="M-66 330L-56 92Q-30 84-16 92L0 104L16 92Q30 84 56 92L66 330Z" fill="{PINK}"/>')
        o.append('<path d="M-46 74L-40 96M46 74L40 96" stroke="#ff6aa8" stroke-width="5" stroke-linecap="round"/>')
        for x, y in ((-30, 130), (10, 120), (36, 146), (-6, 154)):
            o.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#fff" opacity=".8"/>')
    elif outfit == 'shirt_blue':
        o.append(f'<path d="{body}" fill="{SKY}"/>')
        o.append('<path d="M-20 62L0 84L20 62L12 58H-12Z" fill="#e8f5ff"/><path d="M0 84V330" stroke="#3f9fd8" stroke-width="2"/>')
        o.append('<circle cx="0" cy="104" r="2.5" fill="#fff"/><circle cx="0" cy="128" r="2.5" fill="#fff"/><circle cx="0" cy="152" r="2.5" fill="#fff"/>')
    return ''.join(o)


def person(x, y, s, kind, outfit, tilt=0, eyes='open', mouth='smile', style='long', veil=False, crown=False):
    skin = SKIN_B if kind == 'bride' else SKIN_G
    o = [f'<g transform="translate({x} {y}) scale({s})">']
    if veil:
        o.append('<path d="M-26 -52C-96 -20-104 80-112 330L112 330C104 80 96 -20 26 -52Z" fill="#fff" opacity=".55"/>')
    o.append(f'<g transform="rotate({tilt} 0 60)">{hair_back(kind, style)}</g>')
    o.append(torso(outfit, kind))
    o.append(f'<g transform="rotate({tilt} 0 60)">')
    o.append(f'<circle cx="-44" cy="6" r="9" fill="{skin}"/><circle cx="44" cy="6" r="9" fill="{skin}"/>')
    o.append(f'<ellipse cx="0" cy="0" rx="45" ry="47" fill="{skin}"/>')
    o.append(face(eyes, mouth, lashes=(kind == 'bride')))
    o.append(hair_front(kind, style))
    if kind == 'bride' and style == 'long':
        o.append('<circle cx="-46" cy="22" r="3" fill="#fff" stroke="#e7d7c2"/><circle cx="46" cy="22" r="3" fill="#fff" stroke="#e7d7c2"/>')
    if crown:
        for i, a in enumerate(range(-150, -20, 22)):
            r = math.radians(a); cx, cy = 50 * math.cos(r), 48 * math.sin(r) + 2
            col = ['#fff', '#ffc2d4', '#fff', '#ffd9a8'][i % 4]
            o.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="7.5" fill="{col}" stroke="#f1c9d6" stroke-width="1.2"/><circle cx="{cx:.1f}" cy="{cy:.1f}" r="2.4" fill="{GOLD}"/>')
        o.append(f'<path d="M-34 -36 q-4 -6 2 -9 M34 -36 q4 -6 -2 -9" stroke="{GREEN}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    o.append('</g></g>')
    return ''.join(o)


def bouquet(x, y, s=1):
    o = [f'<g transform="translate({x} {y}) scale({s})">',
         f'<path d="M-10 10L-4 60H4L10 10Z" fill="{GREEN}"/><path d="M-12 46Q0 54 12 46L10 56Q0 62-10 56Z" fill="#fff"/>',
         '<ellipse cx="-22" cy="4" rx="12" ry="6" fill="#4cb07a" transform="rotate(-30 -22 4)"/><ellipse cx="22" cy="4" rx="12" ry="6" fill="#4cb07a" transform="rotate(30 22 4)"/>']
    for cx, cy, c in ((-14, -8, '#fff'), (14, -8, PINK), (0, -20, RED), (-20, -24, '#ffd1dc'), (20, -24, '#fff'), (0, 0, '#ffd1dc'), (-6, -34, PINK), (10, -36, '#fff')):
        o.append(f'<circle cx="{cx}" cy="{cy}" r="11" fill="{c}" stroke="#f2b9c9" stroke-width="1.2"/><circle cx="{cx}" cy="{cy}" r="3.5" fill="{GOLD}" opacity=".8"/>')
    o.append('</g>')
    return ''.join(o)


def helmet(x, y, s, c1, c2):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M-40 20C-44 -20-20 -42 6 -42C32 -42 46 -22 44 4L44 22Z" fill="{c1}"/>'
            f'<path d="M-6 -14H40C42 -6 42 2 40 8H-4Q-12 -2-6 -14Z" fill="#1a1d2b"/><path d="M0 -10H30" stroke="#5a6a9a" stroke-width="3" stroke-linecap="round"/>'
            f'<path d="M-40 12H44V22H-40Z" fill="{c2}"/>{heart(-20, -14, 16, c2)}</g>')


# ---------------------------------------------------------------- backgrounds
def sky(w, h, top, bottom, gid):
    return f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#{gid})"/>'


def mountains(w, base, scale=1.0):
    o = []
    layers = [(base - 330 * scale, '#c9d6ea', [(0, 260), (180, 60), (330, 210), (520, 20), (700, 230), (880, 70), (1050, 200), (1200, 90)]),
              (base - 200 * scale, '#a9bad6', [(0, 200), (150, 70), (320, 220), (470, 40), (640, 240), (820, 90), (1000, 230), (1200, 60)]),
              (base - 80 * scale, '#8ea2c4', [(0, 160), (220, 40), (420, 190), (600, 60), (800, 200), (980, 50), (1200, 170)])]
    for top, col, pts in layers:
        sx = w / 1200
        d = f'M0 {base}' + ''.join(f'L{x * sx:.0f} {top + y * scale:.0f}' for x, y in pts) + f'L{w} {base}Z'
        o.append(f'<path d="{d}" fill="{col}"/>')
        # snow caps
        for i in range(1, len(pts) - 1):
            x, y = pts[i]
            if pts[i - 1][1] > y and pts[i + 1][1] > y:
                px, py = x * sx, top + y * scale
                lx = (pts[i - 1][0] * sx - px) * .28; ly = (pts[i - 1][1] - y) * scale * .28
                rx = (pts[i + 1][0] * sx - px) * .28; ry = (pts[i + 1][1] - y) * scale * .28
                o.append(f'<path d="M{px:.0f} {py:.0f}L{px + lx:.0f} {py + ly:.0f}L{px + lx * .55:.0f} {py + ly * .8:.0f}L{px + lx * .2:.0f} {py + ly:.0f}L{px + rx * .35:.0f} {py + ry * .8:.0f}L{px + rx * .7:.0f} {py + ry:.0f}L{px + rx:.0f} {py + ry:.0f}Z" fill="#fff"/>')
    return ''.join(o)


def bunting(w, y, n=11, amp=40):
    cols = [RED, PAPAYA, PINK, SKY, TEAL, BLUE, GREEN, GOLD]
    o = [f'<path d="M0 {y} Q{w / 2} {y + amp * 2} {w} {y}" stroke="#6b5b55" stroke-width="2.5" fill="none"/>']
    for i in range(n):
        t = (i + .5) / n; x = w * t; yy = y + 2 * (1 - t) * t * amp * 2
        o.append(f'<path d="M{x - 18:.0f} {yy:.0f}L{x + 18:.0f} {yy:.0f}L{x:.0f} {yy + 38:.0f}Z" fill="{cols[i % len(cols)]}"/>')
    return ''.join(o)


def confetti(w, h, n, seed, cols=(RED, PAPAYA, PINK, SKY, TEAL, BLUE, GOLD, '#fff')):
    random.seed(seed); o = []
    for _ in range(n):
        x, y = random.uniform(0, w), random.uniform(0, h); c = random.choice(cols)
        if random.random() < .35: o.append(heart(round(x), round(y), random.randint(12, 22), c, .9, random.randint(-25, 25)))
        else: o.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="12" height="6" rx="2" fill="{c}" transform="rotate({random.randint(0, 180)} {x:.0f} {y:.0f})"/>')
    return ''.join(o)


def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'


def save(name, content):
    with open(os.path.join(OUT, name), 'w') as f: f.write(content)
    print(name, len(content))


# ---------------------------------------------------------------- scenes
def hero():
    W, H = 1200, 1100
    b = [sky(W, H, '#b4d3f3', '#ffe1ea', 'hs'), '<circle cx="960" cy="300" r="64" fill="#fff4d6"/><circle cx="960" cy="300" r="105" fill="#fff4d6" opacity=".35"/>',
         mountains(W, 860, 1.55), '<path d="M0 790Q600 730 1200 800V1100H0Z" fill="#eef3fa"/>', '<path d="M0 860Q600 810 1200 870V1100H0Z" fill="#fff"/>',
         bunting(W, 170, 13, 45)]
    for x, y, s, c in ((250, 380, 44, RED), (320, 320, 28, PINK), (930, 420, 38, PINK), (870, 360, 24, RED), (600, 300, 34, '#ff3d6e')):
        b.append(heart(x, y, s, c, .9))
    b.append(person(468, 600, 2.45, 'bride', 'race_white', tilt=13, eyes='closed', mouth='open', style='long', veil=True))
    b.append(person(738, 592, 2.55, 'groom', 'race_red', tilt=-13, eyes='closed', mouth='open'))
    b.append(bouquet(470, 935, 2.1))
    b.append(confetti(W, 760, 26, 7))
    return svg(W, H, ''.join(b), 'Аня та Андрій у гоночних комбінезонах на тлі гір')


def portrait(kind):
    W, H = 600, 800
    if kind == 'bride':
        b = [sky(W, H, '#ffe0ea', '#ffc2d6', 'bp'), '<circle cx="300" cy="330" r="230" fill="#fff" opacity=".35"/>', confetti(W, H, 18, 3, (PINK, '#fff', RED, GOLD)),
             person(300, 380, 2.6, 'bride', 'gown', tilt=6, eyes='open', mouth='open', style='bun', veil=True, crown=True), bouquet(300, 720, 1.7)]
        return svg(W, H, ''.join(b), 'Наречена')
    b = [sky(W, H, '#d8ecff', '#b9d9ff', 'gp'), '<circle cx="300" cy="330" r="230" fill="#fff" opacity=".35"/>', confetti(W, H, 18, 4, (SKY, '#fff', BLUE, GOLD)),
         person(300, 380, 2.6, 'groom', 'suit', tilt=-5, eyes='open', mouth='smile')]
    return svg(W, H, ''.join(b), 'Наречений')


def face_icon(kind):
    bg = '#ffd6e3' if kind == 'bride' else '#cfe6ff'
    b = f'<circle cx="100" cy="100" r="100" fill="{bg}"/><g transform="translate(100 112) scale(1.45) translate(0 0)">'
    skin = SKIN_B if kind == 'bride' else SKIN_G
    b += hair_back(kind, 'bun' if kind == 'bride' else '')
    b += f'<circle cx="-44" cy="6" r="9" fill="{skin}"/><circle cx="44" cy="6" r="9" fill="{skin}"/><ellipse cx="0" cy="0" rx="45" ry="47" fill="{skin}"/>'
    b += face('closed', 'open', lashes=(kind == 'bride')) + hair_front(kind, 'bun')
    if kind == 'bride':
        b += '<path d="M-30 -40C-46 -26-52 -4-50 20" stroke="#fff" stroke-width="8" fill="none" opacity=".7" stroke-linecap="round"/>'
    b += '</g>'
    return svg(200, 200, b, 'Наречена' if kind == 'bride' else 'Наречений')


def gallery():
    W, H = 600, 800
    out = {}
    # 1 Pole position — starting grid
    b = [sky(W, H, '#d5dbe5', '#9aa3b2', 'g1'), '<path d="M0 520H600V800H0Z" fill="#5b6270"/>']
    for x in (60, 330):
        b.append(f'<path d="M{x} 560H{x + 200}M{x} 560V620" stroke="#fff" stroke-width="8"/>')
    b.append('<path d="M0 470H600V500H0Z" fill="url(#ck)"/><defs><pattern id="ck" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#fff"/><rect width="15" height="15" fill="#141414"/><rect x="15" y="15" width="15" height="15" fill="#141414"/></pattern></defs>')
    b.append(bunting(W, 70, 9, 30))
    b.append(person(200, 330, 1.55, 'bride', 'race_white', tilt=8, eyes='open', mouth='open'))
    b.append(person(410, 325, 1.6, 'groom', 'race_papaya', tilt=-8, eyes='open', mouth='smile'))
    b.append('<path d="M0 640H600V800H0Z" fill="#f4f4f6"/>' + ''.join(f'<rect x="{x}" y="640" width="50" height="22" fill="{RED if x // 50 % 2 else "#fff"}"/>' for x in range(0, 600, 50)))
    b.append('<text x="300" y="760" text-anchor="middle" font-family="Montserrat,Arial" font-weight="900" font-size="84" fill="#141414">P1</text>')
    out['g1-pole.svg'] = svg(W, H, ''.join(b), 'Pole position')
    # 2 First lap — coffee date
    b = [sky(W, H, '#fff1df', '#ffd9b8', 'g2'), '<rect x="60" y="80" width="200" height="150" rx="16" fill="#fff" opacity=".6"/><rect x="340" y="80" width="200" height="150" rx="16" fill="#fff" opacity=".6"/>',
         person(190, 340, 1.5, 'bride', 'dress_pink', tilt=10, eyes='open', mouth='open'), person(410, 335, 1.55, 'groom', 'shirt_blue', tilt=-10, eyes='open', mouth='smile'),
         '<path d="M0 600H600V800H0Z" fill="#b9845a"/><path d="M0 600H600V620H0Z" fill="#a06f48"/>']
    for x in (215, 385):
        b.append(f'<path d="M{x - 45} 520H{x + 45}L{x + 36} 600H{x - 36}Z" fill="#fff"/><path d="M{x + 44} 540q30 4 22 28t-30 14" stroke="#fff" stroke-width="10" fill="none"/><ellipse cx="{x}" cy="520" rx="45" ry="10" fill="#7a4a2e"/>')
        b.append(f'<path d="M{x - 10} 500q-14 -24 0 -44t0 -44" stroke="#fff" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>')
    b.append(heart(300, 440, 54, RED))
    out['g2-coffee.svg'] = svg(W, H, ''.join(b), 'Перше коло')
    # 3 Pit stop — seaside with ice cream
    b = [sky(W, H, '#bfe7ff', '#e9f8ff', 'g3'), '<circle cx="470" cy="140" r="56" fill="#ffe08a"/>', '<path d="M0 430Q150 410 300 430T600 430V800H0Z" fill="#4fb3e8"/>',
         '<path d="M0 470Q150 450 300 470T600 470" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>', '<path d="M0 640Q300 600 600 640V800H0Z" fill="#ffe2b0"/>',
         person(200, 360, 1.5, 'bride', 'dress_pink', tilt=8, eyes='closed', mouth='open'), person(410, 355, 1.55, 'groom', 'shirt_blue', tilt=-8, eyes='closed', mouth='open')]
    for x, c in ((120, '#ffb3c6'), (500, '#b8f0e6')):
        b.append(f'<path d="M{x - 26} 600L{x} 700L{x + 26} 600Z" fill="#e7a86b"/><circle cx="{x}" cy="590" r="30" fill="{c}"/><circle cx="{x - 12}" cy="572" r="20" fill="{c}"/><circle cx="{x + 8}" cy="566" r="5" fill="{RED}"/>')
    out['g3-pitstop.svg'] = svg(W, H, ''.join(b), 'Піт-стоп')
    # 4 Twist of fate — proposal at night
    b = [sky(W, H, '#25305f', '#5b4b8a', 'g4'), confetti(W, 380, 30, 11, ('#fff', '#ffe9a8')),
         '<path d="M0 560V420h70v-60h60v90h50v-120h80v150h40v-80h70v110h60v-60h70v80h100v120Z" fill="#1b2147"/>']
    for i in range(18):
        random.seed(40 + i); b.append(f'<rect x="{random.randint(10, 580)}" y="{random.randint(430, 540)}" width="8" height="10" fill="#ffd166" opacity=".8"/>')
    b += [person(190, 350, 1.5, 'bride', 'dress_pink', tilt=6, eyes='open', mouth='o'), person(410, 345, 1.55, 'groom', 'suit', tilt=-6, eyes='open', mouth='smile'),
          '<path d="M210 640H390V760H210Z" fill="#c4002a"/><path d="M200 600H400L390 640H210Z" fill="#e8002d"/><path d="M230 650H370V700H230Z" fill="#fff"/>',
          '<circle cx="300" cy="640" r="32" fill="none" stroke="#ffd166" stroke-width="10"/><path d="M286 606L300 584L314 606L300 618Z" fill="#dff6ff" stroke="#9bd9f2" stroke-width="2"/>',
          heart(160, 220, 30, PINK), heart(450, 200, 24, PINK), '<path d="M300 520l6 18 18 6-18 6-6 18-6-18-18-6 18-6Z" fill="#fff"/>']
    out['g4-proposal.svg'] = svg(W, H, ''.join(b), 'Поворот долі')
    # 5 Finish together — wedding under a floral arch
    b = [sky(W, H, '#fff6f1', '#ffe1ea', 'g5'), '<path d="M70 800V300A230 230 0 0 1 530 300V800" fill="none" stroke="#7fc49a" stroke-width="26"/>']
    for a in range(180, 361, 14):
        r = math.radians(a); x, y = 300 + 230 * math.cos(r), 300 + 230 * math.sin(r)
        b.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="20" fill="{[PINK, "#fff", RED, "#ffd1dc"][a // 14 % 4]}"/>')
    for y in range(320, 800, 60):
        for x in (70, 530): b.append(f'<circle cx="{x}" cy="{y}" r="16" fill="{[PINK, "#fff", "#ffd1dc"][y // 60 % 3]}"/>')
    b += [person(220, 400, 1.55, 'bride', 'gown', tilt=10, eyes='closed', mouth='open', style='bun', veil=True, crown=True),
          person(390, 395, 1.6, 'groom', 'suit', tilt=-10, eyes='closed', mouth='open'), bouquet(200, 650, 1.2), confetti(W, 500, 26, 21), heart(305, 170, 44, RED)]
    out['g5-wedding.svg'] = svg(W, H, ''.join(b), 'Спільний фініш')
    # 6 Podium — champagne and trophy
    b = [sky(W, H, '#1d2550', '#3a4b8f', 'g6'), confetti(W, H, 40, 31, (GOLD, '#fff', RED, PAPAYA, PINK)),
         person(200, 340, 1.5, 'bride', 'race_white', tilt=8, eyes='closed', mouth='open'), person(410, 335, 1.55, 'groom', 'race_blue', tilt=-8, eyes='closed', mouth='open'),
         '<path d="M90 600H510V800H90Z" fill="#f4f4f6"/><path d="M90 600H510V624H90Z" fill="#d9dbe3"/>',
         '<text x="300" y="730" text-anchor="middle" font-family="Montserrat,Arial" font-weight="900" font-size="120" fill="#E8002D">1</text>',
         '<path d="M470 470h56v20c0 30-14 46-28 50v26h20v14h-56v-14h20v-26c-14-4-28-20-28-50Z" fill="#ffd166"/><path d="M470 478h-16c0 20 8 30 18 32M526 478h16c0 20-8 30-18 32" stroke="#ffd166" stroke-width="6" fill="none"/>',
         '<path d="M80 600L100 470H124L136 600Z" fill="#1f7a46"/><rect x="100" y="440" width="22" height="34" fill="#ffd166"/>',
         '<path d="M112 440q-10 -60 -40 -90M112 440q4 -70 30 -110M112 440q-30 -40 -70 -50" stroke="#fff4c2" stroke-width="5" fill="none" stroke-dasharray="2 10" stroke-linecap="round"/>']
    out['g6-podium.svg'] = svg(W, H, ''.join(b), 'Подіум')
    return out


def gifts():
    S = 400
    out = {}
    out['gift-travel.svg'] = svg(S, S, sky(S, S, '#cfe9ff', '#9fd2ff', 'a') + '<circle cx="300" cy="110" r="40" fill="#fff3c4"/><ellipse cx="110" cy="300" rx="70" ry="22" fill="#fff"/><ellipse cx="300" cy="320" rx="54" ry="16" fill="#fff"/>'
                                 '<g transform="translate(200 190) rotate(-20)"><path d="M-110 0Q-110 -16-90 -16H90Q118 -16 120 0Q118 16 90 16H-90Q-110 16-110 0Z" fill="#fff"/><path d="M-20 -14L-60 -80H-36L30 -14ZM-20 14L-60 80H-36L30 14ZM-90 -14L-110 -46H-94L-66 -14Z" fill="' + BLUE + '"/>'
                                 '<circle cx="60" cy="-2" r="5" fill="' + SKY + '"/><circle cx="40" cy="-2" r="5" fill="' + SKY + '"/><circle cx="20" cy="-2" r="5" fill="' + SKY + '"/>' + heart(-70, 0, 20, RED) + '</g>', 'Подорож')
    out['gift-dinner.svg'] = svg(S, S, sky(S, S, '#ffe2ea', '#ffc6d6', 'b') + '<ellipse cx="200" cy="300" rx="150" ry="40" fill="#fff"/><ellipse cx="200" cy="296" rx="90" ry="22" fill="#f4eee8"/>'
                                 '<path d="M120 140V250M280 140V250" stroke="#fff" stroke-width="16" stroke-linecap="round"/><path d="M120 130q-8 -18 0 -30q8 12 0 30ZM280 130q-8 -18 0 -30q8 12 0 30Z" fill="#ffb347"/>'
                                 + heart(200, 210, 70, RED) + '<path d="M60 230V330M48 230V262Q60 272 72 262V230M340 230V330M340 230q22 10 0 50" stroke="#c9ccd6" stroke-width="6" fill="none" stroke-linecap="round"/>', 'Вечеря удвох')
    out['gift-experience.svg'] = svg(S, S, sky(S, S, '#ffe4c9', '#ffc38f', 'c') + '<ellipse cx="90" cy="110" rx="40" ry="14" fill="#fff" opacity=".8"/><ellipse cx="320" cy="300" rx="50" ry="16" fill="#fff" opacity=".8"/>'
                                     '<path d="M200 50C120 50 90 120 110 180C124 220 170 250 186 270H214C230 250 276 220 290 180C310 120 280 50 200 50Z" fill="' + PAPAYA + '"/>'
                                     '<path d="M200 50C170 50 156 120 164 180C170 220 184 250 190 270H210C216 250 230 220 236 180C244 120 230 50 200 50Z" fill="#fff"/>'
                                     '<path d="M186 270L180 300H220L214 270" stroke="#7a4a2e" stroke-width="4" fill="none"/><rect x="176" y="298" width="48" height="36" rx="6" fill="#9a6440"/>' + heart(200, 150, 40, RED), 'Враження')
    out['gift-dream.svg'] = svg(S, S, sky(S, S, '#d9f7ea', '#a8e9cf', 'd') + '<path d="M70 330H330" stroke="#5fbf8f" stroke-width="10" stroke-linecap="round"/>'
                                '<path d="M110 330V200L200 120L290 200V330Z" fill="#fff"/><path d="M90 210L200 110L310 210" stroke="' + GREEN + '" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
                                '<rect x="176" y="250" width="48" height="80" rx="6" fill="' + GREEN + '"/><rect x="128" y="220" width="36" height="36" rx="4" fill="' + SKY + '"/><rect x="236" y="220" width="36" height="36" rx="4" fill="' + SKY + '"/>'
                                + heart(200, 190, 34, RED) + '<circle cx="320" cy="90" r="30" fill="#ffd166"/><text x="320" y="101" text-anchor="middle" font-family="Montserrat,Arial" font-weight="900" font-size="32" fill="#b98500">₴</text>', 'Внесок у мрію')
    return out


if __name__ == '__main__':
    save('hero.svg', hero())
    save('bride.svg', portrait('bride'))
    save('groom.svg', portrait('groom'))
    save('face-bride.svg', face_icon('bride'))
    save('face-groom.svg', face_icon('groom'))
    for k, v in {**gallery(), **gifts()}.items(): save(k, v)
