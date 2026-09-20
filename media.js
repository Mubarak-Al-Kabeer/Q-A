/* ═══════════════════════════════════════════════════════
   media.js — يولّد صور ECG وأيقونات الأدوات والأصوات داخل المتصفح
   الاستخدام في الشيت: imageUrl أو audioUrl = gen:اسم_الميديا
   ويدعم أيضاً روابط Google Drive والروابط المباشرة العادية
═══════════════════════════════════════════════════════ */
(function () {
  const svgUri = s => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  const rnd = s => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };

  /* ───────────── ECG ───────────── */
  const GRID = "<defs><pattern id='g' width='20' height='20' patternUnits='userSpaceOnUse'><path d='M20 0H0V20' fill='none' stroke='#12324a' stroke-width='1'/></pattern></defs><rect width='600' height='200' fill='#06121f'/><rect width='600' height='200' fill='url(#g)'/>";
  const ecgSvg = pts => svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 200'>" + GRID +
    "<polyline points='" + pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") +
    "' fill='none' stroke='#39ff8a' stroke-width='2.5' stroke-linejoin='round'/></svg>");

  const NORM = [[0,0],[8,0],[12,-6],[16,0],[24,0],[27,5],[30,-60],[34,20],[38,0],[52,0],[58,-10],[66,0],[100,0]];
  const NOP  = [[0,0],[24,0],[27,5],[30,-60],[34,20],[38,0],[52,0],[58,-10],[66,0],[100,0]];
  const STE  = [[0,0],[8,0],[12,-6],[16,0],[24,0],[27,5],[30,-60],[34,-10],[42,-32],[56,-34],[66,-22],[80,0],[100,0]];

  function trace(tpl, width, irregular, wobble) {
    const pts = []; let x = 8, i = 0;
    while (x < 600) {
      const w = irregular ? width * (0.55 + rnd(i * 3 + 1) * 0.9) : width;
      tpl.forEach(([dx, dy]) => pts.push([x + dx * w / 100, 110 + dy + (wobble ? rnd(x + dx) * 6 - 3 : 0)]));
      x += w; i++;
    }
    return pts.filter(p => p[0] <= 600);
  }
  const wave = fn => { const p = []; for (let x = 0; x <= 600; x += 3) p.push([x, fn(x)]); return p; };

  /* ───────────── أيقونات الأدوات ───────────── */
  const ICON_BG = "<rect width='300' height='200' rx='16' fill='#0f1c3a'/>";
  const iconSvg = inner => svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'>" + ICON_BG + inner + "</svg>");

  const ICONS = {
    stethoscope: () => iconSvg(
      "<path d='M90 30v50a40 40 0 0 0 80 0V30' fill='none' stroke='#cbd5e1' stroke-width='8' stroke-linecap='round'/>" +
      "<circle cx='90' cy='28' r='7' fill='#94a3b8'/><circle cx='170' cy='28' r='7' fill='#94a3b8'/>" +
      "<path d='M130 120v25a45 45 0 0 0 90 0' fill='none' stroke='#cbd5e1' stroke-width='8' stroke-linecap='round'/>" +
      "<circle cx='220' cy='145' r='24' fill='#22d3ee' stroke='#e2e8f0' stroke-width='5'/>"),
    thermometer: () => iconSvg(
      "<rect x='40' y='85' width='200' height='30' rx='15' fill='#e2e8f0'/>" +
      "<rect x='50' y='94' width='170' height='12' rx='6' fill='#ef4444'/>" +
      "<circle cx='250' cy='100' r='24' fill='#ef4444' stroke='#e2e8f0' stroke-width='5'/>" +
      "<g stroke='#64748b' stroke-width='2'><path d='M90 85v8M120 85v8M150 85v8M180 85v8'/></g>"),
    syringe: () => iconSvg(
      "<rect x='90' y='78' width='120' height='44' rx='6' fill='#e2e8f0' stroke='#94a3b8' stroke-width='3'/>" +
      "<rect x='96' y='90' width='70' height='20' fill='#38bdf8'/>" +
      "<path d='M90 100H50M50 80v40' stroke='#cbd5e1' stroke-width='8' stroke-linecap='round'/>" +
      "<rect x='210' y='92' width='20' height='16' fill='#94a3b8'/><path d='M230 100h50' stroke='#e2e8f0' stroke-width='4' stroke-linecap='round'/>" +
      "<g stroke='#475569' stroke-width='2'><path d='M120 78v10M150 78v10M180 78v10'/></g>"),
    bpcuff: () => iconSvg(
      "<circle cx='85' cy='75' r='42' fill='#e2e8f0' stroke='#94a3b8' stroke-width='5'/>" +
      "<path d='M85 75L108 52' stroke='#ef4444' stroke-width='4' stroke-linecap='round'/><circle cx='85' cy='75' r='5' fill='#1e293b'/>" +
      "<rect x='185' y='40' width='95' height='75' rx='10' fill='#2563eb' stroke='#93c5fd' stroke-width='3'/>" +
      "<path d='M127 72L185 75' stroke='#94a3b8' stroke-width='5'/>" +
      "<path d='M85 117q0 45 60 45' fill='none' stroke='#94a3b8' stroke-width='5'/><ellipse cx='170' cy='162' rx='24' ry='16' fill='#1e293b' stroke='#94a3b8' stroke-width='3'/>"),
    pulseox: () => iconSvg(
      "<rect x='70' y='65' width='160' height='80' rx='16' fill='#334155' stroke='#94a3b8' stroke-width='4'/>" +
      "<rect x='115' y='88' width='115' height='34' rx='17' fill='#f5c6a5'/>" +
      "<rect x='82' y='76' width='38' height='24' rx='4' fill='#052e16'/><text x='86' y='94' font-family='Arial' font-size='16' font-weight='700' fill='#39ff8a'>98</text>"),
    aed: () => iconSvg(
      "<rect x='60' y='45' width='180' height='115' rx='16' fill='#dc2626' stroke='#fecaca' stroke-width='4'/>" +
      "<path d='M150 130c-30-22-40-35-40-48a20 20 0 0 1 40-6a20 20 0 0 1 40 6c0 13-10 26-40 48z' fill='#fff'/>" +
      "<path d='M155 72l-14 24h14l-8 22 22-28h-14l8-18z' fill='#dc2626'/>" +
      "<path d='M60 60q-40 10-30 60M240 60q40 10 30 60' fill='none' stroke='#fbbf24' stroke-width='5'/>"),
    ivbag: () => iconSvg(
      "<path d='M150 12v12' stroke='#cbd5e1' stroke-width='6'/>" +
      "<rect x='108' y='26' width='84' height='104' rx='28' fill='#38bdf8' fill-opacity='.45' stroke='#bae6fd' stroke-width='4'/>" +
      "<rect x='134' y='130' width='32' height='34' rx='6' fill='#e2e8f0' stroke='#94a3b8' stroke-width='3'/>" +
      "<path d='M150 164v30' stroke='#e2e8f0' stroke-width='4'/><path d='M130 60h40M130 80h40M130 100h40' stroke='#e0f2fe' stroke-width='3'/>"),
    bvm: () => iconSvg(
      "<ellipse cx='120' cy='100' rx='70' ry='46' fill='#22c55e' stroke='#bbf7d0' stroke-width='4'/>" +
      "<rect x='185' y='88' width='30' height='24' fill='#94a3b8'/>" +
      "<path d='M215 70q60 30 0 60z' fill='#e2e8f0' fill-opacity='.85' stroke='#94a3b8' stroke-width='3'/>" +
      "<path d='M50 100H24' stroke='#94a3b8' stroke-width='8'/>")
  };

  const IMAGES = {
    ecg_normal:   () => ecgSvg(trace(NORM, 95, false, false)),
    ecg_brady:    () => ecgSvg(trace(NORM, 175, false, false)),
    ecg_svt:      () => ecgSvg(trace(NOP, 42, false, false)),
    ecg_afib:     () => ecgSvg(trace(NOP, 70, true, true)),
    ecg_stelev:   () => ecgSvg(trace(STE, 110, false, false)),
    ecg_vtach:    () => ecgSvg(wave(x => 110 - 62 * Math.sin(x / 8.4))),
    ecg_vfib:     () => ecgSvg(wave(x => 110 + (30 * Math.sin(x * 0.09) + 24 * Math.sin(x * 0.23 + 1) + 16 * Math.sin(x * 0.047 + 2)) * (0.5 + 0.5 * Math.abs(Math.sin(x * 0.013))))),
    ecg_asystole: () => ecgSvg(wave(x => 110 + rnd(x) * 1.6 - 0.8))
  };
  Object.keys(ICONS).forEach(k => IMAGES["img_" + k] = ICONS[k]);
  Object.keys(IMAGES).filter(k => k.startsWith("ecg_")).forEach(k => { IMAGES["img_" + k] = IMAGES[k]; });

  /* ───────────── الصوت (WAV مولَّد) ───────────── */
  const SR = 11025;
  function toBlobUrl(s) {
    const n = s.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s[i])) * 32767, true);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }
  const buf = secs => new Float32Array(Math.floor(SR * secs));

  function tone(s, at, dur, f, amp) {
    const L = Math.floor(SR * dur);
    for (let i = 0; i < L; i++) {
      const k = Math.floor(at) + i; if (k >= s.length) break;
      s[k] += amp * Math.sin(2 * Math.PI * f * i / SR) * Math.sin(Math.PI * i / L);
    }
  }
  function thump(s, at, dur, f, amp) {
    const L = Math.floor(SR * dur);
    for (let i = 0; i < L; i++) {
      const k = Math.floor(at) + i; if (k >= s.length) break;
      const e = Math.exp(-i / (L * 0.35));
      s[k] += amp * e * (Math.sin(2 * Math.PI * f * i / SR) + 0.5 * Math.sin(2 * Math.PI * f * 2 * i / SR));
    }
  }
  function beeps(bpm, secs, irregular) {
    const s = buf(secs); let t = 0, i = 0;
    while (t < s.length) { tone(s, t, 0.09, 1000, 0.5); t += SR * 60 / bpm * (irregular ? 0.5 + rnd(i++ + 3) : 1); }
    return s;
  }
  function heart(bpm, murmur, secs) {
    const s = buf(secs), period = SR * 60 / bpm; let lp = 0;
    for (let t0 = 0; t0 < s.length; t0 += period) {
      thump(s, t0, 0.09, 110, 0.55);
      const s2 = t0 + Math.min(period * 0.38, SR * 0.32);
      thump(s, s2, 0.07, 150, 0.4);
      if (murmur) {
        const a = Math.floor(t0 + SR * 0.09), b = Math.floor(s2);
        for (let i = a; i < b && i < s.length; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.35; s[i] += lp * 0.5 * Math.sin(Math.PI * (i - a) / (b - a)); }
      }
    }
    return s;
  }
  function breathing(wheeze, secs) {
    const s = buf(secs); let lp = 0;
    for (let i = 0; i < s.length; i++) {
      const ph = (i / SR) % 4, env = ph < 2 ? Math.sin(Math.PI * ph / 2) : 0;
      lp += (Math.random() * 2 - 1 - lp) * 0.25;
      let v = lp * 0.5 * env;
      if (wheeze) v += 0.25 * env * (Math.sin(2 * Math.PI * (520 + 40 * Math.sin(i / SR * 6)) * i / SR) + 0.4 * Math.sin(2 * Math.PI * 1040 * i / SR));
      s[i] = v;
    }
    return s;
  }
  const AUDIOS = {
    aud_beep_40:        () => beeps(40, 7),
    aud_beep_75:        () => beeps(75, 7),
    aud_beep_150:       () => beeps(150, 7),
    aud_beep_irregular: () => beeps(90, 8, true),
    aud_flatline:       () => { const s = buf(5); tone(s, 0, 5, 1000, 0.45); return s; },
    aud_alarm:          () => { const s = buf(5); for (let k = 0; k < 20; k++) tone(s, k * SR * 0.25, 0.25, k % 2 ? 660 : 880, 0.5); return s; },
    aud_lubdub:         () => heart(72, false, 8),
    aud_lubdub_fast:    () => heart(140, false, 8),
    aud_murmur:         () => heart(75, true, 8),
    aud_breath:         () => breathing(false, 10),
    aud_wheeze:         () => breathing(true, 10),
    aud_defib:          () => {
      const s = buf(5);
      for (let i = 0; i < SR * 3; i++) { const f = 300 + 1200 * (i / (SR * 3)); s[i] = 0.35 * Math.sin(2 * Math.PI * f * i / SR); }
      tone(s, SR * 3.2, 0.4, 1000, 0.5); return s;
    }
  };

  /* ───────────── الواجهة العامة ───────────── */
  const cache = {};
  function driveId(u) {
    const m = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([^&#]+)/);
    return m ? m[1] : "";
  }
  // kind: "image" | "audio" | "video"
  window.resolveMediaUrl = function (ref, kind) {
    ref = String(ref || "").trim();
    if (!ref) return "";
    if (ref.startsWith("gen:")) {
      const key = ref.slice(4);
      if (cache[key]) return cache[key];
      try {
        if (IMAGES[key]) return (cache[key] = IMAGES[key]());
        if (AUDIOS[key]) return (cache[key] = toBlobUrl(AUDIOS[key]()));
      } catch (e) { console.error("media error", key, e); }
      return "";
    }
    const id = driveId(ref);
    if (id) return kind === "image" ? "https://drive.google.com/uc?export=view&id=" + id : "https://drive.google.com/uc?export=download&id=" + id;
    return ref;
  };
  window.__mediaKeys = { images: Object.keys(IMAGES), audios: Object.keys(AUDIOS) };
})();
