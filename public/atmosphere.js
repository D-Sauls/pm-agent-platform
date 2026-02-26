(() => {
  const canvas = document.createElement("canvas");
  canvas.className = "atmosphere-bg";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let rafId = null;
  const stars = [];
  const dust = [];
  const pointer = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    active: false
  };
  const STAR_COUNT = 180;
  const DUST_COUNT = 40;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function seed() {
    stars.length = 0;
    dust.length = 0;

    for (let i = 0; i < STAR_COUNT; i += 1) {
      stars.push({
        x: rand(0, width),
        y: rand(0, height),
        bx: 0,
        by: 0,
        vx: 0,
        vy: 0,
        r: rand(0.4, 1.8),
        alpha: rand(0.2, 0.9),
        pulse: rand(0.003, 0.015),
        speed: rand(0.02, 0.12)
      });
    }

    for (let i = 0; i < DUST_COUNT; i += 1) {
      dust.push({
        x: rand(-100, width + 100),
        y: rand(-100, height + 100),
        r: rand(60, 180),
        vx: rand(-0.08, 0.08),
        vy: rand(-0.05, 0.05),
        alpha: rand(0.05, 0.16),
        hue: rand(190, 280)
      });
    }

    for (let i = 0; i < stars.length; i += 1) {
      stars[i].bx = stars[i].x;
      stars[i].by = stars[i].y;
    }
  }

  function drawNebula(time, ox, oy) {
    const t = time * 0.00015;
    const g1x = width * (0.2 + 0.1 * Math.sin(t)) + ox * 0.35;
    const g1y = height * (0.3 + 0.12 * Math.cos(t * 1.3)) + oy * 0.35;
    const g2x = width * (0.75 + 0.08 * Math.cos(t * 0.9)) + ox * 0.48;
    const g2y = height * (0.7 + 0.09 * Math.sin(t * 1.1)) + oy * 0.48;

    const glow1 = ctx.createRadialGradient(g1x, g1y, 20, g1x, g1y, width * 0.65);
    glow1.addColorStop(0, "rgba(94, 160, 255, 0.22)");
    glow1.addColorStop(1, "rgba(94, 160, 255, 0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(g2x, g2y, 10, g2x, g2y, width * 0.6);
    glow2.addColorStop(0, "rgba(188, 96, 255, 0.17)");
    glow2.addColorStop(1, "rgba(188, 96, 255, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);
  }

  function drawDust(ox, oy) {
    for (let i = 0; i < dust.length; i += 1) {
      const d = dust[i];
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < -220) d.x = width + 220;
      if (d.x > width + 220) d.x = -220;
      if (d.y < -220) d.y = height + 220;
      if (d.y > height + 220) d.y = -220;

      const dx = d.x + ox * 0.22;
      const dy = d.y + oy * 0.22;
      const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, d.r);
      grad.addColorStop(0, `hsla(${d.hue}, 90%, 70%, ${d.alpha})`);
      grad.addColorStop(1, `hsla(${d.hue}, 90%, 70%, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(dx - d.r, dy - d.r, d.r * 2, d.r * 2);
    }
  }

  function drawStars(time, ox, oy) {
    const influenceRadius = 120;
    const influenceSq = influenceRadius * influenceRadius;

    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i];
      s.by += s.speed;
      if (s.by > height + 3) {
        s.by = -3;
        s.bx = rand(0, width);
        s.x = s.bx;
        s.y = s.by;
      }

      if (pointer.active) {
        const dx = s.x - pointer.x;
        const dy = s.y - pointer.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < influenceSq) {
          const dist = Math.sqrt(distSq) || 1;
          const push = ((influenceRadius - dist) / influenceRadius) * 0.9;
          s.vx += (dx / dist) * push;
          s.vy += (dy / dist) * push;
        }
      }

      s.vx += (s.bx - s.x) * 0.006;
      s.vy += (s.by - s.y) * 0.006;
      s.vx *= 0.94;
      s.vy *= 0.94;
      s.x += s.vx;
      s.y += s.vy;

      const twinkle = 0.25 * Math.sin(time * s.pulse + s.x * 0.01);
      const alpha = Math.max(0.08, Math.min(1, s.alpha + twinkle));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x + ox * 0.06, s.y + oy * 0.06, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function tick(time) {
    pointer.x += (pointer.tx - pointer.x) * 0.1;
    pointer.y += (pointer.ty - pointer.y) * 0.1;
    const ox = (pointer.x - width * 0.5) * 0.08;
    const oy = (pointer.y - height * 0.5) * 0.08;

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#090c1b");
    base.addColorStop(0.55, "#10162e");
    base.addColorStop(1, "#1a2138");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    drawNebula(time, ox, oy);
    drawDust(ox, oy);
    drawStars(time, ox, oy);
    rafId = window.requestAnimationFrame(tick);
  }

  function init() {
    resize();
    pointer.x = width * 0.5;
    pointer.y = height * 0.5;
    pointer.tx = pointer.x;
    pointer.ty = pointer.y;
    seed();
    rafId = window.requestAnimationFrame(tick);
  }

  function setPointerPosition(clientX, clientY) {
    pointer.tx = clientX;
    pointer.ty = clientY;
  }

  window.addEventListener("resize", () => {
    resize();
    seed();
  });
  window.addEventListener("pointermove", (event) => {
    pointer.active = true;
    setPointerPosition(event.clientX, event.clientY);
  });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
    setPointerPosition(width * 0.5, height * 0.5);
  });
  window.addEventListener("pointerout", () => {
    pointer.active = false;
    setPointerPosition(width * 0.5, height * 0.5);
  });
  window.addEventListener(
    "touchmove",
    (event) => {
      if (!event.touches || !event.touches.length) return;
      pointer.active = true;
      setPointerPosition(event.touches[0].clientX, event.touches[0].clientY);
    },
    { passive: true }
  );
  window.addEventListener("touchend", () => {
    pointer.active = false;
    setPointerPosition(width * 0.5, height * 0.5);
  });
  window.addEventListener("beforeunload", () => {
    if (rafId) window.cancelAnimationFrame(rafId);
  });

  init();
})();
