"""Splits the reference identity stylesheet into one partial per BEM block.
Usage: python3 tools/split-styles.py <reference src/styles dir>
A rule belongs to the block named first in its selector; rules inside @container or
@media are split the same way and re-wrapped. Everything else is base."""
import os, re, sys
src = sys.argv[1]
css = ''.join(open(os.path.join(src, f), encoding='utf8').read() + '\n' for f in ('base.css', 'immersive.css'))
css = re.sub(r'/\*.*?\*/', lambda m: m.group(0) if '\n' not in m.group(0) else m.group(0), css, flags=re.S)
STATE = {'scv', 'is', 'has', 'no'}
RENAME = {'w': 'statement', 'char': 'hero', 'ink': 'ch', 'ico': 'pill', 'num': 'steps', 'tag': 'bases', 'tags': 'bases', 'err': 'base', 'dl': 'menu', 'ask': 'menu',
          'tiles': 'tile', 'chips': 'chip', 'badges': 'badge', 'rows': 'row', 'langs': 'lang', 'meters': 'meter', 'stats': 'stat', 'facts': 'fact', 'cards': 'card',
          'rolelist': 'rolerow', 'skilllist': 'skill', 'skillgroup': 'skill', 'viewbar': 'skill', 'links': 'pill', 'textbtn': 'pill', 'iconbtn': 'pill', 'link': 'pill',
          'blocks': 'block', 'bullets': 'block', 'fig': 'block', 'gallery': 'block', 'cols': 'ch', 'sub': 'ch', 'meta': 'ch', 'hint': 'ch', 'prose': 'ch', 'moon': 'launch', 'egg': 'launch',
          'brick': 'pile', 'mono': 'pic', 'dither': 'pic', 'sigil': 'nav', 'skip': 'nav', 'motionbtn': 'nav', 'seg': 'nav', 'foot': 'foot', 'more': 'stop', 'track': 'stop', 'deep': 'rolerow', 'split': 'stop', 'case': 'card', 'steps': 'card', 'statement': 'summary', 'fact': 'summary', 'quote': 'summary', 'biglist': 'row', 'lang': 'skill', 'meter': 'skill'}
def bucket(selector):
    for cls in re.findall(r'\.([a-z][a-z0-9]*)', selector.split(',')[0]):
        if cls in STATE: continue
        seen = set()
        while cls in RENAME and cls not in seen: seen.add(cls); cls = RENAME[cls]
        return cls
    return 'base'
def blocks(text):
    """Yield (prelude, body, raw) for each top-level rule; comments are attached to the next rule."""
    i, n, start = 0, len(text), 0
    while i < n:
        if text.startswith('/*', i): i = text.index('*/', i) + 2; continue
        if text[i] == '{':
            depth, j = 1, i + 1
            while depth: depth += {'{': 1, '}': -1}.get(text[j], 0); j += 1
            yield text[start:i].strip(), text[i + 1:j - 1], text[start:j].strip()
            start = i = j; continue
        if text[i] == ';' and text[start:i].strip().startswith('@'): start = i + 1
        i += 1
out = {}
def add(b, rule): out.setdefault(b, []).append(rule)
for prelude, body, raw in blocks(css):
    head = prelude.split('*/')[-1].strip()
    if head.startswith(('@container', '@media')) and 'print' not in head and 'reduced-motion' not in head:
        inner = {}
        for p2, b2, r2 in blocks(body): inner.setdefault(bucket(p2.split('*/')[-1]), []).append(r2)
        for b, rules in inner.items(): add(b, head + ' {\n  ' + '\n  '.join(rules) + '\n}')
    elif head.startswith('@'): add('base', raw)
    else: add(bucket(head), raw)
os.makedirs('src/styles/blocks', exist_ok=True)
for f in os.listdir('src/styles/blocks'): os.remove(os.path.join('src/styles/blocks', f))
# Partials load in the order their blocks first appear in the reference, so the cascade is unchanged.
names = ['base'] + [b for b in out if b != 'base']
for b in names:
    open(f'src/styles/blocks/_{b}.scss', 'w', encoding='utf8').write(f'// Sigil identity: {b}. Generated from the reference stylesheet by tools/split-styles.py.\n' + '\n'.join(out[b]) + '\n')
print(len(names), 'partials:', ' '.join(f'{b}({len(out[b])})' for b in names))
open('src/styles/_index.scss', 'w').write('// The identity stylesheet, one partial per block.\n' + ''.join(f"@use 'blocks/{b}';\n" for b in names))
