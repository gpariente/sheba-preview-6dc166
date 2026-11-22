/*
 * קשב כפול (dual_attention) — Sheba version of games_src/dual-attention.html (v1.2).
 * Kept: the "find the odd one" grid generator (shape, shade, size, ring opening, arrow, dot count, mirror) and the
 * original sentence bank. Changed per Design (REVIEW.md §3): 60 s, 2–3 rounds of read + search, each ending with one
 * recall question about the sentence; a large "קראו וזכרו" card (52 px) beside a 3×3 grid of 190 px cells; one
 * prompt at a time; no speech, numbers-to-remember or arithmetic; no pickers, names or storage. Staircase 3 up /
 * 2 down over grid finds and recall answers.
 *
 * Tuning: everything adjustable is in STEPS, ROUND and TX below.
 */
(function () {
  "use strict";
  // grid: n×n · types: odd-one kinds · d: subtlety 0–3 · find: ms per grid · read: ms the sentence stays · long: sentence length band
  // Design ladder: 3×3 obvious odd one → subtler difference → 4×4 grid → longer sentence.
  const STEPS = [null,
    { grid: 3, types: ["shape", "color"], d: 0, find: 7000, read: 8000, long: 0 },
    { grid: 3, types: ["shape", "color", "size", "arrow"], d: 0, find: 6500, read: 7500, long: 0 },
    { grid: 3, types: ["shape", "size", "arrow", "orient"], d: 1, find: 6000, read: 7000, long: 0 },
    { grid: 4, types: ["shape", "orient", "arrow", "count"], d: 1, find: 6000, read: 6500, long: 1 },
    { grid: 4, types: ["orient", "count", "size", "mirror"], d: 2, find: 5500, read: 6000, long: 1 },
    { grid: 4, types: ["mirror", "count", "orient", "shape"], d: 3, find: 5000, read: 5500, long: 2 },
  ];
  const TOP = STEPS.length - 1;
  const GLYPH = 0.9;   // svg box as × cell: shapes (r 34 of 50) ≈ 61% of the cell, dice dots r 7.5 → ≈20 px at 150 (Design build2 P1-3)
  const SENT_STYLE = "font:500 52px/1.35 var(--t);margin-top:18px;min-height:140px";
  const HIDDEN_LINE = "font:400 36px/1.4 var(--t);color:var(--ink2);min-height:250px;display:flex;align-items:center;justify-content:center;text-align:center";
  const ROUND = { searchAfterRead: 6000, askMs: 8000, pause: 900 };   // per round: read (+search) → search only → question
  const TX = {
    readK: "קראו וזכרו", later: "", hidden: "המשפט הוסתר. המשיכו לחפש.",
    find: "געו בצורה <b>השונה</b>", ask: "על מה היה המשפט?", ok: "נכון.", bad: "לא הפעם.", late: "הזמן עבר.",
  };
  // The original sentence bank: [sentence, main thing]
  const SENT = [
    ["אל תשכח לקנות חלב.", "חלב"], ["המפתחות על השידה.", "מפתחות"], ["התור לרופא ביום שלישי.", "רופא"],
    ["המשקפיים נמצאים במגירה.", "משקפיים"], ["צריך להשקות את העציץ במרפסת.", "עציץ"], ["הנכדה מגיעה בשבת בצהריים.", "נכדה"],
    ["לקחת את התרופה אחרי ארוחת הבוקר.", "תרופה"], ["האוטובוס לחיפה יוצא בשמונה ועשרה.", "אוטובוס"], ["המטריה מאחורי הדלת.", "מטריה"],
    ["להתקשר לחשמלאי מחר בערב.", "חשמלאי"], ["הספר שביקשת מונח על הכיסא בסלון.", "ספר"], ["הארנק נשאר במכונית, ליד הכיסא של הנהג.", "ארנק"],
  ];
  const bandOf = (s) => { const w = s[0].split(" ").length; return w <= 4 ? 0 : w <= 5 ? 1 : 2; };

  // ── odd-one grid (from the original makeTrial; colours mapped to the Sheba palette) ──
  const f1 = (x) => x.toFixed(1), rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const INKS = ["#ECEDF5", "#6FB4F5", "#F5C842"];
  const fillOf = (c, op) => `fill="${c}"${op != null ? ` fill-opacity="${op}"` : ""}`;
  function poly(n, r, rot = -90) { const p = []; for (let i = 0; i < n; i++) { const a = ((rot + (360 * i) / n) * Math.PI) / 180; p.push(f1(r * Math.cos(a)) + "," + f1(r * Math.sin(a))); } return p.join(" "); }
  function star(n, ro, ri) { const p = []; for (let i = 0; i < 2 * n; i++) { const r = i % 2 ? ri : ro, a = ((-90 + (180 * i) / n) * Math.PI) / 180; p.push(f1(r * Math.cos(a)) + "," + f1(r * Math.sin(a))); } return p.join(" "); }
  const SH = {
    circle: (f) => `<circle r="34" ${f}/>`, square: (f) => `<rect x="-31" y="-31" width="62" height="62" rx="5" ${f}/>`,
    triangle: (f) => `<polygon points="${poly(3, 41)}" ${f} transform="translate(0 7)"/>`, diamond: (f) => `<polygon points="${poly(4, 40)}" ${f}/>`,
    pentagon: (f) => `<polygon points="${poly(5, 37)}" ${f} transform="translate(0 3)"/>`, hexagon: (f) => `<polygon points="${poly(6, 37)}" ${f}/>`,
    octagon: (f) => `<polygon points="${poly(8, 36, -67.5)}" ${f}/>`, star5: (f) => `<polygon points="${star(5, 41, 18)}" ${f} transform="translate(0 3)"/>`,
    star6: (f) => `<polygon points="${star(6, 40, 21)}" ${f}/>`, cross: (f) => `<path d="M-11-33h22v22h22v22h-22v22h-22v-22h-22v-22h22z" ${f}/>`,
  };
  const PAIRS = [
    [["circle", "triangle"], ["square", "star5"], ["circle", "cross"], ["triangle", "square"], ["diamond", "circle"]],
    [["square", "diamond"], ["circle", "hexagon"], ["triangle", "diamond"], ["star5", "cross"], ["square", "pentagon"]],
    [["pentagon", "hexagon"], ["star5", "star6"], ["circle", "octagon"], ["square", "octagon"]],
    [["hexagon", "octagon"], ["star5", "star6"], ["pentagon", "hexagon"], ["circle", "octagon"]],
  ];
  const DOTS = { 2: [[-13, -13], [13, 13]], 3: [[-15, -15], [0, 0], [15, 15]], 4: [[-14, -14], [14, -14], [-14, 14], [14, 14]],
    5: [[-15, -15], [15, -15], [0, 0], [-15, 15], [15, 15]], 6: [[-14, -17], [14, -17], [-14, 0], [14, 0], [-14, 17], [14, 17]] };
  function landolt(deg) { const r = 31, a = 0.25, x = f1(r * Math.cos(a)), y = f1(r * Math.sin(a));
    return `<g transform="rotate(${deg})"><path d="M${x} ${y} A${r} ${r} 0 1 1 ${x} ${-y}" fill="none" stroke="#ECEDF5" stroke-width="12"/></g>`; }
  const arrow = (deg, f) => `<g transform="rotate(${deg})"><path d="M-34-9h36v-17l34 26-34 26v-17h-36z" ${f}/></g>`;
  const FPENT = [[0, -1], [1, -1], [-1, 0], [0, 0], [0, 1]];
  function fpent(rot, mir, f) { return `<g transform="rotate(${rot}) scale(${mir ? -1 : 1} 1)">${FPENT.map(([x, y]) => `<rect x="${x * 22 - 11}" y="${y * 22 - 11}" width="22" height="22" rx="3" ${f}/>`).join("")}</g>`; }
  function dots(n, f, rot) { return `<circle r="40" fill="none" stroke="rgba(236,237,245,.35)" stroke-width="2"/><g transform="rotate(${rot})">${DOTS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" ${f}/>`).join("")}</g>`; }
  function makeTrial(cfg) {
    const n = cfg.grid, N = n * n, odd = rnd(N), d = cfg.d, type = cfg.types[rnd(cfg.types.length)], col = fillOf(INKS[rnd(INKS.length)]);
    let cell;
    if (type === "shape") { let [a, b] = PAIRS[d][rnd(PAIRS[d].length)]; if (Math.random() < .5) [a, b] = [b, a]; cell = (o) => SH[o ? b : a](col); }
    else if (type === "color") { const base = INKS[rnd(INKS.length)], op = [0.35, 0.55, 0.7, 0.8][d], sh = Math.random() < .5 ? "circle" : "square"; cell = (o) => SH[sh](fillOf(base, o ? op : null)); }
    else if (type === "size") { const sh = ["circle", "square", "hexagon", "star5"][rnd(4)], k = [0.6, 0.74, 0.83, 0.89][d], big = Math.random() < .5; cell = (o) => `<g transform="scale(${o ? (big ? 1 : k) : (big ? k : 1)})">${SH[sh](col)}</g>`; }
    else if (type === "orient") { const o4 = d >= 2 ? 8 : 4, base = rnd(o4) * (360 / o4), dl = [180, 90, 45, 45][d] * (Math.random() < .5 ? 1 : -1); cell = (o) => landolt(base + (o ? dl : 0)); }
    else if (type === "arrow") { const base = rnd(8) * 45, dl = [180, 90, 45, 30][d] * (Math.random() < .5 ? 1 : -1); cell = (o) => arrow(base + (o ? dl : 0), col); }
    else if (type === "count") { const [a, b] = [[2, 3], [3, 4], [4, 5], [5, 6]][d], swap = Math.random() < .5; cell = (o) => dots(o !== swap ? b : a, col, rnd(4) * 90); }
    else { const rot = rnd(4) * 90; cell = (o) => fpent(rot, o, col); }   // mirror
    return { type, odd, n, cells: Array.from({ length: N }, (_, q) => cell(q === odd)) };
  }

  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP), W = f.clientWidth, H = f.clientHeight;
    const fb = f.querySelector(".fb"); fb.style.left = "0"; fb.style.right = "50%"; fb.style.bottom = "8px"; f.querySelector(".fbsub").style.display = "none";
    f.insertAdjacentHTML("beforeend", `
      <div class="card" id="daCard" style="position:absolute;top:96px;right:70px;width:${W / 2 - 110}px;padding:40px 50px;min-height:330px">
        <div class="k" id="daK"></div><div id="daSent" style="${SENT_STYLE}"></div>
        <div class="rule" style="margin:26px 0 20px"></div><div class="k" id="daSub" style="font-size:28px"></div>
        <div id="daOpts" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:6px"></div></div>
      <div class="prompt" id="daFind" style="position:absolute;top:26px;left:0;width:50%">${TX.find}</div>
      <div id="daGrid" style="position:absolute;left:0;width:50%;display:grid;justify-content:center"></div>`);
    const kEl = f.querySelector("#daK"), sentEl = f.querySelector("#daSent"), subEl = f.querySelector("#daSub"), optsEl = f.querySelector("#daOpts"), gridEl = f.querySelector("#daGrid");
    let dead = false, tr = null, trT = null, phase = "read", sent = null, used = new Set(), roundT = [];
    let finds = 0, findN = 0, rec = 0, recN = 0, maxGrid = 3, q = null;

    function newGrid() {
      if (dead || (ctx.overtime && ctx.overtime())) return;
      const S = STEPS[st.step]; tr = makeTrial(S); tr.live = true; maxGrid = Math.max(maxGrid, S.grid);
      const cs = S.grid === 3 ? 190 : 150, gap = S.grid === 3 ? 26 : 18, top = 84 + Math.max(0, (H - 140 - (S.grid * cs + (S.grid - 1) * gap)) / 2);
      gridEl.style.cssText = `position:absolute;left:0;width:50%;top:${top}px;display:grid;justify-content:center;grid-template-columns:repeat(${S.grid},${cs}px);gap:${gap}px;direction:ltr`;
      gridEl.innerHTML = tr.cells.map((c, i) => `<button class="tile" data-i="${i}" ${i === tr.odd ? 'data-odd="1"' : ""} style="width:${cs}px;height:${cs}px;padding:0;display:flex;align-items:center;justify-content:center"><svg width="${cs * GLYPH}" height="${cs * GLYPH}" viewBox="-50 -50 100 100">${c}</svg></button>`).join("");
      gridEl.querySelectorAll("button").forEach((b) => b.addEventListener("pointerdown", () => touch(+b.dataset.i, b)));
      trT = ctx.later(() => touch(-1, null), S.find);
    }
    function touch(i, b) {
      if (!tr || !tr.live || phase === "ask") return;
      tr.live = false; ctx.cancel(trT); findN++;
      const ok = i === tr.odd; if (ok) finds++;
      const oddEl = gridEl.querySelector("[data-odd]");
      if (ok) { b.style.boxShadow = "inset 0 0 0 3px var(--ok)"; ctx.feedback("ok", TX.ok); }
      else { if (b) { b.style.boxShadow = "inset 0 0 0 3px var(--soft)"; b.classList.add("shake"); } if (oddEl) oddEl.style.boxShadow = "inset 0 0 0 3px var(--mark)"; ctx.feedback(b ? "soft" : "neutral", b ? TX.bad : TX.late); }
      st.hit(ok);
      ctx.later(() => { ctx.feedback("", ""); if (phase !== "ask") newGrid(); }, ok ? 450 : 1000);
    }
    function pickSentence() {
      const band = STEPS[st.step].long;
      let pool = SENT.filter((s) => !used.has(s[0]) && bandOf(s) === band);
      if (!pool.length) pool = SENT.filter((s) => !used.has(s[0]));
      const s = pool[rnd(pool.length)]; used.add(s[0]); return s;
    }
    // Card states: the sentence, or (after it hides) one centred line in an otherwise clean card (Design build2 P2-3).
    function cardHidden(on) {
      for (const el of [kEl, subEl, f.querySelector("#daCard .rule")]) el.style.display = on ? "none" : "";
      sentEl.style.cssText = on ? HIDDEN_LINE : SENT_STYLE;
      if (on) sentEl.textContent = TX.hidden;
    }
    function round() {
      if (dead || (ctx.overtime && ctx.overtime())) return;
      phase = "read"; sent = pickSentence();
      cardHidden(false); kEl.textContent = TX.readK; sentEl.textContent = sent[0]; sentEl.style.color = "var(--ink)"; subEl.textContent = TX.later; optsEl.innerHTML = "";
      gridEl.classList.remove("dim"); f.querySelector("#daFind").classList.remove("dim");
      if (!tr || !tr.live) newGrid();
      const S = STEPS[st.step];
      roundT.push(ctx.later(() => { phase = "search"; cardHidden(true); }, S.read));
      roundT.push(ctx.later(askQ, S.read + ROUND.searchAfterRead));
    }
    function askQ() {
      if (dead) return;
      phase = "ask"; if (tr) { tr.live = false; ctx.cancel(trT); }
      gridEl.classList.add("dim"); f.querySelector("#daFind").classList.add("dim");
      const others = shuffle(SENT.filter((s) => s[1] !== sent[1])).slice(0, 3).map((s) => s[1]);
      const opts = shuffle([sent[1]].concat(others));
      q = { val: sent[1], live: true };
      cardHidden(false); kEl.textContent = "שאלה"; sentEl.textContent = TX.ask; sentEl.style.color = "var(--mark)"; subEl.textContent = "";
      optsEl.innerHTML = opts.map((o) => `<button class="ans" data-o="${o}" style="height:118px;font-size:40px">${o}</button>`).join("");
      optsEl.querySelectorAll(".ans").forEach((b) => b.addEventListener("pointerdown", () => answer(b.dataset.o, b)));
      q.t = ctx.later(() => answer(null, null), ROUND.askMs);
    }
    function answer(o, b) {
      if (!q || !q.live) return;
      q.live = false; ctx.cancel(q.t); recN++;
      const ok = o === q.val; if (ok) rec++;
      if (b) b.classList.add(ok ? "ok" : "bad");
      if (!ok) { const r = optsEl.querySelector(`[data-o="${q.val}"]`); if (r && r !== b) r.classList.add("was"); }
      subEl.innerHTML = ok ? `<span style="color:var(--ok)">${TX.ok}</span>` : `<span style="color:var(--soft)">${o == null ? TX.late : TX.bad}</span> המשפט היה: ${ctx.esc(sent[0])}`;
      st.hit(ok);
      ctx.later(() => { tr = null; round(); }, ok ? 1100 : 2000);
    }
    function result() {
      const fAcc = findN ? 100 * finds / findN : 0, rAcc = recN ? 100 * rec / recN : 0, perf = recN ? .55 * fAcc + .45 * rAcc : fAcc;
      const g = maxGrid >= 4 ? "עד רשת של 16" : "ברשת של 9";
      const found = finds === 0 ? `הפעם לא נמצאה צורה שונה ${g}` : `מצאתם ${finds === 1 ? "צורה שונה אחת" : `${finds} צורות שונות`} ${g}`;
      const recTxt = !recN ? "" : recN === 1 ? (rec ? ", וזכרתם את המשפט" : ", והמשפט הפעם לא נזכר") : `, וזכרתם ${rec} מתוך ${recN} משפטים`;
      const fact = `${found}${recTxt}.`;
      return { score: ctx.blend(perf, st.max, TOP), fact, metrics: { finds, findN, rec, recN, maxStep: st.max } };
    }
    return {
      start() { round(); },
      midRound: () => !!((tr && tr.live) || (q && q.live)),
      stop() { dead = true; return result(); },
      destroy() { dead = true; },
      _debug: () => ({ phase, odd: tr && tr.live ? tr.odd : null, val: q && q.live ? q.val : null, step: st.step }),
    };
  }

  function diagram(el) {
    const cells = Array.from({ length: 9 }, (_, i) => `<div class="tile" style="width:96px;height:96px;display:flex;align-items:center;justify-content:center;${i === 5 ? "box-shadow:inset 0 0 0 3px var(--ok)" : ""}"><svg width="60" height="60" viewBox="-50 -50 100 100">${i === 5 ? SH.circle(fillOf("#ECEDF5")) : SH.triangle(fillOf("#ECEDF5"))}</svg></div>`).join("");
    el.innerHTML = `<div style="display:flex;gap:40px;align-items:center;direction:rtl">
      <div class="card" style="width:290px;padding:26px 28px"><div class="k" style="font-size:24px">קראו וזכרו</div><div style="font:500 34px/1.35 var(--t);margin-top:12px">המפתחות על השידה.</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,96px);gap:14px">${cells}</div></div>`;
  }

  SHEBA.register({
    id: "dual_attention", name: "קשב כפול", skill: "sharp", seconds: true,
    instr: {
      title: "קוראים, מחפשים, נזכרים",
      steps: [
        "בצד ימין מופיע משפט. <b>קראו וזכרו</b> אותו.",
        "בצד שמאל: געו בצורה <b>השונה</b> מכל האחרות.",
        "אחרי כמה שניות תופיע שאלה על המשפט.",
      ],
      diagram,
    },
    create,
  });
})();
