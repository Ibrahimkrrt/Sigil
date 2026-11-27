import { Injectable, inject } from '@angular/core';
import { DomBuilder } from './dom-builder';
import { Translator } from '../i18n/translator';

/**
 * The moon film: a ten-second WebGL sequence in the page's two colours, played when a
 * skill is thrown hard enough.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class MoonFilm {
  private readonly dom = inject(DomBuilder);
  private readonly h = (tag: string, attrs?: any, ...kids: any[]): any => this.dom.h(tag, attrs, ...kids);
  private readonly translator = inject(Translator);
  private readonly t = (source: string, vars?: Record<string, string | number>): string => this.translator.t(source, vars);

  private T1: any = 3.2;

  private T2: any = 5.3;

  private T3: any = 6.1;

  private END: any = 10.2;

  // seconds: cut to descent, impact, plume thins, end
  private VERT: any = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

  private FRAG: any = `
  precision highp float;
  uniform vec2 uRes; uniform float uT; uniform float uSeed; uniform vec3 uA; uniform vec3 uB;
  const float T1 = ${this.T1.toFixed(2)}; const float T2 = ${this.T2.toFixed(2)}; const float T3 = ${this.T3.toFixed(2)};
  const vec2 CRATER = vec2(0.0, -0.27);

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  #define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
  #define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))

  float stars(vec2 uv, float density) {
    vec2 g = floor(uv * density), f = fract(uv * density) - 0.5;
    float hh = hash(g + uSeed);
    vec2 o = vec2(hash(g + 1.7), hash(g + 9.2)) - 0.5;
    return step(0.94, hh) * smoothstep(0.11, 0.0, length(f - o * 0.7)) * (0.6 + 0.4 * sin(uT * 3.0 + hh * 40.0));
  }
  // Stars pulled into streaks along the direction of travel.
  float streaks(vec2 uv, float amount) {
    float a = atan(uv.y, uv.x), r = length(uv);
    float cell = floor(a * 46.0);
    float hh = hash(vec2(cell, uSeed));
    float pos = fract(hh * 7.0 + uT * (0.5 + hh) * amount);
    float len = 0.05 + 0.3 * amount * hh;
    return step(0.7, hh) * smoothstep(0.0, 0.02, r - pos * 1.3) * smoothstep(len, 0.0, r - pos * 1.3) * smoothstep(0.5, 0.2, abs(fract(a * 46.0) - 0.5)) * amount;
  }

  // Craters on a sphere: cells of a 3D grid each hold one bowl, shaded by which wall faces the light.
  float craters(vec3 n, vec3 l, float K) {
    vec3 p = n * K, base = floor(p - 0.5);
    float acc = 0.0;
    for (int i = 0; i < 8; i++) {
      vec3 cell = base + vec3(mod(float(i), 2.0), mod(floor(float(i) / 2.0), 2.0), floor(float(i) / 4.0));
      float hh = hash3(cell + uSeed);
      if (hh < 0.45) continue;
      vec3 c = normalize(cell + 0.5 + (vec3(hash3(cell + 1.3), hash3(cell + 2.1), hash3(cell + 4.7)) - 0.5) * 0.6);
      float cr = (0.16 + 0.3 * hash3(cell + 7.7)) / K;
      vec3 dv = n - c;
      float d = length(dv) / cr;
      if (d > 1.35) continue;
      vec3 g = normalize(dv - n * dot(dv, n) + 1e-5);
      float inside = smoothstep(0.1, 0.95, d) * step(d, 1.0), rim = (1.0 - smoothstep(1.0, 1.35, d)) * step(1.0, d);
      acc += dot(l, -g) * inside * 1.1 + dot(l, g) * rim * 0.8 - 0.18 * (1.0 - smoothstep(0.0, 0.9, d));
    }
    return acc;
  }

  float earth(vec2 uv, vec2 c, float r, vec3 l, float spin) {
    vec2 d = uv - c; float rr = length(d);
    if (rr > r) return 0.22 * smoothstep(r * 1.07, r, rr) * max(0.0, dot(normalize(vec3(d, 0.0)), l) + 0.6);   // the thin line of atmosphere
    vec3 n = vec3(d / r, sqrt(max(0.0, 1.0 - rr * rr / (r * r))));
    float diff = max(dot(n, l), 0.0);
    vec3 s = n; s.xz = rot(spin) * s.xz; s.xy = rot(0.4) * s.xy;
    float land = smoothstep(0.5, 0.56, fbm(s * 2.3 + uSeed));
    float cloud = smoothstep(0.52, 0.72, fbm(s * 4.5 + vec3(uT * 0.04, 0.0, 3.0)));
    float alb = mix(0.3, 0.62, land) + cloud * 0.5;
    return alb * (0.06 + diff * 1.05) + pow(1.0 - n.z, 3.0) * 0.5 * diff;
  }

  float moon(vec2 uv, vec2 c, float r, vec3 l, float spin) {
    vec2 d = uv - c; float rr = length(d);
    if (rr > r) return 0.0;
    vec3 n = vec3(d / r, sqrt(max(0.0, 1.0 - rr * rr / (r * r))));
    float diff = max(dot(n, l), 0.0);
    vec3 s = n; s.xz = rot(spin) * s.xz;
    float mare = smoothstep(0.46, 0.6, fbm(s * 1.4 + 3.0 + uSeed));
    float alb = 0.74 - mare * 0.3 + (fbm(s * 9.0) - 0.5) * 0.25;
    float relief = craters(s, l, 3.0) + craters(s, l, 7.0) * 0.8 + craters(s, l, 17.0) * 0.6;
    if (r > 1.2) relief += craters(s, l, 41.0) * 0.5 + craters(s, l, 97.0) * 0.4;   // close enough to see the small ones
    return clamp(alb * (0.03 + diff) * (1.0 + relief * 0.9) + relief * 0.12 * diff, 0.0, 1.0);
  }

  // Shots 3 and 4 share one camera: standing on the moon, looking across the new crater toward the Earth.
  float surface(vec2 uv, float tau) {
    float push = 1.0 - 0.07 * smoothstep(0.0, 5.0, tau);
    uv *= push;
    float shake = 0.1 * exp(-tau * 3.0);
    uv += shake * vec2(noise(vec3(tau * 43.0, 1.0, 0.0)) - 0.5, noise(vec3(1.0, tau * 39.0, 0.0)) - 0.5);
    float horizon = -0.02 - 0.05 * uv.x * uv.x + (fbm(vec3(uv.x * 5.0, 3.0, uSeed)) - 0.5) * 0.045;
    float lum;
    vec3 sun = normalize(vec3(-0.75, 0.3, 0.6));
    if (uv.y > horizon) {
      lum = stars(uv, 70.0) + stars(uv + 3.1, 130.0) * 0.7;
      lum = max(lum, earth(uv, vec2(0.46, 0.24), 0.1, normalize(vec3(-0.6, 0.35, 0.72)), 1.2 + uT * 0.02));
    } else {
      // Regolith: detail compressed toward the horizon, low sun from the left.
      float depth = horizon - uv.y;
      vec2 g = vec2(uv.x / (depth + 0.16), 1.0 / (depth + 0.07));
      lum = 0.33 + (fbm(vec3(g * vec2(2.2, 1.1), uSeed)) - 0.5) * 0.62 + (noise(vec3(g * vec2(13.0, 5.0), 2.0)) - 0.5) * 0.26;
      lum *= 0.62 + 0.75 * smoothstep(0.0, 0.5, depth);
      lum += 0.22 * smoothstep(0.03, 0.0, depth);   // the bright line of the horizon
      // Small old craters scattered on the plain, flattened by perspective.
      vec2 q = g * vec2(0.55, 0.42); vec2 qi = floor(q), qf = fract(q) - 0.5;
      float qh = hash(qi + uSeed * 3.0);
      if (qh > 0.62) { vec2 o = qf - (vec2(hash(qi + 4.0), hash(qi + 8.0)) - 0.5) * 0.4; float d = length(o) / (0.14 + 0.2 * hash(qi + 2.0)); if (d < 1.3) lum += (o.x / max(length(o), 0.001)) * (smoothstep(0.2, 0.95, d) * step(d, 1.0) * 0.5 - (1.0 - smoothstep(1.0, 1.3, d)) * step(1.0, d) * 0.3); }

      // The new crater: a deep bowl, a raised rim catching the sun, bright rays thrown outward.
      vec2 rel = (uv - CRATER) / vec2(0.44, 0.118);
      float e = length(rel), ang = atan(rel.y, rel.x);
      float grow = smoothstep(0.0, 0.35, tau);
      e /= max(grow, 0.02);
      float rays = pow(noise(vec3(ang * 5.0, uSeed, 1.0)), 3.0) * 1.6 + pow(noise(vec3(ang * 17.0, 4.0, uSeed)), 4.0);
      lum += rays * smoothstep(3.4, 1.1, e) * step(1.0, e) * 0.42;
      if (e < 1.0) {
        float wall = smoothstep(-0.2, 1.0, rel.x / max(e, 0.001) * e);               // the far wall faces the sun
        lum = mix(0.03, 0.92, wall * smoothstep(0.25, 1.0, e)) * (0.75 + 0.25 * noise(vec3(rel * 9.0, 1.0)));
        lum *= 1.0 - 0.75 * smoothstep(0.75, 0.0, length(rel - vec2(-0.25, 0.05)));   // the shadowed floor
      } else if (e < 1.15) {
        lum = mix(0.98, 0.1, smoothstep(-0.5, 0.7, rel.x / e)) + (noise(vec3(ang * 20.0, e * 9.0, 0.0)) - 0.5) * 0.25;
      }
    }
    // Impact: the white frame, then the plume, then the debris on ballistic arcs.
    vec2 rp = uv - (CRATER + vec2(0.0, 0.02));
    float R = 1.5 * (1.0 - exp(-tau * 3.4));
    float dome = length(rp * vec2(1.0, 1.25));
    float plume = fbm(vec3(rp * 5.0 / (0.35 + R), tau * 0.9 + uSeed)) * 2.5;
    plume *= smoothstep(R, R * 0.35, dome) * smoothstep(-0.14, 0.03, rp.y) * exp(-tau * 0.8);
    float front = smoothstep(0.05, 0.0, abs(dome - R)) * exp(-tau * 3.0) * step(-0.12, rp.y);
    float jets = pow(noise(vec3(atan(rp.y, rp.x) * 9.0, uSeed, 2.0)), 2.5) * smoothstep(R * 1.25, 0.0, dome) * exp(-tau * 1.9) * step(-0.05, rp.y) * 1.5;
    lum = max(lum, 0.0) + plume + front + jets;
    for (int i = 0; i < 26; i++) {
      float fi = float(i);
      float a = 0.25 + 2.64 * hash(vec2(fi, uSeed + 1.0)), v = 0.35 + 0.9 * hash(vec2(fi, uSeed + 2.0));
      vec2 pos = CRATER + vec2(cos(a), sin(a)) * v * tau - vec2(0.0, 0.16 * tau * tau);
      float size = 0.006 + 0.013 * hash(vec2(fi, 5.0));
      lum += smoothstep(size, size * 0.4, length(uv - pos)) * step(horizon - 0.3, pos.y) * exp(-tau * 0.35);
    }
    // Low haze that hangs over the crater while everything settles.
    lum += fbm(vec3(uv * vec2(2.5, 6.0) + vec2(tau * 0.05, 0.0), tau * 0.2)) * 0.5 * smoothstep(0.26, -0.1, abs(uv.y - horizon + 0.05)) * exp(-tau * 0.5) * smoothstep(0.0, 0.5, tau);
    lum += exp(-tau * 5.5) * 1.8;
    return lum;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float t = uT, lum = 0.0;
    // The impact shakes the picture itself, hard, then settles.
    float quake = step(T2, t) * exp(-(t - T2) * 5.0) * 0.045;
    uv += quake * vec2(noise(vec3(t * 61.0, 5.0, 0.0)) - 0.5, noise(vec3(5.0, t * 67.0, 0.0)) - 0.5);
    if (t < T1) {
      // Shot 1. Looking back from the skill: the Earth falls away.
      float k = t / T1;
      float shake = 0.02 * exp(-t * 0.9) + 0.003;
      uv += shake * vec2(noise(vec3(t * 37.0, 0.0, 0.0)) - 0.5, noise(vec3(0.0, t * 41.0, 0.0)) - 0.5);
      uv = rot(0.18 * sin(t * 0.5) - 0.1) * uv;
      float r = 2.6 * exp(-t * 1.02) + 0.035;
      vec2 c = vec2(0.03 * sin(t * 0.8), 0.07 * (1.0 - k) - 0.02);
      lum = stars(uv, 60.0) + stars(uv * 1.7 + 4.0, 90.0) * 0.6 + streaks(uv - c, 0.5 * smoothstep(0.3, 1.6, t) * (1.0 - 0.6 * k));
      float e = earth(uv, c, r, normalize(vec3(0.45, 0.4, 0.8)), 0.6 + t * 0.07);
      if (length(uv - c) < r * 1.07) lum = e;
      // The engine: a hard flickering glow that thins out as the air does.
      float burn = exp(-t * 1.5) * (0.7 + 0.5 * noise(vec3(t * 28.0, uv.x * 9.0, 0.0)));
      lum += burn * smoothstep(0.55, 0.0, length((uv - vec2(0.0, -0.62)) * vec2(1.0, 0.75))) * 1.6;
      lum += exp(-t * 7.0);
    } else if (t < T2) {
      // Shot 2. Looking forward: the moon comes up to meet it.
      float s = t - T1, k = s / (T2 - T1);
      float shake = 0.002 + 0.045 * k * k * k;
      uv += shake * vec2(noise(vec3(t * 47.0, 2.0, 0.0)) - 0.5, noise(vec3(2.0, t * 51.0, 0.0)) - 0.5);
      uv = rot(0.5 * (1.0 - k) * (1.0 - k)) * uv;
      float r = 0.07 * exp(s * 2.35);
      vec2 c = mix(vec2(0.3, 0.14), vec2(0.0, 0.0), smoothstep(0.0, 0.8, k));
      lum = stars(uv, 60.0) + stars(uv * 1.7 + 4.0, 90.0) * 0.6 + streaks(uv - c, 0.25 + 0.9 * k);
      float mm = moon(uv, c, r, normalize(vec3(-0.62, 0.3, 0.72)), 0.9 + s * 0.05);
      if (length(uv - c) < r) lum = mm;
      lum += exp(-s * 8.0) * 0.8 + smoothstep(0.93, 1.0, k) * 1.5;
    } else {
      lum = surface(uv, t - T2);
    }
    lum = clamp(lum, 0.0, 1.0);
    lum = pow(lum, 0.9);
    float th = bayer8(gl_FragCoord.xy) * 0.94 + 0.03;
    gl_FragColor = vec4(mix(uA, uB, step(th, lum)), 1.0);
  }`;

  private rgb: any = (c: any) => { const s: any = String(c).trim(); const m: any = /rgba?\(([^)]+)\)/.exec(s); if (m) return m[1].split(/[\s,/]+/).slice(0, 3).map((v: any) => parseFloat(v) / 255); const n: any = parseInt(s.replace('#', ''), 16); return Number.isNaN(n) ? [1, 0.29, 0.11] : [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /**
   * Play the sequence over the whole viewport. Resolves when it has closed.
   * Returns null when WebGL is not available, so the caller can fall back.
   */
  playMoonshot(root: any, { label, className }: any, { accent = '#ff4a1c', code = '' }: any = {}): any {
    const canvas: any = this.h('canvas', { class: 'launch__screen' });
    const gl: any = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const sh: any = (type: any, src: any) => { const s: any = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
    let prog: any;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, this.VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, this.FRAG)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e: any) { console.warn('[sigil] moon sequence unavailable', e); return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc: any = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U: any = (n: any) => gl.getUniformLocation(prog, n);
    gl.uniform3fv(U('uA'), this.rgb('#0b0b0d')); gl.uniform3fv(U('uB'), this.rgb(accent)); gl.uniform1f(U('uSeed'), Math.random() * 40);

    // Instruments: the monospaced voice of the page, reporting the flight.
    const clock: any = this.h('span', {}, 'T+00.0'), phase: any = this.h('span', { class: 'launch__phase' }, this.t('Ascent'));
    const readA: any = this.h('span', {}), readB: any = this.h('span', {});
    const hood: any = this.h('span', { class: `${className} launch__hood` }, label);
    const planted: any = this.h('span', { class: `${className} launch__planted` }, label);
    const caption: any = this.h('p', { class: 'launch__caption' }, this.t('{skill} has landed', { skill: label }));
    const skip: any = this.h('button', { type: 'button', class: 'launch__skip' }, this.t('Skip'), this.h('span', { 'aria-hidden': 'true' }, ' · ESC'));
    const film: any = this.h('div', { class: 'launch', role: 'dialog', 'aria-label': this.t('{skill} left for the moon.', { skill: label }) },
      this.h('div', { class: 'launch__film', 'aria-hidden': 'true' }, canvas, hood, planted,
        this.h('div', { class: 'launch__hud launch__hud--top' }, this.h('span', {}, `${code ? `SIG ${code} · ` : ''}${this.t('Mission')} ${label}`), clock),
        this.h('div', { class: 'launch__hud launch__hud--bottom' }, phase, readA, readB),
        caption),
      skip);
    root.append(film);
    const cell: any = 4;
    const size: any = () => { const w: any = Math.max(2, Math.round(film.clientWidth / cell)), hh: any = Math.max(2, Math.round(film.clientHeight / cell)); if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; gl.viewport(0, 0, w, hh); } gl.uniform2f(U('uRes'), canvas.width, canvas.height); };
    const fmt: any = (n: any) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');

    return new Promise((resolve: any) => {
      let raf: any = 0, t0: any = performance.now(), done: any = false, stage: any = -1;
      const before: any = document.activeElement;
      const finish: any = () => {
        if (done) return; done = true;
        cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey, true);
        film.classList.add('is-leaving');
        setTimeout(() => { gl.getExtension('WEBGL_lose_context')?.loseContext(); film.remove(); before?.focus?.({ preventScroll: true }); resolve(); }, 520);
      };
      const onKey: any = (e: any) => { if (e.key === 'Escape') { e.stopPropagation(); finish(); } };
      window.addEventListener('keydown', onKey, true);
      skip.addEventListener('click', finish);
      skip.focus({ preventScroll: true });
      const frame: any = (now: any) => {
        const time: any = (now - t0) / 1000;
        size();
        gl.uniform1f(U('uT'), Math.min(time, this.END));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        clock.textContent = `T+${time.toFixed(1).padStart(4, '0')}`;
        const s: any = time < this.T1 ? 0 : time < this.T2 ? 1 : time < this.T3 ? 2 : 3;
        if (time < this.T1) { const k: any = 1 - Math.exp(-time * 1.02); readA.textContent = `${this.t('Altitude')} ${fmt(k * 196000)} km`; readB.textContent = `${this.t('Speed')} ${fmt(2800 + k * 8300)} m/s`; }
        else if (time < this.T2) { const k: any = (time - this.T1) / (this.T2 - this.T1); readA.textContent = `${this.t('To surface')} ${fmt(188400 * (1 - k) ** 2.6)} km`; readB.textContent = `${this.t('Speed')} ${fmt(2400 + k * 180)} m/s`; }
        if (s !== stage) {
          stage = s;
          film.dataset.shot = String(s);
          phase.textContent = [this.t('Ascent'), this.t('Terminal descent'), this.t('Impact'), this.t('Touchdown')][s];
          if (s >= 2) { readA.textContent = `${this.t('To surface')} 0 km`; readB.textContent = s === 2 ? `${this.t('Speed')} 0 m/s` : this.t('Signal nominal'); }
        }
        if (time >= this.END) finish(); else raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
  }
}
