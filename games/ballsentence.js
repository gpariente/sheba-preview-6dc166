/*
 * כדור ומשפט (ball_sentence) — Sheba version of games_src/ball-and-voice.html (v1.3), renamed: there is no audio.
 * Kept: one hand keeps a finger on a moving ball, the other hand answers short sentence questions; the original's
 * sentence bank and question generators (sense, compare, quant, syll, odd, cond, seq, neg), the smooth ball path.
 * Changed per Design (REVIEW.md §1): 60 s, about 6 sentences; ball on the right half (starts at 280 px, contact
 * ring turns green on contact); sentence 52 px, mark-blue question, 2×2 answers on the left; lifting the finger
 * shows "החזירו את האצבע לכדור" and never fails the trial; staircase 3 up / 2 down on the answers; no speech, no
 * language/level pickers, no names, no storage. Ball shrinks with the step (Guy, 22.11), floor 220 px.
 *
 * Tuning: everything adjustable is in STEPS and TX below.
 */
(function () {
  "use strict";
  // ball: diameter px · spd: path speed · items: question types · limit: answer window ms
  // Design ladder: slow ball + 2-clause sentence → faster ball → 3 clauses → "אי אפשר לדעת" sometimes correct.
  const STEPS = [null,
    { ball: 280, spd: 0.70, items: ["sense"], limit: 9000 },
    { ball: 270, spd: 0.90, items: ["sense", "odd"], limit: 9000 },
    { ball: 255, spd: 0.95, items: ["compare", "seq", "syll", "odd"], limit: 9000 },
    { ball: 240, spd: 1.15, items: ["compare", "quantAll", "syll", "condSure", "seq"], limit: 8500 },
    { ball: 230, spd: 1.30, items: ["compare", "compareUnk", "quant", "cond", "neg"], limit: 8000 },
    { ball: 220, spd: 1.45, items: ["quant", "cond", "compareUnk", "neg", "seq"], limit: 7500 },
  ];
  const TOP = STEPS.length - 1, TOL = 1.15, NEXT_MS = 900, GRACE_S = 2;
  const TX = {
    promptBall: "אצבע אחת על הכדור, כל הזמן", promptQ: "ענו ביד השנייה",
    on: "האצבע על הכדור", off: "החזירו את האצבע לכדור", ok: "נכון.", bad: "לא הפעם.", late: "הזמן עבר.",
  };
  // Sentence bank: the original Hebrew content (ball-and-voice.html v1.3 CONTENT.he)
  const C = {
    unk: "אי אפשר לדעת",
    sense: { yes: "הגיוני", no: "לא הגיוני",
      act: [{ t: "הרופא רשם לחולה מרשם" }, { t: "הנהג עצר ברמזור אדום" }, { t: "הטבח חתך את הירקות", r: "הירקות חתכו את הטבח" },
        { t: "הגנן השקה את העציץ", r: "העציץ השקה את הגנן" }, { t: "המורה בדק את המבחנים", r: "המבחנים בדקו את המורה" },
        { t: "הנגר תיקן את הכיסא", r: "הכיסא תיקן את הנגר" }, { t: "הדייג תפס דג גדול" }, { t: "התינוק שתה את החלב", r: "החלב שתה את התינוק" },
        { t: "הכלב נבח על הדוור" }, { t: "הצייר צייר את הנוף", r: "הנוף צייר את הצייר" }, { t: "השופט שרק בסוף המשחק" }, { t: "הנהג מילא דלק במכונית" }],
      inv: ["שתה", "צייר", "שר", "אכל", "קרא", "רשם"],
      inan: ["הכיסא", "החלון", "השולחן", "המקרר", "הכביש", "העיפרון", "הקיר", "הסלע", "הארון", "המנעול", "הגשר"],
      ok: ["החלון נסגר מהרוח", "המקרר שמר על הקור", "הכיסא עמד ליד השולחן", "המנורה האירה את החדר", "הכביש היה רטוב מהגשם", "המים רתחו בסיר", "העיפרון נשבר על הדף"],
      bad: ["המים היו יבשים לגמרי", "האש הייתה קפואה וקרה", "הסלע היה נוזלי ורך", "השקט היה רועש מאוד", "הקרח היה לוהט ובוער"] },
    cmp: { names: ["דני", "יוסי", "אבי", "איתי", "רון", "גיל", "עומר", "נדב", "טל", "אורי"],
      pairs: [["גבוה", "נמוך"], ["מבוגר", "צעיר"], ["מהיר", "איטי"], ["כבד", "קל"], ["חזק", "חלש"]] },
    quant: { things: [["הכדורים", "כדור"], ["העפרונות", "עיפרון"], ["הבלונים", "בלון"], ["התיקים", "תיק"], ["הכובעים", "כובע"]],
      cols: [["אדומים", "אדום"], ["כחולים", "כחול"], ["ירוקים", "ירוק"], ["צהובים", "צהוב"]], boxes: ["בקופסה", "בשקית", "בארון", "במגירה"] },
    syll: [["כלבים", "בעלי חיים", "בעלי החיים", "כלב", "בעל חיים"], ["ורדים", "פרחים", "הפרחים", "ורד", "פרח"], ["תפוזים", "פירות", "הפירות", "תפוז", "פרי"],
      ["מלפפונים", "ירקות", "הירקות", "מלפפון", "ירק"], ["אורנים", "עצים", "העצים", "אורן", "עץ"]],
    odd: [[["תפוח", "בננה", "אגס"], "פטיש"], [["כלב", "חתול", "סוס"], "כיסא"], [["אדום", "כחול", "ירוק"], "מהיר"], [["ראש", "יד", "רגל"], "שולחן"],
      [["רכבת", "מטוס", "אוטובוס"], "ספר"], [["שמש", "ירח", "כוכב"], "נעל"], [["סכין", "מזלג", "כף"], "מברשת"], [["רופא", "מורה", "נגר"], "ענן"]],
    cond: [{ c: "אם יורד גשם, אז הכביש רטוב", p: "יורד גשם", q: "הכביש רטוב", np: "לא ירד גשם", nq: "הכביש יבש" },
      { c: "אם דני התאמן, אז דני עייף", p: "דני התאמן", q: "דני עייף", np: "דני לא התאמן", nq: "דני לא עייף" },
      { c: "אם הדלת פתוחה, אז נכנס אוויר קר", p: "הדלת פתוחה", q: "נכנס אוויר קר", np: "הדלת סגורה", nq: "לא נכנס אוויר קר" },
      { c: "אם המנורה דולקת, אז החדר מואר", p: "המנורה דולקת", q: "החדר מואר", np: "המנורה כבויה", nq: "החדר חשוך" }],
    seq: [["נעלתי את הדלת", "כיביתי את האור"], ["שתיתי קפה", "קראתי עיתון"], ["יצאתי מהבית", "לבשתי מעיל"], ["שלחתי את המכתב", "בדקתי את הכתובת"]],
    neg: [{ stem: "אף תלמיד לא נעדר מהשיעור.", ask: "כמה תלמידים נכחו?", opts: ["כולם", "אף אחד", "רק חלק"], val: "כולם" },
      { stem: "אין אף חלון שאינו סגור.", ask: "כמה חלונות פתוחים?", opts: ["אף אחד", "כולם", "רק חלק"], val: "אף אחד" },
      { stem: "לא נכון שאף אחד לא הגיע.", ask: "מה נכון?", opts: ["לפחות אחד הגיע", "אף אחד לא הגיע", "כולם הגיעו"], val: "לפחות אחד הגיע" },
      { stem: "לא נכון שכל הדלתות נעולות.", ask: "מה נכון?", opts: ["דלת אחת לפחות פתוחה", "כל הדלתות פתוחות", "כל הדלתות נעולות"], val: "דלת אחת לפחות פתוחה" }],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const endP = (s) => (/[.?!]$/.test(s) ? s : s + ".");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Question generators (from the original; Hebrew only)
  const GEN = {
    sense() {
      const c = C.sense, ok = Math.random() < .5; let t;
      if (ok) t = Math.random() < .55 ? pick(c.act).t : pick(c.ok);
      else { const r = Math.random(); if (r < .4) { const s1 = pick(c.inan); let o = pick(c.inan); while (o === s1) o = pick(c.inan); t = `${s1} ${pick(c.inv)} את ${o}`; } else if (r < .8) t = pick(c.act.filter((x) => x.r)).r; else t = pick(c.bad); }
      return { stem: endP(t), ask: "הגיוני או לא?", opts: [c.yes, c.no], val: ok ? c.yes : c.no };
    },
    compare(unk) {
      const n = shuffle(C.cmp.names).slice(0, 3), p = pick(C.cmp.pairs), top = Math.random() < .5;
      if (unk) {   // both compared to the same person: the extreme can't be known
        const stem = `${n[0]} ${p[0]} מ${n[2]}. ${n[1]} ${p[0]} מ${n[2]}.`;
        return { stem, ask: `מי ה${top ? p[0] : p[1]} מכולם?`, opts: shuffle([n[0], n[1], n[2], C.unk]), val: top ? C.unk : n[2] };
      }
      return { stem: `${n[0]} ${p[0]} מ${n[1]}. ${n[1]} ${p[0]} מ${n[2]}.`, ask: `מי ה${top ? p[0] : p[1]} מכולם?`, opts: shuffle([n[0], n[1], n[2], C.unk]), val: top ? n[0] : n[2] };
    },
    compareUnk() { return Math.random() < .5 ? GEN.compare(true) : GEN.compare(false); },
    quant(forceAll) {
      const q = C.quant, tt = pick(q.things), b = pick(q.boxes), cs = shuffle(q.cols).slice(0, 3), all = forceAll || Math.random() < .5;
      return { stem: `${all ? "כל " : "חלק מ"}${tt[0]} ${b} הם ${cs[0][0]}. הוצאתי ${tt[1]} אחד.`, ask: "מה הצבע שלו?", opts: shuffle([cs[0][1], cs[1][1], cs[2][1], C.unk]), val: all ? cs[0][1] : C.unk };
    },
    quantAll() { return GEN.quant(true); },
    syll() {
      const k = pick(C.syll), o = [`לפניי ${k[4]}`, `כל ${k[2]} הם ${k[0]}`, `לפניי דבר שאינו ${k[4]}`];
      return { stem: `כל ה${k[0]} הם ${k[1]}. לפניי ${k[3]}.`, ask: "מה בהכרח נכון?", opts: shuffle(o.concat([C.unk])), val: o[0] };
    },
    odd() { const o = pick(C.odd), all = shuffle(o[0].concat([o[1]])); return { stem: all.join(", ") + ".", ask: "איזו מילה לא שייכת?", opts: all, val: o[1] }; },
    cond(sure) {
      const x = pick(C.cond), r = Math.random() * (sure ? .68 : 1); let given, val;
      if (r < .34) { given = x.p; val = x.q; } else if (r < .68) { given = x.nq; val = x.np; } else { given = x.q; val = C.unk; }
      const pool = shuffle([x.q, x.np, x.p, x.nq, C.unk].filter((v, i, a) => a.indexOf(v) === i && v !== val && v !== given));
      return { stem: endP(x.c) + " " + endP(given), ask: "מה בהכרח נובע?", opts: shuffle([val].concat(pool.slice(0, 3))), val };
    },
    condSure() { return GEN.cond(true); },
    seq() {
      const s = pick(C.seq), a = s[0], b = s[1], before = Math.random() < .5, askFirst = Math.random() < .5, first = before ? b : a, last = before ? a : b;
      return { stem: `${before ? "לפני ש" : "אחרי ש"}${a}, ${b}.`, ask: askFirst ? "מה קרה ראשון?" : "מה קרה אחרון?", opts: shuffle([a, b, "שניהם יחד", C.unk]), val: askFirst ? first : last };
    },
    neg() { const b = pick(C.neg); return { stem: b.stem, ask: b.ask, opts: shuffle(b.opts.concat([C.unk])), val: b.val }; },
  };

  const WAVE = [0.34, 0.51, 0.77, 0.23];   // per second of path time
  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP), W = f.clientWidth, H = f.clientHeight, MID = W / 2;
    const fb = f.querySelector(".fb"); fb.style.right = "50%"; fb.style.bottom = "26px";
    f.insertAdjacentHTML("beforeend", `<div class="mid"></div>
      <div class="prompt" style="position:absolute;top:30px;right:0;width:50%">${TX.promptBall}</div>
      <div class="prompt" style="position:absolute;top:30px;left:0;width:50%">${TX.promptQ}</div>
      <div id="bsBall" style="position:absolute;left:0;top:0;border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2">
        <div id="bsRing" style="position:absolute;inset:-22px;border-radius:50%;border:4px solid rgba(236,237,245,.25);transition:border-color .15s"></div>
        <div id="bsCore" style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 40% 38%,#33447E,#1E2A5C);border:3px solid #8CC8FF;display:flex;align-items:center;justify-content:center"><i style="width:30px;height:30px;border-radius:50%;background:#8CC8FF"></i></div></div>
      <div id="bsOn" style="position:absolute;bottom:30px;right:0;width:50%;display:flex;justify-content:center;align-items:center;gap:12px;font:400 30px var(--t);color:var(--ink2);z-index:3"></div>
      <div id="bsQ" style="position:absolute;top:110px;left:52px;width:${MID - 104}px;text-align:center">
        <div id="bsStem" style="font:500 52px/1.32 var(--t);color:var(--ink);min-height:210px;display:flex;align-items:center;justify-content:center"></div>
        <div id="bsAsk" style="font:500 40px var(--t);color:var(--mark);margin-top:14px;min-height:54px"></div>
        <div class="qdrain" style="width:420px;margin:18px auto 0"><b id="bsDrain"></b></div>
        <div id="bsOpts" style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:30px"></div></div>`);
    const ball = f.querySelector("#bsBall"), ringEl = f.querySelector("#bsRing"), onEl = f.querySelector("#bsOn");
    const stemEl = f.querySelector("#bsStem"), askEl = f.querySelector("#bsAsk"), optsEl = f.querySelector("#bsOpts"), drain = f.querySelector("#bsDrain");
    const ph = [0, 1, 2, 3].map(() => Math.random() * 6.283);
    let dead = false, raf = 0, last = null, u = 0, bx = MID + MID / 2, by = H / 2, ptr = null, px = 0, py = 0;
    let onT = 0, totT = 0, wasOn = null, cur = null, qT = null;
    const answers = [];

    function ballPos() {
      const d = STEPS[st.step].ball, r = d / 2, cx = MID + MID / 2, cy = H / 2 + 10;
      const ax = MID / 2 - r - 40, ay = H / 2 - r - 100;
      const nx = Math.sin(u * WAVE[0] + ph[0]) * .6 + Math.sin(u * WAVE[1] + ph[1]) * .4;
      const ny = Math.sin(u * WAVE[2] + ph[2]) * .55 + Math.sin(u * WAVE[3] + ph[3]) * .45;
      return [cx + nx * ax, cy + ny * Math.max(0, ay)];
    }
    function frame(now) {
      if (dead) return;
      const dt = last == null ? 0 : Math.min(.05, (now - last) / 1000); last = now;
      if (!ctx.paused()) {
        const S = STEPS[st.step]; u += dt * S.spd; [bx, by] = ballPos();
        ball.style.width = ball.style.height = S.ball + "px";
        ball.style.transform = `translate(${bx - S.ball / 2}px,${by - S.ball / 2}px)`;
        const on = ptr != null && Math.hypot(px - bx, py - by) <= S.ball / 2 * TOL;
        if (ctx.now() / 1000 > GRACE_S || ptr != null) { totT += dt; if (on) onT += dt; if (cur) { cur.tot += dt; if (on) cur.on += dt; } }
        if (on !== wasOn) {
          wasOn = on; ringEl.style.borderColor = on ? "#4FBF8A" : "rgba(236,237,245,.6)"; ringEl.style.borderStyle = on ? "solid" : "dashed";
          onEl.innerHTML = on ? `${ctx.icon.check(30)}<span>${TX.on}</span>` : `<span style="color:var(--mark)">${TX.off}</span>`;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    // finger tracking: the first touch that lands in the ball half becomes the ball finger
    const down = (e) => {
      const p = ctx.local(e); if (ptr == null && p.x >= MID && p.y > 0 && p.y < H) { ptr = e.pointerId; px = p.x; py = p.y; }
    };
    const move = (e) => { if (e.pointerId === ptr) { const p = ctx.local(e); px = p.x; py = p.y; } };
    const up = (e) => { if (e.pointerId === ptr) ptr = null; };

    function ask() {
      if (ctx.overtime && ctx.overtime()) return;   // +10 s overtime: no new question
      if (dead) return;
      const S = STEPS[st.step], it = GEN[pick(S.items)]();
      cur = { ...it, live: true, t0: ctx.now(), on: 0, tot: 0, step: st.step };
      stemEl.textContent = it.stem; askEl.textContent = it.ask;
      optsEl.style.gridTemplateColumns = "1fr 1fr";
      optsEl.innerHTML = it.opts.map((o) => `<button class="ans" data-o="${ctx.esc(o)}" style="height:${it.opts.length > 2 ? 118 : 150}px;${o.length > 14 ? "font-size:30px" : ""}">${ctx.esc(o)}</button>`).join("");
      optsEl.querySelectorAll(".ans").forEach((b) => b.addEventListener("pointerdown", (e) => { e.stopPropagation(); answer(b.dataset.o, b); }));
      drain.style.transition = "none"; drain.style.width = "100%";
      requestAnimationFrame(() => requestAnimationFrame(() => { drain.style.transition = `width ${S.limit}ms linear`; drain.style.width = "0%"; }));
      qT = ctx.later(() => answer(null, null), S.limit);
    }
    function answer(o, btn) {
      if (!cur || !cur.live) return;
      cur.live = false; ctx.cancel(qT);
      const ok = o === cur.val, rt = ctx.now() - cur.t0;
      answers.push({ ok, rt, timeout: o == null, step: cur.step, onPct: cur.tot ? 100 * cur.on / cur.tot : 0 });
      drain.style.transition = "none";
      if (btn) btn.classList.add(ok ? "ok" : "bad");
      if (!ok) { const r = [...optsEl.children].find((b) => b.dataset.o === cur.val); if (r && r !== btn) r.classList.add("was"); }
      if (ok) ctx.feedback("ok", TX.ok); else if (o == null) ctx.feedback("neutral", TX.late); else ctx.feedback("soft", TX.bad);
      st.hit(ok);
      ctx.later(() => { ctx.feedback("", ""); stemEl.textContent = ""; askEl.textContent = ""; optsEl.innerHTML = ""; ctx.later(ask, 250); }, ok ? NEXT_MS : NEXT_MS + 700);
    }
    function result() {
      const n = answers.length, okN = answers.filter((a) => a.ok).length;
      const acc = n ? 100 * okN / n : 0, onPct = totT ? 100 * onT / totT : 0;
      const ms = st.max >= 5 ? "עד משפטים עם \"אי אפשר לדעת\"" : st.max >= 3 ? "עד משפטים של שלושה חלקים" : "במשפטים קצרים";
      const fact = n ? `${n === 1 ? (okN ? "המשפט נענה נכון" : "המשפט עוד לא נענה נכון") : `${okN} מתוך ${n} משפטים נכון`}, ${ms}. האצבע על הכדור ${Math.round(onPct)}% מהזמן.` : `האצבע על הכדור ${Math.round(onPct)}% מהזמן.`;
      return { score: ctx.blend(.5 * acc + .5 * onPct, st.max, TOP), fact, metrics: { n, okN, onPct: Math.round(onPct), maxStep: st.max } };
    }
    return {
      start() {
        document.addEventListener("pointerdown", down, true); document.addEventListener("pointermove", move, true);
        ["pointerup", "pointercancel"].forEach((ev) => document.addEventListener(ev, up, true));
        raf = requestAnimationFrame(frame); ctx.later(ask, 1200);
      },
      midRound: () => !!(cur && cur.live),
      stop() { dead = true; return result(); },
      destroy() {
        dead = true; cancelAnimationFrame(raf);
        document.removeEventListener("pointerdown", down, true); document.removeEventListener("pointermove", move, true);
        ["pointerup", "pointercancel"].forEach((ev) => document.removeEventListener(ev, up, true));
      },
      _debug: () => ({ ball: [bx, by], d: STEPS[st.step].ball, step: st.step, q: cur && cur.live ? cur.val : null }),
    };
  }

  function diagram(el) {
    el.innerHTML = `<div style="position:relative;width:700px;height:560px">
      <div style="position:absolute;top:60px;bottom:60px;left:50%;width:1px;background:var(--hair)"></div>
      <div style="position:absolute;top:150px;right:65px;width:220px;height:220px;border-radius:50%;border:3px solid #4FBF8A;display:flex;align-items:center;justify-content:center">
        <div style="width:176px;height:176px;border-radius:50%;background:#26346A;border:3px solid #8CC8FF;display:flex;align-items:center;justify-content:center"><i style="width:22px;height:22px;border-radius:50%;background:#8CC8FF"></i></div></div>
      <div style="position:absolute;top:400px;right:65px;width:220px;text-align:center;font:400 28px var(--t);color:var(--ink2)">אצבע על הכדור</div>
      <div style="position:absolute;top:110px;left:30px;width:300px;text-align:center;font:500 34px/1.35 var(--t)">טל גבוה מרון.<br>רון גבוה מגיל.</div>
      <div style="position:absolute;top:230px;left:30px;width:300px;text-align:center;font:500 28px var(--t);color:var(--mark)">מי הגבוה מכולם?</div>
      <div style="position:absolute;top:290px;left:30px;width:300px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="ans" style="height:74px;font-size:28px;box-shadow:inset 0 0 0 3px var(--ok)">טל</div><div class="ans" style="height:74px;font-size:28px">רון</div>
        <div class="ans" style="height:74px;font-size:28px">גיל</div><div class="ans" style="height:74px;font-size:22px">אי אפשר לדעת</div></div></div>`;
  }

  SHEBA.register({
    id: "ball_sentence", name: "כדור ומשפט", skill: "focus", seconds: true,
    instr: {
      title: "יד על הכדור, עין על המשפט",
      titleSize: 72,   // fits one line in the 880 px column (Design build2 P2-1)
      steps: [
        "בצד ימין זז כדור. השאירו עליו אצבע <b>כל הזמן</b>.",
        "בצד שמאל מופיע משפט קצר. ענו על השאלה <b>ביד&nbsp;השנייה</b>.",
        "מתחילים במשפטים קלים, והם מתקשים כשמצליחים.",
      ],
      diagram,
    },
    create,
  });
})();
