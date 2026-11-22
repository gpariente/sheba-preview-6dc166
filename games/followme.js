/*
 * עקוב אחרי (follow_me) — Sheba port of games_src/follow-me.html (v1.3).
 * Kept from the original: the five colourful scenes and figures, the star target, halo, distraction tricks, the grey
 * stop with a 6 s answer window. Changed (Design §1b): figures 1.6× (U 44→72), target 1.15× of that, near-black
 * outline at r×0.10, soft vignette, darker street, text on dark panels, shared frame. No level/language pickers,
 * no "!" copy. Difficulty adapts between scenes (start at level 1, up at ≥70, +2 at ≥90, down below 40).
 * Guy play-test 22.11: figures 0.6× (U 72 → 44), livelier (faster ramp, motion styles: cruise / zig-zag / dart,
 * shorter scenes and transitions, sparkles on a correct stop), the target is never more than OCC_MAX covered.
 */
(function () {
  "use strict";
  const C = { yellow: "#F5C518", teal: "#13A7AE", red: "#E5484D", blue: "#3E7BFA", green: "#2FB36D", purple: "#8E4EC6", orange: "#F0812A", pink: "#E85AA8", white: "#F4F4EF", brown: "#8B5E3C" };
  const MASK = "#858C96", OUT = "rgba(16,20,30,.92)";            // Design: outline .55 → .92
  const UI = { ok: "#4FBF8A", soft: "#F2A66A", brand: "#8CC8FF", neutral: "#C9CBD8" };
  const LW = (r) => Math.max(3, r * .10);                          // Design: r×.07 → r×.10, min 3px

  const TX = {
    scenes: ["רחוב", "כביש", "שמיים", "ים", "להקה"],
    tmsg: ["הדמות נכנסת למכונית צהובה.", "היא יוצאת מהמכונית כבלון.", "הבלון נוחת בים והופך לדג.", "הדג מזנק מהמים והופך לציפור."],
    shift1: "היא משנה צבע וגודל. הכוכב נשאר.", shift2: "היא משנה צבע שוב. הכוכב נשאר.",
    intro: "זו הדמות עם הכוכב. השאירו עליה את האצבע.", go: "עקבו אחריה.",
    hold: "השאירו את האצבע על הדמות עם הכוכב", back: "החזירו את האצבע לדמות",
    check: "עצירה. געו במקום שבו היא נמצאת.", lift: "הרימו את האצבע ועקבו אחריה בעיניים.",
    correct: "נכון. זו היא.", wrong: "לא כאן. הנה היא.", timeUp: "הנה היא.",
    blackout: "הסימנים נעלמו. המשיכו לעקוב.", swapStar: "התנגשות. הכוכב קפץ. הישארו עם הדמות המקורית.", swapColor: "התנגשות. הן החליפו צבעים.",
    thrownWhere: "היא נזרקה. איפה היא עכשיו?", thrown: "היא נזרקה. {m}",
    mut_color: "היא החליפה צבע.", mut_size: "היא שינתה גודל.", mut_mark: "הכוכב שלה הפך לנקודה.", "mut_color+size": "היא שינתה צבע וגם גודל.",
  };
  const tx = (k, v) => { let s = TX[k]; if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]); return s; };

  // Levels from the original (n: figures, spd: speed, …). Sheba starts at 1 (7 figures) and adapts per scene.
  const LV = {
    1: { n: 7, spd: 55, same: 0, changers: 0, dotP: 0, halo: true, bigP: 0, dash: 0, flash: 0, hold: 0, blk: 0,
      pool: ["red", "blue", "green", "purple", "pink", "white"], plan: [[], [], [], [], []], thr: null },
    2: { n: 8, spd: 65, same: 1, changers: 0, dotP: .15, halo: true, bigP: .1, dash: 0, flash: 0, hold: 3, blk: 2,
      pool: ["red", "blue", "green", "purple", "pink", "white"], plan: [[], [], ["blackout"], [], ["blackout"]], thr: null },
    3: { n: 9, spd: 75, same: 1, changers: 1, dotP: .25, halo: false, bigP: .12, dash: 1, flash: 7, hold: 3.5, blk: 2.5,
      pool: ["red", "blue", "green", "purple", "pink", "white", "orange"], plan: [[], ["swapStar"], ["blackout"], [], ["blackout", "swapStar"]],
      thr: { cd: 9, hold: 3.5, trailA: .9, trailT: 1.5, dist: [.38, .52], muts: ["color", "size"], tell: true } },
    4: { n: 10, spd: 85, same: 2, changers: 1, dotP: .3, halo: false, bigP: .15, dash: 1, flash: 5.5, hold: 3.5, blk: 2.5,
      pool: ["red", "blue", "green", "purple", "pink", "white", "orange"], plan: [[], ["swapStar"], ["blackout"], ["swapStar"], ["blackout", "swapStar"]],
      thr: { cd: 7, hold: 4, trailA: .85, trailT: 1.3, dist: [.42, .6], muts: ["color", "size"], tell: true } },
    5: { n: 11, spd: 100, same: 3, changers: 2, dotP: .5, halo: false, bigP: .22, dash: 2, flash: 4.2, hold: 4, blk: 3,
      pool: ["red", "blue", "green", "purple", "pink", "white", "orange", "brown"],
      plan: [[], ["swapStar", "shadow"], ["swapColor", "blackout"], ["shadow", "swapStar"], ["swapColor", "blackout", "swapStar"]],
      thr: { cd: 5.5, hold: 5, trailA: .6, trailT: .9, dist: [.46, .68], muts: ["color", "size", "mark"], tell: true } },
    6: { n: 12, spd: 115, same: 4, changers: 2, dotP: .65, halo: false, bigP: .3, dash: 3, flash: 3.2, hold: 4.5, blk: 3.5,
      pool: ["red", "blue", "green", "purple", "pink", "white", "orange", "brown"],
      plan: [[], ["swapStar", "shadow"], ["swapColor", "blackout"], ["shadow", "swapStar"], ["swapColor", "blackout", "swapStar"]],
      thr: { cd: 4.5, hold: 5.5, trailA: .35, trailT: .5, dist: [.5, .75], muts: ["color", "size", "mark", "color+size"], tell: false } },
  };
  const TOP = 6;
  const SCENES = [
    { kind: "person", bg: "street", sz: 1, sp: .8 },
    { kind: "car", bg: "road", sz: 1.05, sp: 1.25 },
    { kind: "balloon", bg: "sky", sz: 1.05, sp: .85, shift: ["yellow", "teal"], grow: true, shiftMsg: "shift1" },
    { kind: "fish", bg: "sea", sz: 1, sp: .75, tScale: .85, bigBoost: .35 },   // tScale .72 → .85: the target stays readable for older eyes (big decoys kept at .35)
    { kind: "bird", bg: "dusk", sz: .95, sp: 1.05, shift: ["teal", "orange"], excl: ["purple"], flock: true, shiftMsg: "shift2" },
  ];
  const NPH = SCENES.length, EV_TIMES = [.12, .58, .8], TRANS = 1.8, CHECK_SEC = 6, INTRO_SEC = 2.2, REVEAL_SEC = 1.3;
  const LIFT_SEC = { 1: 1.8, 2: 2.2, 3: 2.5, 4: 2.8, 5: 3, 6: 3.4 };
  const LIFT_SPEED = { 1: 1.3, 2: 1.4, 3: 1.5, 4: 1.6, 5: 1.8, 6: 2 };
  const LIFT_MINGLE = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4 };
  const UP_AT = 70, JUMP_AT = 90, DOWN_BELOW = 40;              // faster ramp (Guy: boring): ≥90 → two levels up
  const U_K = .053, U_MIN = 16, U_MAX = 44;                         // figure unit: 0.6× the build-2 size (.088 / 72 px)
  const EXTRA_FIGS = 2;                                             // smaller figures → two more on screen
  const SPEED_K = 1.15;                                             // a little quicker overall
  const OCC_MAX = .30;                                              // max share of the target another figure may cover
  const HIT_MIN = 64, PICK_MIN = 96;                                // finger tolerances in px (figures are smaller now)
  const TARGET_X = 1.15;                                           // Design: the target is 1.15× the figure size

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = (x) => Math.floor(x + 0.5 + 1e-9);
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  function hex(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  function mix(a, b, k) { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); }
  function shade(h, k) { return k < 0 ? mix(h, "#000000", -k) : mix(h, "#ffffff", k); }
  const easeOutBack = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  // ── Figures (original routines; outline + star size adjusted) ────────────
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function star(c, x, y, r) { const R0 = r * .46, ri = R0 * .42; c.lineWidth = Math.max(2.5, r * .09); c.strokeStyle = "#18212C"; c.fillStyle = "#FFFFFF";
    c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? ri : R0; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); c.fill(); c.stroke(); }
  function mark(c, x, y, r, type) {
    if (!type) return;
    if (type === "star") return star(c, x, y, r);
    c.lineWidth = Math.max(2.5, r * .09); c.strokeStyle = "#18212C"; c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(x, y, r * .17, 0, 7); c.fill(); c.stroke();
  }
  function person(c, x, y, r, col, ph, face, mk) {
    c.save(); c.translate(x, y); c.scale(face, 1); c.lineCap = "round"; c.lineWidth = r * .26; c.strokeStyle = shade(col, -.45);
    const s = Math.sin(ph) * .28 * r;
    c.beginPath(); c.moveTo(-.18 * r, .6 * r); c.lineTo(-.18 * r + s, 1.05 * r); c.moveTo(.18 * r, .6 * r); c.lineTo(.18 * r - s, 1.05 * r); c.stroke();
    c.lineWidth = LW(r); c.strokeStyle = OUT; c.fillStyle = col;
    rr(c, -.44 * r, -.25 * r, .88 * r, .98 * r, .36 * r); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -.64 * r, .36 * r, 0, 7); c.fill(); c.stroke();
    c.restore(); mark(c, x, y + .2 * r, r, mk);
  }
  function car(c, x, y, r, col, ang, mk) {
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = "#111";
    for (const [ax, ay] of [[.62, .6], [.62, -.6], [-.62, .6], [-.62, -.6]]) { rr(c, ax * r - .24 * r, ay * r - .1 * r, .48 * r, .2 * r, .06 * r); c.fill(); }
    c.lineWidth = LW(r); c.strokeStyle = OUT; c.fillStyle = col;
    rr(c, -1.1 * r, -.6 * r, 2.2 * r, 1.2 * r, .36 * r); c.fill(); c.stroke();
    c.fillStyle = "rgba(22,32,44,.78)"; rr(c, .3 * r, -.46 * r, .36 * r, .92 * r, .12 * r); c.fill(); rr(c, -.86 * r, -.42 * r, .24 * r, .84 * r, .1 * r); c.fill();
    c.fillStyle = "#FFF6C8"; c.beginPath(); c.arc(1.02 * r, -.38 * r, .08 * r, 0, 7); c.arc(1.02 * r, .38 * r, .08 * r, 0, 7); c.fill();
    mark(c, -.12 * r, 0, r, mk); c.restore();
  }
  function balloon(c, x, y, r, col, ph, mk) {
    c.save(); c.translate(x, y); c.strokeStyle = "rgba(30,36,46,.8)"; c.lineWidth = Math.max(2, r * .05);
    c.beginPath(); c.moveTo(0, 1.05 * r); c.quadraticCurveTo(Math.sin(ph) * .45 * r, 1.5 * r, Math.sin(ph + 1) * .2 * r, 2 * r); c.stroke();
    c.fillStyle = shade(col, -.2); c.beginPath(); c.moveTo(-.12 * r, 1.08 * r); c.lineTo(.12 * r, 1.08 * r); c.lineTo(0, .94 * r); c.fill();
    c.lineWidth = LW(r); c.strokeStyle = OUT; c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, .84 * r, r, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.ellipse(-.32 * r, -.42 * r, .16 * r, .3 * r, -.4, 0, 7); c.fill();
    c.restore(); mark(c, x, y + .06 * r, r, mk);
  }
  function fish(c, x, y, r, col, ang, ph, mk) {
    c.save(); c.translate(x, y); c.rotate(ang); if (Math.cos(ang) < 0) c.scale(1, -1);
    const w = Math.sin(ph * 2) * .22 * r;
    c.lineWidth = LW(r); c.strokeStyle = OUT; c.fillStyle = shade(col, -.15);
    c.beginPath(); c.moveTo(-.72 * r, 0); c.lineTo(-1.3 * r, -.52 * r + w); c.lineTo(-1.18 * r, w); c.lineTo(-1.3 * r, .52 * r + w); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-.1 * r, -.48 * r); c.quadraticCurveTo(.1 * r, -.85 * r, .35 * r, -.46 * r); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r, .56 * r, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(.58 * r, -.14 * r, .14 * r, 0, 7); c.fill();
    c.fillStyle = "#18212C"; c.beginPath(); c.arc(.62 * r, -.14 * r, .07 * r, 0, 7); c.fill();
    mark(c, -.12 * r, .04 * r, r, mk); c.restore();
  }
  function bird(c, x, y, r, col, ang, ph, mk) {
    const f = Math.cos(ang) < 0 ? -1 : 1;
    c.save(); c.translate(x, y); c.scale(f, 1); c.rotate(Math.atan2(Math.sin(ang), Math.abs(Math.cos(ang))) * .5);
    const fl = Math.sin(ph * 2.6);
    c.lineWidth = LW(r); c.strokeStyle = OUT; c.fillStyle = shade(col, -.2);
    c.beginPath(); c.moveTo(-.7 * r, 0); c.lineTo(-1.2 * r, -.3 * r); c.lineTo(-1.15 * r, .25 * r); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, .05 * r, .82 * r, .45 * r, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.arc(.7 * r, -.2 * r, .32 * r, 0, 7); c.fill(); c.stroke();
    c.fillStyle = "#F2A33A"; c.beginPath(); c.moveTo(.98 * r, -.26 * r); c.lineTo(1.32 * r, -.16 * r); c.lineTo(.98 * r, -.06 * r); c.fill();
    c.fillStyle = "#18212C"; c.beginPath(); c.arc(.78 * r, -.26 * r, .06 * r, 0, 7); c.fill();
    mark(c, -.06 * r, .12 * r, r, mk);
    c.fillStyle = shade(col, -.12); c.beginPath(); c.moveTo(-.38 * r, -.12 * r); c.lineTo(.3 * r, -.12 * r); c.lineTo(-.18 * r + .1 * r * fl, -.18 * r - 1.05 * r * fl); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  function drawKind(c, kind, x, y, r, col, o, mk) {
    if (kind === "person") person(c, x, y, r, col, o.ph, Math.cos(o.ang) >= 0 ? 1 : -1, mk);
    else if (kind === "car") car(c, x, y, r, col, o.ang, mk);
    else if (kind === "balloon") balloon(c, x, y, r, col, o.ph, mk);
    else if (kind === "fish") fish(c, x, y, r, col, o.ang, o.ph, mk);
    else bird(c, x, y, r, col, o.ang, o.ph, mk);
  }

  // ── Scene backgrounds (original; street darker, vignette added) ──────────
  function paintBg(x, name, W, H, U) {
    const clouds = (n, col) => { x.fillStyle = col; for (let i = 0; i < n; i++) { const cx = rnd(0, W), cy = rnd(0, H), s = rnd(U * 1.2, U * 2.2); for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(cx + k * s * .7, cy + (k % 2) * s * .2, s, s * .55, 0, 0, 7); x.fill(); } } };
    let g;
    if (name === "street") {
      x.fillStyle = "#C3CAD2"; x.fillRect(0, 0, W, H);
      const tl = Math.max(36, U * 2.2); x.strokeStyle = "rgba(110,120,132,.35)"; x.lineWidth = 1.2;
      for (let i = 0; i < H / tl + 1; i++) { const off = i % 2 ? tl / 2 : 0; x.beginPath(); x.moveTo(0, i * tl); x.lineTo(W, i * tl); x.stroke(); for (let j = -1; j < W / tl + 1; j++) { x.beginPath(); x.moveTo(j * tl + off, i * tl); x.lineTo(j * tl + off, i * tl + tl); x.stroke(); } }
    } else if (name === "road") {
      x.fillStyle = "#3A3F47"; x.fillRect(0, 0, W, H); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = Math.max(2, U * .09); x.setLineDash([U * 1.4, U * 1.2]);
      const lanes = Math.max(3, Math.round(H / (U * 3))); for (let i = 1; i < lanes; i++) { x.beginPath(); x.moveTo(0, H * i / lanes); x.lineTo(W, H * i / lanes); x.stroke(); }
      x.setLineDash([]);
    } else if (name === "sky") {
      g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#6FB2E0"); g.addColorStop(1, "#C9E4F6"); x.fillStyle = g; x.fillRect(0, 0, W, H); clouds(6, "rgba(255,255,255,.55)");
    } else if (name === "sea") {
      g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2A84BC"); g.addColorStop(1, "#0E3A5E"); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = "rgba(255,255,255,.06)"; for (let i = 0; i < 5; i++) { const sx = rnd(0, W); x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + U * 2, 0); x.lineTo(sx + U * 7, H); x.lineTo(sx + U * 3, H); x.fill(); }
      x.strokeStyle = "rgba(255,255,255,.22)"; x.lineWidth = 1.5; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(rnd(0, W), rnd(0, H), rnd(2, U * .25), 0, 7); x.stroke(); }
      x.fillStyle = "#C9B48A"; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= 10; i++) x.lineTo(W * i / 10, H - U * .6 - Math.sin(i * 1.7) * U * .3); x.lineTo(W, H); x.fill();
    } else {
      g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#4E5FA8"); g.addColorStop(1, "#C7B7E6"); x.fillStyle = g; x.fillRect(0, 0, W, H); clouds(5, "rgba(255,255,255,.18)");
    }
    const v = x.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); v.addColorStop(0, "rgba(8,10,24,0)"); v.addColorStop(1, "rgba(8,10,24,.28)"); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }

  // ── Instruction diagram: the street with the star figure, then the five forms ──
  function diagram(el) {
    const W = 700, H = 560, DPR = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement("canvas"); cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + "px"; cv.style.height = H + "px";
    el.appendChild(cv); const c = cv.getContext("2d"); c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.save(); c.beginPath(); c.roundRect(50, 40, 600, 300, 16); c.clip(); c.translate(50, 40);
    paintBg(c, "street", 600, 300, 44);
    const o = { ph: .6, ang: 0 };
    person(c, 110, 90, 40, C.pink, .3, 1, null); person(c, 480, 220, 40, C.blue, 1.4, -1, null); person(c, 500, 80, 40, C.white, .8, -1, "dot");
    const g = c.createRadialGradient(300, 160, 0, 300, 160, 100); g.addColorStop(0, "rgba(255,244,190,.55)"); g.addColorStop(1, "rgba(255,244,190,0)"); c.fillStyle = g; c.beginPath(); c.arc(300, 160, 100, 0, 7); c.fill();
    drawKind(c, "person", 300, 160, 50, C.yellow, o, "star");
    c.lineWidth = 13; c.strokeStyle = "#0D1130"; c.beginPath(); c.arc(300, 165, 84, 0, 7); c.stroke();
    c.lineWidth = 6; c.strokeStyle = UI.ok; c.beginPath(); c.arc(300, 165, 84, 0, 7); c.stroke();
    c.restore();
    const kinds = [["person", "street", C.yellow], ["car", "road", C.yellow], ["balloon", "sky", C.teal], ["fish", "sea", C.teal], ["bird", "dusk", C.orange]];
    kinds.forEach(([k, bg, col], i) => {
      const x = 650 - 108 - i * 123, y = 390;            // right to left: the order they appear
      c.save(); c.beginPath(); c.roundRect(x, y, 108, 108, 12); c.clip(); c.translate(x, y); paintBg(c, bg, 108, 108, 18);
      drawKind(c, k, 54, k === "balloon" ? 46 : 56, k === "car" ? 22 : 28, col, { ph: .6, ang: Math.PI }, "star"); c.restore();
    });
  }

  function create(ctx) {
    const field = ctx.field;
    field.style.background = "#000"; field.style.borderColor = "rgba(236,237,245,.22)";
    field.querySelector(".fb").style.display = "none";
    field.insertAdjacentHTML("beforeend", `<canvas id="fmcv" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <div class="ov" id="fmStage" style="top:24px;right:24px;padding:14px 26px;font:500 28px var(--t)"></div>
      <div class="ov" id="fmPrompt" style="bottom:24px;left:50%;transform:translateX(-50%);padding:16px 40px;font:500 36px var(--t);white-space:nowrap;display:flex;align-items:center;gap:16px"></div>`);
    const cv = field.querySelector("#fmcv"), ctx2 = cv.getContext("2d");
    const stageEl = field.querySelector("#fmStage"), promptEl = field.querySelector("#fmPrompt");
    const W = field.clientWidth, H = field.clientHeight, DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx2.setTransform(DPR, 0, 0, DPR, 0, 0);
    const U = clamp(Math.min(W, H) * U_K, U_MIN, U_MAX);
    const BG = {};
    for (const s of SCENES) { const a = document.createElement("canvas"); a.width = W * DPR; a.height = H * DPR; const x = a.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0); paintBg(x, s.bg, W, H, U); BG[s.bg] = a; }
    const SCENE_SEC = ctx.cfg.FOLLOW_SCENE_SECONDS || 11;
    let cfg = null, G = null, raf = 0, last = 0, dead = false;
    const P = { x: -999, y: -999, active: false };

    // prompt panel: banners override the default line for a while (game time)
    let banner = null;
    function say(txt, kind, ms) { banner = { txt, kind: kind || "", until: ms ? G.clock + ms / 1000 : Infinity }; }
    function sayClear() { banner = null; }
    let lastPrompt = "";
    function drawPrompt() {
      let txt, kind;
      if (banner && G.clock < banner.until) { txt = banner.txt; kind = banner.kind; }
      else if (G.state === "run" || G.state === "trans") { if (G.on) { txt = TX.hold; kind = "ok"; } else if (G.offT > .5) { txt = TX.back; kind = "off"; } else { txt = TX.hold; kind = ""; } }
      else { txt = banner ? banner.txt : ""; kind = banner ? banner.kind : ""; }
      const key = txt + "|" + kind; if (key === lastPrompt) return; lastPrompt = key;
      const ic = kind === "ok" ? ctx.icon.check(34) : kind === "bad" ? ctx.icon.cross(30) : kind === "off" ? ctx.icon.dashed(30, "#C9CBD8") : "";
      promptEl.style.color = kind === "good" ? UI.ok : kind === "bad" ? UI.soft : "#ECEDF5";
      promptEl.innerHTML = (kind === "good" ? ctx.icon.check(34) : ic) + `<span>${ctx.esc(txt)}</span>`;
      promptEl.style.display = txt ? "flex" : "none";
    }
    function setChip() { (G.sceneLv = G.sceneLv || [])[G.phase] = G.level; stageEl.textContent = TX.scenes[G.phase]; }   // scene name only, no "שלב N מתוך 5" (Design build2 P1-1; Guy to confirm)

    function setLevel(l) { G.level = clamp(l, 1, TOP); G.maxLevel = Math.max(G.maxLevel, G.level); cfg = Object.assign({}, LV[G.level], { dur: SCENE_SEC }); G.thr = cfg.thr; }
    const radius = (o) => U * SCENES[G.phase].sz * o.scale * (o.isT ? TARGET_X : 1);
    function newObj(kind, color, isT) {
      // motion style: cruise (smooth), zig (weaving), dart (bursts of speed) — the target cruises or weaves
      const style = isT ? (Math.random() < .5 ? "cruise" : "zig") : pick(["cruise", "zig", "dart", "cruise"]);
      return { x: rnd(U * 2, W - U * 2), y: rnd(U * 2, H - U * 2), ang: rnd(0, 6.28), tr: 0, sp: isT ? 1 : rnd(.75, 1.25), ph: rnd(0, 6), kind, color, mark: isT ? "star" : null,
        scale: 1, alpha: 1, z: isT ? .5 : Math.random(), isT, changer: false, off: rnd(-.35, .35), popT: 0, style, mt: rnd(0, 6.28), mf: rnd(.7, 1.4) };
    }
    function makeDecoys(pi) {
      const sc = SCENES[pi], kind = sc.kind, out = [], n = cfg.n - 1 + EXTRA_FIGS, Tg = G.target;
      const from = Tg.color, to = sc.shift ? C[sc.shift[1]] : null;
      const pool = cfg.pool.filter((k) => !(sc.excl || []).includes(k)).map((k) => C[k]).filter((c) => c !== from && c !== to);
      const bigP = cfg.bigP + (sc.bigBoost || 0) * (cfg.bigP > 0 ? 1 : .5);
      for (let i = 0; i < n; i++) {
        let col;
        if (i < cfg.same) col = to && i % 2 ? to : from;
        else if (!cfg.same && to && i === 0) col = to;
        else col = pick(pool);
        const o = newObj(kind, col, false);
        for (let k = 0; k < 20 && Math.hypot(o.x - Tg.x, o.y - Tg.y) < U * 4; k++) { o.x = rnd(U * 2, W - U * 2); o.y = rnd(U * 2, H - U * 2); }
        if (Math.random() < cfg.dotP) o.mark = "dot";
        if (Math.random() < bigP) o.scale = rnd(1.3, 1.6);
        if (i >= n - cfg.dash) o.sp = rnd(1.8, 2.3);
        o.baseMark = o.mark; out.push(o);
      }
      if (to) { let c = cfg.changers; for (const o of out) { if (c > 0 && o.color === from && o.sp < 1.5) { o.changer = true; c--; } } }
      return out;
    }
    const sortZ = (a) => a.sort((p, q) => p.z - q.z);

    function startGame() {
      G = { level: 1, maxLevel: 1, state: "intro", phase: 0, t: 0, clock: 0, objs: [], next: null, bursts: [], onT: 0, totT: 0, stOn: 0, stTot: 0, offT: 0, pingT: 0,
        correct: 0, timeouts: 0, shift: null, chk: { choice: null }, evQ: [], swap: null, fly: null, blackout: 0, flashT: 3, flockAng: rnd(0, 6.28),
        throws: 0, thrCD: 3, sinceThrow: 0, mut: null, trail: null, stops: 0, stagePct: [], finished: false, sparks: [] };
      setLevel(1);
      G.target = newObj("person", C.yellow, true); G.target.x = W / 2; G.target.y = H / 2;
      G.objs = sortZ([G.target, ...makeDecoys(0)]);
      setChip(); say(TX.intro, "");
    }
    function beginRun() {
      G.state = "run"; G.t = 0; G.shift = null; G.stOn = 0; G.stTot = 0;
      G.evQ = (cfg.plan[G.phase] || []).map((type, i) => ({ type, at: cfg.dur * EV_TIMES[i] }));
    }

    // distraction events (original)
    const decoys = () => G.objs.filter((o) => !o.isT && o.alpha > 0);
    function pickPartner() {
      const Tg = G.target, d = decoys().filter((o) => !o.hunt && !o.shadow && o.sp < 1.5);
      const same = d.filter((o) => o.color === Tg.color);
      const list = (same.length ? same : d).sort((a, b) => Math.hypot(a.x - Tg.x, a.y - Tg.y) - Math.hypot(b.x - Tg.x, b.y - Tg.y));
      return list[Math.min(list.length - 1, 1)] || list[0];
    }
    function fireEvent(type) {
      if (type === "blackout") { G.blackout = cfg.blk; say(TX.blackout, "warn", 1600); return; }
      if (G.swap) return;
      const o = pickPartner(); if (!o) return;
      if (type === "shadow") { o.shadow = { t: 5, side: Math.random() < .5 ? 1 : -1 }; return; }
      o.hunt = { t: 0, type };
    }
    function collide(o, type) {
      restoreMut(true);
      const Tg = G.target, n = Math.atan2(o.y - Tg.y, o.x - Tg.x);
      o.ang = n + rnd(-.5, .5); Tg.ang = n + Math.PI + rnd(-.5, .5); o.tr = Tg.tr = 0; o.hunt = null;
      G.bursts.push({ x: (o.x + Tg.x) / 2, y: (o.y + Tg.y) / 2, t: 0, col: "#FFFFFF" });
      if (type === "ram") { throwTarget(o, true); return; }
      G.swap = { o, type, t: cfg.hold };
      if (type === "swapStar") { Tg.mark = null; G.fly = { from: Tg, to: o, t: 0, back: false }; say(TX.swapStar, "warn", 1800); }
      else { const c = Tg.color; Tg.color = o.color; o.color = c; say(TX.swapColor, "warn", 1800); }
      if (G.thr) throwTarget(o, false);
    }
    function landingSpot(o) {
      const Tg = G.target, m = U * 2.4, D = Math.min(W, H) * rnd(G.thr.dist[0], G.thr.dist[1]);
      const away = Math.atan2(Tg.y - o.y, Tg.x - o.x); let best = null, bd = -1;
      for (let i = 0; i < 16; i++) { const a = away + rnd(-1.1, 1.1), x = clamp(Tg.x + Math.cos(a) * D, m, W - m), y = clamp(Tg.y + Math.sin(a) * D, m, H - m), d = Math.hypot(x - Tg.x, y - Tg.y);
        if (d > bd) { bd = d; best = { x, y }; } if (d >= D * .9) return { x, y }; }
      return best;
    }
    function throwTarget(o, doMut) {
      const Tg = G.target; if (Tg.throw) return;
      const n = Math.atan2(o.y - Tg.y, o.x - Tg.x); o.ang = n + rnd(-.4, .4); o.tr = 0;
      const L = landingSpot(o);
      Tg.throw = { x0: Tg.x, y0: Tg.y, x1: L.x, y1: L.y, t: 0, dur: .55, doMut, spinDir: Math.random() < .5 ? -1 : 1 };
      G.trail = { x0: Tg.x, y0: Tg.y, t: 0 };
      G.bursts.push({ x: (o.x + Tg.x) / 2, y: (o.y + Tg.y) / 2, t: 0, col: "#FFFFFF" });
      G.throws++; G.thrCD = G.thr.cd; G.sinceThrow = 0;
      if (doMut && !G.thr.tell) say(TX.thrownWhere, "warn", 1400);
    }
    function mutate() {
      const Tg = G.target, th = G.thr; restoreMut(true);
      let types = th.muts.filter((x) => !(x === "mark" && (G.swap || G.fly)));
      if (G.swap && G.swap.type === "swapColor") types = types.filter((x) => x === "size" || x === "mark");
      if (!types.length) return;
      const type = pick(types), m = { type, t: th.hold, color: Tg.color, scale: Tg.scale, mark: Tg.mark };
      if (type.includes("color")) { const cnt = {}; for (const o of decoys()) if (o.color !== Tg.color) cnt[o.color] = (cnt[o.color] || 0) + 1; const cols = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]); Tg.color = cols[0] || C.blue; }
      if (type.includes("size")) Tg.scale = Tg.scale * (Math.random() < .5 ? .7 : 1.4);
      if (type === "mark") Tg.mark = "dot";
      G.mut = m;
      if (th.tell) say(tx("thrown", { m: TX["mut_" + type] }), "warn", 1800);
    }
    function restoreMut(instant) {
      const m = G.mut; if (!m) return; const Tg = G.target;
      if (m.type.includes("color") && !(G.swap && G.swap.type === "swapColor")) Tg.color = m.color;
      if (m.type.includes("size")) Tg.scale = m.scale;
      if (m.type === "mark" && !G.swap && !G.fly) Tg.mark = "star";
      if (!instant) G.bursts.push({ x: Tg.x, y: Tg.y, t: 0, col: Tg.color, soft: true });
      G.mut = null;
    }
    function restoreSwap(instant) {
      const s = G.swap; if (!s) return; const Tg = G.target, o = s.o;
      if (s.type === "swapStar") { o.mark = o.baseMark; if (instant) { Tg.mark = "star"; G.fly = null; } else { Tg.mark = null; G.fly = { from: o, to: Tg, t: 0, back: true }; } }
      else { const c = Tg.color; Tg.color = o.color; o.color = c; }
      if (!instant) G.bursts.push({ x: Tg.x, y: Tg.y, t: 0, col: Tg.color, soft: true });
      G.swap = null;
    }
    function clearEvents() {
      const Tg = G.target; if (Tg.throw) { Tg.x = Tg.throw.x1; Tg.y = Tg.throw.y1; Tg.throw = null; } Tg.spin = 0; G.trail = null;
      restoreMut(true); restoreSwap(true); G.fly = null; G.blackout = 0; G.evQ = [];
      for (const o of G.objs) { o.hunt = null; o.shadow = null; o.popT = 0; }
      Tg.mark = "star";
    }
    function steer(o, dt, spd) {
      const Tg = G.target;
      if (o.throw) {
        const th = o.throw; th.t += dt; const k = clamp(th.t / th.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
        o.x = th.x0 + (th.x1 - th.x0) * e; o.y = th.y0 + (th.y1 - th.y0) * e - Math.sin(k * Math.PI) * U * 1.2;
        o.spin = th.spinDir * k * Math.PI * 2 * 1.5; o.ph += dt * 8;
        if (k >= 1) { o.throw = null; o.spin = 0; if (G.trail) { G.trail.x1 = o.x; G.trail.y1 = o.y; } o.ang = rnd(0, 6.28); o.tr = 0; G.bursts.push({ x: o.x, y: o.y, t: 0, col: "#FFFFFF" }); if (th.doMut) mutate(); }
        return;
      }
      if (o.shadow) {
        o.shadow.t -= dt; const r = radius(Tg) * 2.6, px = -Math.sin(Tg.ang) * r * o.shadow.side, py = Math.cos(Tg.ang) * r * o.shadow.side;
        const k = Math.min(1, 3 * dt); o.x += (Tg.x + px - o.x) * k; o.y += (Tg.y + py - o.y) * k; o.ang += angDiff(Tg.ang, o.ang) * k; o.ph += spd * dt / U * 2;
        if (o.shadow.t <= 0) { o.shadow = null; o.ang += (Math.random() < .5 ? 1 : -1) * 1.2; }
        return;
      }
      o.tr += (Math.random() - .5) * 4 * dt; o.tr = clamp(o.tr, -1.4, 1.4); o.ang += o.tr * dt;
      let mult = 1;
      if (o.hunt) { o.hunt.t += dt; const want = Math.atan2(Tg.y - o.y, Tg.x - o.x); o.ang += angDiff(want, o.ang) * Math.min(1, 6 * dt); mult = 1.5;
        if (!Tg.throw && Math.hypot(Tg.x - o.x, Tg.y - o.y) < (radius(o) + radius(Tg)) * .75) collide(o, o.hunt.type); else if (o.hunt && o.hunt.t > 4.5) o.hunt = null; }
      if (o.kind === "bird" && SCENES[G.phase].flock && !o.hunt) o.ang += angDiff(G.flockAng + o.off, o.ang) * Math.min(1, 1.6 * dt);
      const m = U * 2.2; let want = null;
      if (o.x < m) want = 0; else if (o.x > W - m) want = Math.PI;
      if (o.y < m) want = want === null ? Math.PI / 2 : (want + Math.PI / 2) / 2; else if (o.y > H - m) want = want === null ? -Math.PI / 2 : (want === Math.PI ? -3 * Math.PI / 4 : -Math.PI / 4);
      if (want !== null) { o.ang += angDiff(want, o.ang) * Math.min(1, 5 * dt); o.tr *= .9; }
      o.mt += dt * o.mf;
      if (o.style === "zig" && !o.hunt) o.ang += Math.sin(o.mt * 2.4) * 1.6 * dt;
      if (o.style === "dart" && !o.hunt) mult *= .7 + 1.6 * Math.pow(Math.max(0, Math.sin(o.mt * 1.3)), 6);
      const v = spd * o.sp * mult; o.x += Math.cos(o.ang) * v * dt; o.y += Math.sin(o.ang) * v * dt;
      if (o.kind === "balloon") o.x += Math.sin(o.ph * .5) * U * .4 * dt;
      if (o.kind === "fish") o.y += Math.sin(o.ph * .4) * U * .3 * dt;
      o.x = clamp(o.x, U, W - U); o.y = clamp(o.y, U * 1.2, H - U * 1.2);
      o.ph += v * dt / U * (o.kind === "balloon" ? .6 : o.kind === "bird" ? 1.4 : 2.2);
    }
    const baseSpd = () => cfg.spd * SPEED_K * clamp(Math.min(W, H) / 700, .55, 1.4);
    function track(dt, count) {
      const Tg = G.target;
      const on = P.active && Math.hypot(P.x - Tg.x, P.y - Tg.y) < Math.max(HIT_MIN, Math.max(radius(Tg), U * .9) * 1.5 * (Tg.kind === "car" ? 1.15 : 1));
      if (count) { G.totT += dt; G.stTot += dt; if (on) { G.onT += dt; G.stOn += dt; G.offT = 0; } else G.offT += dt; }
      if (cfg.halo && G.offT > 1.6) { G.pingT -= dt; if (G.pingT <= 0) { G.bursts.push({ x: Tg.x, y: Tg.y, t: 0, col: Tg.color, soft: true }); G.pingT = 1.6; } } else G.pingT = 0;
      G.on = on;
    }
    function update(dt) {
      if (!G || G.finished) return;
      G.t += dt; G.clock += dt;
      for (const b of G.bursts) b.t += dt; G.bursts = G.bursts.filter((b) => b.t < .9);
      for (const k of G.sparks) { k.t += dt; k.x += k.vx * dt; k.y += k.vy * dt; k.vy += 900 * dt; } G.sparks = G.sparks.filter((k) => k.t < 1.1);
      const sc = SCENES[G.phase];
      if (G.state === "intro") {
        for (const o of G.objs) if (!o.isT) steer(o, dt, baseSpd() * sc.sp * .5);
        track(dt, false);
        if (G.t >= INTRO_SEC) { beginRun(); say(TX.go, "", 1200); }
      } else if (G.state === "run") {
        G.flockAng += (Math.random() - .5) * 1.2 * dt;
        const fx = G.objs.reduce((s, o) => s + o.x, 0) / G.objs.length, fy = G.objs.reduce((s, o) => s + o.y, 0) / G.objs.length;
        G.flockAng += angDiff(Math.atan2(H / 2 - fy, W / 2 - fx), G.flockAng) * Math.min(1, .25 * dt) * (Math.hypot(W / 2 - fx, H / 2 - fy) / (Math.min(W, H) * .25));
        for (const o of G.objs) steer(o, dt, baseSpd() * sc.sp);
        for (const o of G.objs) if (o.popT > 0) o.popT -= dt;
        track(dt, true);
        while (G.evQ.length && G.t >= G.evQ[0].at) fireEvent(G.evQ.shift().type);
        if (G.thr) {
          const Tg = G.target; G.thrCD -= dt; G.sinceThrow += dt;
          if (G.mut) { G.mut.t -= dt; if (G.mut.t <= 0) restoreMut(false); }
          const shifting = G.shift && G.shift.t < 2;
          if (!Tg.throw && G.thrCD <= 0 && !shifting && G.t > 2 && G.t < cfg.dur - 1.5) {
            for (const o of decoys()) { if (o.hunt || o.shadow || (G.swap && G.swap.o === o)) continue;
              if (Math.hypot(o.x - Tg.x, o.y - Tg.y) < (radius(o) + radius(Tg)) * .72) { restoreMut(true); throwTarget(o, true); break; } }
            if (!Tg.throw && G.sinceThrow > G.thr.cd * 1.8 && !G.swap && !decoys().some((o) => o.hunt)) { const o = pickPartner(); if (o) { o.hunt = { t: 0, type: "ram" }; G.sinceThrow = 0; } }
          }
        }
        if (G.trail) { G.trail.t += dt; if (!G.thr || G.trail.t > G.thr.trailT + .6) G.trail = null; }
        if (G.blackout > 0) G.blackout -= dt;
        if (G.swap) { G.swap.t -= dt; if (G.swap.t <= 0) restoreSwap(false); }
        if (G.fly) { G.fly.t += dt; if (G.fly.t >= .45) { if (G.fly.back) G.target.mark = "star"; else G.fly.to.mark = "star"; G.fly = null; } }
        if (cfg.flash) { G.flashT -= dt; if (G.flashT <= 0) { G.flashT = rnd(cfg.flash * .7, cfg.flash * 1.3); const d = decoys(); if (d.length) { const o = pick(d); o.popT = .5; G.bursts.push({ x: o.x, y: o.y, t: 0, col: "#FFFFFF", flash: true }); } } }
        if (sc.shift && !G.shift && G.t > cfg.dur * .5) {
          restoreSwap(true); restoreMut(true); if (G.thr) G.thrCD = Math.max(G.thrCD, 2.2); G.shift = { t: 0, from: C[sc.shift[0]], to: C[sc.shift[1]], grow: sc.grow };
          G.bursts.push({ x: G.target.x, y: G.target.y, t: 0, col: G.shift.to }); say(TX[sc.shiftMsg], "", 1800);
        }
        if (G.shift) { G.shift.t += dt; const k = clamp(G.shift.t / 1.6, 0, 1), s = G.shift;
          if (!G.swap && !G.mut) { G.target.color = mix(s.from, s.to, k); if (s.grow) G.target.scale = 1 + .15 * k + .3 * Math.sin(k * Math.PI); }
          for (const o of G.objs) if (o.changer && !(G.swap && G.swap.o === o)) o.color = mix(s.from, s.to, k); }
        if (G.t >= cfg.dur) {
          clearEvents();
          if (G.shift) { const s = G.shift; G.target.color = s.to; for (const o of G.objs) if (o.changer) o.color = s.to; }
          G.stagePct.push(G.stTot ? R((100 * G.stOn) / G.stTot) : 0);
          G.state = "lift"; G.t = 0; say(TX.lift, "");
          const Tg = G.target, near = decoys().sort((a, b) => Math.hypot(a.x - Tg.x, a.y - Tg.y) - Math.hypot(b.x - Tg.x, b.y - Tg.y));
          G.minglers = near.slice(0, LIFT_MINGLE[G.level]);
        }
      } else if (G.state === "lift") {
        for (const o of G.objs) steer(o, dt, baseSpd() * sc.sp * LIFT_SPEED[G.level]);
        const Tg = G.target; for (const o of G.minglers) o.ang += angDiff(Math.atan2(Tg.y - o.y, Tg.x - o.x), o.ang) * Math.min(1, 2.5 * dt);
        if (G.t >= LIFT_SEC[G.level]) { G.state = "check"; G.t = 0; G.chk = { choice: null }; say(TX.check, ""); }
      } else if (G.state === "check") {
        if (G.t >= CHECK_SEC) choose(null);
      } else if (G.state === "reveal") {
        if (G.t > REVEAL_SEC) {
          if (G.phase < NPH - 1) { G.state = "trans"; G.t = 0; G.next = makeDecoys(G.phase + 1); for (const o of G.next) o.alpha = 0;
            G.from = G.target.kind; G.to = SCENES[G.phase + 1].kind; G.burstDone = false; say(TX.tmsg[G.phase], "", 2400); }
          else finish();
        }
      } else if (G.state === "trans") {
        const p = clamp(G.t / TRANS, 0, 1);
        for (const o of G.objs) if (!o.isT) { steer(o, dt, baseSpd() * sc.sp * .6); o.alpha = 1 - clamp(p * 2, 0, 1); }
        const nsc = SCENES[G.phase + 1];
        for (const o of G.next) { steer(o, dt, baseSpd() * nsc.sp * .6); o.alpha = clamp((p - .45) * 2, 0, 1); }
        steer(G.target, dt, baseSpd() * .35); track(dt, false);
        if (!G.burstDone && p > .4) { G.burstDone = true; G.bursts.push({ x: G.target.x, y: G.target.y, t: 0, col: G.target.color }); }
        if (p >= 1) { G.phase++; G.target.kind = G.to; G.target.scale = SCENES[G.phase].tScale || 1; G.objs = sortZ([G.target, ...G.next]); G.next = null; beginRun(); setChip(); }
      }
      // progress for the shared timer bar (this game ends after its 5 scenes, about 90 s)
      let sub = 0;
      if (G.state === "run") sub = .8 * clamp(G.t / cfg.dur, 0, 1); else if (G.state === "lift") sub = .82; else if (G.state === "check") sub = .85 + .1 * clamp(G.t / CHECK_SEC, 0, 1); else if (G.state === "reveal") sub = .97;
      ctx.setProgress((G.phase + sub) / NPH);
      ctx.setTimeLeft(estLeft());
    }
    // estimated seconds left, for the visible timer (this game ends after its scenes, not on a clock)
    const STOP_EST = 1.5;
    function estLeft() {
      const lift = LIFT_SEC[G.level], per = SCENE_SEC + lift + STOP_EST + REVEAL_SEC, scenesAfter = NPH - 1 - G.phase;
      let cur = 0;
      if (G.state === "intro") cur = INTRO_SEC - G.t + per;
      else if (G.state === "run") cur = SCENE_SEC - G.t + lift + STOP_EST + REVEAL_SEC;
      else if (G.state === "lift") cur = lift - G.t + STOP_EST + REVEAL_SEC;
      else if (G.state === "check") cur = Math.max(0, STOP_EST - G.t) + REVEAL_SEC;
      else if (G.state === "reveal") cur = Math.max(0, REVEAL_SEC - G.t);
      else if (G.state === "trans") return (TRANS - G.t) + (scenesAfter) * (per + TRANS) - TRANS;
      return Math.max(0, cur + scenesAfter * (per + TRANS));
    }
    function nearest(x, y) {
      let best = null, bd = 1e9; for (const o of G.objs) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } }
      return best && bd < Math.max(PICK_MIN, Math.max(radius(best), U) * 2.2) ? best : null;
    }
    function choose(o) {
      G.chk.choice = o; const ok = !!(o && o.isT), timeout = !o;
      G.stops++; if (ok) G.correct++; if (timeout) G.timeouts++;
      G.state = "reveal"; G.t = 0;
      say(ok ? TX.correct : timeout ? TX.timeUp : TX.wrong, ok ? "good" : "bad");
      // adaptive step between scenes: 0.6 × time on target + 0.4 × the stop (original up-at-80 / down-below-40)
      const pct = G.stagePct[G.stagePct.length - 1] || 0, s = .6 * pct + .4 * (ok ? 100 : 0);
      if (ok) sparkle(G.target.x, G.target.y);
      if (s >= UP_AT && G.level < TOP) { setLevel(G.level + (s >= JUMP_AT ? 2 : 1)); ctx.stepFlash(); }
      else if (s < DOWN_BELOW && G.level > 1) setLevel(G.level - 1);
    }

    // small delight: white stars pop out of the figure on a correct stop
    function sparkle(x, y) { for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28), v = rnd(260, 620); G.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 320, t: 0, r: rnd(.35, .6) * U }); } }
    // share of circle 1 covered by circle 2
    function overlapFrac(x1, y1, r1, x2, y2, r2) {
      const d = Math.hypot(x2 - x1, y2 - y1); if (d >= r1 + r2) return 0; if (d <= Math.abs(r2 - r1)) return r2 >= r1 ? 1 : (r2 * r2) / (r1 * r1);
      const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)) + r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))
        - .5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
      return a / (Math.PI * r1 * r1);
    }
    // figures drawn above the target that would cover more than OCC_MAX of it are drawn below it instead
    function capOcclusion(list, masked) {
      const Tg = G.target, ti = list.indexOf(Tg); if (ti < 0) return list;
      const rr = (o) => masked ? U * SCENES[G.phase].sz : radius(o), rT = rr(Tg);
      const above = list.slice(ti + 1).filter((o) => o.alpha > 0 && overlapFrac(Tg.x, Tg.y, rT, o.x, o.y, rr(o)) > OCC_MAX);
      if (!above.length) return list;
      const out = list.filter((o) => !above.includes(o)); out.splice(out.indexOf(Tg), 0, ...above); return out;
    }
    function drawObj(o, masked) {
      if (o.alpha <= 0) return;
      let r = masked ? U * SCENES[G.phase].sz : radius(o); if (o.popT > 0) r *= 1 + .35 * Math.sin(Math.PI * o.popT / .5);
      const mkType = (masked || G.blackout > 0) ? null : o.mark, c = ctx2;
      c.globalAlpha = o.alpha;
      if (!masked && o.isT && cfg.halo) { const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2.1); g.addColorStop(0, "rgba(255,240,170,.55)"); g.addColorStop(1, "rgba(255,240,170,0)"); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, r * 2.1, 0, 7); c.fill(); }
      if (o.isT && G.state === "trans") {
        const p = clamp(G.t / TRANS, 0, 1), a = clamp((p - .25) / .4, 0, 1);
        if (a < 1) { c.globalAlpha = 1 - a; drawKind(c, G.from, o.x, o.y, r * (1 - a * .8), o.color, o, o.mark); }
        if (a > 0) { c.globalAlpha = a; const ns = SCENES[G.phase + 1]; const rr2 = U * TARGET_X * ns.sz * (ns.tScale || 1) * easeOutBack(a); drawKind(c, G.to, o.x, o.y, Math.max(1, rr2), o.color, o, o.mark); }
      } else if (o.spin) { c.save(); c.translate(o.x, o.y); c.rotate(o.spin); drawKind(c, o.kind, 0, 0, r, masked ? MASK : o.color, o, mkType); c.restore(); }
      else drawKind(c, o.kind, o.x, o.y, r, masked ? MASK : o.color, o, mkType);
      c.globalAlpha = 1;
    }
    function render() {
      const c = ctx2; c.clearRect(0, 0, W, H); if (!G) return;
      c.drawImage(BG[SCENES[G.phase].bg], 0, 0, W, H);
      if (G.state === "trans") { c.globalAlpha = clamp((G.t / TRANS - .3) / .5, 0, 1); c.drawImage(BG[SCENES[G.phase + 1].bg], 0, 0, W, H); c.globalAlpha = 1; }
      const masked = G.state === "check" || G.state === "lift";
      if (G.trail && G.thr && !masked) {
        const tr = G.trail, T0 = G.target, th = G.thr, fade = clamp(1 - (tr.t - th.trailT) / .6, 0, 1) * th.trailA;
        if (fade > 0) { c.save(); c.globalAlpha = fade; c.setLineDash([U * .35, U * .3]); c.lineCap = "round"; c.lineWidth = Math.max(3, U * .18); c.strokeStyle = "rgba(255,255,255,.95)";
          c.beginPath(); c.moveTo(tr.x0, tr.y0); c.lineTo(tr.x1 ?? T0.x, tr.y1 ?? T0.y); c.stroke(); c.restore(); }
      }
      const list = capOcclusion(G.next ? sortZ([...G.objs, ...G.next]) : G.objs.slice(), masked);
      for (const o of list) drawObj(o, masked);
      for (const k of G.sparks) { c.globalAlpha = clamp(1.1 - k.t, 0, 1); star(c, k.x, k.y, k.r * 2); } c.globalAlpha = 1;
      if (G.fly && !masked) { const f = G.fly, k = clamp(f.t / .45, 0, 1), x = f.from.x + (f.to.x - f.from.x) * k, y = f.from.y + (f.to.y - f.from.y) * k - Math.sin(k * Math.PI) * U * 1.6; star(c, x, y, U * 1.1); }
      for (const b of G.bursts) { const k = b.t / .9; c.strokeStyle = b.col; c.globalAlpha = (1 - k) * (b.soft ? .55 : .9); c.lineWidth = b.soft ? 2 : Math.max(3, U * .14);
        for (let i = 0; i < (b.soft ? 1 : 2); i++) { c.beginPath(); c.arc(b.x, b.y, Math.max(1, U * (.8 + k * (b.flash ? 3.5 : 2.6) - i * .8)), 0, 7); c.stroke(); } }
      c.globalAlpha = 1;
      const Tg = G.target, r = radius(Tg);
      if (G.state === "intro") { const pul = 1 + .1 * Math.sin(G.t * 6); c.setLineDash([20, 14]); c.strokeStyle = "#0D1130"; c.lineWidth = 9; c.beginPath(); c.arc(Tg.x, Tg.y, r * 2 * pul, 0, 7); c.stroke(); c.strokeStyle = "#ECEDF5"; c.lineWidth = 4; c.beginPath(); c.arc(Tg.x, Tg.y, r * 2 * pul, 0, 7); c.stroke(); c.setLineDash([]); }
      if (G.state === "reveal") {
        c.lineWidth = 13; c.strokeStyle = "#0D1130"; if (!(G.chk.choice && G.chk.choice.isT)) c.setLineDash([14, 10]); c.beginPath(); c.arc(Tg.x, Tg.y, Math.max(r, U) * 1.9, 0, 7); c.stroke(); c.setLineDash([]);
        c.lineWidth = 6; c.strokeStyle = G.chk.choice && G.chk.choice.isT ? UI.ok : UI.brand; if (!(G.chk.choice && G.chk.choice.isT)) c.setLineDash([14, 10]);
        c.beginPath(); c.arc(Tg.x, Tg.y, Math.max(r, U) * 1.9, 0, 7); c.stroke(); c.setLineDash([]);
        const ch = G.chk.choice; if (ch && !ch.isT) { const s = U * .7; c.strokeStyle = UI.soft; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(ch.x - s, ch.y - s); c.lineTo(ch.x + s, ch.y + s); c.moveTo(ch.x + s, ch.y - s); c.lineTo(ch.x - s, ch.y + s); c.stroke(); }
      }
      // contact ring: green while the finger is on the figure, dashed grey when lifted
      if (G.state === "run" || G.state === "trans") {
        const yo = Tg.kind === "person" ? .1 * r : 0;
        if (G.on) { c.lineWidth = 13; c.strokeStyle = "#0D1130"; c.beginPath(); c.arc(Tg.x, Tg.y + yo, r * 1.75, 0, 7); c.stroke(); c.lineWidth = 6; c.strokeStyle = UI.ok; c.beginPath(); c.arc(Tg.x, Tg.y + yo, r * 1.75, 0, 7); c.stroke(); }
        else if (G.offT > .5) { c.setLineDash([20, 14]); c.lineWidth = 9; c.strokeStyle = "#0D1130"; c.beginPath(); c.arc(Tg.x, Tg.y + yo, r * 1.75, 0, 7); c.stroke(); c.lineWidth = 4; c.strokeStyle = "#ECEDF5"; c.beginPath(); c.arc(Tg.x, Tg.y + yo, r * 1.75, 0, 7); c.stroke(); c.setLineDash([]); }
      }
      drawPrompt();
    }
    function frame(now) {
      if (dead) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!ctx.paused()) update(dt);
      if (!dead && G && !G.finished) render();
      raf = requestAnimationFrame(frame);
    }
    const setP = (e) => { const b = cv.getBoundingClientRect(); P.x = (e.clientX - b.left) * W / b.width; P.y = (e.clientY - b.top) * H / b.height; };
    const onMove = (e) => { setP(e); if (e.pointerType === "mouse" || e.buttons || e.pointerType === "touch") P.active = true; };
    const onDown = (e) => { setP(e); P.active = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} if (G && G.state === "check") { const o = nearest(P.x, P.y); if (o) choose(o); } };
    const onUp = (e) => { if (e.pointerType !== "mouse") P.active = false; };
    const onLeave = (e) => { if (e.pointerType === "mouse") P.active = false; };

    function result() {
      const focus = G.totT > 0 ? R((100 * G.onT) / G.totT) : 0;
      const vp = G.stops ? R((100 * G.correct) / G.stops) : 0;
      const perf = .6 * focus + .4 * vp;
      const ms = G.maxLevel >= 5 ? "עם הסחות מהירות" : G.maxLevel >= 3 ? "עם הסחות" : "בקצב רגוע";
      const late = (G.sceneLv || []).slice(3).filter((x) => x != null), held = late.length ? late.reduce((a, v) => a + v, 0) / late.length : null;
      return { held, top: TOP, trials: (G.sceneLv || []).length, acc: focus, score: ctx.blend(perf, G.maxLevel, TOP), fact: `האצבע נשארה על הדמות ${focus}% מהזמן, ${ms}.`,
        metrics: { focus, vp, stops: G.stops, stopsCorrect: G.correct, maxLevel: G.maxLevel, stagePct: G.stagePct } };
    }
    function finish() { if (G.finished) return; G.finished = true; ctx.done(result()); }

    return {
      start() {
        cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointerup", onUp);
        cv.addEventListener("pointercancel", onUp); cv.addEventListener("pointerleave", onLeave);
        startGame(); last = performance.now(); raf = requestAnimationFrame(frame);
      },
      stop() { if (G) G.finished = true; return result(); },
      destroy() { dead = true; cancelAnimationFrame(raf); },
      _debug: () => G,
    };
  }

  SHEBA.register({
    id: "follow_me", name: "עקוב אחרי", skill: "focus", seconds: null, hardCap: 170, lengthLabel: "כדקה וחצי",
    instr: {
      title: "עקבו אחרי הדמות",
      steps: [
        "השאירו את האצבע על <b>הדמות עם הכוכב הלבן</b>, גם&nbsp;כשאחרות נתקלות בה.",
        "בכל שלב היא משתנה: מכונית, בלון, דג וציפור.",
        "בסוף כל שלב הכל נעשה אפור. עקבו בעיניים, ואז <b>געו בה</b>.",
      ],
      diagram,
    },
    create,
  });
})();
