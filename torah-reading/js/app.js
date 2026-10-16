(function () {
  'use strict';

  const VERSES = window.CHAYEI_SARAH;
  const ALIYOT = window.ALIYOT;
  const STORY = window.STORY;
  const INFO = window.TROPE_INFO;
  const CH = window.CH;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // ---------- שמירה מקומית (localStorage עלול להיכשל) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('chs:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('chs:' + k, JSON.stringify(v)); } catch (e) { /* noop */ }
  },
  };

  const state = {
    view: 'learn',
    aliyah: store.get('aliyah', 1),
    mode: 't',
    level: 0.25,
    known: store.get('known', {}),      // { "23:1": true }
    quiz: store.get('quiz', { ok: 0, total: 0, perTrope: {} }),
    masks: {},
  };

  // ---------- עזרים ----------
  const key = v => v.c + ':' + v.v;
  const inRange = (v, from, to) => {
    const n = v.c * 1000 + v.v;
    return n >= from[0] * 1000 + from[1] && n <= to[0] * 1000 + to[1];
  };
  const versesOf = a => VERSES.filter(v => inRange(v, a.from, a.to));
  const currentAliyah = () => ALIYOT[state.aliyah - 1];
  const hebNum = n => {
    const L = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const T = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    if (n === 15) return 'טו';
    if (n === 16) return 'טז';
    return (T[Math.floor(n / 10)] + L[n % 10]) || '';
  };
  const sefariaUrl = ref => 'https://www.sefaria.org.il/' + ref + '?lang=he';
  const kindOf = tr => (INFO[tr] && INFO[tr].kind) || '';
  const kindClass = tr => (kindOf(tr) === 'מפסיק' ? 'stop' : kindOf(tr) === 'משרת' ? 'serve' : '');
  const wordText = (w, mode) => w[mode];

  // ---------- ניווט ----------
  function setView(v) {
    state.view = v;
    $$('.view').forEach(x => x.classList.toggle('on', x.id === 'view-' + v));
    $$('#mainTabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    $('#aliyot').hidden = (v === 'quiz' || v === 'progress');
    closePanel();
    TropePlayer.stop(); resetPlayBtn();
    if (v === 'learn') renderLearn();
    if (v === 'practice') renderPractice();
    if (v === 'quiz') nextQuestion();
    if (v === 'progress') renderProgress();
  }

  function renderAliyot() {
    const nav = $('#aliyot');
    nav.innerHTML = '';
    ALIYOT.forEach(a => {
      const vs = versesOf(a);
      const done = vs.filter(v => state.known[key(v)]).length;
      const b = el('button', a.n === state.aliyah ? 'on' : '');
      b.append(el('span', 'a-name', a.name), el('span', 'a-ref', `${CH[a.from[0]]} ${hebNum(a.from[1])}–${a.from[0] === a.to[0] ? '' : CH[a.to[0]] + ' '}${hebNum(a.to[1])}`));
      const bar = el('span', 'a-bar'); const fill = el('i'); fill.style.width = Math.round(done / vs.length * 100) + '%';
      bar.append(fill); b.append(bar);
      b.onclick = () => { state.aliyah = a.n; store.set('aliyah', a.n); TropePlayer.stop(); resetPlayBtn(); closePanel(); renderAliyot(); rerender(); };
      nav.append(b);
    });
  }

  function rerender() {
    if (state.view === 'learn') renderLearn();
    else if (state.view === 'practice') renderPractice();
  }

  // ---------- מצב לימוד ----------
  function sectionsOf(a) {
    return STORY.filter(s => inRange({ c: s.from[0], v: s.from[1] }, a.from, a.to));
  }

  function wordSpan(w, vi, wi, mode) {
    const s = el('span', 'w ' + (mode === 't' || mode === 'n' ? kindClass(w.tr) : ''), wordText(w, mode));
    s.dataset.v = vi; s.dataset.w = wi;
    s.tabIndex = 0;
    s.onclick = () => showWord(w, s);
    s.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showWord(w, s); } };
    return s;
  }

  function renderLearn() {
    renderAliyot();
    const body = $('#learnBody');
    body.innerHTML = '';
    const a = currentAliyah();
    if (a.n === 7) body.append(el('div', 'note', 'המפטיר הוא הקריאה האחרונה (כה טז–יח). אחריה קוראים את ההפטרה "והמלך דוד זקן" (מלכים א א א–לא). ההפטרה תתווסף בהמשך.'));
    sectionsOf(a).forEach(sec => {
      const card = el('article', 'story');
      const head = el('div', 'story-head');
      head.append(el('h2', '', sec.title), el('span', 'story-range', `${CH[sec.from[0]]} ${hebNum(sec.from[1])}–${hebNum(sec.to[1])}`));
      card.append(head);

      const text = el('div', 'text');
      versesOf({ from: sec.from, to: sec.to }).forEach(v => {
        const vi = VERSES.indexOf(v);
        const p = el('span', 'verse');
        p.append(el('sup', 'vnum', hebNum(v.v)));
        v.w.forEach((w, wi) => { p.append(wordSpan(w, vi, wi, state.mode)); p.append(document.createTextNode(' ')); });
        text.append(p);
      });
      card.append(text);

      const det = el('details', 'story-more');
      det.append(el('summary', '', 'מה קורה כאן ואיך זה קשור לפסוקים אחרים'));
      det.append(el('p', 'summary', sec.summary));
      const ul = el('ul', 'refs');
      sec.refs.forEach(r => {
        const li = el('li');
        const link = el('a', '', r.label);
        link.href = sefariaUrl(r.to); link.target = '_blank'; link.rel = 'noopener';
        li.append(link, el('span', '', ' – ' + r.why));
        ul.append(li);
      });
      det.append(ul);
      card.append(det);
      body.append(card);
    });
  }

  // ---------- חלונית מילה ----------
  function showWord(w, span) {
    const p = $('#wordPanel');
    const info = INFO[w.tr];
    p.hidden = false;
    p.innerHTML = '';
    const close = el('button', 'x', '×'); close.onclick = closePanel; close.setAttribute('aria-label', 'סגור');
    p.append(close);
    p.append(el('div', 'wp-word', w.n));
    const row = el('div', 'wp-row');
    row.append(el('span', 'chip ' + kindClass(w.tr), w.tr || 'ללא טעם (מחוברת לאחרת)'));
    if (info) row.append(el('span', 'chip ghost', info.kind));
    p.append(row);
    p.append(el('p', '', info ? info.note : 'מילה זו מחוברת למילה שאחריה (מקף), ולכן אין עליה טעם משלה.'));
    const sy = el('p', 'muted', `${w.syl} הברות · הטעמה בהברה ${w.st + 1}`);
    p.append(sy);
    const b = el('button', 'primary', '▶ שמע מילה');
    b.onclick = () => TropePlayer.play([{ word: w, key: 0 }], { tempo: +$('#tempo').value, tonic: +$('#tonic').value });
    p.append(b);
    $$('.w.sel').forEach(x => x.classList.remove('sel'));
    span.classList.add('sel');
  }
  function closePanel() { const p = $('#wordPanel'); p.hidden = true; $$('.w.sel').forEach(x => x.classList.remove('sel')); }

  // ---------- נגן ----------
  function resetPlayBtn() { const b = $('#playBtn'); b.textContent = '▶ שמע את העלייה'; $$('.w.now').forEach(x => x.classList.remove('now')); }
  function togglePlay() {
    if (TropePlayer.isPlaying()) { TropePlayer.stop(); resetPlayBtn(); return; }
    const a = currentAliyah();
    const words = [];
    versesOf(a).forEach(v => {
      const vi = VERSES.indexOf(v);
      v.w.forEach((w, wi) => words.push({ word: w, key: vi + '-' + wi, endOfVerse: wi === v.w.length - 1 }));
    });
    $('#playBtn').textContent = '⏹ עצור';
    TropePlayer.play(words, {
      tempo: +$('#tempo').value, tonic: +$('#tonic').value,
      onWord: k => {
        $$('.w.now').forEach(x => x.classList.remove('now'));
        const [vi, wi] = String(k).split('-');
        const s = $(`.w[data-v="${vi}"][data-w="${wi}"]`);
        if (s) { s.classList.add('now'); s.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      },
      onEnd: resetPlayBtn,
    });
  }

  // ---------- שינון ----------
  function maskFor(a, level, fresh) {
    const k = a.n + ':' + level;
    if (!state.masks[k] || fresh) {
      const m = {};
      versesOf(a).forEach(v => { m[key(v)] = v.w.map(() => Math.random() < level); });
      state.masks[k] = m;
    }
    return state.masks[k];
  }

  function renderPractice(fresh) {
    renderAliyot();
    const body = $('#practiceBody');
    body.innerHTML = '';
    const a = currentAliyah();
    const mask = maskFor(a, state.level, fresh);
    versesOf(a).forEach(v => {
      const row = el('div', 'p-verse' + (state.known[key(v)] ? ' known' : ''));
      const text = el('div', 'text');
      text.append(el('sup', 'vnum', hebNum(v.v)));
      v.w.forEach((w, wi) => {
        if (mask[key(v)][wi]) {
          const h = el('button', 'hole');
          h.style.minWidth = Math.max(2.2, w.b.length * 0.9) + 'ch';
          h.setAttribute('aria-label', 'מילה חסרה, לחץ כדי לגלות');
          h.onclick = () => { const r = el('span', 'w revealed', w.b); h.replaceWith(r); };
          text.append(h);
        } else {
          text.append(el('span', 'w', w.b));
        }
        text.append(document.createTextNode(' '));
      });
      row.append(text);
      const actions = el('div', 'p-actions');
      const reveal = el('button', 'ghost', 'גלה הכול');
      reveal.onclick = () => $$('.hole', text).forEach(h => h.click());
      const know = el('label', 'know');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!state.known[key(v)];
      cb.onchange = () => {
        if (cb.checked) state.known[key(v)] = true; else delete state.known[key(v)];
        store.set('known', state.known);
        row.classList.toggle('known', cb.checked);
        renderAliyot();
      };
      know.append(cb, document.createTextNode(' שיננתי'));
      actions.append(reveal, know);
      row.append(actions);
      body.append(row);
    });
  }

  // ---------- בוחן טעמים ----------
  let currentQ = null;
  const quizTropes = () => Object.keys(INFO).filter(t => INFO[t]);

  function nextQuestion() {
    const pool = [];
    VERSES.forEach((v, vi) => v.w.forEach((w, wi) => { if (w.tr && w.tr !== 'סוף פסוק') pool.push([vi, wi]); }));
    const [vi, wi] = pool[Math.floor(Math.random() * pool.length)];
    const v = VERSES[vi], target = v.w[wi];
    // 3 מסיחים: מעדיפים טעמים שנראים בפרשה
    const seen = [...new Set(pool.map(([a, b]) => VERSES[a].w[b].tr))].filter(t => t !== target.tr);
    const wrong = seen.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [target.tr, ...wrong].sort(() => Math.random() - 0.5);
    currentQ = { target, opts, answered: false };

    const holder = $('#quizVerse');
    holder.innerHTML = '';
    v.w.forEach((w, i) => {
      const s = el('span', 'w' + (i === wi ? ' target' : ''), w.t);
      holder.append(s, document.createTextNode(' '));
    });
    const box = $('#quizOpts'); box.innerHTML = '';
    opts.forEach(o => {
      const b = el('button', 'opt', o);
      b.onclick = () => answer(o, b);
      box.append(b);
    });
    $('#quizFeedback').textContent = '';
    $('#quizNext').hidden = true;
    renderQuizMeta();
  }
  function renderQuizMeta() {
    $('#quizScore').textContent = `${state.quiz.ok} נכון מתוך ${state.quiz.total}`;
  }
  function answer(choice, btn) {
    if (currentQ.answered) return;
    currentQ.answered = true;
    const ok = choice === currentQ.target.tr;
    state.quiz.total++; if (ok) state.quiz.ok++;
    const pt = state.quiz.perTrope[currentQ.target.tr] || { ok: 0, total: 0 };
    pt.total++; if (ok) pt.ok++;
    state.quiz.perTrope[currentQ.target.tr] = pt;
    store.set('quiz', state.quiz);
    $$('#quizOpts .opt').forEach(b => {
      b.disabled = true;
      if (b.textContent === currentQ.target.tr) b.classList.add('right');
    });
    if (!ok) btn.classList.add('wrong');
    const info = INFO[currentQ.target.tr];
    $('#quizFeedback').textContent = (ok ? 'נכון! ' : `הטעם הוא ${currentQ.target.tr}. `) + (info ? info.note : '');
    $('#quizNext').hidden = false;
    renderQuizMeta();
    TropePlayer.play([{ word: currentQ.target, key: 0 }], { tempo: 1, tonic: +$('#tonic').value });
  }

  // ---------- התקדמות ----------
  function renderProgress() {
    renderAliyot();
    const body = $('#progressBody');
    body.innerHTML = '';
    const total = VERSES.length;
    const done = VERSES.filter(v => state.known[key(v)]).length;
    const big = el('div', 'big-stat');
    big.append(el('strong', '', Math.round(done / total * 100) + '%'), el('span', '', `${done} מתוך ${total} פסוקים שוננו`));
    body.append(big);

    const grid = el('div', 'p-grid');
    ALIYOT.forEach(a => {
      const vs = versesOf(a);
      const d = vs.filter(v => state.known[key(v)]).length;
      const c = el('div', 'p-card');
      c.append(el('h3', '', 'עלייה ' + a.name), el('p', 'muted', `${d} / ${vs.length} פסוקים`));
      const bar = el('div', 'bar'); const f = el('i'); f.style.width = Math.round(d / vs.length * 100) + '%'; bar.append(f);
      c.append(bar);
      grid.append(c);
    });
    body.append(grid);

    const q = state.quiz;
    const weak = Object.entries(q.perTrope).filter(([, s]) => s.total >= 2 && s.ok / s.total < 0.7).sort((x, y) => x[1].ok / x[1].total - y[1].ok / y[1].total).slice(0, 4);
    const box = el('div', 'p-card');
    box.append(el('h3', '', 'בוחן הטעמים'));
    box.append(el('p', 'muted', q.total ? `${q.ok} תשובות נכונות מתוך ${q.total}` : 'עדיין לא ענית על שאלות.'));
    if (weak.length) box.append(el('p', '', 'כדאי לתרגל: ' + weak.map(([t]) => t).join(', ')));
    body.append(box);
  }

  // ---------- אירועים ----------
  $('#mainTabs').onclick = e => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); };
  $('#modeSeg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    state.mode = b.dataset.mode;
    $$('#modeSeg button').forEach(x => x.classList.toggle('on', x === b));
    TropePlayer.stop(); resetPlayBtn(); closePanel(); renderLearn();
  };
  $('#levelSeg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    state.level = +b.dataset.level;
    $$('#levelSeg button').forEach(x => x.classList.toggle('on', x === b));
    renderPractice(true);
  };
  $('#newMask').onclick = () => renderPractice(true);
  $('#playBtn').onclick = togglePlay;
  $('#quizNext').onclick = nextQuestion;
  $('#resetProgress').onclick = () => {
    if (!confirm('למחוק את כל ההתקדמות?')) return;
    state.known = {}; state.quiz = { ok: 0, total: 0, perTrope: {} };
    store.set('known', state.known); store.set('quiz', state.quiz);
    renderProgress();
  };

  setView('learn');
})();
