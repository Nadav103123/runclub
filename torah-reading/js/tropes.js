// מנוע "מנגינת הדגמה" לטעמי המקרא בנוסח אשכנזי.
//
// חשוב: זו הדגמה מקורבת שנוצרה בסינתיסייזר, כדי שאפשר יהיה לבדוק את הרעיון של
// הדגשת מילה-מילה לפי הטעם. המנגינות כאן אינן מאושרות על ידי חזן או בעל קורא,
// ובמוצר אמיתי מחליפים אותן בהקלטות אמיתיות. אפשר לערוך את MOTIFS ישירות.
//
// כל מוטיב: תווים בחצאי טונים ביחס לטוניקה (0 = דו, 2 = רה, 4 = מי, 5 = פה, 7 = סול, -5 = סול נמוך).
window.MOTIFS = {
  'סוף פסוק': [4, 2, 0],
  'אתנחתא': [0, -1, -3, 0],
  'טיפחא': [-1, -3],
  'זקף קטן': [2, 5, 4],
  'זקף גדול': [0, 4, 2],
  'פשטא': [0, 2],
  'רביע': [4, 2, 4, 2],
  'תביר': [2, 0, -1, 0],
  'גרש': [2, 4, 2],
  'גרשיים': [2, 4, 2, 5, 4],
  'סגול': [0, 2, 4],
  'שלשלת': [0, 2, 0, 2, 0, 2, 0],
  'פזר': [4, 5, 7, 5, 4],
  'תלישא גדולה': [0, 2, 4],
  'תלישא קטנה': [-3, 0],
  'מונח': [-5],
  'מרכא': [-5, -3],
  'מהפך': [-3, -1],
  'קדמא': [0, 2],
  'דרגא': [0, -1, 0],
  'מרכא כפולה': [-5, -3, -5, -3],
  '': [-5],
};

window.TropePlayer = (function () {
  let ctx = null, master = null, timers = [], playing = false, gen = 0;

  let silent = null;
  // ב-iOS צליל Web Audio מושתק כשמתג השקט פעיל, אלא אם מנגנים גם אלמנט audio.
  function unlockIOS() {
    try {
      if (!silent) {
        silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
        silent.loop = true;
      }
      const r = silent.play(); if (r && r.catch) r.catch(() => {});
    } catch (e) { /* noop */ }
  }

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    return ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
  }

  function note(freq, start, dur) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.5, start + 0.04);
    g.gain.setValueAtTime(0.5, start + Math.max(0.05, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    [['sawtooth', 0], ['triangle', 6]].forEach(([type, detune]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start(start);
      o.stop(start + dur + 0.02);
    });
    filter.connect(g);
    g.connect(master);
  }

  // בונה ציר זמן למילה: מחזיר [{t, dur, semi}]
  function wordNotes(word, beat) {
    const motif = window.MOTIFS[word.tr] || window.MOTIFS[''];
    const syl = Math.max(1, word.syl);
    const stress = Math.min(word.st, syl - 1);
    const out = [];
    let t = 0;
    for (let s = 0; s < stress; s++) { out.push({ t, dur: beat * 0.8, semi: motif[0] }); t += beat * 0.8; }
    const rest = syl - stress; // הברות מההטעמה והלאה
    for (let s = 0; s < rest; s++) {
      if (s < rest - 1 && s < motif.length - 1) {
        out.push({ t, dur: beat, semi: motif[s] });
        t += beat;
      } else {
        // ההברה האחרונה מקבלת את שאר התווים של המוטיב
        const left = motif.slice(Math.min(s, motif.length - 1));
        const span = beat * 1.3;
        left.forEach((semi, k) => out.push({ t: t + (span / left.length) * k, dur: span / left.length, semi }));
        t += span;
      }
    }
    return { notes: out, len: t };
  }

  function stop() {
    gen++;
    timers.forEach(clearTimeout); timers = [];
    if (master) { try { master.gain.value = 0; master.disconnect(); } catch (e) { /* noop */ } }
    playing = false;
  }

  // words: [{word, key}] ; opts: {tempo, tonic, onWord(key), onEnd()}
  function play(words, opts) {
    stop();
    unlockIOS();
    playing = true;
    const my = ++gen;
    ensureCtx().then(() => { if (my === gen && playing) schedule(words, opts); });
  }

  function schedule(words, opts) {
    const beat = 0.34 / (opts.tempo || 1);
    const tonic = opts.tonic || 196;
    let cursor = ctx.currentTime + 0.15;
    const t0 = cursor;
    words.forEach(({ word, key, endOfVerse }) => {
      const { notes, len } = wordNotes(word, beat);
      notes.forEach(n => note(tonic * Math.pow(2, n.semi / 12), cursor + n.t, n.dur * 0.97));
      const delay = (cursor - t0) * 1000 + 150;
      timers.push(setTimeout(() => opts.onWord && opts.onWord(key), delay));
      cursor += len + (word.tr === 'אתנחתא' ? beat * 0.9 : 0.06);
      if (endOfVerse) cursor += beat * 1.2;
    });
    timers.push(setTimeout(() => { playing = false; opts.onEnd && opts.onEnd(); }, (cursor - t0) * 1000 + 300));
  }

  return { play, stop, isPlaying: () => playing };
})();
