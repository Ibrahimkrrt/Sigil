import { Injectable, inject } from '@angular/core';
import { hash } from '@domain/text/hash';

/**
 * The dither layer: one shared WebGL context that draws every pattern and image as an
 * 8x8 ordered dither in the chapter's two colours.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class DitherEngine {
  private VERT: any = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

  private FRAG: any = `
  precision mediump float;
  uniform vec2 u_res;       // tile size in cells
  uniform float u_time, u_seed, u_hover, u_vel, u_img, u_gain;
  uniform int u_pat;
  uniform vec2 u_mouse;     // pointer in tile space, 0..1, y down
  uniform vec3 u_a, u_b;
  uniform sampler2D u_tex;
  uniform vec2 u_texRes;

  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
  float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  void main(){
    vec2 cell = floor(gl_FragCoord.xy);
    vec2 uv = (cell + 0.5) / u_res; uv.y = 1.0 - uv.y;
    float asp = u_res.x / u_res.y;
    float t = u_time;
    uv.x += u_vel * 0.04 * sin(uv.y * 9.0 + t * 2.0);                 // scroll speed bends the image
    vec2 p = (uv - 0.5) * vec2(asp, 1.0);
    vec2 m = (u_mouse - 0.5) * vec2(asp, 1.0);
    float s = u_seed * 13.7;
    float v;
    if (u_img > 0.5) {
      float ta = u_texRes.x / u_texRes.y;                            // cover fit
      vec2 q = uv - 0.5; if (ta > asp) q.x *= asp / ta; else q.y *= ta / asp;
      vec3 c = texture2D(u_tex, q + 0.5).rgb;
      v = dot(c, vec3(0.299, 0.587, 0.114));
      v = clamp((v - 0.5) * 1.25 + 0.5, 0.0, 1.0);
    } else if (u_pat == 0) {                                          // flow
      vec2 q = p * 1.5 + s; q += 0.6 * vec2(fbm(q + t * 0.07), fbm(q - t * 0.05 + 4.0));
      v = fbm(q + vec2(t * 0.04, 0.0));
    } else if (u_pat == 1) {                                          // rings
      v = 0.5 + 0.5 * sin(length(p - vec2(sin(s) * 0.3, cos(s * 1.3) * 0.2)) * 26.0 - t * 1.4);
      v *= 0.55 + 0.45 * noise(p * 2.0 + s);
    } else if (u_pat == 2) {                                          // bars
      float x = p.x * 5.0 + noise(vec2(floor(p.y * 6.0) + s, t * 0.25)) * 2.0;
      v = smoothstep(0.15, 0.85, abs(fract(x) - 0.5) * 2.0);
    } else if (u_pat == 3) {                                          // blobs
      v = 0.0;
      for (int i = 0; i < 4; i++) { float fi = float(i) + s; vec2 c = 0.42 * vec2(sin(t * 0.31 + fi * 2.4) * asp * 0.8, cos(t * 0.27 + fi * 1.7)); v += 0.035 / (dot(p - c, p - c) + 0.02); }
      v = clamp(v * 0.42, 0.0, 1.0);
    } else if (u_pat == 4) {                                          // waves
      v = 0.5 + 0.5 * sin((p.y + 0.12 * sin(p.x * 3.0 + t * 0.7 + s)) * 34.0);
      v = mix(v, fbm(p * 2.0 + s), 0.35);
    } else {                                                          // contours
      float f = fbm(p * 1.8 + s + vec2(0.0, t * 0.03));
      v = 1.0 - smoothstep(0.0, 0.22, abs(fract(f * 7.0) - 0.5));
    }
    float d = distance(p, m);
    v += (0.25 + 0.55 * u_hover) * exp(-d * d * 9.0);                 // the pointer is a light
    v = (v - 0.5) * u_gain + 0.5 + (u_hover - 0.5) * 0.0;
    float bit = step(bayer8(cell), clamp(v, 0.0, 1.0));
    bit = mix(bit, 1.0 - bit, step(0.5, u_hover) * (1.0 - u_img));    // pattern tiles invert on hover
    gl_FragColor = vec4(mix(u_a, u_b, bit), 1.0);
  }`;

  PATTERNS: any = ['flow', 'rings', 'bars', 'blobs', 'waves', 'contours'];

  /**
   * @param {{ motion:number, root:HTMLElement }} opts
   * @returns dither API, or null when WebGL is unavailable.
   */
  createDither({ motion = 0.8, root }: any): any {
    const self = this;
    const glc: any = document.createElement('canvas');
    glc.width = 512; glc.height = 512;
    const gl: any = glc.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) return null;
    const compile: any = (type: any, src: any) => { const sh: any = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
    const prog: any = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, this.VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, this.FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc: any = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U: any = Object.fromEntries(['u_res', 'u_time', 'u_seed', 'u_hover', 'u_vel', 'u_img', 'u_gain', 'u_pat', 'u_mouse', 'u_a', 'u_b', 'u_tex', 'u_texRes'].map((n: any) => [n, gl.getUniformLocation(prog, n)]));

    const tiles: any = new Set();
    const colors: any = { ground: [11, 11, 13], tone: [40, 30, 28], accent: [255, 74, 28], fg: [242, 241, 236] };
    const target: any = { ...colors };
    let pointer: any = [-9999, -9999], vel: any = 0, velT: any = 0;
    let raf: any = 0, running: any = false, paused: any = false, time: any = Math.random() * 40, last: any = 0, dirty: any = true;

    const io: any = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries: any) => { for (const e of (entries as any)) { e.target._tile.visible = e.isIntersecting; } dirty = true; kick(); }, { rootMargin: '120px' }) : null;

    function draw(tile: any) {
      const el: any = tile.canvas;
      const w: any = el.clientWidth, h: any = el.clientHeight;
      if (w < 2 || h < 2) return;
      const cw: any = Math.max(2, Math.min(512, Math.ceil(w / tile.px))), ch: any = Math.max(2, Math.min(512, Math.ceil(h / tile.px)));
      if (el.width !== cw || el.height !== ch) { el.width = cw; el.height = ch; }
      const r: any = el.getBoundingClientRect();
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(U.u_res, cw, ch);
      gl.uniform1f(U.u_time, time * tile.speed);
      gl.uniform1f(U.u_seed, tile.seed);
      gl.uniform1f(U.u_hover, tile.hover);
      gl.uniform1f(U.u_vel, vel);
      gl.uniform1f(U.u_gain, tile.gain);
      gl.uniform1i(U.u_pat, tile.pattern);
      gl.uniform2f(U.u_mouse, r.width ? (pointer[0] - r.left) / r.width : -9, r.height ? (pointer[1] - r.top) / r.height : -9);
      const a: any = colors.ground, b: any = tile.mode === 'tone' ? colors.tone : tile.mode === 'fg' ? colors.fg : colors.accent;
      gl.uniform3f(U.u_a, a[0] / 255, a[1] / 255, a[2] / 255);
      gl.uniform3f(U.u_b, b[0] / 255, b[1] / 255, b[2] / 255);
      const img: any = tile.tex ? 1 : 0;
      gl.uniform1f(U.u_img, img);
      if (img) { gl.bindTexture(gl.TEXTURE_2D, tile.tex); gl.uniform1i(U.u_tex, 0); gl.uniform2f(U.u_texRes, tile.texW, tile.texH); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      tile.ctx.drawImage(glc, 0, glc.height - ch, cw, ch, 0, 0, cw, ch);
    }

    function frame(now: any) {
      raf = 0;
      const dt: any = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      const animate: any = motion > 0 && !paused;
      if (animate) time += dt * (0.35 + motion * 0.9);
      const k: any = animate ? 1 - Math.exp(-dt * 5) : 1;
      let moving: any = 0;
      for (const key of (['ground', 'tone', 'accent', 'fg'] as any)) for (let i: any = 0; i < 3; i++) { const d: any = target[key][i] - colors[key][i]; colors[key][i] += d * k; moving += Math.abs(d); }
      vel += (velT - vel) * k; velT *= 0.9; moving += Math.abs(vel) * 100;
      for (const tile of (tiles as any)) {
        if (!tile.canvas.isConnected) { tiles.delete(tile); continue; }
        const d: any = tile.hoverT - tile.hover; tile.hover += d * (animate ? 1 - Math.exp(-dt * 9) : 1); moving += Math.abs(d);
        if (tile.visible) draw(tile);
      }
      dirty = false;
      if (running && (animate || moving > 0.01)) raf = requestAnimationFrame(frame);
    }
    function kick() { if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    const onMove: any = (e: any) => { pointer = [e.clientX, e.clientY]; if (motion <= 0 || paused) kick(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    const onVis: any = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVis);
    const ro: any = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { dirty = true; kick(); }) : null;
    ro?.observe(root);
    function start() { if (!running) { running = true; kick(); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    return {
      start, stop,
      /**
       * Create a tile. `mode`: "duo" (ground + ink, for media), "tone" (ground + a quiet tint, safe behind text) or "fg".
       * `image`: an <img> to dither instead of a pattern. `hoverEl`: the element whose hover drives the tile.
       */
      tile({ pattern = 0, seed = '', mode = 'duo', px = 4, speed = 1, gain = 1.6, image = null, hoverEl = null, cls = '' }: any = {}) {
        const canvas: any = document.createElement('canvas');
        canvas.className = `dither ${cls}`;
        canvas.setAttribute('aria-hidden', 'true');
        const tile: any = { canvas, ctx: canvas.getContext('2d'), pattern: typeof pattern === 'string' ? Math.max(0, self.PATTERNS.indexOf(pattern)) : pattern, seed: (hash(String(seed)) % 1000) / 100, mode, px, speed, gain, hover: 0, hoverT: 0, visible: !io, tex: null, texW: 1, texH: 1 };
        canvas._tile = tile;
        tiles.add(tile);
        io?.observe(canvas);
        const target: any = hoverEl || canvas;
        const on: any = () => { tile.hoverT = 1; kick(); }, off: any = () => { tile.hoverT = 0; kick(); };
        queueMicrotask(() => { const t2: any = hoverEl || canvas.closest('[data-hover]') || target; t2.addEventListener('pointerenter', on); t2.addEventListener('pointerleave', off); t2.addEventListener('focusin', on); t2.addEventListener('focusout', off); });
        if (image) {
          const load: any = () => {
            try {
              const tex: any = gl.createTexture();
              gl.bindTexture(gl.TEXTURE_2D, tex);
              // Rasterise first: this gives vector images a size and keeps the texture small.
              const iw: any = image.naturalWidth || 800, ih: any = image.naturalHeight || 600, k: any = Math.min(1, 640 / Math.max(iw, ih));
              const src: any = document.createElement('canvas');
              src.width = Math.max(1, Math.round(iw * k)); src.height = Math.max(1, Math.round(ih * k));
              src.getContext('2d').drawImage(image, 0, 0, src.width, src.height);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
              tile.tex = tex; tile.texW = src.width; tile.texH = src.height;
              canvas.dispatchEvent(new CustomEvent('dither:ready', { bubbles: true }));
              kick();
            } catch { /* cross-origin image without CORS: the plain image stays visible */ }
          };
          if (image.complete && image.naturalWidth) load(); else image.addEventListener('load', load, { once: true });
        }
        kick();
        return canvas;
      },
      /** Re-ink every tile (colours ease to the new chapter). */
      setColors(scene: any) { target.ground = scene.ground; target.tone = scene.tone; target.accent = scene.accent; target.fg = scene.fg; kick(); },
      /** Scroll speed, in viewport heights per second: bends the tiles a little. */
      setVelocity(v: any) { if (paused) return; velT = Math.max(-1, Math.min(1, v)) * Math.min(1, motion); kick(); },
      /** Stop drawing a tile that has left the page. */
      forget(canvas: any) { const gone: any = canvas && canvas._tile; if (gone) { tiles.delete(gone); io?.unobserve(canvas); } },
      invalidate() { dirty = true; kick(); },
      /** Hold every tile still. Colours and hover still update, nothing moves on its own. */
      pause(v: any) { paused = !!v; kick(); },
      destroy() {
        stop(); io?.disconnect(); ro?.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', onVis);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  }
}
