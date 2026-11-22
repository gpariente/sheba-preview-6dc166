/*
 * אתגר הזיכרון (memory) — Sheba port of the station Memory Quest
 * (station_review/dashboard/lib/station/memory/engine.ts + components/station/memory-game.tsx).
 * Kept: Pancho's round accuracy (correct/total × total/(total+errors)); the "where was it" (spatial) and
 * "remember the order" (sequence) tasks. Changed per Design/QA: 2 modes alternating for 60 s, thin-line objects
 * instead of emoji, 6 s answer timeout on every question, rounds start by themselves, Hebrew plurals, no time
 * shown, no coach level / save / sessionStorage. The engine's streak rule becomes the shared staircase
 * (3 correct answers in a row → harder, 2 misses → easier), starting at 2 items on a 6-cell grid.
 */
(function () {
  "use strict";
  // thin-line objects (48×48, stroke only). g: m / f / p for "איפה היה / הייתה / היו".
  const P = (d) => d;
  const ITEMS = [
    { id: "glasses", he: "המשקפיים", g: "p", svg: P('<circle cx="14" cy="27" r="7"/><circle cx="34" cy="27" r="7"/><path d="M21 27h6M7 25l-3-6M41 25l3-6"/>') },
    { id: "key", he: "המפתח", g: "m", svg: P('<circle cx="15" cy="24" r="8"/><path d="M23 24h19M36 24v6M41 24v5"/>') },
    { id: "cup", he: "הכוס", g: "f", svg: P('<path d="M11 15h22v14a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z"/><path d="M33 19h3a5 5 0 0 1 0 10h-3M17 9c0 2 2 2 2 4M24 8c0 2 2 2 2 4"/>') },
    { id: "apple", he: "התפוח", g: "m", svg: P('<path d="M24 16c-4-3-13-2-13 9 0 8 6 15 10 15 2 0 2-1 3-1s1 1 3 1c4 0 10-7 10-15 0-11-9-12-13-9z"/><path d="M24 16c0-4 2-7 5-8M24 13c-3-3-6-3-8-2"/>') },
    { id: "clock", he: "השעון", g: "m", svg: P('<circle cx="24" cy="25" r="15"/><path d="M24 16v9l6 4M16 7l-5 4M32 7l5 4"/>') },
    { id: "book", he: "הספר", g: "m", svg: P('<path d="M8 11c6-2 12-1 16 3v25c-4-4-10-5-16-3zM40 11c-6-2-12-1-16 3v25c4-4 10-5 16-3z"/>') },
    { id: "flower", he: "הפרח", g: "m", svg: P('<circle cx="24" cy="17" r="4"/><path d="M24 13c-2-6 6-6 0 0M28 17c6-2 6 6 0 0M24 21c2 6-6 6 0 0M20 17c-6 2-6-6 0 0"/><path d="M24 21v20M24 33c-4-4-9-3-10-1M24 30c4-4 8-3 9-1"/>') },
    { id: "umbrella", he: "המטרייה", g: "f", svg: P('<path d="M6 24a18 18 0 0 1 36 0zM24 6v2M24 24v12a4 4 0 0 1-8 0"/>') },
    { id: "hat", he: "הכובע", g: "m", svg: P('<path d="M14 30V18a10 6 0 0 1 20 0v12"/><ellipse cx="24" cy="31" rx="18" ry="5"/><path d="M14 25h20"/>') },
    { id: "phone", he: "הטלפון", g: "m", svg: P('<rect x="15" y="6" width="18" height="36" rx="4"/><path d="M21 37h6M21 10h6"/>') },
    { id: "letter", he: "המכתב", g: "m", svg: P('<rect x="7" y="13" width="34" height="23" rx="3"/><path d="M8 15l16 12 16-12"/>') },
    { id: "ball", he: "הכדור", g: "m", svg: P('<circle cx="24" cy="24" r="15"/><path d="M9 24c6-4 24-4 30 0M24 9c-5 6-5 24 0 30"/>') },
    { id: "scissors", he: "המספריים", g: "p", svg: P('<circle cx="14" cy="35" r="5"/><circle cx="34" cy="35" r="5"/><path d="M17 31L33 8M31 31L15 8"/>') },
    { id: "candle", he: "הנר", g: "m", svg: P('<rect x="18" y="20" width="12" height="21" rx="2"/><path d="M24 20v-4M24 7c3 4 3 7 0 9-3-2-3-5 0-9z"/>') },
  ];
  const icon = (it, size, col, w) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="${col || "#ECEDF5"}" stroke-width="${w || 2.2}" stroke-linecap="round" stroke-linejoin="round">${it.svg}</svg>`;
  const verb = (it) => ({ m: "היה", f: "הייתה", p: "היו" })[it.g];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // staircase steps (replaces the engine's 10-level table for a 60 s game)
  const STEPS = [
    null,
    { items: 2, cols: 3, rows: 2, expo: 3.0, seq: 3, flash: 1.2, extra: 0 },
    { items: 3, cols: 3, rows: 2, expo: 3.0, seq: 3, flash: 1.2, extra: 0 },
    { items: 3, cols: 3, rows: 3, expo: 3.0, seq: 4, flash: 1.1, extra: 0 },
    { items: 4, cols: 3, rows: 3, expo: 3.5, seq: 4, flash: 1.0, extra: 1 },
    { items: 4, cols: 4, rows: 3, expo: 3.5, seq: 5, flash: 1.0, extra: 1 },
    { items: 5, cols: 4, rows: 3, expo: 4.0, seq: 5, flash: .9, extra: 2 },
  ];
  const TOP = STEPS.length - 1, ANSWER_MS = 6000, REVEAL_MS = 1200;

  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP);
    f.insertAdjacentHTML("beforeend", `<div id="mqPrompt" style="position:absolute;top:34px;left:50%;transform:translateX(-50%);height:96px;padding:0 40px;display:flex;align-items:center;gap:22px;border:1px solid var(--hair);border-radius:16px;background:rgba(19,25,70,.6);font:500 46px var(--t);white-space:nowrap"></div>
      <div id="mqBoard" style="position:absolute;left:0;right:0;top:160px;bottom:110px;display:flex;align-items:center;justify-content:center"></div>`);
    const promptEl = f.querySelector("#mqPrompt"), board = f.querySelector("#mqBoard");
    let dead = false, round = 0, live = null, timers = [];
    const outcomes = [];           // per round: {correct,total,errors,acc}
    let answered = 0, right = 0, maxCells = 6;
    const later = (fn, ms) => { const id = ctx.later(() => { if (!dead) fn(); }, ms); timers.push(id); return id; };
    const prompt = (html) => { promptEl.innerHTML = html; promptEl.style.display = html ? "flex" : "none"; };

    function trial(ok, wrongTap) {
      answered++; if (ok) right++;
      live.correct += ok ? 1 : 0; live.total++; if (wrongTap) live.errors++;
      st.hit(ok);
    }
    function closeRound() {
      if (live && live.total) { const a = Math.max(0, Math.min(1, (live.correct / live.total) * (live.total / (live.total + live.errors)))); outcomes.push(Math.round(a * 100)); }
      live = null;
    }
    function nextRound() {
      if (dead) return;
      closeRound();
      if (ctx.overtime && ctx.overtime()) return;   // +10 s overtime: no new round, the kiosk ends the game
      round++;
      const s = STEPS[st.step];
      live = { correct: 0, total: 0, errors: 0 };
      if (round % 2 === 1) spatial(s); else sequence(s);
    }

    // ── איפה זה היה? ──
    function spatial(s) {
      ctx.setStage("");
      const n = s.cols * s.rows; maxCells = Math.max(maxCells, n);
      const cw = s.rows === 2 ? 300 : 260, ch = s.rows === 2 ? 240 : 168, gap = 26, isz = s.rows === 2 ? 128 : 120;
      const cells = shuffle([...Array(n).keys()]).slice(0, s.items), items = shuffle(ITEMS).slice(0, s.items);
      const at = new Map(cells.map((c, i) => [c, items[i]]));
      board.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${s.cols},${cw}px);grid-auto-rows:${ch}px;gap:${gap}px;direction:ltr">${[...Array(n).keys()].map((i) =>
        `<button class="tile" data-c="${i}" ${at.has(i) ? `data-it="${at.get(i).id}"` : ""} style="display:flex;align-items:center;justify-content:center">${at.has(i) ? icon(at.get(i), isz) : ""}</button>`).join("")}</div>`;
      const cellEl = (i) => board.querySelector(`[data-c="${i}"]`);
      prompt(`<span>זכרו איפה כל חפץ</span>`);
      ctx.feedback("", "");
      later(() => {
        board.querySelectorAll(".tile").forEach((b) => { b.innerHTML = ""; b.removeAttribute("data-it"); });
        const order = shuffle(cells); let k = 0;
        const ask = () => {
          if (k >= order.length) { if (live) live.done = true; later(nextRound, 700); return; }
          const c = order[k], it = at.get(c); let done = false;
          prompt(`${icon(it, 60, "#8CC8FF")}<span>איפה ${verb(it)} ${it.he}?</span>`); promptEl.dataset.ask = it.id;
          const finish = (ok, tapped) => {
            if (done) return; done = true; ctx.cancel(to);
            board.querySelectorAll(".tile").forEach((b) => (b.onpointerdown = null));
            const good = cellEl(c);
            if (ok) { good.innerHTML = icon(it, isz); good.style.borderColor = "var(--ok)"; good.style.boxShadow = "inset 0 0 0 2px var(--ok)"; ctx.feedback("ok", "נכון. זה היה כאן."); trial(true, false); }
            else {
              if (tapped != null) { const b = cellEl(tapped); b.innerHTML = ctx.icon.cross(64); b.classList.add("shake"); }
              good.innerHTML = icon(it, isz, "#8CC8FF"); good.style.border = "2px dashed var(--mark)";
              ctx.feedback(tapped != null ? "soft" : "miss", tapped != null ? "לא כאן." : "זה היה כאן.", tapped != null ? "זה היה כאן." : "");
              trial(false, tapped != null);
            }
            later(() => { [good, tapped != null ? cellEl(tapped) : null].forEach((b) => { if (b) { b.innerHTML = ""; b.style.border = ""; b.style.borderColor = ""; b.style.boxShadow = ""; b.classList.remove("shake"); } }); ctx.feedback("", ""); k++; ask(); }, ok ? 650 : REVEAL_MS);
          };
          board.querySelectorAll(".tile").forEach((b) => (b.onpointerdown = () => { const i = +b.dataset.c; finish(i === c, i === c ? null : i); }));
          const to = later(() => finish(false, null), ANSWER_MS);
        };
        ask();
      }, s.expo * 1000);
    }

    // ── זכרו את הסדר ──
    function sequence(s) {
      ctx.setStage("");
      const items = shuffle(ITEMS).slice(0, s.seq), extra = shuffle(ITEMS.filter((x) => !items.includes(x))).slice(0, s.extra);
      prompt(`<span>זכרו את הסדר</span>`); ctx.feedback("", "");
      let i = 0;
      const show = () => {
        if (i >= items.length) return recall();
        board.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:26px">
          <div class="tile" data-show="${items[i].id}" style="width:360px;height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">${icon(items[i], 180)}<div style="font:500 40px var(--t)">${items[i].he.replace(/^ה/, "")}</div></div>
          <div class="dots" style="gap:16px">${items.map((_, j) => `<i class="${j < i ? "done" : j === i ? "on" : ""}" style="width:16px;height:16px"></i>`).join("")}</div></div>`;
        later(() => { board.innerHTML = ""; later(() => { i++; show(); }, 250); }, s.flash * 1000);
      };
      const recall = () => {
        const choices = shuffle([...items, ...extra]);
        prompt(`<span>געו בחפצים לפי הסדר</span>`);
        board.innerHTML = `<div style="display:flex;gap:28px;flex-wrap:wrap;justify-content:center;max-width:1560px">${choices.map((it) =>
          `<button class="tile" data-id="${it.id}" style="width:230px;height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">${icon(it, 120)}<div style="font:400 28px var(--t);color:var(--ink2)">${it.he.replace(/^ה/, "")}</div><span class="badge" style="position:absolute;top:10px;right:14px;font:600 28px var(--d);color:var(--ok)"></span></button>`).join("")}</div>`;
        const tileOf = (it) => board.querySelector(`[data-id="${it.id}"]`);
        let k = 0, to = null, busy = false;
        const arm = () => { ctx.cancel(to); to = later(() => answer(null), ANSWER_MS); };
        const mark = (it, ok) => { const b = tileOf(it); b.style.borderColor = ok ? "var(--ok)" : "var(--mark)"; b.style.borderStyle = ok ? "solid" : "dashed"; b.style.borderWidth = "2px"; b.querySelector(".badge").textContent = String(k + 1); b.querySelector(".badge").style.color = ok ? "var(--ok)" : "var(--mark)"; b.disabled = true; };
        const answer = (tapped) => {
          if (busy || dead) return;
          const want = items[k], ok = tapped === want;
          if (ok) { mark(want, true); ctx.feedback("ok", "נכון."); trial(true, false); k++; }
          else {
            busy = true;
            if (tapped) { const b = tileOf(tapped); b.classList.add("shake"); later(() => b.classList.remove("shake"), 460); }
            mark(want, false); ctx.feedback(tapped ? "soft" : "miss", tapped ? "לא זה." : "זה היה הבא בתור.", tapped ? "זה היה הבא בתור." : "");
            trial(false, !!tapped); k++;
          }
          ctx.cancel(to);
          if (k >= items.length) { if (live) live.done = true; later(() => { ctx.feedback("", ""); nextRound(); }, ok ? 800 : REVEAL_MS); return; }
          if (busy) later(() => { busy = false; arm(); }, REVEAL_MS); else arm();
        };
        board.querySelectorAll("[data-id]").forEach((b) => (b.onpointerdown = () => { if (b.disabled) return; answer([...items, ...extra].find((x) => x.id === b.dataset.id)); }));
        arm();
      };
      show();
    }

    function result() {
      closeRound();
      const acc = outcomes.length ? Math.round(outcomes.reduce((a, b) => a + b, 0) / outcomes.length) : 0;
      const grid = `עד רשת של ${maxCells} משבצות`;
      const fact = !answered ? "המשחק הסתיים לפני השאלה הראשונה."
        : right === 0 ? `הפעם לא זכרתם חפץ, ${grid}.`
        : answered === 1 ? `זכרתם חפץ אחד מתוך אחד, ${grid}.`
        : `זכרתם ${right === 1 ? "חפץ אחד" : `${right} חפצים`} מתוך ${answered}, ${grid}.`;
      return { score: ctx.blend(acc, st.max, TOP), fact,
        metrics: { acc, rounds: outcomes.length, maxStep: st.max } };
    }
    return {
      start() { nextRound(); },
      midRound: () => !!(live && !live.done),                        // a round is on: time-up gives the +10 s overtime
      stop() { dead = true; return result(); },
      destroy() { dead = true; },
    };
  }

  function diagram(el) {
    const it = ITEMS[0], k = ITEMS[1];
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:30px">
      <div style="height:80px;padding:0 30px;display:flex;align-items:center;gap:18px;border:1px solid var(--hair);border-radius:14px;font:500 36px var(--t)">${icon(it, 48, "#8CC8FF")}איפה היו המשקפיים?</div>
      <div style="display:grid;grid-template-columns:repeat(3,150px);grid-auto-rows:112px;gap:18px;direction:ltr">
        ${[0, 1, 2, 3, 4, 5].map((i) => `<div class="tile" style="display:flex;align-items:center;justify-content:center;${i === 4 ? "border:2px solid var(--ok)" : ""}">${i === 4 ? icon(it, 64) : i === 0 ? icon(k, 64, "rgba(236,237,245,.35)") : ""}</div>`).join("")}
      </div></div>`;
  }

  SHEBA.register({
    id: "memory", name: "אתגר הזיכרון", skill: "memory", seconds: true,
    instr: {
      title: "זכרו איפה כל חפץ",
      steps: [
        "חפצים יופיעו על לוח לכמה שניות.",
        "הם נעלמים. <b>געו במקום</b> שבו כל חפץ היה.",
        "בסבב הבא <b>זכרו את הסדר</b> שבו הם הופיעו.",
      ],
      diagram,
    },
    create,
  });
})();
