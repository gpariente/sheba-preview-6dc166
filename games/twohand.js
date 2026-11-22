/*
 * אימון שתי ידיים (two_hand_sync) — redesigned after Guy's play-test (22 Nov 2026).
 * Purpose (shown on the card): both sides of the brain working together. Each round a blue disc appears in the
 * right half (right hand) and a yellow ring in the left half (left hand). A white ring closes in on each of them;
 * both rings close at the same moment, even when one target appeared later. Touch both at that moment.
 * A round counts when the two touches land within the step's sync window and not too early. Grey circles (with
 * their own closing ring) must not be touched. Adaptive 3 up / 2 down over 8 steps: smaller targets (170 → 110 px,
 * touch area 1.3×), a later second target, faster rings, decoys, drifting targets, tighter window (450 → 150 ms).
 * Test aid: on a device without touch (Guy's Mac with a mouse), two clicks within the window count as a pair
 * (window ×MOUSE_WIN_X). On the kiosk / tablets real multi-touch is used. No round counter, no level numbers.
 *
 * Tuning: STEPS, timing constants and TX below.
 */
(function () {
  "use strict";
  // d: target px (visual; touch area HIT×) · ring: ms for the closing ring · lag: [min,max] ms the second target
  // appears after the first (0 = together) · win: sync window ms · move: drift px/s · decoy: chance of a grey circle
  // layout: mirror | uneven | random | diagonal | far
  const STEPS = [null,
    { d: 170, ring: 1700, lag: 0, win: 450, move: 0, decoy: 0, layout: "mirror" },
    { d: 160, ring: 1550, lag: 0, win: 380, move: 0, decoy: 0, layout: "uneven" },
    { d: 150, ring: 1450, lag: [150, 350], win: 320, move: 0, decoy: 0, layout: "random" },
    { d: 140, ring: 1350, lag: [200, 450], win: 280, move: 0, decoy: 0.4, layout: "random" },
    { d: 130, ring: 1250, lag: [250, 500], win: 240, move: 50, decoy: 0.5, layout: "diagonal" },
    { d: 120, ring: 1150, lag: [300, 600], win: 210, move: 80, decoy: 0.55, layout: "far" },
    { d: 115, ring: 1050, lag: [300, 700], win: 180, move: 110, decoy: 0.6, layout: "far" },
    { d: 110, ring: 950, lag: [300, 800], win: 150, move: 140, decoy: 0.65, layout: "far" },
  ];
  const TOP = STEPS.length - 1, D_FLOOR = 110, HIT = 1.3, RING_FROM = 2.3;
  const EARLY = 350;            // a touch more than this before the rings close is "too early"
  const GRACE = 550;            // targets stay this long after the rings close
  const WAIT = [700, 1200], FEEDBACK_MS = 900, MID_GAP = 120, TOP_BAND = 110, BOTTOM_BAND = 150, EDGE = 70;
  const MOUSE_WIN_X = 2.2, MOUSE_WIN_MIN = 350;
  const COL = { right: "#6FB4F5", left: "#F5C842", decoy: "#7A7F99", ring: "#ECEDF5" };
  const TX = {
    prompt: "געו בשניהם <b>כשהטבעות נסגרות</b>",
    mouse: "מצב בדיקה עם עכבר: שתי לחיצות מהירות נחשבות ביחד",
    ok: "ביחד", apart: "כמעט", early: "מוקדם מדי", miss: "הזמן עבר.", decoy: "לא באפור",
  };
  const rand = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const noTouch = () => !(navigator.maxTouchPoints > 0) && !("ontouchstart" in window);

  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP), W = f.clientWidth, H = f.clientHeight, MOUSE = noTouch();
    f.querySelector(".fb").style.bottom = "70px";
    f.insertAdjacentHTML("beforeend", `<div class="mid"></div>
      <div class="prompt" style="position:absolute;top:30px;left:0;right:0">${TX.prompt}</div>
      ${MOUSE ? `<div class="small" style="position:absolute;top:84px;left:0;right:0;text-align:center;color:var(--ink3)">${TX.mouse}</div>` : ""}
      <div class="hand" style="right:36px"><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="${COL.right}"/></svg><span>יד ימין</span></div>
      <div class="hand" style="left:36px"><span>יד שמאל</span><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10.5" fill="none" stroke="${COL.left}" stroke-width="3"/></svg></div>`);
    let dead = false, cur = null, raf = 0;
    const rounds = [];

    // one target: hit area (HIT × d) holding the visual and its closing ring
    function el(kind, d) {
      const D = d * HIT, h = document.createElement("div");
      h.style.cssText = `position:absolute;width:${D}px;height:${D}px;margin:${-D / 2}px 0 0 ${-D / 2}px;border-radius:50%;display:flex;align-items:center;justify-content:center;touch-action:none;z-index:${kind === "decoy" ? 1 : 2}`;
      const vis = document.createElement("div");
      vis.style.cssText = kind === "right" ? `width:${d}px;height:${d}px;border-radius:50%;background:${COL.right};transition:box-shadow .12s,opacity .25s`
        : kind === "left" ? `width:${d}px;height:${d}px;border-radius:50%;border:${Math.round(d * .14)}px solid ${COL.left};background:#151B45;transition:box-shadow .12s,opacity .25s`
        : `width:${d}px;height:${d}px;border-radius:50%;background:${COL.decoy};transition:opacity .25s`;
      const ring = document.createElement("div");
      ring.style.cssText = `position:absolute;left:50%;top:50%;width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;border-radius:50%;border:4px solid ${kind === "decoy" ? "rgba(236,237,245,.55)" : COL.ring};pointer-events:none;transform:scale(${RING_FROM})`;
      h.appendChild(vis); h.appendChild(ring); h.vis = vis; h.ring = ring; h.dataset.kind = kind; f.appendChild(h); return h;
    }
    function glow(t, col) { t.el.vis.style.boxShadow = col ? `0 0 0 10px rgba(13,17,48,.9), 0 0 0 15px ${col}` : "none"; }
    function positions(p) {
      const r = p.d * HIT / 2, top = TOP_BAND + r, bot = H - BOTTOM_BAND - r, half = W / 2;
      const xr = { left: [EDGE + r, half - MID_GAP - r], right: [half + MID_GAP + r, W - EDGE - r] };
      const ry = () => rand(top, bot), box = { xr, top, bot };
      if (p.layout === "mirror") { const y = rand(top + .25 * (bot - top), bot - .25 * (bot - top)), x = rand(xr.left[0] + .2 * (xr.left[1] - xr.left[0]), xr.left[1]); return { left: [x, y], right: [W - x, y], box }; }
      if (p.layout === "uneven") { const yl = ry(); let yr = ry(); for (let i = 0; i < 30 && Math.abs(yl - yr) < .35 * (bot - top); i++) yr = ry(); return { left: [rand(...xr.left), yl], right: [rand(...xr.right), yr], box }; }
      if (p.layout === "diagonal" || p.layout === "far") {
        const hi = Math.random() < .5, j = () => rand(0, 60);
        const ox = p.layout === "far" ? [Math.random() < .5, Math.random() < .5] : [Math.random() < .5, null];
        if (ox[1] === null) ox[1] = !ox[0];
        return { left: [ox[0] ? xr.left[0] + j() : xr.left[1] - j(), hi ? top + j() : bot - j()], right: [ox[1] ? xr.right[1] - j() : xr.right[0] + j(), hi ? bot - j() : top + j()], box };
      }
      return { left: [rand(...xr.left), ry()], right: [rand(...xr.right), ry()], box };
    }

    function nextRound() {
      if (dead || (ctx.overtime && ctx.overtime())) return;   // +10 s overtime: no new round
      ctx.later(show, rand(...WAIT));
    }
    function show() {
      if (dead || (ctx.overtime && ctx.overtime())) return;
      const p = STEPS[st.step], d = Math.max(D_FLOOR, p.d), pos = positions(p), now = ctx.now();
      const lag = p.lag ? rand(...p.lag) : 0, lateSide = lag ? (Math.random() < .5 ? "left" : "right") : null;
      const closeAt = now + lag + p.ring;   // both rings close at the same moment
      cur = { live: true, p, closeAt, T: {}, decoy: null, hits: {}, win: MOUSE ? Math.max(MOUSE_WIN_MIN, p.win * MOUSE_WIN_X) : p.win };
      for (const side of ["left", "right"]) {
        const t = { side, el: el(side, d), x: pos[side][0], y: pos[side][1], appear: side === lateSide ? now + lag : now, vx: 0, vy: 0, box: pos.box.xr[side] };
        if (p.move) { const a = rand(0, 6.283), m = p.move * rand(.7, 1.3); t.vx = Math.cos(a) * m; t.vy = Math.sin(a) * m; }
        place(t); if (t.appear > now) t.el.style.visibility = "hidden";
        t.el.addEventListener("pointerdown", (e) => { e.preventDefault(); tap(side, e); });
        cur.T[side] = t;
      }
      if (p.decoy && Math.random() < p.decoy) addDecoy(p, d, pos, now);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
    function addDecoy(p, d, pos, now) {
      const side = Math.random() < .5 ? "left" : "right", b = pos.box, D = d * HIT; let x, y;
      for (let i = 0; i < 40; i++) { x = rand(...b.xr[side]); y = rand(b.top, b.bot); if (Math.hypot(x - pos[side][0], y - pos[side][1]) > D + 30) break; }
      const t = { side: "decoy", el: el("decoy", d), x, y, appear: now + rand(0, 300), vx: 0, vy: 0, box: b.xr[side] };
      place(t); t.el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (cur && cur.live && ctx.now() >= t.appear) resolve("decoy"); });
      cur.decoy = t;
    }
    function place(t) { t.el.style.left = t.x + "px"; t.el.style.top = t.y + "px"; }
    let lastF = 0;
    function frame(ts) {
      if (dead || !cur || !cur.live) return;
      const dt = lastF ? Math.min(.05, (ts - lastF) / 1000) : 0; lastF = ts;
      if (!ctx.paused()) {
        const now = ctx.now(), c = cur;
        for (const t of [c.T.left, c.T.right, c.decoy]) {
          if (!t) continue;
          if (now >= t.appear && t.el.style.visibility === "hidden") t.el.style.visibility = "";
          const span = Math.max(1, c.closeAt - t.appear), k = clamp((c.closeAt - now) / span, 0, 1);
          t.el.ring.style.transform = `scale(${1 + (RING_FROM - 1) * k})`;
          t.el.ring.style.opacity = now >= c.closeAt ? String(clamp(1 - (now - c.closeAt) / GRACE, 0, 1)) : "1";
          if (t.vx && c.hits[t.side] == null) {
            t.x += t.vx * dt; t.y += t.vy * dt;
            if (t.x < t.box[0] || t.x > t.box[1]) { t.vx *= -1; t.x = clamp(t.x, t.box[0], t.box[1]); }
            const top = TOP_BAND + t.el.offsetWidth / 2, bot = H - BOTTOM_BAND - t.el.offsetWidth / 2;
            if (t.y < top || t.y > bot) { t.vy *= -1; t.y = clamp(t.y, top, bot); }
            place(t);
          }
        }
        if (now > c.closeAt + GRACE) resolve(null);
      } else lastF = 0;
      if (cur && cur.live) raf = requestAnimationFrame(frame);
    }
    function tap(side, e) {
      const c = cur; if (!c || !c.live) return;
      const t = c.T[side], now = ctx.now(); if (now < t.appear || c.hits[side] != null) return;
      c.hits[side] = now; glow(t, "#4FBF8A");
      if (c.hits.left != null && c.hits.right != null) resolve("pair");
    }
    function resolve(kind) {
      const c = cur; if (!c || !c.live) return;
      c.live = false; cancelAnimationFrame(raf); lastF = 0;
      const hl = c.hits.left, hr = c.hits.right;
      let outcome, gap = null;
      if (kind === "decoy") outcome = "decoy";
      else if (hl != null && hr != null) {
        gap = Math.round(Math.abs(hl - hr));
        outcome = Math.min(hl, hr) < c.closeAt - EARLY ? "early" : gap <= c.win ? "ok" : "apart";
      } else outcome = "miss";
      rounds.push({ ok: outcome === "ok", gap, step: st.step, outcome });
      st.hit(outcome === "ok");
      const ts = [c.T.left, c.T.right];
      for (const t of ts) t.el.ring.style.opacity = "0";
      if (outcome === "ok") { ts.forEach((t) => glow(t, "#4FBF8A")); ctx.feedback("ok", TX.ok, "", FEEDBACK_MS); }
      else if (outcome === "apart") { ts.forEach((t) => glow(t, "#F2A66A")); ctx.feedback("soft", TX.apart, "", FEEDBACK_MS); }
      else if (outcome === "early") { ts.forEach((t) => glow(t, "#F2A66A")); ctx.feedback("soft", TX.early, "", FEEDBACK_MS); }
      else if (outcome === "decoy") { ts.forEach((t) => glow(t, null)); ctx.feedback("soft", TX.decoy, "", FEEDBACK_MS); }
      else { ts.forEach((t) => { t.el.vis.style.opacity = ".35"; }); ctx.feedback("neutral", TX.miss, "", FEEDBACK_MS); }
      if (c.decoy) c.decoy.el.vis.style.opacity = ".3";
      ctx.later(() => { for (const t of [...ts, c.decoy]) if (t) t.el.remove(); if (cur === c) cur = null; nextRound(); }, FEEDBACK_MS);
    }
    function result() {
      const total = rounds.length, ok = rounds.filter((r) => r.ok), acc = total ? 100 * ok.length / total : 0;
      const gap = ok.length ? ok.reduce((a, r) => a + r.gap, 0) / ok.length : 400;
      const perf = acc * (.75 + .25 * clamp((400 - gap) / 300, 0, 1));
      const ms = st.max >= 6 ? "עד עיגולים קטנים וזזים" : st.max >= 4 ? "עד עיגולים עם הסחה" : st.max >= 3 ? "עד הופעה לא בו-זמנית" : "בקצב הרגוע";
      const what = ok.length === 0 ? "עוד לא הייתה נגיעה ביחד" : ok.length === 1 ? "נגיעה אחת ביחד" : `${ok.length} נגיעות ביחד מתוך ${total}`;
      return { score: ctx.blend(perf, st.max, TOP), fact: `${what}, ${ms}.`,
        metrics: { total, ok: ok.length, meanGap: Math.round(gap), maxStep: st.max, decoyHits: rounds.filter((r) => r.outcome === "decoy").length, early: rounds.filter((r) => r.outcome === "early").length, mouse: MOUSE } };
    }
    return {
      start() { nextRound(); },
      midRound: () => !!(cur && cur.live),
      stop() { dead = true; if (cur) cur.live = false; cancelAnimationFrame(raf); return result(); },
      destroy() { dead = true; cancelAnimationFrame(raf); },
      _debug: () => {
        const r = (t) => { if (!t) return null; const b = t.el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: t.el.vis.offsetWidth, shown: t.el.style.visibility !== "hidden" }; };
        return cur && cur.live ? { live: true, now: ctx.now(), closeAt: cur.closeAt, left: r(cur.T.left), right: r(cur.T.right), decoy: r(cur.decoy), step: st.step, win: cur.win, mouse: MOUSE } : { live: false, step: st.step, mouse: MOUSE };
      },
    };
  }

  function diagram(el) {
    const tgt = (side, x) => `<div style="position:absolute;top:200px;${side}:${x}px;width:150px;height:150px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:-34px;border-radius:50%;border:4px solid #ECEDF5;opacity:.9"></div>
        ${side === "right" ? `<div style="width:110px;height:110px;border-radius:50%;background:${COL.right}"></div>` : `<div style="width:110px;height:110px;border-radius:50%;border:15px solid ${COL.left};box-sizing:border-box;background:#151B45"></div>`}</div>`;
    el.innerHTML = `<div style="position:relative;width:700px;height:560px">
      <div style="position:absolute;top:90px;bottom:90px;left:50%;width:1px;background:var(--hair)"></div>
      ${tgt("right", 120)}${tgt("left", 120)}
      <div style="position:absolute;top:410px;right:120px;width:150px;text-align:center;font:400 32px var(--t);color:var(--ink2)">יד ימין</div>
      <div style="position:absolute;top:410px;left:120px;width:150px;text-align:center;font:400 32px var(--t);color:var(--ink2)">יד שמאל</div></div>`;
  }

  SHEBA.register({
    id: "two_hand_sync", name: "אימון שתי ידיים", skill: "coord", seconds: true,
    instr: {
      title: "שתי ידיים, באותו רגע",
      lead: "שני הצדדים של המוח עובדים יחד.",
      steps: [
        "יד ימין לעיגול <b style=\"color:#6FB4F5\">הכחול</b>, יד שמאל לטבעת <b style=\"color:#F5C842\">הצהובה</b>.",
        "געו בשניהם יחד, בדיוק כשהטבעת הלבנה נסגרת עליהם.",
        "עיגול <b style=\"color:#A9ADC4\">אפור</b>? לא נוגעים בו.",
      ],
      diagram,
    },
    create,
  });
})();
