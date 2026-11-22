/*
 * Sheba kiosk shell: screens, guided session, game frame, pausable game clock, idle reset, results,
 * anonymous counters, hidden staff exit. Single page: no history entries, no network, no names.
 */
(function () {
  "use strict";
  const CFG = window.SHEBA_CONFIG || {};
  const $ = (q, r) => (r || document).querySelector(q);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── Icons (thin line, from the Design mocks) ─────────────────────────────
  const B = "#8CC8FF";
  const ICON = {
    arrow: (s = 30, c = "#B4B9D6", w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M40 24H9M19 13L8 24l11 11" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    back: (s = 30, c = "#B4B9D6") => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M8 24h31M29 13l11 11-11 11" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    exit: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#B4B9D6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/></svg>`,
    check: (s = 34, c = "#4FBF8A", w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M10 25l9 9 19-20" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    cross: (s = 30, c = "#F2A66A", w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M13 13l22 22M35 13L13 35" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/></svg>`,
    clock: (s = 30, c = "#C9CBD8") => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="24" r="16"/><path d="M24 14v10l7 5"/></svg>`,
    dashed: (s = 30, c = B) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="6" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="5 4"/></svg>`,
    peak: (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" stroke="${B}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 36l12-12 8 7 15-17"/><path d="M33 14h8v8"/></svg>`,
    focus: (s = 56) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="${B}" stroke-width="1.8"/><circle cx="24" cy="24" r="9" fill="none" stroke="${B}" stroke-width="1.8"/><circle cx="24" cy="24" r="2.6" fill="${B}"/></svg>`,
    memory: (s = 56) => { let r = ""; const on = [0, 5, 7]; for (let i = 0; i < 9; i++) { const x = 6 + (i % 3) * 13, y = 6 + Math.floor(i / 3) * 13; r += `<rect x="${x}" y="${y}" width="10" height="10" rx="1.5" fill="${on.includes(i) ? B : "none"}" fill-opacity=".55" stroke="${B}" stroke-width="1.1"/>`; } return `<svg width="${s}" height="${s}" viewBox="0 0 48 48">${r}</svg>`; },
    sharp: (s = 56) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M27 5L11 27h11l-3 16 18-24H25z" fill="none" stroke="${B}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
    coord: (s = 56) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="24" r="6" stroke="${B}" stroke-width="1.8"/><circle cx="38" cy="24" r="6" stroke="${B}" stroke-width="1.8"/><path d="M18 24h12M21 20l-4 4 4 4M27 20l4 4-4 4" stroke="${B}" stroke-width="1.8"/></svg>`,
  };

  // ── Skills and games. Station names; יצירתיות hidden (no game trains it). ──
  const SKILLS = [
    { id: "focus", name: "פוקוס" },
    { id: "memory", name: "זיכרון" },
    { id: "sharp", name: "חדות מחשבה" },
    { id: "coord", name: "קואורדינציה" },
  ];
  const SKILL_NAME = Object.fromEntries(SKILLS.map((s) => [s.id, s.name]));
  // Pick lists: all 8 games, in the order shown. A game id that isn't loaded is skipped.
  const PICK = {
    focus: [{ id: "follow_me", desc: "עוקבים באצבע אחרי הדמות עם הכוכב" }, { id: "ball_sentence", desc: "יד אחת על הכדור, היד השנייה עונה על משפטים" }],
    memory: [{ id: "memory", desc: "זוכרים איפה היה כל חפץ ובאיזה סדר" }],
    sharp: [{ id: "flex", desc: "ממיינים לפי כלל שמתחלף" }, { id: "dual_attention", desc: "קוראים משפט, מחפשים את השונה ואז נזכרים" }],
    coord: [{ id: "two_hand_sync", desc: "שתי ידיים נוגעות יחד כשהטבעות נסגרות" }, { id: "bimanual", desc: "שתי הידיים עוקבות אחרי מסלול, כמו במראה" }, { id: "two_hand_touch", desc: "תופסים כל כדור ביד הנכונה וזוכרים מילה" }],
  };

  const GAMES = {};
  function register(def) { GAMES[def.id] = def; }

  // ── Anonymous local counters (no names, no ids, nothing sent) ────────────
  const CKEY = "sheba.counters.v1";
  function counters() { try { return JSON.parse(localStorage.getItem(CKEY)) || { since: new Date().toISOString().slice(0, 10) }; } catch (_) { return { since: new Date().toISOString().slice(0, 10) }; } }
  function count(key) {
    if (!CFG.COUNTERS) return;
    try { const c = counters(); c[key] = (c[key] || 0) + 1; localStorage.setItem(CKEY, JSON.stringify(c)); } catch (_) {}
  }

  // ── Stage scaling (letterbox 1920×1080 into any window) ──────────────────
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $("#stage").style.transform = `translate(-50%,-50%) scale(${s})`;
  }

  // ── Living neural background (30% during play, via body.playing) ─────────
  function net() {
    const cv = $("#net"), c = cv.getContext("2d"), N = 64, nodes = [];
    for (let i = 0; i < N; i++) nodes.push({ x: Math.random() * 1920, y: Math.random() * 1080, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9, r: Math.random() < .12 ? 2.6 : 1.4 });
    let last = performance.now();
    function draw(now) {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      c.clearRect(0, 0, 1920, 1080);
      for (const n of nodes) { n.x += n.vx * dt; n.y += n.vy * dt; if (n.x < -40) n.x = 1960; if (n.x > 1960) n.x = -40; if (n.y < -40) n.y = 1120; if (n.y > 1120) n.y = -40; }
      c.lineWidth = 1;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 210) { c.strokeStyle = `rgba(140,200,255,${(0.16 * (1 - d / 210)).toFixed(3)})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      }
      for (const n of nodes) { c.fillStyle = n.r > 2 ? "rgba(220,236,255,.55)" : "rgba(180,200,240,.35)"; c.beginPath(); c.arc(n.x, n.y, n.r, 0, 7); c.fill(); }
      setTimeout(() => requestAnimationFrame(draw), 33);   // ~30 fps is plenty for the backdrop
    }
    requestAnimationFrame(draw);
  }

  // ── Pausable game clock: games schedule with ctx.later so the idle overlay freezes them ──
  const clock = { t: 0, running: false, paused: false, timers: [], seq: 0, last: 0 };
  function clockLoop(now) {
    const dt = Math.min(.1, (now - clock.last) / 1000); clock.last = now;
    if (clock.running && !clock.paused) {
      clock.t += dt;
      if (clock.timers.length) {
        const due = clock.timers.filter((x) => x.at <= clock.t);
        if (due.length) { clock.timers = clock.timers.filter((x) => x.at > clock.t); due.sort((a, b) => a.at - b.at).forEach((x) => { try { x.fn(); } catch (e) { console.error(e); } }); }
      }
      try { tickGame(); } catch (e) { console.error(e); }   // a throw here must never stop the clock loop
    }
    requestAnimationFrame(clockLoop);
  }

  // ── Session (memory only; wiped on exit, idle and "סיום") ────────────────
  let session = null;   // { mode: "guided"|"skill", queue: [gameId], idx, results: [] }
  let curStair = null, touched = false;
  let screen = "start", inst = null, curDef = null, progress = 0, ended = false;
  const view = () => $("#view");
  function setPlaying(on) { document.body.classList.toggle("playing", !!on); }

  // Guided session (Guy play-test 22.11): four games, one per skill tile, in tile order.
  // The coordination slot falls back to the one-finger-at-a-time catch game on a single-touch screen.
  function guidedQueue() {
    let co = CFG.GUIDED_COORD || "auto";
    if (co === "auto") co = navigator.maxTouchPoints === 1 ? "two_hand_touch" : "two_hand_sync";
    if (!GAMES[co]) co = "two_hand_sync";
    return ["follow_me", "memory", "flex", co].filter((id) => GAMES[id]);
  }
  function wipe() {
    stopGame();
    session = null; clearTimeout(resultsT); clearTimeout(insT); clearTimeout(endT);
  }
  function exitToStart(reason) {
    if (reason) count(reason);
    wipe(); showStart();
  }

  // ── Start screen (mock 01) ───────────────────────────────────────────────
  // Guy play-test 22.11: marketing line instead of "בזמן ההמתנה"; no explanatory sublines.
  const TXT = { headline: "כושר למוח,<br>בכמה דקות", kicker: "4 משחקים · כ-5 דקות" };
  function showStart() {
    screen = "start"; setPlaying(false);
    view().innerHTML = `<div class="scr" id="scrStart">
      <div id="staffHot" aria-hidden="true"></div>
      <div class="hl"><img src="assets/logo.png" alt="LunaMind"></div>
      <div class="hc caps">BrainGym</div>
      <div class="r1 rule"></div>
      <div class="hm">
        <div class="label kick"><i></i>${TXT.kicker}</div>
        <h1 class="xl">${TXT.headline}</h1>
        <div class="hact"><button class="cta huge" id="goGuided">התחל להתאמן${ICON.arrow(44, "#FFFFFF", 2.6)}</button></div>
      </div>
      <div class="sk"><div class="skh"><div class="label">או בחרו מיומנות לאימון</div></div>
        <div class="skrow">${SKILLS.map((s) => `<button class="sk1" data-skill="${s.id}">${ICON[s.id]()}<div class="n">${esc(s.name)}</div><span class="ar">${ICON.arrow()}</span></button>`).join("")}</div>
      </div></div>`;
    $("#goGuided").addEventListener("click", () => { count("start_guided"); session = { mode: "guided", queue: guidedQueue(), idx: 0, results: [] }; showInstr(); });
    view().querySelectorAll("[data-skill]").forEach((b) => b.addEventListener("click", () => {
      const sk = b.dataset.skill, playable = (PICK[sk] || []).filter((it) => GAMES[it.id]);
      count("open_skill_" + sk);
      // one playable game → straight to its instruction card (Design FIXES 7); יציאה there returns to start
      if (playable.length === 1) { count("start_skill"); session = { mode: "skill", queue: [playable[0].id], idx: 0, results: [] }; showInstr(); }
      else showPick(sk);
    }));
    bindStaffHot();
  }

  // ── Skill pick list ──────────────────────────────────────────────────────
  function showPick(skill) {
    screen = "pick"; setPlaying(false);
    const items = (PICK[skill] || []).filter((it) => GAMES[it.id]);   // rows for games not built are hidden
    view().innerHTML = `<div class="scr">
      <div class="gh"><div class="gt"><span class="gname">אימון לפי מיומנות</span></div>
        <button class="exit" id="back">${ICON.back(26)}חזרה</button></div>
      <div class="pkwrap"><h1>${ICON[skill](72)}${esc(SKILL_NAME[skill])}</h1>
        <div class="pklist">${items.map((it) => {
          const g = it.id ? GAMES[it.id] : null, name = g ? g.name : it.name;
          return `<button class="pk ${it.soon ? "soon" : ""}" ${it.soon ? "disabled" : `data-game="${it.id}"`}>
            <div><div class="pn">${esc(name)}</div><div class="pd">${esc(it.desc)}</div></div>
            <span class="go">${it.soon ? "בקרוב" : `מתחילים${ICON.arrow(30, "#8CC8FF")}`}</span></button>`;
        }).join("")}</div></div></div>`;
    $("#back").addEventListener("click", () => { wipe(); showStart(); });
    view().querySelectorAll("[data-game]").forEach((b) => b.addEventListener("click", () => {
      count("start_skill"); session = { mode: "skill", queue: [b.dataset.game], idx: 0, results: [] }; showInstr();
    }));
  }

  // ── Shared header ────────────────────────────────────────────────────────
  function header(def) {
    const guided = session && session.mode === "guided";
    const dots = guided ? `<span class="dots">${session.queue.map((_, i) => `<i class="${i < session.idx ? "done" : i === session.idx ? "on" : ""}"></i>`).join("")}</span>` : "";
    const mid = guided ? `משחק ${session.idx + 1} מתוך ${session.queue.length}` : "אימון לפי מיומנות";
    return `<div class="gh"><div class="gt"><span class="gname">${esc(def.name)}</span><span class="gskill">${esc(SKILL_NAME[def.skill])}</span></div>
      <div class="gp">${dots}<span>${mid}</span></div>
      <button class="exit" id="exit">${ICON.exit()}יציאה</button></div>`;
  }
  function bindExit() { const e = $("#exit"); if (e) e.addEventListener("click", () => exitToStart("exit_" + (curDef ? curDef.id : screen))); }

  // ── Instruction card (mock 02): the player taps to start (no auto-start, Guy 22.11); the idle reset is generous ──
  let insT = null;
  function showInstr() {
    const def = GAMES[session.queue[session.idx]]; curDef = def;
    screen = "instr"; setPlaying(false);
    const guided = session.mode === "guided";
    view().innerHTML = `<div class="scr">${header(def)}
      <div class="ins-l" id="diagram"></div>
      <div class="ins-r"><h1${def.instr.titleSize ? ` style="font-size:${def.instr.titleSize}px"` : ""}>${esc(def.instr.title)}</h1>${def.instr.lead ? `<div class="ins-lead">${esc(def.instr.lead)}</div>` : ""}
        <ol class="steps">${def.instr.steps.map((s, i) => `<li><span class="sn">0${i + 1}</span><span>${s}</span></li>`).join("")}</ol></div>
      <div class="ins-cta"><button class="cta" id="go">הבנתי, מתחילים</button></div></div>`;
    try { def.instr.diagram($("#diagram")); } catch (e) { console.error(e); }
    bindExit();
    const go = () => { clearTimeout(insT); if (screen === "instr") startGame(def); };
    $("#go").addEventListener("click", go);
    lastInput = performance.now();
  }

  // ── Game frame ───────────────────────────────────────────────────────────
  function Staircase(top, o) {
    o = o || {};
    const up = o.up || CFG.STAIR_UP || 3, down = o.down || CFG.STAIR_DOWN || 2;
    const s = { step: 1, max: 1, top, ok: 0, bad: 0, hits: 0, misses: 0, trace: [],
      hit(correct) {
        s.trace.push(s.step);   // the step this trial was played at (held-level grading)
        if (correct) { s.hits++; s.ok++; s.bad = 0; if (s.ok >= up) { s.ok = 0; if (s.step < top) { s.step++; s.max = Math.max(s.max, s.step); stepFlash(); return "up"; } } }
        else { s.misses++; s.bad++; s.ok = 0; if (s.bad >= down) { s.bad = 0; if (s.step > 1) { s.step--; return "down"; } } }
        return null;
      },
      set(v) { s.step = clamp(v, 1, top); s.max = Math.max(s.max, s.step); },
    };
    return s;
  }
  function stepFlash() { const t = $(".gtimer"); if (!t) return; t.classList.add("flash"); setTimeout(() => t.classList.remove("flash"), 300); }

  let fbT = null;
  function feedback(kind, text, sub, ms) {
    const tag = $("#fbtag"), sb = $("#fbsub"); if (!tag) return;
    const ic = { ok: ICON.check(34), soft: ICON.cross(30), miss: ICON.dashed(30), neutral: ICON.clock(30), info: "" }[kind] || "";
    tag.className = "fbtag " + (kind || ""); tag.innerHTML = text ? `${ic}<span>${esc(text)}</span>` : "";
    sb.textContent = sub || "";
    clearTimeout(fbT); if (ms) fbT = setTimeout(() => { tag.innerHTML = ""; sb.textContent = ""; }, ms);
  }

  function startGame(def) {
    screen = "game"; setPlaying(true); ended = false; progress = 0;
    touched = false;   // "game_start_<id>" is counted on the first touch in play, not on an unattended auto-start
    overtime = false; otEnd = 0; timeLeft = null;
    view().innerHTML = `<div class="scr">${header(def)}<div class="gclock" id="gclock"></div><div class="gtimer"><b id="tbar"></b></div>
      <div class="otb" id="otb"></div>
      <div class="field" id="field"><div class="stagelbl" id="stagelbl"></div>
        <div class="fb"><div class="fbtag" id="fbtag"></div><div class="fbsub" id="fbsub"></div></div></div></div>`;
    bindExit();
    clock.t = 0; clock.timers = []; clock.paused = false; clock.running = true;
    const field = $("#field");
    const ctx = {
      field, W: field.clientWidth, H: field.clientHeight, cfg: CFG,
      later(fn, ms) { const id = ++clock.seq; clock.timers.push({ id, at: clock.t + ms / 1000, fn }); return id; },
      cancel(id) { clock.timers = clock.timers.filter((x) => x.id !== id); },
      now: () => clock.t * 1000,
      paused: () => clock.paused || !clock.running,
      setStage(txt) { const e = $("#stagelbl"); if (e) e.textContent = txt || ""; },
      feedback, stair: (top, o) => (curStair = Staircase(top, o)), stepFlash, icon: ICON, esc,
      // pointer event → field coordinates (the stage is CSS-scaled)
      local(e) { const r = field.getBoundingClientRect(), k = r.width / field.offsetWidth; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; },
      setProgress(f) { progress = clamp(f, 0, 1); },
      setTimeLeft(sec) { timeLeft = sec; },          // games without a fixed length (עקוב אחרי) report an estimate
      overtime: () => overtime,                       // true during the +10 s: start no new rounds
      done(res) { finishGame(res); },
      blend, plural,
    };
    try { inst = def.create(ctx); inst.start(); } catch (e) { console.error(e); finishGame({ score: 0, fact: "" }); }
  }
  // Time left is shown as m:ss next to the bar (Guy 22.11). When the time runs out in the middle of a round
  // (the game's midRound() says so), the player gets OVERTIME_SECONDS more, shown as "עוד 10 שניות לסיים";
  // the game ends as soon as that round is over, or when the extra time runs out.
  let overtime = false, otEnd = 0, timeLeft = null, lastClockTxt = "";
  const mmss = (sec) => { const v = Math.max(0, Math.ceil(sec)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`; };
  function showClock(sec, ot) {
    const el = $("#gclock"); if (!el) return;
    const txt = sec == null ? "" : (ot ? "+" : "") + mmss(sec);
    if (txt !== lastClockTxt) { el.textContent = txt; lastClockTxt = txt; }
    el.classList.toggle("ot", !!ot); el.classList.toggle("late", !ot && sec != null && sec <= 10);
  }
  function endNow() { const res = safeStop(); finishGame(res); }
  function tickGame() {
    if (screen !== "game" || !curDef || ended) return;
    const bar = $("#tbar"), tl = $(".gtimer");
    const midRound = () => { try { return !!(inst && inst.midRound && inst.midRound()); } catch (e) { return false; } };
    if (overtime) {
      const left = otEnd - clock.t; showClock(left, true);
      const ob = $("#otb"); if (ob) ob.querySelector("b").textContent = Math.max(0, Math.ceil(left));
      if (left <= 0 || !midRound()) endNow();
      return;
    }
    if (curDef.seconds) {
      const total = curDef.seconds === true ? CFG.GAME_SECONDS || 60 : curDef.seconds;
      const left = total - clock.t;
      if (bar) bar.style.width = (100 * clamp(left / total, 0, 1)) + "%";
      if (tl) tl.classList.toggle("late", left <= 10);
      showClock(left, false);
      if (left <= 0) {
        if (midRound() && (CFG.OVERTIME_SECONDS || 0) > 0) {
          overtime = true; otEnd = clock.t + CFG.OVERTIME_SECONDS; count("overtime_" + curDef.id);
          const ob = $("#otb"); if (ob) { ob.innerHTML = `${ICON.clock(34, "#0D1130")}<span>עוד ${CFG.OVERTIME_SECONDS} שניות לסיים</span><b>${CFG.OVERTIME_SECONDS}</b>`; ob.classList.add("on"); }
          showClock(CFG.OVERTIME_SECONDS, true);
        } else endNow();
      }
    } else {
      if (bar) bar.style.width = (100 * (1 - progress)) + "%";
      if (tl) tl.classList.toggle("late", progress > .88);
      showClock(timeLeft, false);
      if (clock.t > (curDef.hardCap || 160)) endNow();   // safety net
    }
  }
  function safeStop() { try { return inst && inst.stop ? inst.stop() : null; } catch (e) { console.error(e); return null; } }
  function stopGame() {
    clock.running = false; clock.timers = [];
    if (inst) { try { inst.destroy && inst.destroy(); } catch (e) { console.error(e); } }
    inst = null;
  }

  let endT = null;
  function finishGame(res) {
    if (ended || screen !== "game") return;
    ended = true;
    const def = curDef, stair = curStair; stopGame();
    res = res || { score: 0, fact: "" };
    count("game_done_" + def.id);
    // Held level H: the median step over the second half of the trials (where the player settled, not the best streak).
    // A game can supply its own (follow_me: mean level of scenes 4–5).
    let held = res.held, top = res.top, trials = res.trials, acc = res.acc;
    if (held == null && stair && stair.trace.length) {
      const tr = stair.trace, h = tr.slice(Math.floor(tr.length / 2)).sort((x, y) => x - y), m = h.length >> 1;
      held = h.length % 2 ? h[m] : (h[m - 1] + h[m]) / 2;
    }
    if (top == null && stair) top = stair.top;
    if (trials == null) trials = stair ? stair.trace.length : 0;
    if (acc == null && stair) acc = stair.hits + stair.misses ? 100 * stair.hits / (stair.hits + stair.misses) : 0;
    const r = { id: def.id, name: def.name, skill: def.skill, score: clamp(Math.round(res.score || 0), 0, 100), fact: res.fact || "",
      held: held == null ? null : held, top: top || 1, trials, acc: acc == null ? null : Math.round(acc), touched };
    r.band = bandOf(r);
    session.results.push(r);
    if (touched) {
      if (r.held != null) count(`lvl_${def.id}_${Math.round(r.held * 2)}`);   // H×2, so half steps survive
      count(`band_${def.id}_${r.band ? r.band.n : 0}`);
    } else count("game_untouched_" + def.id);
    const card = document.createElement("div"); card.className = "endcard";
    const more = session.idx + 1 < session.queue.length;
    card.innerHTML = `<div class="ring">${ICON.check(80, "#ECEDF5", 1.6)}</div><h1>${more ? `יפה. ממשיכים למשחק ${session.idx + 2} מתוך ${session.queue.length}.` : "סיימתם. כל הכבוד."}</h1>`;
    view().querySelector(".scr").appendChild(card);
    endT = setTimeout(() => {
      session.idx++;
      if (session.idx < session.queue.length) showInstr(); else showResults();
    }, 2000);
  }

  // ── Results (mock 03): this session only, 30 s max (a touch adds time) ────
  // Grade bands come from the held level, normalised to 0–1 over the game's steps; cut-offs live in config.js
  // (GRADE_CUTS, provisional, aiming at about 20 / 35 / 30 / 15 %). Fewer than GRADE_MIN_TRIALS trials → fact only.
  const WORDS = { 4: "מצוין", 3: "טוב מאוד", 2: "טוב", 1: "שווה לחזור לזה" };
  function bandOf(r) {
    const G = CFG.GRADE_CUTS || {}, c = Object.assign({ excellent: .7, excellentAcc: 75, veryGood: .4, good: .15, goodAcc: 70, minTrials: 6 }, G.default, G[r.id]);
    if (r.held == null || r.trials < c.minTrials) return null;
    const hn = r.top > 1 ? (r.held - 1) / (r.top - 1) : 0, acc = r.acc == null ? 100 : r.acc;
    const n = hn >= c.excellent && acc >= c.excellentAcc ? 4 : hn >= c.veryGood ? 3 : (hn >= c.good || acc >= c.goodAcc) ? 2 : 1;
    return { n, word: WORDS[n], hn };
  }
  function strongest(rs) {
    // Shown only on a strict lead: higher band, then higher held level. Otherwise the "balanced" line.
    // On a tie, when every row is in the 4th band, or when grades are missing: "אימנתם היום N מיומנויות".
    // one game (train by skill): that skill's result in the peak line (Guy 22.11)
    if (rs.length === 1) return rs[0].band ? { one: true, skill: rs[0].skill, word: rs[0].band.word } : null;
    const n = new Set(rs.map((r) => r.skill)).size, g = rs.filter((r) => r.band);
    const plain = { tie: true, n };
    if (g.length < 2 || g.every((r) => r.band.n === 1)) return plain;
    const key = (r) => r.band.n * 10 + r.band.hn;
    const s = g.slice().sort((a, b) => key(b) - key(a));
    if (key(s[0]) - key(s[1]) < 1e-9 || s[0].skill === s[1].skill) return plain;
    return { skill: s[0].skill };
  }
  function blend(perf, maxStep, top) { return Math.round(0.75 * clamp(perf, 0, 100) + 25 * (top > 1 ? (maxStep - 1) / (top - 1) : 0)); }
  function plural(n, one, many) { return n === 1 ? one : `${n} ${many}`; }
  let resultsT = null, resultsArm = null;
  function showResults() {
    screen = "results"; setPlaying(false); curDef = null;
    count(session.mode === "guided" ? "results_guided" : "results_skill");
    const rs = session.results, best = strongest(rs);
    const max = CFG.RESULTS_MAX || 30;
    view().innerHTML = `<div class="scr">
      <button class="exit" id="exit" style="position:absolute;top:44px;left:110px">${ICON.exit()}יציאה</button>
      <div class="rs-brand"><img src="assets/logo.png" alt="LunaMind"></div>
      <div class="rs-h">סיימתם. כך הלך לכם היום</div>
      ${best ? `<div class="rs-peak">${ICON.peak()}<span>${best.one ? `${esc(SKILL_NAME[best.skill])}: <b>${best.word}</b>` : best.tie ? (best.n === 1 ? "אימנתם היום מיומנות אחת" : `אימנתם היום ${best.n} מיומנויות`) : `הכי בלט היום: <b>${esc(SKILL_NAME[best.skill])}</b>`}</span></div>` : ""}
      <div class="rs-box ${rs.length === 1 ? "one" : ""}" style="${best ? "" : rs.length === 1 ? "top:330px" : "top:260px;height:670px"}">
        ${rs.map((r) => { const n = r.band ? r.band.n : 0; return `<div class="rs-row">
          <div class="rs-top">${ICON[r.skill](40)}<span class="rn">${esc(r.name)}</span><span class="rk">${esc(SKILL_NAME[r.skill])}</span><span class="rg">${r.band ? r.band.word : ""}</span></div>
          ${r.band ? `<div class="meter">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>` : ""}
          <div class="rs-fact">${esc(r.fact || (r.touched ? "" : "לא שוחק הפעם."))}</div></div>`; }).join("")}
      </div>
      <div class="rs-qr"><div class="qr"><img src="assets/qr-sheba.svg" alt=""></div>
        <h2>רוצים להמשיך מהבית?</h2><div class="small" style="margin-top:12px">סרקו והתחילו לשחק בטלפון</div>
        <div class="url">app.lunamind.ai/sheba</div>
        <div class="disc">זו לא בדיקה רפואית,<br>והתוצאות אינן מעידות על מצב בריאותי.</div></div>
      <div class="rs-btns"><button class="cta" id="again">שחקו שוב</button><button class="ghost" id="done">סיום</button></div>
      <div class="rs-drain"><b id="drain"></b></div></div>`;
    $("#exit").addEventListener("click", () => exitToStart("exit_results"));
    $("#done").addEventListener("click", () => exitToStart("results_done"));
    $("#again").addEventListener("click", () => {
      // replay what was played: the trio after a guided session, the same game after a skill game
      const mode = session.mode, queue = mode === "guided" ? guidedQueue() : session.queue.slice();
      count("play_again_" + mode); wipe();
      count(mode === "guided" ? "start_guided" : "start_skill"); session = { mode, queue, idx: 0, results: [] }; showInstr();
    });
    // RESULTS_MAX s without a touch → the standard "עדיין כאן?" overlay (IDLE_OVERLAY s) → reset. A touch restarts the wait.
    const d = $("#drain");
    const arm = () => { d.style.transition = "none"; d.style.width = "100%"; requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transition = `width ${max}s linear`; d.style.width = "0%"; })); };
    resultsArm = arm; lastInput = performance.now();
    arm();
  }

  // ── Idle: "עדיין כאן?" then full reset ───────────────────────────────────
  let lastInput = performance.now(), idleOv = null, idleStart = 0;
  function onInput() {
    lastInput = performance.now();
    if (screen === "results" && resultsArm) resultsArm();
    if (screen === "game" && !touched && !ended && curDef && !idleOv) { touched = true; count("game_start_" + curDef.id); }
    if (idleOv) { idleOv.remove(); idleOv = null; clock.paused = false; }
  }
  function idleCheck() {
    const now = performance.now();
    if (idleOv) {
      if (now - idleStart > (CFG.IDLE_OVERLAY || 10) * 1000) { idleOv.remove(); idleOv = null; clock.paused = false; exitToStart("idle_reset_" + screen); }
      return;
    }
    const lim = screen === "game" ? CFG.IDLE_GAME || 15 : screen === "instr" ? CFG.IDLE_INSTRUCTION || 60 : screen === "pick" ? CFG.IDLE_MENU || 20 : screen === "results" ? CFG.RESULTS_MAX || 30 : 0;
    if (lim && now - lastInput > lim * 1000) {
      clock.paused = true; idleStart = now;
      idleOv = document.createElement("div"); idleOv.className = "overlay";
      idleOv.innerHTML = `<h1>עדיין כאן?</h1><div class="body">געו במסך כדי להמשיך</div><div class="bar"><b id="idleBar" style="width:100%"></b></div>`;
      $("#stage").appendChild(idleOv);
      const b = $("#idleBar"); b.style.transition = `width ${CFG.IDLE_OVERLAY || 10}s linear`; requestAnimationFrame(() => requestAnimationFrame(() => (b.style.width = "0%")));
    }
  }

  // ── Hidden staff exit: long-press top-left corner of the start screen 3 s, then PIN ──
  function bindStaffHot() {
    const h = $("#staffHot"); if (!h) return; let t = null;
    h.addEventListener("pointerdown", () => { t = setTimeout(staffPin, 3000); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => h.addEventListener(ev, () => clearTimeout(t)));
  }
  // Staff screens close by themselves after STAFF_IDLE s without a touch. 3 wrong PINs lock the pad for 60 s.
  let pinFails = 0, pinLockUntil = 0;
  function staffIdle(ov) {
    let t = null; const arm = () => { clearTimeout(t); t = setTimeout(() => { if (ov.isConnected) ov.remove(); }, (CFG.STAFF_IDLE || 30) * 1000); };
    ov.addEventListener("pointerdown", arm, true); arm();
  }
  function staffPin() {
    let typed = "";
    const ov = document.createElement("div"); ov.className = "overlay solid"; ov.id = "staffPin";
    const pinLen = Math.max(4, String(CFG.STAFF_PIN || "").length);
    const draw = () => {
      const locked = performance.now() < pinLockUntil;
      if (locked) {
        ov.innerHTML = `<div class="label">צוות בלבד</div><div class="body">יותר מדי ניסיונות. נסו שוב בעוד דקה.</div><button class="ghost" data-x="c" style="width:420px">חזרה</button>`;
        ov.querySelector('[data-x="c"]').addEventListener("click", () => ov.remove()); return;
      }
      ov.innerHTML = `<div class="label">צוות בלבד</div><div class="pindots">${Array.from({ length: pinLen }, (_, i) => `<i class="${i < typed.length ? "on" : ""}"></i>`).join("")}</div>
        <div class="pin">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join("")}<button data-x="c" style="font:500 36px var(--t)">ביטול</button><button data-n="0">0</button><button data-x="b">⌫</button></div>`;
      ov.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => { typed += b.dataset.n; check(); }));
      ov.querySelector('[data-x="c"]').addEventListener("click", () => ov.remove());
      ov.querySelector('[data-x="b"]').addEventListener("click", () => { typed = typed.slice(0, -1); draw(); });
    };
    const check = () => {
      const pin = String(CFG.STAFF_PIN || "");
      if (typed === pin) { pinFails = 0; ov.remove(); staffPanel(); return; }
      if (typed.length >= pinLen) {
        typed = ""; pinFails++;
        if (pinFails >= (CFG.STAFF_PIN_TRIES || 3)) { pinFails = 0; pinLockUntil = performance.now() + (CFG.STAFF_PIN_LOCK || 60) * 1000; count("staff_pin_lock"); draw(); return; }
        draw(); ov.querySelector(".pin").classList.add("shake"); return;
      }
      draw();
    };
    draw(); staffIdle(ov); $("#stage").appendChild(ov);
  }
  function staffPanel() {
    const ov = document.createElement("div"); ov.className = "overlay solid"; ov.id = "staffPanel";
    const c = counters();
    const lines = Object.keys(c).sort().map((k) => `${k.padEnd(28)} ${c[k]}`).join("\n");
    ov.innerHTML = `<div class="label">צוות · קיוסק שיבא</div>
      <div class="staffstats">${esc(lines || "—")}</div>
      <div class="staffgrid"><button class="ghost" id="sBack">חזרה לקיוסק</button><button class="ghost" id="sReload">רענון</button>
        <button class="ghost" id="sReset">איפוס מונים</button><button class="ghost" id="sQuit">יציאה מהקיוסק</button></div>
      <div class="small" id="sMsg">אחרי יציאה: הקיצור "הפעלת הקיוסק" בשולחן העבודה מחזיר את הקיוסק.</div>`;
    $("#stage").appendChild(ov); staffIdle(ov);
    $("#sBack").addEventListener("click", () => ov.remove());
    $("#sReload").addEventListener("click", () => location.reload());
    $("#sReset").addEventListener("click", () => {
      const cf = document.createElement("div"); cf.className = "overlay solid";
      cf.innerHTML = `<h1 style="font-size:72px">לאפס את כל המונים?</h1><div class="body">אי אפשר לבטל את זה.</div>
        <div class="staffgrid"><button class="ghost" id="cfYes">כן, לאפס</button><button class="ghost" id="cfNo">לא</button></div>`;
      $("#stage").appendChild(cf); staffIdle(cf);
      cf.querySelector("#cfNo").addEventListener("click", () => cf.remove());
      cf.querySelector("#cfYes").addEventListener("click", () => { try { localStorage.removeItem(CKEY); } catch (_) {} cf.remove(); ov.remove(); });
    });
    $("#sQuit").addEventListener("click", () => {
      // Works when served by launch/serve.py on 127.0.0.1 (it closes Chrome and tells the watchdog to stand down).
      if (location.protocol.startsWith("http") && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
        fetch("/__staff/exit", { method: "POST", headers: { "Content-Type": "text/plain" }, body: String(CFG.STAFF_PIN || "") })
          .then((r) => { $("#sMsg").textContent = r.ok ? "סוגר את הקיוסק…" : "השרת המקומי סירב."; })
          .catch(() => { $("#sMsg").textContent = "אין שרת מקומי. סגרו את חלון Sheba watchdog, ואז Alt+F4."; });
      } else $("#sMsg").textContent = "בהרצה מקובץ: סגרו את חלון Sheba watchdog, ואז Alt+F4 (מקלדת או AnyDesk).";
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    fit(); window.addEventListener("resize", fit);
    net();
    ["pointerdown", "pointermove", "touchstart"].forEach((ev) => document.addEventListener(ev, onInput, { capture: true, passive: true }));
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("dragstart", (e) => e.preventDefault());
    window.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    setInterval(idleCheck, 250);
    // fresh page every RELOAD_HOURS, only while the start screen is idle (memory hygiene for a 24/7 kiosk)
    const bootAt = performance.now();
    setInterval(() => { if (screen === "start" && !document.querySelector(".overlay") && performance.now() - bootAt > (CFG.RELOAD_HOURS || 6) * 3600e3 && performance.now() - lastInput > 60e3) location.reload(); }, 60e3);
    clock.last = performance.now(); requestAnimationFrame(clockLoop);
    showStart();
  }

  window.SHEBA = { register, boot, ICON, GAMES, Staircase, blend, plural, _debug: { get session() { return session; }, get inst() { return inst; }, get screen() { return screen; }, get stair() { return curStair; }, get ended() { return ended; }, clock, showResults: () => showResults(), setSession: (s) => (session = s) } };
})();
