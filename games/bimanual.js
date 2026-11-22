/*
 * שתי ידיים · אתגרים (bimanual) — Sheba version of games_src/bimanual.html (v2.1), "8 challenges" cut to 2.
 * Kept: two hand targets moving on guide tracks, one per side; a finger counts as "on" within a tolerance of the
 * target; the path shapes (circle, figure eight) and mirror motion; the in-play speed adaptation.
 * Fixed per Design/QA (REVIEW.md §2): ימין is on the RIGHT as a blue disc, שמאל on the LEFT as an amber ring (the
 * original had them swapped); exit is the shared header button (one press); no CDN font, names, storage, neon theme.
 * 60 s = 2 challenges of 30 s: "מראה" then "אותו כיוון" (no "אתגר N מתוך 2" counter, Design build2 P1-1; Guy to confirm).
 * Design build2: track .5 alpha / 3 px / dash 10 10; lift → dashed ring + prompt at once; inner edges ≥120 px from the centre line.
 * Ladder (Design + Guy 22.11): the track gets faster and narrower after a streak, targets shrink 260 → 220 px
 * (Design's two-hand minimum), the path changes from circle to figure eight, and speed starts to vary.
 * A streak unit = 3 s of play: both fingers on target ≥ 75% of it → correct; < 40% → miss.
 *
 * Tuning: STEPS, WINDOW and TX below.
 */
