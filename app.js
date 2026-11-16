(() => {
  "use strict";

  const STORE_KEY = "htn-state-v1";
  const $ = (id) => document.getElementById(id);

  // ---------- State & storage ----------
  const defaults = {
    currentId: null,
    group: "all",
    shuffle: false,
    order: null,        // shuffled list of ids
    hide: false,
    guide: true,
    pen: 1,             // index into PEN_SIZES
    learned: {},        // id -> timestamp
    seen: {},           // id -> { n, last }
    days: {},           // "YYYY-MM-DD" -> { views, words: [ids] }
    recent: [],         // most recent ids first
  };
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch { return { ...defaults }; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ---------- Data ----------
  let words = [];
  let byId = new Map();
  let list = [];      // current filtered/ordered list of words
  let pos = 0;

  fetch("words.json")
    .then((r) => r.json())
    .then((data) => {
      words = data;
      byId = new Map(words.map((w) => [w.id, w]));
      initGroups();
      applySettingsUI();
      buildList();
      render();
    })
    .catch(() => { $("word").textContent = "Lỗi tải dữ liệu"; });

  function initGroups() {
    const sel = $("group");
    const groups = [...new Set(words.map((w) => w.group))];
    sel.innerHTML = "";
    const add = (v, t) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); };
    add("all", `Tất cả (${words.length})`);
    add("unlearned", "Chưa thuộc");
    add("learned", "Đã thuộc");
    groups.forEach((g) => add(g, `${g} (${words.filter((w) => w.group === g).length})`));
    sel.value = state.group;
    if (sel.value !== state.group) { state.group = "all"; sel.value = "all"; }
    sel.addEventListener("change", () => {
      state.group = sel.value;
      buildList();
      render();
    });
  }

  function buildList() {
    let base = words;
    if (state.shuffle) {
      const valid = Array.isArray(state.order) && state.order.length === words.length;
      if (!valid) state.order = shuffled(words.map((w) => w.id));
      base = state.order.map((id) => byId.get(id)).filter(Boolean);
    }
    const g = state.group;
    list = base.filter((w) =>
      g === "all" ? true :
      g === "learned" ? !!state.learned[w.id] :
      g === "unlearned" ? !state.learned[w.id] :
      w.group === g);
    const i = list.findIndex((w) => w.id === state.currentId);
    pos = i >= 0 ? i : 0;
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Render ----------
  let lastRecordedId = null;

  function render() {
    const card = $("card");
    card.classList.remove("revealed");
    if (!list.length) {
      $("word").textContent = "—";
      $("kana").textContent = "";
      $("romaji").textContent = "";
      $("meaning").textContent = "Không có từ nào trong nhóm này";
      $("counter").textContent = "0 / 0";
      $("groupTag").textContent = "";
      $("seenTag").textContent = "";
      $("guide").textContent = "";
      card.classList.remove("is-learned");
      $("btnLearned").setAttribute("aria-pressed", "false");
      save();
      return;
    }
    const w = list[pos];
    state.currentId = w.id;
    $("word").textContent = w.word;
    $("kana").textContent = w.kana === w.word ? "" : w.kana;
    $("romaji").textContent = w.romaji;
    $("meaning").textContent = w.meaning;
    $("counter").textContent = `${pos + 1} / ${list.length}`;
    $("groupTag").textContent = `#${w.id} · ${w.group}`;
    fitWord();

    if (lastRecordedId !== w.id) { recordView(w.id); lastRecordedId = w.id; }
    const s = state.seen[w.id];
    $("seenTag").textContent = s ? `Đã xem ${s.n} lần` : "";

    const learned = !!state.learned[w.id];
    card.classList.toggle("is-learned", learned);
    $("btnLearned").setAttribute("aria-pressed", String(learned));

    $("guide").textContent = w.word;
    clearCanvas();
    sizeGuide();
    save();
  }

  function fitWord() {
    const el = $("word");
    el.style.fontSize = "";
    const max = $("card").clientWidth - 48;
    const cur = parseFloat(getComputedStyle(el).fontSize);
    if (el.scrollWidth > max && el.scrollWidth > 0) el.style.fontSize = `${Math.floor(cur * max / el.scrollWidth)}px`;
  }

  function sizeGuide() {
    const wrap = $("canvasWrap");
    const n = Math.max(1, [...$("guide").textContent].length);
    const size = Math.min(wrap.clientHeight * 0.8, (wrap.clientWidth * 0.9) / n);
    $("guide").style.fontSize = `${Math.max(20, size)}px`;
  }

  function recordView(id) {
    const now = Date.now();
    const s = state.seen[id] || { n: 0, last: 0 };
    s.n += 1; s.last = now;
    state.seen[id] = s;
    const d = today();
    const day = state.days[d] || { views: 0, words: [] };
    day.views += 1;
    if (!day.words.includes(id)) day.words.push(id);
    state.days[d] = day;
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 60);
  }

  // ---------- Navigation ----------
  function go(delta) {
    if (!list.length) return;
    pos = (pos + delta + list.length) % list.length;
    render();
  }
  $("btnNext").addEventListener("click", () => go(1));
  $("btnPrev").addEventListener("click", () => go(-1));
  document.addEventListener("keydown", (e) => {
    if (!$("history").hidden) { if (e.key === "Escape") closeHistory(); return; }
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") go(-1);
  });

  // Swipe on the card + tap to reveal
  (() => {
    const card = $("card");
    let sx = 0, sy = 0, t = 0;
    card.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; t = Date.now(); });
    card.addEventListener("pointerup", (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t < 600) {
        go(dx < 0 ? 1 : -1);
      } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        card.classList.toggle("revealed");
      }
    });
  })();

  $("btnLearned").addEventListener("click", () => {
    if (!list.length) return;
    const id = list[pos].id;
    if (state.learned[id]) delete state.learned[id];
    else state.learned[id] = Date.now();
    // Keep the learned/unlearned filters consistent
    if (state.group === "learned" || state.group === "unlearned") {
      buildList();
      if (pos >= list.length) pos = 0;
    }
    render();
  });

  // ---------- Settings toggles ----------
  const PEN_SIZES = [{ w: 6, t: "mảnh" }, { w: 12, t: "vừa" }, { w: 20, t: "đậm" }];

  function applySettingsUI() {
    document.body.classList.toggle("hide-answer", state.hide);
    $("btnHide").setAttribute("aria-pressed", String(state.hide));
    $("btnShuffle").setAttribute("aria-pressed", String(state.shuffle));
    $("btnGuide").setAttribute("aria-pressed", String(state.guide));
    $("guide").hidden = !state.guide;
    $("btnPen").textContent = `Nét: ${PEN_SIZES[state.pen].t}`;
  }
  $("btnHide").addEventListener("click", () => { state.hide = !state.hide; applySettingsUI(); save(); });
  $("btnShuffle").addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    state.order = state.shuffle ? shuffled(words.map((w) => w.id)) : null;
    applySettingsUI();
    buildList();
    pos = 0;
    render();
  });
  $("btnGuide").addEventListener("click", () => { state.guide = !state.guide; applySettingsUI(); save(); });
  $("btnPen").addEventListener("click", () => { state.pen = (state.pen + 1) % PEN_SIZES.length; applySettingsUI(); save(); });

  // ---------- Fullscreen ----------
  // The Android app already runs in immersive full screen
  if (window.Capacitor?.isNativePlatform?.()) $("btnFull").hidden = true;
  $("btnFull").addEventListener("click", () => {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el).catch?.(() => {});
    }
  });

  // ---------- Drawing pad ----------
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  let strokes = [];   // array of arrays of {x,y,p}
  let current = null;

  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
    sizeGuide();
    fitWord();
  }
  function inkColor() { return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#2a2a2a"; }

  function drawStroke(s) {
    if (!s.pts.length) return;
    ctx.strokeStyle = inkColor();
    ctx.fillStyle = inkColor();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.pts.length === 1) {
      const p = s.pts[0];
      ctx.beginPath(); ctx.arc(p.x, p.y, s.w / 2, 0, Math.PI * 2); ctx.fill();
      return;
    }
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1], b = s.pts[i];
      ctx.lineWidth = s.w * (0.6 + 0.8 * (b.p ?? 0.5));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function redraw() {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    strokes.forEach(drawStroke);
  }
  function clearCanvas() { strokes = []; current = null; redraw(); }

  function pt(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return { x: e.clientX - r.left, y: e.clientY - r.top, p };
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    current = { w: PEN_SIZES[state.pen].w, pts: [pt(e)], id: e.pointerId };
    strokes.push(current);
    drawStroke(current);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!current || e.pointerId !== current.id) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const b = pt(ev), a = current.pts[current.pts.length - 1];
      current.pts.push(b);
      ctx.strokeStyle = inkColor();
      ctx.lineCap = "round";
      ctx.lineWidth = current.w * (0.6 + 0.8 * b.p);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  });
  const end = (e) => { if (current && e.pointerId === current.id) current = null; };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  $("btnClear").addEventListener("click", clearCanvas);
  $("btnUndo").addEventListener("click", () => { strokes.pop(); redraw(); });

  new ResizeObserver(resizeCanvas).observe($("canvasWrap"));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", redraw);
  document.fonts?.ready.then(() => { fitWord(); sizeGuide(); });

  // ---------- History sheet ----------
  function openHistory() { renderHistory(); $("history").hidden = false; }
  function closeHistory() { $("history").hidden = true; }
  $("btnHistory").addEventListener("click", openHistory);
  $("btnCloseHistory").addEventListener("click", closeHistory);
  $("history").addEventListener("click", (e) => { if (e.target.id === "history") closeHistory(); });

  function wordButton(id) {
    const w = byId.get(id);
    if (!w) return null;
    const b = document.createElement("button");
    b.innerHTML = `${esc(w.word)}<small>${esc(w.meaning)}</small>`;
    b.addEventListener("click", () => jumpTo(id));
    return b;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function jumpTo(id) {
    let i = list.findIndex((w) => w.id === id);
    if (i < 0) { state.group = "all"; $("group").value = "all"; buildList(); i = list.findIndex((w) => w.id === id); }
    pos = Math.max(0, i);
    closeHistory();
    render();
  }

  function renderHistory() {
    const seenCount = Object.keys(state.seen).length;
    const learnedCount = Object.keys(state.learned).length;
    const dayKeys = Object.keys(state.days).sort().reverse();
    $("stats").innerHTML = `
      <div class="stat"><b>${seenCount}</b><span>từ đã xem / ${words.length}</span></div>
      <div class="stat"><b>${learnedCount}</b><span>từ đã thuộc</span></div>
      <div class="stat"><b>${dayKeys.length}</b><span>ngày đã học</span></div>`;

    const days = $("days");
    days.innerHTML = "";
    if (!dayKeys.length) days.innerHTML = `<div class="empty">Chưa có dữ liệu</div>`;
    dayKeys.slice(0, 30).forEach((k) => {
      const d = state.days[k];
      const [y, m, dd] = k.split("-");
      const row = document.createElement("div");
      row.className = "day";
      row.innerHTML = `<span>${k === today() ? "Hôm nay" : `${dd}/${m}/${y}`}</span><span>${d.words.length} từ · ${d.views} lượt xem</span>`;
      days.appendChild(row);
    });

    const recent = $("recent");
    recent.innerHTML = "";
    state.recent.forEach((id) => { const b = wordButton(id); if (b) recent.appendChild(b); });
    if (!recent.children.length) recent.innerHTML = `<div class="empty">Chưa có</div>`;

    const ll = $("learnedList");
    ll.innerHTML = "";
    Object.entries(state.learned).sort((a, b) => b[1] - a[1]).forEach(([id]) => {
      const b = wordButton(Number(id)); if (b) ll.appendChild(b);
    });
    if (!ll.children.length) ll.innerHTML = `<div class="empty">Chưa có</div>`;
  }

  $("btnReset").addEventListener("click", () => {
    if (!confirm("Xoá toàn bộ lịch sử học và danh sách đã thuộc?")) return;
    state = { ...defaults, group: state.group, hide: state.hide, guide: state.guide, pen: state.pen };
    lastRecordedId = null;
    buildList();
    render();
    renderHistory();
  });
})();
