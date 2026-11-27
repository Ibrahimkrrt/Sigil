import { Injectable, inject } from '@angular/core';

/**
 * The skill pile: rigid bodies you can pick up and throw.
 * Lifted from the reference engine; values are loosely typed inside.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class PilePhysics {
  /**
   * The pile: list items become rigid bodies that fall, lean, topple, stack and
   * can be thrown. A small 2D rigid-body solver for oriented boxes: separating
   * axis test with edge clipping for contact points, then sequential impulses
   * with friction (after Erin Catto's Box2D Lite). The list stays a list for
   * assistive technology.
   */
  physicsPile(box: any, motion: any, { onFlipAttempt, onLaunch }: any = {}): any {
    const items: any = [...box.querySelectorAll('li')];
    if (motion <= 0 || !items.length) return { drop() {}, destroy() {} };
    box.classList.add('is-live');
    let gravity: any = 2400;
    const FRICTION: any = 0.55, ITERATIONS: any = 10, SUBSTEPS: any = 3, SLOP: any = 0.6;
    let W: any = box.clientWidth, H: any = box.clientHeight, raf: any = 0, last: any = 0, grabbed: any = null, quiet: any = 0, awake: any = 0;
    const body: any = (el: any) => ({ el, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, hx: 1, hy: 1, im: 0, ii: 0, held: false });
    const bodies: any = items.map(body);
    // Floor and walls: bodies that never move.
    const fixed: any = [body(null), body(null), body(null)];
    const size: any = () => {
      W = box.clientWidth; H = box.clientHeight;
      const [floor, left, right]: any = fixed;
      Object.assign(floor, { x: W / 2, y: H + 400, hx: W + 2000, hy: 400 });
      Object.assign(left, { x: -400, y: H - 4000, hx: 400, hy: 6000 });
      Object.assign(right, { x: W + 400, y: H - 4000, hx: 400, hy: 6000 });
    };
    const measure: any = (b: any) => { b.hx = b.el.offsetWidth / 2; b.hy = b.el.offsetHeight / 2; const m: any = b.hx * b.hy * 4; b.im = 1 / m; b.ii = 12 / (m * (4 * b.hx * b.hx + 4 * b.hy * b.hy)); };
    const place: any = () => {
      size();
      bodies.forEach((b: any, i: any) => {
        measure(b);
        b.x = b.hx + 8 + Math.random() * Math.max(1, W - 2 * b.hx - 16); b.y = -b.hy - 30 - i * 64 - Math.random() * 40;
        b.a = (Math.random() - 0.5) * 0.5; b.vx = (Math.random() - 0.5) * 160; b.vy = 0; b.w = (Math.random() - 0.5) * 1.6;
      });
      quiet = 0;
    };

    // ---- Collision: oriented box against oriented box. Returns up to two contacts { x, y, nx, ny, sep }, normal from A to B.
    const incident: any = (h: any, px: any, py: any, c: any, s: any, nx: any, ny: any) => {
      const lx: any = -(c * nx + s * ny), ly: any = -(-s * nx + c * ny);   // normal in the box's own frame, reversed
      let v0: any, v1: any;
      if (Math.abs(lx) > Math.abs(ly)) { if (lx > 0) { v0 = [h[0], -h[1]]; v1 = [h[0], h[1]]; } else { v0 = [-h[0], h[1]]; v1 = [-h[0], -h[1]]; } }
      else if (ly > 0) { v0 = [h[0], h[1]]; v1 = [-h[0], h[1]]; } else { v0 = [-h[0], -h[1]]; v1 = [h[0], -h[1]]; }
      return [[px + c * v0[0] - s * v0[1], py + s * v0[0] + c * v0[1]], [px + c * v1[0] - s * v1[1], py + s * v1[0] + c * v1[1]]];
    };
    const clip: any = (pts: any, nx: any, ny: any, offset: any) => {
      const d0: any = nx * pts[0][0] + ny * pts[0][1] - offset, d1: any = nx * pts[1][0] + ny * pts[1][1] - offset, out: any = [];
      if (d0 <= 0) out.push(pts[0]);
      if (d1 <= 0) out.push(pts[1]);
      if (d0 * d1 < 0) { const k: any = d0 / (d0 - d1); out.push([pts[0][0] + k * (pts[1][0] - pts[0][0]), pts[0][1] + k * (pts[1][1] - pts[0][1])]); }
      return out;
    };
    const collide: any = (A: any, B: any) => {
      const ca: any = Math.cos(A.a), sa: any = Math.sin(A.a), cb: any = Math.cos(B.a), sb: any = Math.sin(B.a);
      const dx: any = B.x - A.x, dy: any = B.y - A.y;
      const dAx: any = ca * dx + sa * dy, dAy: any = -sa * dx + ca * dy, dBx: any = cb * dx + sb * dy, dBy: any = -sb * dx + cb * dy;
      // C = Aᵀ·B, the rotation from B's frame to A's.
      const c00: any = Math.abs(ca * cb + sa * sb), c01: any = Math.abs(-ca * sb + sa * cb), c10: any = Math.abs(-sa * cb + ca * sb), c11: any = Math.abs(sa * sb + ca * cb);
      const fAx: any = Math.abs(dAx) - A.hx - (c00 * B.hx + c01 * B.hy), fAy: any = Math.abs(dAy) - A.hy - (c10 * B.hx + c11 * B.hy);
      if (fAx > 0 || fAy > 0) return null;
      const fBx: any = Math.abs(dBx) - B.hx - (c00 * A.hx + c10 * A.hy), fBy: any = Math.abs(dBy) - B.hy - (c01 * A.hx + c11 * A.hy);
      if (fBx > 0 || fBy > 0) return null;
      // Pick the axis of least penetration, preferring A's faces a little so the choice does not flicker.
      let axis: any = 0, sep: any = fAx, nx: any = dAx > 0 ? ca : -ca, ny: any = dAx > 0 ? sa : -sa;
      if (fAy > 0.95 * sep + 0.01 * A.hy) { axis = 1; sep = fAy; nx = dAy > 0 ? -sa : sa; ny = dAy > 0 ? ca : -ca; }
      if (fBx > 0.95 * sep + 0.01 * B.hx) { axis = 2; sep = fBx; nx = dBx > 0 ? cb : -cb; ny = dBx > 0 ? sb : -sb; }
      if (fBy > 0.95 * sep + 0.01 * B.hy) { axis = 3; sep = fBy; nx = dBy > 0 ? -sb : sb; ny = dBy > 0 ? cb : -cb; }
      let fnx: any, fny: any, front: any, snx: any, sny: any, neg: any, pos: any, edge: any;
      if (axis < 2) {
        fnx = nx; fny = ny;
        const half: any = axis === 0 ? A.hx : A.hy, other: any = axis === 0 ? A.hy : A.hx;
        front = A.x * fnx + A.y * fny + half;
        snx = axis === 0 ? -sa : ca; sny = axis === 0 ? ca : sa;
        const side: any = A.x * snx + A.y * sny; neg = -side + other; pos = side + other;
        edge = incident([B.hx, B.hy], B.x, B.y, cb, sb, fnx, fny);
      } else {
        fnx = -nx; fny = -ny;
        const half: any = axis === 2 ? B.hx : B.hy, other: any = axis === 2 ? B.hy : B.hx;
        front = B.x * fnx + B.y * fny + half;
        snx = axis === 2 ? -sb : cb; sny = axis === 2 ? cb : sb;
        const side: any = B.x * snx + B.y * sny; neg = -side + other; pos = side + other;
        edge = incident([A.hx, A.hy], A.x, A.y, ca, sa, fnx, fny);
      }
      let pts: any = clip(edge, -snx, -sny, neg);
      if (pts.length < 2) return null;
      pts = clip(pts, snx, sny, pos);
      if (pts.length < 2) return null;
      const out: any = [];
      for (const p of (pts as any)) { const s: any = fnx * p[0] + fny * p[1] - front; if (s <= 0) out.push({ x: p[0] - s * fnx, y: p[1] - s * fny, nx, ny, sep: s, pn: 0, pt: 0 }); }
      return out.length ? out : null;
    };

    // ---- One step of the solver.
    const all: any = () => [...bodies, ...fixed];
    const simulate: any = (dt: any) => {
      const list: any = all();
      for (const b of (bodies as any)) {
        if (b.held) continue;
        b.vy += gravity * dt; b.vx *= 0.999; b.w *= 0.995;
      }
      const contacts: any = [];
      for (let i: any = 0; i < bodies.length; i++) {
        const A: any = bodies[i], ra: any = Math.hypot(A.hx, A.hy);
        for (let j: any = i + 1; j < list.length; j++) {
          const B: any = list[j];
          if (!B.el) { if (j === bodies.length ? A.y + ra < H - 2 : j === bodies.length + 1 ? A.x - ra > 2 : A.x + ra < W - 2) continue; }
          else { const rb: any = Math.hypot(B.hx, B.hy); if (Math.abs(A.x - B.x) > ra + rb || Math.abs(A.y - B.y) > ra + rb) continue; }
          const found: any = collide(A, B);
          if (!found) continue;
          for (const c of (found as any)) {
            const r1x: any = c.x - A.x, r1y: any = c.y - A.y, r2x: any = c.x - B.x, r2y: any = c.y - B.y;
            const rn1: any = r1x * c.nx + r1y * c.ny, rn2: any = r2x * c.nx + r2y * c.ny;
            const tx: any = c.ny, ty: any = -c.nx, rt1: any = r1x * tx + r1y * ty, rt2: any = r2x * tx + r2y * ty;
            c.A = A; c.B = B; c.r1x = r1x; c.r1y = r1y; c.r2x = r2x; c.r2y = r2y; c.tx = tx; c.ty = ty;
            c.mn = 1 / (A.im + B.im + A.ii * (r1x * r1x + r1y * r1y - rn1 * rn1) + B.ii * (r2x * r2x + r2y * r2y - rn2 * rn2));
            c.mt = 1 / (A.im + B.im + A.ii * (r1x * r1x + r1y * r1y - rt1 * rt1) + B.ii * (r2x * r2x + r2y * r2y - rt2 * rt2));
            c.bias = -0.2 / dt * Math.min(0, c.sep + SLOP);
            contacts.push(c);
          }
        }
      }
      const push: any = (c: any, px: any, py: any) => {
        const { A, B }: any = c;
        A.vx -= A.im * px; A.vy -= A.im * py; A.w -= A.ii * (c.r1x * py - c.r1y * px);
        B.vx += B.im * px; B.vy += B.im * py; B.w += B.ii * (c.r2x * py - c.r2y * px);
      };
      for (let it: any = 0; it < ITERATIONS; it++) for (const c of (contacts as any)) {
        const { A, B }: any = c;
        let dvx: any = B.vx - B.w * c.r2y - A.vx + A.w * c.r1y, dvy: any = B.vy + B.w * c.r2x - A.vy - A.w * c.r1x;
        let dp: any = c.mn * (-(dvx * c.nx + dvy * c.ny) + c.bias);
        const pn0: any = c.pn; c.pn = Math.max(pn0 + dp, 0); dp = c.pn - pn0;
        push(c, dp * c.nx, dp * c.ny);
        dvx = B.vx - B.w * c.r2y - A.vx + A.w * c.r1y; dvy = B.vy + B.w * c.r2x - A.vy - A.w * c.r1x;
        let dt2: any = c.mt * -(dvx * c.tx + dvy * c.ty);
        const max: any = FRICTION * c.pn, pt0: any = c.pt; c.pt = Math.max(-max, Math.min(max, pt0 + dt2)); dt2 = c.pt - pt0;
        push(c, dt2 * c.tx, dt2 * c.ty);
      }
      for (const b of (bodies as any)) {
        if (b.held) continue;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
        if (gravity <= 0 && b.y < b.hy) { b.y = b.hy; b.vy = Math.abs(b.vy) * 0.4; }   // weightless: the box gets a lid
        if (b.x < -200 || b.x > W + 200 || b.y > H + 200) { b.x = W / 2; b.y = -b.hy; b.vx = b.vy = b.w = 0; }   // never lose a brick
      }
    };

    const frame: any = (now: any) => {
      const dt: any = Math.min(0.033, (now - last) / 1000 || 0.016) / SUBSTEPS; last = now;
      for (let s: any = 0; s < SUBSTEPS; s++) {
        if (grabbed) {
          // The held brick follows the pointer on a stiff spring, so it still pushes the others around.
          const c: any = Math.cos(grabbed.a), sn: any = Math.sin(grabbed.a);
          const ax: any = grabbed.x + c * gx - sn * gy, ay: any = grabbed.y + sn * gx + c * gy;
          grabbed.vx = (tx - ax) * 24; grabbed.vy = (ty - ay) * 24; grabbed.w *= 0.9;
          grabbed.x += grabbed.vx * dt; grabbed.y += grabbed.vy * dt; grabbed.a += grabbed.w * dt;
        }
        simulate(dt);
      }
      let energy: any = 0;
      for (const b of (bodies as any)) {
        const speed: any = Math.hypot(b.vx, b.vy) + Math.abs(b.w) * 60;
        // A little stiction: bricks that are barely moving are eased to a stop, so a tall pile settles instead of creeping.
        if (speed < 40 && !b.held && gravity > 0) { b.vx *= 0.86; b.vy *= 0.86; b.w *= 0.86; }
        energy = Math.max(energy, speed);
        // Easter egg: someone keeps trying to turn a brick upside down. The label will not have it.
        const down: any = Math.cos(b.a) < -0.2;
        if (down && !b.down && (b === grabbed || now - (b.touched || 0) < 4000)) {
          flips = flips.filter((t0: any) => now - t0 < 12000); flips.push(now);
          if (flips.length >= 2 && now - teased > 15000) { teased = now; flips = []; onFlipAttempt?.(); }
        }
        b.down = down;
        // A box looks the same turned half-way round, so the label is always drawn the right way up.
        b.el.style.transform = `translate3d(${(b.x - b.hx).toFixed(1)}px, ${(b.y - b.hy).toFixed(1)}px, 0) rotate(${(Math.cos(b.a) < 0 ? b.a + Math.PI : b.a).toFixed(4)}rad)`;
      }
      // Sleep once everything has been still for a moment; any touch wakes it.
      quiet = energy < 26 && !grabbed && gravity > 0 ? quiet + dt * SUBSTEPS : 0;
      if (gravity <= 0) awake = 0;
      awake += dt * SUBSTEPS;
      if (quiet > 1 || (awake > 14 && !grabbed)) { for (const b of (bodies as any)) { b.vx = b.vy = b.w = 0; } raf = 0; return; }
      raf = requestAnimationFrame(frame);
    };
    const wake: any = () => { quiet = 0; awake = 0; if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    // ---- Grab and throw.
    let gx: any = 0, gy: any = 0, tx: any = 0, ty: any = 0, flips: any = [], teased: any = -Infinity;
    const local: any = (e: any) => { const r: any = box.getBoundingClientRect(), k: any = box.offsetWidth ? r.width / box.offsetWidth : 1; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
    const pd: any = (e: any) => {
      const b: any = bodies.find((it: any) => it.el === e.target.closest('li'));
      if (!b || b.parked) return;
      trail.length = 0;
      [tx, ty] = local(e);
      const c: any = Math.cos(b.a), s: any = Math.sin(b.a), dx: any = tx - b.x, dy: any = ty - b.y;
      gx = c * dx + s * dy; gy = -s * dx + c * dy;   // where on the brick it was picked up
      grabbed = b; b.held = true; b.touched = performance.now(); b.el.classList.add('is-held');
      e.preventDefault(); wake();
    };
    const trail: any = [];   // recent pointer positions, to know how hard a brick was thrown
    const pm: any = (e: any) => { if (!grabbed) return; [tx, ty] = local(e); const now: any = performance.now(); trail.push([now, tx, ty]); while (trail.length > 2 && now - trail[0][0] > 110) trail.shift(); };
    const pu: any = () => {
      if (!grabbed) return;
      const b: any = grabbed; grabbed = null;
      b.held = false; b.touched = performance.now(); b.w += b.vx * 0.002; b.el.classList.remove('is-held');
      // Easter egg: thrown upward hard enough, a brick does not come back down. It goes to the moon.
      const first: any = trail[0], lastP: any = trail[trail.length - 1];
      const span: any = first && lastP ? (lastP[0] - first[0]) / 1000 : 0;
      const svx: any = span > 0.02 ? (lastP[1] - first[1]) / span : 0, svy: any = span > 0.02 ? (lastP[2] - first[2]) / span : 0;
      trail.length = 0;
      // It has to be a real throw: fast, mostly straight up, over a long sweep, and let go mid-flight.
      // Dragging a brick out of the top of the pile, or a casual flick, stays an ordinary toss.
      const need: any = Math.max(3600, Math.min(5200, window.innerHeight * 5)), rise: any = first && lastP ? first[2] - lastP[2] : 0;
      if (onLaunch && !away && lastP && -svy > need && Math.abs(svx) < -svy * 0.8 && rise > Math.min(320, window.innerHeight * 0.3) && performance.now() - lastP[0] < 60) launch(b, { from: [b.x / W, Math.max(0, Math.min(1, b.y / H))] });
      wake();
    };
    let away: any = null;
    const launch: any = (b: any, info: any = {}) => {
      if (away || !onLaunch) return false;
      away = b; b.held = true; b.parked = true; b.vx = b.vy = b.w = 0; b.x = W / 2; b.y = -5000; b.el.style.visibility = 'hidden';
      onLaunch({ label: b.el.firstChild?.textContent || b.el.textContent, className: b.el.className.replace(/\bis-held\b/, ''), from: info.from || [0.5, 0.8], back(delay: any = 1300) {
        // The brick comes home a moment after the scene closes, dropped in from above.
        setTimeout(() => { if (away !== b) return; away = null; b.held = false; b.parked = false; b.x = b.hx + 12 + Math.random() * Math.max(1, W - 2 * b.hx - 24); b.y = -b.hy - 30; b.a = (Math.random() - 0.5) * 0.6; b.vx = 0; b.vy = 300; b.w = (Math.random() - 0.5) * 2; b.el.style.visibility = ''; wake(); }, delay);
      } });
      return true;
    };
    box.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu); window.addEventListener('pointercancel', pu);
    const ro: any = new ResizeObserver(() => { if (Math.abs(box.clientWidth - W) > 2 || Math.abs(box.clientHeight - H) > 2) { size(); bodies.forEach(measure); wake(); } });
    ro.observe(box);
    let dropped: any = false;
    const io: any = new IntersectionObserver((es: any) => { if (es.some((e: any) => e.isIntersecting) && !dropped) { dropped = true; place(); wake(); } }, { threshold: 0.25 });
    io.observe(box);
    return {
      drop() { if (away) return; dropped = true; place(); wake(); },
      /** Send one brick (the first, or a random one) to the moon without throwing it. */
      launchAny() { const free: any = bodies.filter((b: any) => !b.parked); return free.length ? launch(free[Math.floor(Math.random() * free.length)]) : false; },
      /** Switch gravity off for a while: everything drifts. */
      float(ms: any = 6000) {
        if (gravity <= 0) return;
        gravity = -40;
        for (const b of (bodies as any)) if (!b.parked) { b.vx += (Math.random() - 0.5) * 500; b.vy -= 200 + Math.random() * 500; b.w += (Math.random() - 0.5) * 3; }
        wake();
        setTimeout(() => { gravity = 2400; wake(); }, ms);
      },
      destroy() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); box.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu); box.classList.remove('is-live'); items.forEach((el: any) => { el.style.transform = ''; }); },
    };
  }
}