(function () {
  "use strict";
  // d: target px · v: path cycles per second · tol: "on" radius as × target radius · path · vary: speed wobble 0–1
  const STEPS = [null,
    { d: 260, v: 0.085, tol: 1.30, path: "circle", vary: 0 },
    { d: 250, v: 0.105, tol: 1.25, path: "circle", vary: 0 },
    { d: 240, v: 0.125, tol: 1.18, path: "circle", vary: 0.25 },
    { d: 235, v: 0.115, tol: 1.12, path: "eight", vary: 0.15 },
    { d: 225, v: 0.135, tol: 1.06, path: "eight", vary: 0.30 },
    { d: 220, v: 0.155, tol: 1.00, path: "eight", vary: 0.40 },
  ];
  const TOP = STEPS.length - 1, WINDOW = { s: 3, good: 0.75, bad: 0.40 }, CH_SEC = 30, R_PATH = 200, START_WAIT = 3;
  const INNER_GAP = 120;                                    // min px from a token's inner edge to the centre line
  const TRACK = { stroke: "rgba(236,237,245,.5)", width: 3, dash: "10 10" };
  const RING_ON = "0 0 0 10px rgba(13,17,48,.9), 0 0 0 15px #4FBF8A", RING_OFF = { shadow: "0 0 0 13px rgba(13,17,48,.9)", outline: "4px dashed #ECEDF5", offset: "9px" };
  const TX = {
    ch: [{ stage: "מראה", prompt: "הזיזו את שתי הידיים כמו במראה" }, { stage: "אותו כיוון", prompt: "עכשיו שתי הידיים זזות לאותו כיוון" }],
    put: "שימו אצבע על כל עיגול", swap: "מחליפים: עכשיו לאותו כיוון", good: "שתי הידיים על המסלול", lost: "החזירו את האצבעות לעיגולים",
  };
  const TAU = Math.PI * 2;
  const PATHS = { circle: (s) => [Math.cos(TAU * s), Math.sin(TAU * s)], eight: (s) => [Math.sin(TAU * s), Math.sin(2 * TAU * s) * .62] };

  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP), W = f.clientWidth, H = f.clientHeight, CY = H / 2 + 46;
    // path centres: a quarter of the field in, pushed out further if needed so the inner edge keeps INNER_GAP
    const DMAX = Math.max(...STEPS.slice(1).map((x) => x.d)), CO = Math.max(W / 4, INNER_GAP + DMAX / 2 + R_PATH);
    const C = { L: W / 2 - CO, R: W / 2 + CO };
    f.insertAdjacentHTML("beforeend", `<div class="mid"></div>
      <div style="position:absolute;top:24px;left:0;right:0;text-align:center;font:500 28px var(--t);color:var(--ink2)" id="bmStage"></div>
      <div class="prompt" id="bmPrompt" style="position:absolute;top:66px;left:0;right:0;color:var(--ink)"></div>
      <svg id="bmGuide" width="${W}" height="${H}" style="position:absolute;left:0;top:0;pointer-events:none"></svg>
      <div class="legend" style="right:36px"><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#6FB4F5"/></svg><span>יד ימין · צד ימין</span></div>
      <div class="legend" style="left:36px"><span>יד שמאל · צד שמאל</span><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10.5" fill="none" stroke="#F5C842" stroke-width="3"/></svg></div>`);
    const fb = f.querySelector(".fb"); fb.style.bottom = "70px";
    const guide = f.querySelector("#bmGuide");
    const T = {};
    for (const s of ["L", "R"]) {
      const e = document.createElement("div");
      e.style.cssText = "position:absolute;left:0;top:0;border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;font:700 40px var(--t);transition:box-shadow .12s";
      if (s === "R") { e.style.background = "#6FB4F5"; e.style.color = "#0D1130"; e.textContent = "ימין"; }
      else { e.style.border = "8px solid #F5C842"; e.style.color = "#F5C842"; e.style.background = "#151B45"; e.textContent = "שמאל"; }
      e.dataset.hand = s; f.appendChild(e); T[s] = { el: e, x: C[s], y: CY, ptr: null, fx: 0, fy: 0, on: false };
    }
    let dead = false, raf = 0, last = null, ch = 0, s = 0, started = false, swapUntil = 0, drawn = "", liftShown = false;
    let win = { t: 0, b: 0 }, tot = 0, both = 0, totCh = [0, 0], bothCh = [0, 0], lifts = 0;

    function setCh(i) { ch = i; f.querySelector("#bmStage").textContent = TX.ch[i].stage; f.querySelector("#bmPrompt").textContent = TX.ch[i].prompt; drawn = ""; }
    function pos(side, ss, path) {
      const [px, py] = PATHS[path](ss), mirror = ch === 0 && side === "R" ? -1 : 1;
      return [C[side] + px * R_PATH * mirror, CY + py * R_PATH * (path === "eight" ? 1 : .9)];
    }
    function drawGuide() {
      const S = STEPS[st.step], key = S.path + ch; if (key === drawn) return; drawn = key;
      let out = "";
      for (const side of ["L", "R"]) {
        const pts = []; for (let k = 0; k <= 96; k++) { const [x, y] = pos(side, k / 96, S.path); pts.push(x.toFixed(1) + "," + y.toFixed(1)); }
        out += `<polyline points="${pts.join(" ")}" fill="none" stroke="${TRACK.stroke}" stroke-width="${TRACK.width}" stroke-dasharray="${TRACK.dash}" stroke-linecap="round"/>`;
      }
      guide.innerHTML = out;
    }
    const down = (e) => {
      const p = ctx.local(e); if (p.y < 0 || p.y > H) return;
      const side = p.x < W / 2 ? "L" : "R", t = T[side];
      if (t.ptr == null && Math.hypot(p.x - t.x, p.y - t.y) <= STEPS[st.step].d * .9) { t.ptr = e.pointerId; t.fx = p.x; t.fy = p.y; }
    };
    const move = (e) => { for (const k of ["L", "R"]) if (T[k].ptr === e.pointerId) { const p = ctx.local(e); T[k].fx = p.x; T[k].fy = p.y; } };
    const up = (e) => { for (const k of ["L", "R"]) if (T[k].ptr === e.pointerId) { T[k].ptr = null; if (started) lifts++; } };

    function frame(now) {
      if (dead) return;
      const dt = last == null ? 0 : Math.min(.05, (now - last) / 1000); last = now;
      if (!ctx.paused()) {
        const S = STEPS[st.step], gt = ctx.now() / 1000;
        if (ch === 0 && gt >= (ctx.cfg.GAME_SECONDS || 60) * CH_SEC / 60) { setCh(1); swapUntil = gt + 1.6; ctx.feedback("info", TX.swap, "", 1600); }
        drawGuide();
        if (!started) { if ((T.L.ptr != null && T.R.ptr != null) || gt > START_WAIT) { started = true; ctx.feedback("", ""); } else ctx.feedback("info", TX.put); }
        const moving = started && gt >= swapUntil;
        if (moving) { const wob = 1 + S.vary * Math.sin(gt * 1.7) * Math.sin(gt * .63 + 1); s += dt * S.v * wob; }
        for (const side of ["L", "R"]) {
          const t = T[side], [x, y] = pos(side, s, S.path), d = S.d, k = Math.min(1, dt * 10);
          t.x += (x - t.x) * k; t.y += (y - t.y) * k;   // eased, so a path or size change never jumps
          t.el.style.width = t.el.style.height = d + "px";
          t.el.style.transform = `translate(${t.x - d / 2}px,${t.y - d / 2}px)`;
          t.on = t.ptr != null && Math.hypot(t.fx - t.x, t.fy - t.y) <= d / 2 * S.tol;
          // green ring while on track; dashed "off" ring at once when the finger is lifted or off (as ball / follow-me)
          if (t.on) { t.el.style.boxShadow = RING_ON; t.el.style.outline = "none"; }
          else { t.el.style.boxShadow = RING_OFF.shadow; t.el.style.outline = RING_OFF.outline; t.el.style.outlineOffset = RING_OFF.offset; }
        }
        if (moving) {
          const lifted = T.L.ptr == null || T.R.ptr == null;
          if (lifted && !liftShown) { liftShown = true; ctx.feedback("soft", TX.lost, ""); }
          else if (!lifted && liftShown) { liftShown = false; ctx.feedback("", ""); }
          const b = T.L.on && T.R.on;
          tot += dt; totCh[ch] += dt; if (b) { both += dt; bothCh[ch] += dt; }
          win.t += dt; if (b) win.b += dt;
          if (win.t >= WINDOW.s) {
            const q = win.b / win.t; win = { t: 0, b: 0 };
            if (q >= WINDOW.good) { st.hit(true); if (!liftShown) ctx.feedback("ok", TX.good, "", 1100); }
            else if (q < WINDOW.bad) { st.hit(false); if (!liftShown) ctx.feedback("soft", TX.lost, "", 1400); }
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function result() {
      const pct = tot ? 100 * both / tot : 0, a = totCh[0] ? 100 * bothCh[0] / totCh[0] : 0, b = totCh[1] ? 100 * bothCh[1] / totCh[1] : 0;
      const ms = st.max >= 4 ? "עד מסלול שמונה מהיר" : st.max >= 2 ? "עד הקצב הבינוני" : "בקצב הרגוע";
      return { score: ctx.blend(pct, st.max, TOP), fact: `שתי הידיים על המסלול ${Math.round(pct)}% מהזמן, ${ms}.`, metrics: { pct: Math.round(pct), mirror: Math.round(a), parallel: Math.round(b), lifts, maxStep: st.max } };
    }
    return {
      start() {
        setCh(0);
        document.addEventListener("pointerdown", down, true); document.addEventListener("pointermove", move, true);
        ["pointerup", "pointercancel"].forEach((ev) => document.addEventListener(ev, up, true));
        raf = requestAnimationFrame(frame);
      },
      stop() { dead = true; return result(); },
      destroy() {
        dead = true; cancelAnimationFrame(raf);
        document.removeEventListener("pointerdown", down, true); document.removeEventListener("pointermove", move, true);
        ["pointerup", "pointercancel"].forEach((ev) => document.removeEventListener(ev, up, true));
      },
      _debug: () => ({ L: [T.L.x, T.L.y], R: [T.R.x, T.R.y], d: STEPS[st.step].d, step: st.step, ch, started, gap: Math.round(Math.min(W / 2 - T.L.x - STEPS[st.step].d / 2, T.R.x - STEPS[st.step].d / 2 - W / 2)) }),
    };
  }

  function diagram(el) {
    el.innerHTML = `<div style="position:relative;width:700px;height:560px">
      <div style="position:absolute;top:60px;bottom:60px;left:50%;width:1px;background:var(--hair)"></div>
      <svg width="700" height="560" style="position:absolute;left:0;top:0"><circle cx="175" cy="270" r="120" fill="none" stroke="rgba(236,237,245,.5)" stroke-width="3" stroke-dasharray="10 10"/><circle cx="525" cy="270" r="120" fill="none" stroke="rgba(236,237,245,.5)" stroke-width="3" stroke-dasharray="10 10"/></svg>
      <div style="position:absolute;left:115px;top:90px;width:120px;height:120px;border-radius:50%;border:7px solid #F5C842;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:700 26px var(--t);color:#F5C842">שמאל</div>
      <div style="position:absolute;right:115px;top:90px;width:120px;height:120px;border-radius:50%;background:#6FB4F5;display:flex;align-items:center;justify-content:center;font:700 26px var(--t);color:#0D1130">ימין</div>
      <div style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font:400 28px var(--t);color:var(--ink2)">שתי הידיים זזות כמו במראה</div></div>`;
  }

  SHEBA.register({
    id: "bimanual", name: "שתי ידיים · אתגרים", skill: "coord", seconds: true,
    instr: {
      title: "שתי ידיים על המסלול",
      steps: [
        "יד ימין על העיגול <b style=\"color:#6FB4F5\">הכחול</b>, יד שמאל על הטבעת <b style=\"color:#F5C842\">הצהובה</b>.",
        "העיגולים זזים. השאירו את שתי האצבעות עליהם.",
        "אתגר ראשון: כמו במראה. אתגר שני: לאותו כיוון.",
      ],
      diagram,
    },
    create,
  });
})();
