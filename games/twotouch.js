/*
 * תפיסה דו-ידית (two_hand_touch) — Sheba version of games_src/two-hand-touch.html (v1.3).
 * Kept: balls thrown in arcs from the sides and from below; each ball must be touched in its own half of the screen
 * (the hand rule checked by touch); a word flashes and is asked about later.
 * Changed per Design (REVIEW.md §7): blue filled disc = יד ימין (touch it on the right), amber ring = יד שמאל (touch
 * it on the left), with a legend (no more black-on-white, no colour-only rule); a large word card; one recall question
 * at the end. 60 s = about 48 s of catching + 12 s recall. No beeps, pickers, names or storage; staircase 3 up / 2 down.
 * Ladder (Design + Guy 22.11): slower balls → faster → two at once (one per hand, with a "ביחד" window that tightens)
 * → a second word; balls shrink and their speeds and launch points vary more as the step rises.
 *
 * Tuning: STEPS, PLAY_S and TX below.
 */
(function () {
  "use strict";
  // d: ball px · gap: s between throws · cross: s to cross the court · max: balls at once · pair: share of paired throws
  // win: ms for both balls of a pair to count "ביחד" · vary: ± speed spread · words: words to remember · flash: ms on screen
  const STEPS = [null,
    { d: 250, gap: 1.9, cross: 5.2, max: 1, pair: 0, win: 0, vary: 0.05, words: 1, flash: 4000 },
    { d: 235, gap: 1.6, cross: 4.6, max: 2, pair: 0, win: 0, vary: 0.10, words: 1, flash: 3600 },
    { d: 220, gap: 1.4, cross: 4.0, max: 2, pair: 0, win: 0, vary: 0.15, words: 1, flash: 3200 },
    { d: 205, gap: 1.6, cross: 3.7, max: 3, pair: 0.45, win: 900, vary: 0.20, words: 1, flash: 3000 },
    { d: 190, gap: 1.3, cross: 3.4, max: 4, pair: 0.65, win: 650, vary: 0.25, words: 2, flash: 2600 },
    { d: 180, gap: 1.0, cross: 3.1, max: 5, pair: 0.80, win: 450, vary: 0.30, words: 2, flash: 2200 },
  ];
  // Design build2: moving balls never below D_FLOOR; the touch area is HIT × the ball. Harder = more balls and pairs, not smaller.
  const D_FLOOR = 180, HIT = 1.3;
  const TOP = STEPS.length - 1, PLAY_S = 48, ASK_MS = 10000, WORD_AT = [1.5, 24];
  const TX = {
    remember: "זכרו את המילה", ok: { L: "שמאל", R: "ימין" }, wrong: "צד לא נכון", miss: "פספוס", pair: "ביחד",
    ask1: "איזו מילה הופיעה?", ask2: "אילו שתי מילים הופיעו? געו בשתיהן.", right: "נכון.", bad: "לא הפעם.", late: "הזמן עבר.",
  };
  const WORDS = ["כרית", "מטריה", "פנס", "מפתח", "שעון", "סולם", "ג׳ירפה", "ינשוף", "דולפין", "קיפוד", "רימון", "אבטיח", "תאנה", "מגפיים", "משקפיים", "צב"];
  const rnd = (a, b) => a + Math.random() * (b - a), shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP), W = f.clientWidth, H = f.clientHeight, MID = W / 2;
    const TOTAL = ctx.cfg.GAME_SECONDS || 60, PLAY = TOTAL * PLAY_S / 60, W2 = TOTAL * WORD_AT[1] / 60;
    f.insertAdjacentHTML("beforeend", `<div class="mid"></div>
      <div class="card" id="ttCard" style="position:absolute;top:22px;left:50%;transform:translateX(-50%);min-width:330px;padding:16px 50px 20px;text-align:center;z-index:4;visibility:hidden">
        <div class="k">${TX.remember}</div><div id="ttWord" style="font:500 84px/1.15 var(--t)"></div></div>
      <div id="ttQ" style="position:absolute;inset:0;z-index:5;display:none;flex-direction:column;align-items:center;justify-content:center;gap:30px;background:rgba(13,17,48,.9)">
        <div id="ttAsk" style="font:500 60px var(--t)"></div><div id="ttOpts" style="display:grid;grid-template-columns:repeat(3,330px);gap:28px"></div></div>
      <div class="legend" style="right:36px"><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#6FB4F5"/></svg><span>כחול מלא ← יד ימין, בצד ימין</span></div>
      <div class="legend" style="left:36px"><span>טבעת צהובה ← יד שמאל, בצד שמאל</span><svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10.5" fill="none" stroke="#F5C842" stroke-width="3"/></svg></div>`);
    const fb = f.querySelector(".fb"); fb.style.bottom = "70px";
    const card = f.querySelector("#ttCard"), wordEl = f.querySelector("#ttWord"), qEl = f.querySelector("#ttQ");
    let dead = false, raf = 0, last = null, balls = [], uid = 0, nextAt = 1.0, phase = "play", pairSeq = 0;
    const shown = [], pool = shuffle(WORDS), stats = { hit: 0, wrong: 0, miss: 0, pairs: 0, pairsTogether: 0, rts: [] };
    let quiz = null;

    function ballEl(side, d) {
      const e = document.createElement("div");
      e.style.cssText = `position:absolute;left:0;top:0;width:${d}px;height:${d}px;border-radius:50%;pointer-events:none;z-index:2;` +
        (side === "R" ? "background:#6FB4F5;box-shadow:inset 0 -10px 24px rgba(13,17,48,.25)" : `border:${Math.round(d * .085)}px solid #F5C842;background:rgba(245,200,66,.06)`);
      e.dataset.side = side; f.appendChild(e); return e;
    }
    function spawn(side, kind, pairId) {
      const S = STEPS[st.step], d = Math.max(D_FLOOR, S.d), r = d / 2;
      let x0, y0, x1, y1;
      if (kind === "left") { x0 = -r; y0 = H * rnd(.45, .85); x1 = W + r; y1 = H * rnd(.5, 1); }
      else if (kind === "right") { x0 = W + r; y0 = H * rnd(.45, .85); x1 = -r; y1 = H * rnd(.5, 1); }
      else { x0 = side === "L" ? W * rnd(.08, .45) : W * rnd(.55, .92); y0 = H + r; x1 = side === "L" ? W * rnd(.08, .4) : W * rnd(.6, .92); y1 = H + r; }
      const apex = H * rnd(.16, .38), h = Math.max(0, (y0 + y1) / 2 - apex);
      const T = S.cross * rnd(1 - S.vary, 1 + S.vary) * (kind === "bottom" ? .8 : 1);
      balls.push({ id: ++uid, side, kind, x0, y0, x1, y1, h, T, p: 0, x: x0, y: y0, d, el: ballEl(side, d), pairId, born: ctx.now(), avail: null });
    }
    function throwNext() {
      const S = STEPS[st.step];
      if (balls.length >= S.max) return;
      if (S.pair && Math.random() < S.pair && balls.length <= S.max - 2) {   // one per hand, launched together
        const id = ++pairSeq; stats.pairs++; spawn("L", "bottom", id); spawn("R", "bottom", id);
        pairs[id] = { t: {}, win: S.win };
      } else {
        const side = Math.random() < .5 ? "L" : "R", kind = st.step <= 1 ? (Math.random() < .5 ? "left" : "right") : ["left", "right", "bottom"][Math.floor(Math.random() * 3)];
        spawn(side, kind, 0);
      }
    }
    const pairs = {};
    const posAt = (b, p) => [b.x0 + (b.x1 - b.x0) * p, (1 - p) * b.y0 + p * b.y1 - 4 * b.h * p * (1 - p)];
    const own = (b, x) => (b.side === "L" ? x < MID : x >= MID);
    function pop(b, text, col) {
      const e = document.createElement("div");
      e.style.cssText = `position:absolute;left:${Math.max(80, Math.min(W - 80, b.x))}px;top:${Math.max(30, b.y - b.d / 2 - 30)}px;transform:translate(-50%,-50%);font:500 34px var(--t);color:${col};z-index:3;pointer-events:none;transition:opacity .6s,transform .6s`;
      e.textContent = text; f.appendChild(e);
      requestAnimationFrame(() => { e.style.opacity = "0"; e.style.transform = "translate(-50%,-90%)"; });
      setTimeout(() => e.remove(), 700);
    }
    function kill(b) { b.dead = true; b.el.remove(); }
    const down = (e) => {
      if (phase !== "play" || ctx.paused()) return;
      const p = ctx.local(e); let best = null, bd = 1e9;
      for (const b of balls) { const dd = Math.hypot(b.x - p.x, b.y - p.y); if (dd < Math.max(b.d, D_FLOOR) / 2 * HIT && dd < bd) { bd = dd; best = b; } }
      if (!best) return;
      kill(best);
      if (own(best, p.x)) {
        stats.hit++; stats.rts.push(ctx.now() - (best.avail ?? best.born)); pop(best, TX.ok[best.side] + " ✓", "#4FBF8A"); st.hit(true);
        if (best.pairId) {
          const pr = pairs[best.pairId]; pr.t[best.side] = ctx.now();
          if (pr.t.L != null && pr.t.R != null && Math.abs(pr.t.L - pr.t.R) <= pr.win) { stats.pairsTogether++; ctx.feedback("ok", TX.pair, "", 900); }
        }
      } else { stats.wrong++; pop(best, TX.wrong, "#F2A66A"); st.hit(false); }
    };
    function flashWord() {
      const w = pool[shown.length]; shown.push(w); wordEl.textContent = w; card.style.visibility = "visible";
      ctx.later(() => { card.style.visibility = "hidden"; }, STEPS[st.step].flash);
    }
    function frame(now) {
      if (dead) return;
      const dt = last == null ? 0 : Math.min(.05, (now - last) / 1000); last = now;
      if (!ctx.paused() && phase === "play") {
        const gt = ctx.now() / 1000;
        if (gt >= PLAY) { endPlay(); }
        else {
          if (gt >= nextAt) { throwNext(); nextAt = gt + STEPS[st.step].gap * rnd(.8, 1.2); }
          for (const b of balls) {
            b.p += dt / b.T; [b.x, b.y] = posAt(b, b.p);
            if (b.avail == null && own(b, b.x) && b.y < H - b.d / 2) b.avail = ctx.now();
            b.el.style.transform = `translate(${b.x - b.d / 2}px,${b.y - b.d / 2}px)`;
            if (b.p >= 1) { kill(b); stats.miss++; pop({ x: b.x, y: Math.min(b.y, H - 60), d: 0 }, TX.miss, "#8CC8FF"); st.hit(false); }
          }
          balls = balls.filter((b) => !b.dead);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function endPlay() {
      phase = "ask"; balls.forEach(kill); balls = []; card.style.visibility = "hidden";
      const need = shown.length || 1, opts = shuffle(shown.concat(shuffle(WORDS.filter((w) => !shown.includes(w))).slice(0, need === 1 ? 3 : 4)));
      quiz = { need, picked: [], live: true };
      f.querySelector("#ttAsk").textContent = need === 1 ? TX.ask1 : TX.ask2;
      const oe = f.querySelector("#ttOpts"); oe.style.gridTemplateColumns = `repeat(${opts.length > 4 ? 3 : 2},330px)`;
      oe.innerHTML = opts.map((o) => `<button class="ans" data-o="${o}" style="height:130px;font-size:46px">${o}</button>`).join("");
      oe.querySelectorAll(".ans").forEach((b) => b.addEventListener("pointerdown", () => choose(b)));
      qEl.style.display = "flex";
      quiz.t = ctx.later(() => finishQuiz(true), ASK_MS);
    }
    function choose(b) {
      if (!quiz || !quiz.live || quiz.picked.includes(b.dataset.o)) return;
      quiz.picked.push(b.dataset.o); b.classList.add("pick");
      if (quiz.picked.length >= quiz.need) finishQuiz(false);
    }
    function finishQuiz(timeout) {
      if (!quiz.live) return;
      quiz.live = false; ctx.cancel(quiz.t);
      const oe = f.querySelector("#ttOpts");
      quiz.right = quiz.picked.filter((w) => shown.includes(w)).length;
      oe.querySelectorAll(".ans").forEach((b) => { const w = b.dataset.o, sel = quiz.picked.includes(w), was = shown.includes(w); b.classList.remove("pick"); if (sel) b.classList.add(was ? "ok" : "bad"); else if (was) b.classList.add("was"); });
      const all = quiz.right === quiz.need;
      if (all) ctx.feedback("ok", TX.right); else ctx.feedback(timeout ? "neutral" : "soft", timeout ? TX.late : TX.bad);
      ctx.later(() => ctx.done(result()), 1600);
    }
    function result() {
      const n = stats.hit + stats.wrong + stats.miss, acc = n ? 100 * stats.hit / n : 0;
      const rt = stats.rts.length ? stats.rts.reduce((a, v) => a + v, 0) / stats.rts.length : 1600;
      const balls = acc * (.7 + .3 * Math.max(0, Math.min(1, (1600 - rt) / 1000)));
      const mem = quiz && quiz.right != null ? 100 * quiz.right / quiz.need : 0;
      const ms = st.max >= 4 ? "עד שני כדורים יחד" : st.max >= 3 ? "עד הקצב המהיר" : "בקצב הרגוע";
      const wordTxt = quiz && quiz.right != null ? (quiz.need === 1 ? (quiz.right ? ", והמילה נזכרה" : "") : `, ${quiz.right} מתוך 2 מילים`) : "";
      return { score: ctx.blend(.7 * balls + .3 * mem, st.max, TOP), fact: `${stats.hit} מתוך ${n} כדורים ביד הנכונה, ${ms}${wordTxt}.`, metrics: { ...stats, rts: undefined, n, mem, maxStep: st.max } };
    }
    return {
      start() {
        document.addEventListener("pointerdown", down, true);
        ctx.later(flashWord, WORD_AT[0] * 1000);
        ctx.later(() => { if (STEPS[st.step].words >= 2 && phase === "play") flashWord(); }, W2 * 1000);
        raf = requestAnimationFrame(frame);
      },
      stop() { dead = true; return result(); },
      destroy() { dead = true; cancelAnimationFrame(raf); document.removeEventListener("pointerdown", down, true); },
      _debug: () => ({ phase, step: st.step, balls: balls.map((b) => ({ x: b.x, y: b.y, side: b.side, d: b.d, avail: own(b, b.x) && b.y < H - b.d / 2 && b.y > 0 })), words: shown.slice() }),
    };
  }

  function diagram(el) {
    el.innerHTML = `<div style="position:relative;width:700px;height:560px">
      <div style="position:absolute;top:60px;bottom:60px;left:50%;width:1px;background:var(--hair)"></div>
      <svg width="700" height="560" style="position:absolute;left:0;top:0" fill="none" stroke="rgba(236,237,245,.35)" stroke-width="2" stroke-dasharray="4 10"><path d="M40 470 Q200 120 260 300"/><path d="M660 470 Q500 120 440 300"/></svg>
      <div style="position:absolute;left:205px;top:245px;width:110px;height:110px;border-radius:50%;border:9px solid #F5C842;box-sizing:border-box"></div>
      <div style="position:absolute;right:205px;top:245px;width:110px;height:110px;border-radius:50%;background:#6FB4F5"></div>
      <div class="card" style="position:absolute;top:40px;left:50%;transform:translateX(-50%);padding:10px 34px;text-align:center"><div class="k" style="font-size:22px">זכרו את המילה</div><div style="font:500 46px var(--t)">כרית</div></div>
      <div style="position:absolute;bottom:40px;right:40px;font:400 26px var(--t);color:var(--ink2)">כחול ← יד ימין</div>
      <div style="position:absolute;bottom:40px;left:40px;font:400 26px var(--t);color:var(--ink2)">צהוב ← יד שמאל</div></div>`;
  }

  SHEBA.register({
    id: "two_hand_touch", name: "תפיסה דו-ידית", skill: "coord", seconds: true,
    instr: {
      title: "תופסים ביד הנכונה",
      steps: [
        "כדור <b style=\"color:#6FB4F5\">כחול מלא</b>: יד ימין, בצד ימין של המסך.",
        "טבעת <b style=\"color:#F5C842\">צהובה</b>: יד שמאל, בצד שמאל של המסך.",
        "בהתחלה תופיע מילה. <b>זכרו אותה</b>: בסוף נשאל עליה.",
      ],
      diagram,
    },
    create,
  });
})();
