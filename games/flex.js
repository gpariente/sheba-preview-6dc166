/*
 * מוח גמיש (flex) — guided backup and the חדות מחשבה pick. A 60 s rule-switch task in the Sheba system, built
 * from the "מעבר בין כללים" stage of games_src/flex-multitask.html (one name now: מוח גמיש). Per Design: a
 * permanent rule banner, two large answer panels, a visual rule switch (banner slides in, 600 ms pause), amber
 * instead of black. Staircase: switches come more often, then the answer window shortens. No sound.
 */
(function () {
  "use strict";
  const STEPS = [null,
    { block: [8, 8], win: 4000 }, { block: [6, 6], win: 3500 }, { block: [4, 6], win: 3000 },
    { block: [3, 5], win: 2600 }, { block: [2, 4], win: 2200 }, { block: [1, 3], win: 1800 },
  ];
  const TOP = STEPS.length - 1;
  const COL = { blue: "#6FB4F5", yellow: "#F5C842" };
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shapeSvg = (shape, col, s, fill) => shape === "circle"
    ? `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" ${fill ? `fill="${col}"` : `fill="none" stroke="${col}" stroke-width="5"`}/></svg>`
    : `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="10" ${fill ? `fill="${col}"` : `fill="none" stroke="${col}" stroke-width="5"`}/></svg>`;
  // Fixed panels (Design FIXES P0-1, mock g4): they never redraw. Right = כחול · עיגול, left = צהוב · ריבוע.
  // The half that matches the active rule is at full strength with a mark-blue border; the other half at 35%.
  const HALF = {
    right: { color: { word: "כחול", art: `<div style="width:120px;height:120px;border-radius:50%;background:${COL.blue}"></div>` }, shape: { word: "עיגול", art: shapeSvg("circle", "#ECEDF5", 120, false) } },
    left: { color: { word: "צהוב", art: `<div style="width:120px;height:120px;border-radius:50%;background:${COL.yellow}"></div>` }, shape: { word: "ריבוע", art: shapeSvg("square", "#ECEDF5", 116, false) } },
  };
  const panelHTML = (side) => ["color", "shape"].map((k) => `<div class="fxh" data-k="${k}" style="flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border-radius:14px;transition:opacity .25s,box-shadow .25s">${HALF[side][k].art}<span style="font:500 44px var(--t)">${HALF[side][k].word}</span></div>`).join(`<i style="width:1px;align-self:stretch;margin:34px 0;background:var(--hair)"></i>`);

  function create(ctx) {
    const f = ctx.field, st = ctx.stair(TOP);
    f.insertAdjacentHTML("beforeend", `
      <div id="fxRule" style="position:absolute;top:34px;left:50%;transform:translateX(-50%);height:100px;padding:0 46px;display:flex;align-items:center;gap:18px;border:1.5px solid var(--mark);border-radius:16px;background:rgba(19,25,70,.75);font:500 50px var(--t);color:var(--ink);white-space:nowrap;transition:transform .35s"></div>
      <div id="fxStim" style="position:absolute;top:196px;left:50%;transform:translateX(-50%);width:230px;height:230px;display:flex;align-items:center;justify-content:center"></div>
      <button class="tile" id="fxR" style="position:absolute;top:444px;right:110px;width:700px;height:250px;display:flex;align-items:stretch;padding:12px">${panelHTML("right")}</button>
      <button class="tile" id="fxL" style="position:absolute;top:444px;left:110px;width:700px;height:250px;display:flex;align-items:stretch;padding:12px">${panelHTML("left")}</button>`);
    const ruleEl = f.querySelector("#fxRule"), stim = f.querySelector("#fxStim"), pR = f.querySelector("#fxR"), pL = f.querySelector("#fxL");
    let dead = false, rule = "color", left = 0, trialT = null, cur = null, total = 0, right = 0, switches = 0;

    function drawPanels() {
      for (const el of [pR, pL]) el.querySelectorAll(".fxh").forEach((h) => { const on = h.dataset.k === rule; h.style.opacity = on ? "1" : ".35"; h.style.boxShadow = on ? "inset 0 0 0 2px #8CC8FF" : "none"; });
    }
    function drawRule() { ruleEl.innerHTML = `<svg width="34" height="22" viewBox="0 0 34 22"><circle cx="11" cy="11" r="8" fill="${COL.blue}"/><circle cx="23" cy="11" r="8" fill="${COL.yellow}" fill-opacity=".9"/></svg><span style="color:var(--ink2);font-weight:400">מיינו לפי</span><b style="color:var(--mark);font-weight:600">${rule === "color" ? "צבע" : "צורה"}</b>`; }
    function newBlock() { const b = STEPS[st.step].block; left = ri(b[0], b[1]); }
    function next() {
      if (dead || (ctx.overtime && ctx.overtime())) return;   // +10 s overtime: no new trial
      if (left <= 0) {
        if (total > 0) {   // rule switch: banner slides in, short pause
          rule = rule === "color" ? "shape" : "color"; switches++;
          stim.innerHTML = ""; drawRule(); drawPanels();
          ruleEl.style.transform = "translateX(-50%) scale(1.12)"; ctx.feedback("info", "הכלל התחלף.");
          ctx.later(() => { ruleEl.style.transform = "translateX(-50%) scale(1)"; ctx.feedback("", ""); }, 600);
          newBlock(); ctx.later(trial, 900); return;
        }
        newBlock();
      }
      trial();
    }
    function trial() {
      if (dead) return;
      const shape = Math.random() < .5 ? "circle" : "square", color = Math.random() < .5 ? "blue" : "yellow";
      const answer = rule === "color" ? (color === "blue" ? "right" : "left") : (shape === "circle" ? "right" : "left");
      cur = { answer, live: true };
      stim.innerHTML = shapeSvg(shape, COL[color], 210, true);
      trialT = ctx.later(() => resolve(null), STEPS[st.step].win);
    }
    function resolve(side) {
      if (!cur || !cur.live) return;
      cur.live = false; ctx.cancel(trialT); left--; total++;
      const ok = side === cur.answer;
      if (ok) right++;
      const el = side === "right" ? pR : side === "left" ? pL : null;
      if (ok) { el.style.boxShadow = "inset 0 0 0 3px var(--ok)"; ctx.feedback("ok", "נכון."); }
      else if (el) { el.style.boxShadow = "inset 0 0 0 3px var(--soft)"; el.classList.add("shake"); ctx.feedback("soft", "לא הפעם.", `הכלל עכשיו: ${rule === "color" ? "צבע" : "צורה"}`); }
      else ctx.feedback("neutral", "הזמן עבר.", "");
      st.hit(ok);
      ctx.later(() => { if (el) { el.style.boxShadow = ""; el.classList.remove("shake"); } stim.innerHTML = ""; ctx.feedback("", ""); ctx.later(next, 250); }, ok ? 420 : 900);
    }
    pR.addEventListener("pointerdown", () => resolve("right"));
    pL.addEventListener("pointerdown", () => resolve("left"));

    function result() {
      const acc = total ? 100 * right / total : 0;
      const ms = st.max >= 5 ? "עד הקצב המהיר" : st.max >= 3 ? "עם החלפות תכופות" : "עם החלפות נדירות";
      return { score: ctx.blend(acc, st.max, TOP), fact: !total ? "המשחק הסתיים לפני המיון הראשון." : right === 0 ? `הפעם עוד לא היה מיון נכון, ${ms}.` : `${right === 1 ? "מיון נכון אחד" : `${right} מיונים נכונים`} מתוך ${total}, ${ms}.`, metrics: { total, right, switches, maxStep: st.max } };
    }
    return {
      start() { ctx.setStage(""); drawRule(); drawPanels(); ctx.later(next, 500); },
      midRound: () => !!(cur && cur.live),
      stop() { dead = true; return result(); },
      destroy() { dead = true; },
    };
  }

  function diagram(el) {
    const half = (art, word, on) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border-radius:10px;opacity:${on ? 1 : .35};${on ? "box-shadow:inset 0 0 0 2px #8CC8FF" : ""}">${art}<span style="font:500 28px var(--t)">${word}</span></div>`;
    const sw = (c) => `<div style="width:60px;height:60px;border-radius:50%;background:${c}"></div>`;
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:30px">
      <div style="height:76px;padding:0 30px;display:flex;align-items:center;gap:14px;border:1.5px solid var(--mark);border-radius:14px;font:500 38px var(--t)"><span style="color:var(--ink2)">מיינו לפי</span><b style="color:var(--mark)">צבע</b></div>
      ${shapeSvg("square", COL.blue, 120, true)}
      <div style="display:flex;gap:24px;direction:rtl">
        <div class="tile" style="width:300px;height:150px;display:flex;padding:8px;border:2px solid var(--ok)">${half(sw(COL.blue), "כחול", true)}${half(shapeSvg("circle", "#ECEDF5", 60, false), "עיגול", false)}</div>
        <div class="tile" style="width:300px;height:150px;display:flex;padding:8px">${half(sw(COL.yellow), "צהוב", true)}${half(shapeSvg("square", "#ECEDF5", 58, false), "ריבוע", false)}</div>
      </div></div>`;
  }

  SHEBA.register({
    id: "flex", name: "מוח גמיש", skill: "sharp", seconds: true,
    instr: {
      title: "מיינו לפי הכלל שלמעלה",
      steps: [
        "כשכתוב <b>צבע</b>: כחול לימין, צהוב לשמאל.",
        "כשכתוב <b>צורה</b>: עיגול לימין, ריבוע לשמאל.",
        "הכלל מתחלף מדי פעם. שימו לב לשורה העליונה.",
      ],
      diagram,
    },
    create,
  });
})();
