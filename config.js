/*
 * Sheba kiosk — local settings. Edit this file on the kiosk PC (over AnyDesk), then reload Chrome.
 * Nothing here is sent anywhere.
 */
window.SHEBA_CONFIG = {
  // Hidden staff exit: long-press the top-left corner of the start screen for 3 seconds, then type this PIN.
  // PLACEHOLDER — Guy sets the real PIN before the kiosk goes to Sheba. Digits only, 4–8 long.
  STAFF_PIN: "0000",

  // Guided session ("התחל להתאמן"): four games, one per skill tile —
  // עקוב אחרי (פוקוס) → אתגר הזיכרון (זיכרון) → מוח גמיש (חדות מחשבה) → coordination game below.
  //   "auto"           → two_hand_sync (אימון שתי ידיים), unless the screen reports exactly one touch point,
  //                      then two_hand_touch (תפיסה דו-ידית, one finger at a time)
  //   "two_hand_sync"  → always the two-hand game
  //   "two_hand_touch" → always the catch game (use this if two-finger touch fails on the real screen)
  GUIDED_COORD: "auto",

  // Timings (seconds). Plan: 60 s per game, עקוב אחרי about 90 s (it ends after its 5 scenes).
  GAME_SECONDS: 60,
  FOLLOW_SCENE_SECONDS: 7,       // per scene ×5 + stops + transitions (Guy 22.11: quicker scene changes; was 9 → ≈ 83 s, now ≈ 65–75 s)
  OVERTIME_SECONDS: 10,          // time up in the middle of a round → "עוד 10 שניות לסיים" to finish it (0 = off)
  RESULTS_MAX: 30,               // results screen wipes the session after this… (Design build2 asked 35: declined, Product 30 s privacy limit)
  RESULTS_EXTEND: 15,            // …a touch on it keeps at least this many seconds left…
  RESULTS_CAP: 60,               // …but never more than this in total
  RELOAD_HOURS: 6,               // reload the page every 6 h, only while the start screen is idle
  IDLE_INSTRUCTION: 60,          // instruction cards never start by themselves; 60 s without a touch → "עדיין כאן?"
  IDLE_MENU: 20,                 // no touch on a pick list → "עדיין כאן?"
  IDLE_GAME: 15,                 // no touch during a game → "עדיין כאן?" (game clock pauses)
  IDLE_OVERLAY: 10,              // then full reset to the start screen

  // Adaptive staircase defaults (tune on the real kiosk).
  STAIR_UP: 3,                   // correct answers in a row → one step harder
  STAIR_DOWN: 2,                 // misses in a row → one step easier

  // Grades (results screen). PROVISIONAL — calibrate from the lvl_/band_ counters after ~150 plays per game.
  // Each game's held level H = median staircase step over the 2nd half of its trials, normalised to 0–1
  // (hn = (H − 1) / (top step − 1)). Bands, aiming at about 20 / 35 / 30 / 15 %:
  //   מצוין: hn ≥ excellent and accuracy ≥ excellentAcc · טוב מאוד: hn ≥ veryGood
  //   טוב: hn ≥ good or accuracy ≥ goodAcc · otherwise "שווה לחזור לזה". Under minTrials trials → fact only, no band.
  GRADE_CUTS: {
    default: { excellent: 0.70, excellentAcc: 75, veryGood: 0.40, good: 0.15, goodAcc: 70, minTrials: 3 },   // 3 (was 6): a single game always gets its skill result
    follow_me: { excellent: 0.60, excellentAcc: 75, veryGood: 0.40, good: 0.20, goodAcc: 50, minTrials: 1 },   // H = mean level of scenes 4–5, accuracy = % on target
  },

  // Staff screens
  STAFF_IDLE: 30,                // PIN pad / staff panel close after this many seconds without a touch
  STAFF_PIN_TRIES: 3,            // wrong PINs in a row…
  STAFF_PIN_LOCK: 60,            // …lock the pad for this many seconds

  // Anonymous local counters (starts, finishes, where people quit). Stored only in this browser profile.
  COUNTERS: true,
};
