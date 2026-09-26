/* Eau Gallie Medical Center: site behaviour.
   Vanilla JS. The only third-party code is the hero's Liquid Object (Canvas UI + three.js), bundled into
   liquid-object.js and served from this site; fonts are self-hosted too. Browsing makes no request to any
   other server, sets no cookies and stores nothing in the browser. Every motion path checks prefers-reduced-motion.
   Service detail copy is carried over verbatim from the previous site (injected at build). */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Open-now status ─────────────────────────────────────────────
     Posted hours: Mon/Wed/Fri 10am–4pm, Tue/Thu 1pm–6pm, Sat/Sun closed.
     Computed in America/New_York so a visitor's own timezone never matters. */
  const HOURS = { 1: [10, 16], 2: [13, 18], 3: [10, 16], 4: [13, 18], 5: [10, 16] };
  function clinicStatus(date = new Date()) {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(date).map(x => [x.type, x.value]));
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    const mins = (+p.hour) * 60 + (+p.minute);
    const fmt = h => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
    const today = HOURS[wd];
    if (today && mins >= today[0] * 60 && mins < today[1] * 60) return { open: true, label: `Open now · walk in until ${fmt(today[1])}` };
    if (today && mins < today[0] * 60) return { open: false, label: `Closed · opens today at ${fmt(today[0])}` };
    for (let i = 1; i <= 7; i++) { const d = (wd + i) % 7; if (HOURS[d]) return { open: false, label: `Closed · opens ${i === 1 ? 'tomorrow' : DAYS[d]} at ${fmt(HOURS[d][0])}` }; }
  }
  window.clinicStatus = clinicStatus;
  function renderStatus() {
    const s = clinicStatus(new Date());
    $$('[data-clinic-status]').forEach(el => { el.textContent = s.label; el.dataset.open = String(s.open); });
    renderHoursWeek();
  }

  /* ── Live week of hours ────────────────────────────────────────────
     A time axis from 9am to 7pm, one row per open weekday, today highlighted with a "now" tick.
     Drawn from HOURS above; the plain-text hours beside it stay the accessible source. */
  function renderHoursWeek() {
    const box = $('[data-hours-week]'); if (!box) return;
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), now = (+p.hour) + (+p.minute) / 60;
    const START = 9, END = 19, pct = h => `${((h - START) / (END - START)) * 100}%`;
    const fmt = h => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
    const rows = [1, 2, 3, 4, 5].map(d => {
      const [o, c] = HOURS[d], today = d === wd;
      const tick = today && now >= START && now <= END ? `<i class="hours-now" style="left:${pct(now)}"></i>` : '';
      return `<div class="hours-row${today ? ' is-today' : ''}"><b>${['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d]}</b>`
        + `<span class="hours-track"><span class="hours-span" style="left:${pct(o)};width:${pct(START + c - o)}"></span>${tick}</span>`
        + `<span>${fmt(o)}-${fmt(c)}</span></div>`;
    });
    rows.push(`<div class="hours-row${wd === 0 || wd === 6 ? ' is-today' : ''}"><b>Sat</b><span class="hours-closed">Saturday and Sunday closed</span></div>`);
    const html = rows.join('');
    if (box.innerHTML !== html) box.innerHTML = html;      // re-render only when the minute actually moved something
  }
  renderStatus();
  setInterval(renderStatus, 30000);

  /* ── Nav: shrink on scroll + mobile menu ─────────────────────────── */
  const nav = $('#nav');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const toggle = $('#nav-toggle'), menu = $('#nav-menu');
  if (toggle && menu) {
    const setMenu = open => { toggle.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); } });
  }

  /* ── Reveal on scroll + ECG / line-art that draws itself ─────────── */
  const revealEls = $$('[data-reveal]');
  $$('[data-draw]').forEach(svg => $$('path, line, polyline, circle', svg).forEach(p => {
    const L = p.getTotalLength ? p.getTotalLength() : 0;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = reduce ? 0 : L;
  }));
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      if (e.target.matches('[data-draw]')) $$('path, line, polyline, circle', e.target).forEach(p => { p.style.strokeDashoffset = 0; });
      io.unobserve(e.target);
    }), { threshold: 0.2, rootMargin: '0px 0px -48px 0px' });
    revealEls.forEach(el => io.observe(el));
    $$('[data-draw]').forEach(el => io.observe(el));
  }

  /* ── Count-up for the clinic's own published figures ─────────────── */
  const countEls = $$('[data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return; cio.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1100;
      const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    countEls.forEach(el => { el.textContent = '0'; cio.observe(el); });
  }

  /* ── Hero background: soft light field + a live heartbeat trace ────
     The loop runs only while the hero is on screen and the tab is visible,
     and never under reduced motion (a single static frame is drawn instead). */
  const cv = $('[data-hero-bg]');
  if (cv && cv.getContext) {
    const g = cv.getContext('2d');
    let W = 0, H = 0, BEATS = 4, raf = 0, onScreen = true;
    const t0 = performance.now();
    const blobs = [[.16, .28, .42, '94,189,179', .22, .00013], [.86, .20, .36, '232,196,112', .17, .00011], [.64, .82, .50, '14,116,144', .10, .00009], [.30, .86, .30, '234,246,243', .60, .00015]];
    const dots = Array.from({ length: 28 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.2, s: .00002 + Math.random() * .00005, plus: i % 5 === 0 }));
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.max(1, W * d); cv.height = Math.max(1, H * d); g.setTransform(d, 0, 0, d, 0, 0); BEATS = Math.max(2, Math.round(W / 300)); };
    const ecg = u => { const b = (u * BEATS) % 1; if (b < .40) return 0; if (b < .45) return -.12; if (b < .50) return .10; if (b < .54) return -.9; if (b < .58) return .55; if (b < .64) return -.08; return 0; };
    function frame(now) {
      const t = now - t0;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#F3F7F6'; g.fillRect(0, 0, W, H);
      for (const [x, y, rad, rgb, a, sp] of blobs) {
        const cx = (x + Math.sin(t * sp * 7) * .05) * W, cy = (y + Math.cos(t * sp * 5) * .05) * H, R = rad * Math.max(W, H);
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      g.fillStyle = 'rgba(14,116,144,.15)';
      for (const d of dots) {
        const py = (((d.y - t * d.s) % 1) + 1) % 1 * H, px = d.x * W;
        if (d.plus) { g.fillRect(px - 4, py - .8, 8, 1.6); g.fillRect(px - .8, py - 4, 1.6, 8); } else { g.beginPath(); g.arc(px, py, d.r, 0, 6.283); g.fill(); }
      }
      const base = H * .955, amp = Math.min(46, H * .055, W * .09), head = reduce ? 1 : ((t / 5200) % 1);
      g.lineWidth = 1.6; g.lineJoin = g.lineCap = 'round';
      const steps = Math.max(120, Math.round(W / 4));
      for (let i = 1; i <= steps; i++) {
        const u0 = (i - 1) / steps, u1 = i / steps, behind = head - u1;
        const alpha = reduce ? .2 : (behind >= 0 && behind < .55 ? .48 * (1 - behind / .55) + .05 : .05);
        g.strokeStyle = `rgba(14,116,144,${alpha.toFixed(3)})`;
        g.beginPath(); g.moveTo(u0 * W, base + ecg(u0) * amp); g.lineTo(u1 * W, base + ecg(u1) * amp); g.stroke();
      }
      if (!reduce) { const hx = head * W, hy = base + ecg(head) * amp, hg = g.createRadialGradient(hx, hy, 0, hx, hy, 14); hg.addColorStop(0, 'rgba(232,196,112,.9)'); hg.addColorStop(1, 'rgba(232,196,112,0)'); g.fillStyle = hg; g.beginPath(); g.arc(hx, hy, 14, 0, 6.283); g.fill(); }
    }
    const loop = now => { frame(now); raf = requestAnimationFrame(loop); };
    const sync = () => { const run = !reduce && onScreen && !document.hidden; if (run && !raf) raf = requestAnimationFrame(loop); if (!run && raf) { cancelAnimationFrame(raf); raf = 0; } };
    if ('ResizeObserver' in window) new ResizeObserver(() => { size(); if (!raf) frame(performance.now()); }).observe(cv);
    size(); frame(performance.now());
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { onScreen = es[0].isIntersecting; sync(); }).observe(cv);
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* ── Accessible modal dialogs (services + Natalie) ───────────────── */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let active = null;
  function openModal(overlay, opener) {
    const dialog = $('[role=dialog]', overlay);
    active = { overlay, dialog, opener };
    overlay.hidden = false;
    document.documentElement.classList.add('modal-open');
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    const first = $$(FOCUSABLE, dialog)[0] || dialog;
    first.focus({ preventScroll: true });
  }
  function closeModal() {
    if (!active) return;
    const { overlay, opener } = active; active = null;
    overlay.classList.remove('is-open'); overlay.hidden = true;
    document.documentElement.classList.remove('modal-open');
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, active.dialog).filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!items.length) { e.preventDefault(); active.dialog.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !active.dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !active.dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  $$('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
    $$('[data-close]', ov).forEach(b => b.addEventListener('click', closeModal));
  });

  const SERVICES = {
    'primary-care': {
      label: 'Primary Care',
      title: 'Your Personal Health Partner',
      icon: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>',
      tags: ['Chronic Conditions', 'Whole Family', 'Preventive Care', 'Prescriptions', 'Referrals'],
      body: `
        <h4>What is Primary Care?</h4>
        <p>Primary care is your "home base" for health, a regular provider who actually knows you, your history, and your goals. You don't need to wait until you're sick. In fact, that's the whole point: staying ahead of problems before they become serious.</p>
        <h4>You might need this if...</h4>
        <ul>
          <li>You have an ongoing condition like high blood pressure, diabetes, thyroid disease, or high cholesterol that needs regular management</li>
          <li>You need someone to manage your medications and refills</li>
          <li>You want routine bloodwork and checkups to catch things early</li>
          <li>You've been bouncing between ERs and urgent cares with no continuity of care</li>
          <li>You need referrals to specialists and someone to coordinate the big picture</li>
          <li>You just want a doctor who takes time to listen</li>
        </ul>
        <h4>What to expect</h4>
        <p>At your first visit we'll review your full health history, check your vitals, and build a care plan together. Follow-up visits keep everything on track. We order labs, coordinate imaging, write referrals, and manage prescriptions, all through one convenient location.</p>
        <div class="svc-price-box"><span>New Patient Visit</span><strong>$125</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Established Patient Visit</span><strong>$100</strong></div>`,
    },
    'urgent-care': {
      label: 'Urgent & Walk-In Care',
      title: 'Sick Today? Come Right In.',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      tags: ['No Appointment Needed', 'Same Day', 'Walk-Ins', 'Adults & Kids'],
      body: `
        <h4>What is Urgent Care?</h4>
        <p>Urgent care fills the gap between your regular doctor and the emergency room. If you're sick or hurt <em>today</em> and it isn't life-threatening, we can see you now, no appointment, no waiting weeks to get scheduled. Walk right in.</p>
        <h4>Come in if you have...</h4>
        <ul>
          <li>Fever, chills, or flu symptoms</li>
          <li>Sore throat, ear pain, or sinus infection</li>
          <li>Cough, congestion, or mild shortness of breath</li>
          <li>Burning or frequent urination (UTI)</li>
          <li>Pink eye or eye irritation</li>
          <li>Skin rash, bug bites, or mild allergic reaction</li>
          <li>A cut that needs cleaning, bandaging, or stitches</li>
          <li>Nausea, vomiting, or diarrhea</li>
          <li>Minor sprains, strains, or injuries</li>
        </ul>
        <h4>When to go to the ER instead</h4>
        <p>For chest pain, stroke symptoms, severe difficulty breathing, uncontrolled bleeding, or any life-threatening emergency, call 911 or go to the nearest emergency room. We handle the things that are urgent but not emergencies.</p>
        <div class="svc-price-box"><span>New Patient Visit</span><strong>$125</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Established Patient Visit</span><strong>$100</strong></div>`,
    },
    'physicals': {
      label: 'Physicals',
      title: 'Clearance, Check-Ups & More',
      icon: '<svg viewBox="0 0 24 24"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>',
      tags: ['Back to School', 'Sports Clearance', 'Employment', 'Annual Wellness', 'Kids & Adults'],
      body: `
        <h4>What is a physical?</h4>
        <p>A physical is a complete head-to-toe health assessment. Whether your child needs one before school starts, you need clearance for a new job, or you just want to know where your health stands, we make it fast, affordable, and thorough.</p>
        <h4>We do physicals for...</h4>
        <ul>
          <li><strong>Back-to-school requirements</strong>: most Florida schools require one within the last year</li>
          <li><strong>Sports & athletic clearance</strong>: football, soccer, basketball, cheerleading, wrestling, and more</li>
          <li><strong>Summer camp</strong>: most camps require a current physical on file</li>
          <li><strong>Employment / pre-hire</strong>: many jobs require a physical before starting</li>
          <li><strong>Annual adult wellness exams</strong>: know your numbers and stay ahead of problems</li>
          <li><strong>Pre-surgery clearance</strong>: required by most surgical centers before procedures</li>
        </ul>
        <h4>What happens during a physical</h4>
        <p>We check your height, weight, blood pressure, heart rate, vision, and reflexes. We review your medical history and any symptoms you have. For sports physicals, we evaluate your musculoskeletal health and cardiovascular readiness. All required forms are signed same-day.</p>
        <div class="svc-price-box"><span>Adult Physical</span><strong>$100</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Child Physical (School / Sports / Camp)</span><strong>$80</strong></div>`,
    },
    'telemedicine': {
      label: 'Telemedicine',
      title: 'See a Provider From Anywhere',
      icon: '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>',
      tags: ['Phone or Video', 'No Travel', 'Same-Day', 'Prescriptions Sent Electronically'],
      body: `
        <h4>What is a telemedicine visit?</h4>
        <p>A telemedicine visit is a <em>real</em> medical appointment, just done over video or phone instead of in person. You connect with Dr. Wolfington from your phone, tablet, or computer. When it is medically appropriate, we can write prescriptions, order labs, and create your care plan remotely. Some concerns still need an in-person exam, and we will tell you if yours does.</p>
        <h4>Great for...</h4>
        <ul>
          <li>Prescription refills and medication management</li>
          <li>Follow-up visits after a prior appointment</li>
          <li>Cold, flu, sinus infections, or UTIs, no need to leave home when you feel awful</li>
          <li>Reviewing lab results or imaging with your provider</li>
          <li>Anxiety, stress, or general mental health check-ins</li>
          <li>Patients who live far away or have mobility challenges</li>
          <li>Busy schedules, connect on your lunch break</li>
        </ul>
        <h4>How it works</h4>
        <p>Call us to schedule your telemedicine visit with Dr. Wolfington. We'll send you a secure link before your visit, no special app download required on most devices. Afterward, prescriptions are sent directly to your pharmacy and any lab orders are transmitted electronically.</p>
        <div class="svc-price-box"><span>Telemedicine Visit (new &amp; established)</span><strong>$100</strong></div>`,
    },
    'weight-loss': {
      label: 'Medical Weight Loss',
      title: 'Real Results, Medically Supervised',
      icon: '<svg viewBox="0 0 24 24"><path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.72L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5v-5l-2.28 2.72C7.01 18.47 6 15.37 6 12c0-4.08 3.05-7.44 7-7.93V2.05z"/></svg>',
      tags: ['GLP-1 / Semaglutide', 'Peptide Protocols', 'Personalized Plan', 'Lab Evaluation'],
      body: `
        <h4>This isn't just another diet</h4>
        <p>Medical weight loss is different from apps, calorie counting, or gym memberships. We evaluate your body chemistry, history, and goals, then design a plan that works with your specific biology. Weight problems are often <em>medical</em> problems: hormonal imbalances, insulin resistance, thyroid issues, and metabolic dysfunction. We treat the cause, not just the symptom.</p>
        <h4>You might benefit if...</h4>
        <ul>
          <li>You've tried multiple diets but can't keep the weight off long-term</li>
          <li>Your weight is affecting your blood pressure, blood sugar, joints, or sleep</li>
          <li>You've been told you're pre-diabetic or have metabolic syndrome</li>
          <li>You feel constantly tired or have a frustratingly slow metabolism</li>
          <li>You want a supervised approach beyond just "eat less, move more"</li>
        </ul>
        <h4>What we offer</h4>
        <ul>
          <li><strong>GLP-1 receptor agonist medications</strong>: prescription medications that reduce appetite and help regulate blood sugar. Whether one is right for you, which medication, and what it costs are discussed at your visit. Individual results vary.</li>
          <li><strong>Peptide protocols</strong>: support fat metabolism, lean muscle retention, and energy (see Peptide Therapy for more)</li>
          <li><strong>Lab work</strong>: we identify thyroid dysfunction, hormonal imbalances, or insulin resistance that may be working against you</li>
          <li><strong>Ongoing check-ins</strong>: we monitor your progress and adjust the plan as your body changes</li>
        </ul>
        <div class="svc-price-box"><span>Initial Consultation Visit</span><strong>$100+</strong></div>
        <p style="font-size:.8rem;color:var(--gray-500);margin-top:8px;">Medication and treatment plan costs discussed at your first appointment.</p>`,
    },
    'labs': {
      label: 'Lab & Imaging Orders',
      title: 'Know What\'s Actually Going On Inside',
      icon: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
      tags: ['Blood Work', 'Urinalysis', 'X-Rays', 'Ultrasounds', 'Specialist Referrals'],
      body: `
        <h4>What this means for you</h4>
        <p>Lab work and imaging are the tools that tell us what's actually happening inside your body, things you can't see or feel yet. We can order virtually any diagnostic test and send you to a nearby lab or imaging center, often the same day.</p>
        <h4>Common blood tests we order</h4>
        <ul>
          <li><strong>Metabolic panel</strong>: blood sugar, kidney function, liver enzymes, electrolytes</li>
          <li><strong>Lipid panel</strong>: total cholesterol, LDL, HDL, triglycerides</li>
          <li><strong>Thyroid (TSH)</strong>: low thyroid causes fatigue, weight gain, depression, and more</li>
          <li><strong>HbA1c</strong>: your average blood sugar over 3 months (screens for diabetes)</li>
          <li><strong>Complete blood count (CBC)</strong>: checks for anemia, infection, immune issues</li>
          <li><strong>Vitamin D, B12, Iron</strong>: deficiencies are very common and easily treated</li>
          <li><strong>Hormone panels</strong>: testosterone, estrogen, cortisol, and more</li>
          <li><strong>STI panels</strong>: confidential testing for common sexually transmitted infections</li>
        </ul>
        <h4>Imaging we can order</h4>
        <ul>
          <li>X-rays for bone, joint, or chest concerns</li>
          <li>Ultrasounds for abdominal, pelvic, or vascular issues</li>
          <li>Referrals for MRI or CT scan at nearby imaging centers</li>
        </ul>
        <h4>How it works</h4>
        <p>Come in or book a telemedicine visit. We discuss your symptoms, order the right tests, and send the orders electronically. You visit a local lab or imaging center at your convenience. We review your results and follow up with you directly, and a plan for next steps.</p>
        <div class="svc-price-box"><span>Office visit required to order tests</span><strong>$100-$125</strong></div>`,
    },
    'aesthetics': {
      label: 'Aesthetics',
      title: 'Look Refreshed. Feel Like You.',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>',
      tags: ['Clinical Setting', 'Anti-Aging', 'Botox', 'Fillers', 'Skin Rejuvenation'],
      body: `
        <h4>What is medical aesthetics?</h4>
        <p>Medical aesthetic treatments use clinically proven techniques to help you look refreshed and feel more confident, administered by medical professionals in a safe, controlled environment. This is not a spa. It's medical-grade care with real, lasting results.</p>
        <h4>Muscle Relaxers (Neuromodulators)</h4>
        <ul>
          <li><strong>Xeomin ($10/unit)</strong>: a highly purified neuromodulator that relaxes the muscles causing forehead lines, crow's feet, and frown lines. Results last 3-4 months with minimal downtime.</li>
          <li><strong>Letybo ($8/unit)</strong>: a newer-generation neuromodulator offering smooth, natural results at an accessible price point.</li>
          <li><strong>Botox or Dysport ($12/unit)</strong>: the gold-standard neuromodulators trusted worldwide for softening expression lines and wrinkles.</li>
        </ul>
        <h4>Facial Fillers &amp; Volumizers</h4>
        <ul>
          <li><strong>Radiesse ($550/syringe)</strong>: a calcium-based filler that restores volume to cheeks, jawline, and deeper folds, while stimulating your body's own collagen production for long-lasting results.</li>
          <li><strong>Restylane Kysse ($500/syringe)</strong>: a hyaluronic acid filler specifically designed for natural-looking lip enhancement and softening fine lines around the mouth.</li>
          <li><strong>Versa ($425/syringe)</strong>: a smooth hyaluronic acid filler ideal for nasolabial folds (smile lines), lip enhancement, and restoring facial volume at a great value.</li>
        </ul>
        <h4>Who it's for</h4>
        <p>Anyone who wants to look more rested, address specific signs of aging, or improve their skin, in a judgment-free, professional setting. You don't need to look dramatically different. Most patients simply want to look like the best version of themselves.</p>
        <p>Aesthetic procedures at our clinic are performed exclusively by <strong>Natalie Best, APRN-BC</strong>, a board-certified Family Nurse Practitioner.</p>
        <p style="font-size:.85rem;color:var(--gray-500);">Appointment availability with Natalie is limited. To ask about an appointment, call <a href="tel:+13212412013" style="color:var(--teal);font-weight:600;">(321) 241-2013</a>.</p>
        <div class="svc-price-box"><span>Xeomin</span><strong>$10/unit</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Letybo</span><strong>$8/unit</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Botox or Dysport</span><strong>$12/unit</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Radiesse</span><strong>$550/syringe</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Restylane Kysse</span><strong>$500/syringe</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Versa</span><strong>$425/syringe</strong></div>
        <p style="font-size:.85rem;color:var(--gray-500);margin-top:10px;">Neuromodulators and dermal fillers are prescription treatments. Every treatment starts with a consultation to review your health history, goals, expected results, and the risks and possible side effects. Results vary from person to person. To schedule with Natalie Best, APRN-BC, call <a href="tel:+13212412013" style="color:var(--teal);font-weight:600;">(321) 241-2013</a>.</p>
        <p style="font-size:.8rem;color:var(--gray-500);margin-top:8px;">Xeomin, Letybo, Botox, Dysport, Radiesse, Restylane Kysse and Revanesse Versa are trademarks of their respective owners. Eau Gallie Medical Center is not affiliated with or endorsed by them.</p>`,
    },
    'peptides': {
      label: 'Peptide Therapy',
      title: 'Your Body\'s Natural Signals, Amplified',
      icon: '<svg viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2-.42 0-.82.02-1.2.05C15.73 11.37 17 8 17 8z"/></svg>',
      tags: ['Consultation Required', 'Individual Evaluation'],
      body: `
        <h4>What is peptide therapy?</h4>
        <p>Peptides are short chains of amino acids, the building blocks of proteins. A few peptide medications are FDA-approved for specific uses. Many peptides promoted online are not FDA-approved for the purposes they are marketed for, and their safety and effectiveness have not been established.</p>
        <p>At Eau Gallie Medical Center, peptide therapy is offered only after an individual evaluation with Dr. Wolfington. He will discuss whether any option is appropriate for you, what the evidence does and does not show, its regulatory status, its risks and side effects, and the alternatives.</p>
        <h4>What to expect</h4>
        <ul>
          <li>A consultation to review your health history, goals and current medications</li>
          <li>A candid discussion of benefits, risks, costs and alternatives</li>
          <li>No treatment unless you and your physician agree it is appropriate</li>
        </ul>
        <div class="svc-price-box"><span>Consultation required, starts at</span><strong>$100</strong></div>`,
    },
    'mmj': {
      label: 'Medical Marijuana',
      title: 'Florida MMJ Certification: Simple & Compassionate',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2C8 2 6 6 6 9c0 2.5 1.5 4.7 3.7 5.7L8 22h8l-1.7-7.3C16.5 13.7 18 11.5 18 9c0-3-2-7-6-7z"/></svg>',
      tags: ['Florida Residents', 'Qualifying Conditions', 'State Registry', 'Initial & Renewal'],
      body: `
        <h4>How does medical marijuana work in Florida?</h4>
        <p>Medical marijuana is legal in Florida, but before you can walk into a dispensary, you need to be certified by a licensed physician and entered into the Florida Medical Marijuana Use Registry. Dr. Wolfington is a licensed Florida MMJ certifying physician. We make the process simple and judgment-free.</p>
        <h4>Florida's qualifying conditions (Fla. Stat. 381.986)</h4>
        <ul>
          <li>Cancer</li>
          <li>Epilepsy</li>
          <li>Glaucoma</li>
          <li>HIV / AIDS</li>
          <li>Post-traumatic stress disorder (PTSD)</li>
          <li>ALS (amyotrophic lateral sclerosis)</li>
          <li>Crohn's disease</li>
          <li>Parkinson's disease</li>
          <li>Multiple sclerosis</li>
          <li>Chronic nonmalignant pain caused by, or originating from, a qualifying condition</li>
          <li>A terminal condition diagnosed by a physician other than the certifying physician</li>
          <li>Conditions of the same kind or class as, or comparable to, those listed</li>
        </ul>
        <p>Whether you qualify is decided by the physician at your evaluation. Certification is not guaranteed.</p>
        <h4>How the process works</h4>
        <ul>
          <li>Walk in or call us to request an initial certification visit ($175)</li>
          <li>Dr. Wolfington reviews your medical history and qualifying condition</li>
          <li>If certified, you're entered into the Florida state registry within a few days</li>
          <li>You'll receive your registry ID and can purchase from any licensed Florida dispensary</li>
          <li>Renew annually to keep your certification active ($150)</li>
        </ul>
        <p style="font-size:.85rem;color:var(--gray-500);">You must be a Florida resident with a valid Florida ID. Medical records related to your qualifying condition are helpful but not always required, we'll work with you.</p>
        <div class="svc-price-box"><span>Initial Certification Visit</span><strong>$175</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Annual Renewal Visit</span><strong>$150</strong></div>`,
    },
    'procedures': {
      label: 'Minor Procedures',
      title: 'Quick, Safe In-Clinic Procedures',
      icon: '<svg viewBox="0 0 24 24"><path d="M8.1 13.34l2.83-2.83L3.91 3.5C2.38 5.03 2.38 7.56 3.91 9.09l4.19 4.25zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/></svg>',
      tags: ['Stitches / Sutures', 'Abscess Drainage', 'Cysts & Boils', 'Local Anesthesia', 'Same Day'],
      body: `
        <h4>Sutures (Stitches)</h4>
        <p>If you have a cut that's too deep, too wide, or won't stop bleeding with direct pressure, it likely needs stitches. Leaving a deep wound open risks infection, poor healing, and significant scarring.</p>
        <p>We numb the area first with a local anesthetic injection, so you barely feel anything during the procedure. We then clean the wound thoroughly and close it carefully to promote proper healing and minimize scarring. You'll leave with wound care instructions and a follow-up plan for suture removal.</p>
        <h4>When a cut should be checked</h4>
        <ul>
          <li>The wound is deeper than about ¼ inch or gaping open</li>
          <li>Bleeding doesn't slow after 10-15 minutes of firm pressure</li>
          <li>The edges of the cut won't stay together on their own</li>
          <li>The cut is on the face, hand, or over a joint</li>
          <li>You can see fat, muscle, or white tissue at the bottom</li>
        </ul>
        <h4>Incision &amp; Drainage (I&amp;D), Abscesses, Boils &amp; Cysts</h4>
        <p>An abscess or boil is a painful pocket of pus that forms under the skin when bacteria infect a hair follicle, gland, or wound. It looks red, swollen, and feels hot and throbbing. <strong>Antibiotics alone are usually not enough</strong>: the infection is walled off and the only real fix is to drain it.</p>
        <p>We numb the area completely, make a small opening in the skin, and drain the infected material. Most patients feel <em>immediate, significant relief</em> the moment it's drained. We'll pack the wound if needed and give you aftercare instructions.</p>
        <h4>When an abscess should be looked at</h4>
        <ul>
          <li>A lump that's red, warm, swollen, and getting larger over days</li>
          <li>Throbbing or pulsing pain in the area</li>
          <li>A white or yellow "head" forming on the bump</li>
          <li>Fever, chills, or red streaks spreading from the area</li>
        </ul>
        <p style="font-size:.85rem;color:var(--gray-500);">Don't try to pop or lance an abscess at home, this can push infection deeper and make it worse. Let us handle it safely.</p>
        <div class="svc-price-box"><span>Sutures (Laceration Repair)</span><strong>$200</strong></div>
        <div class="svc-price-box" style="margin-top:8px;"><span>Incision &amp; Drainage</span><strong>$200</strong></div>`,
    },
  };
  const svcOverlay = $('#svc-overlay');
  $$('[data-service-open]').forEach(btn => btn.addEventListener('click', () => {
    const s = SERVICES && SERVICES[btn.dataset.serviceOpen]; if (!s || !svcOverlay) return;
    $('#svc-label').textContent = s.label;
    $('#svc-title').textContent = s.title;
    $('#svc-icon').innerHTML = s.icon;
    $('#svc-tags').innerHTML = s.tags.map(t => `<li class="svc-tag">${t}</li>`).join('');
    $('#svc-body').innerHTML = s.body;
    $('[role=dialog]', svcOverlay).scrollTop = 0;
    openModal(svcOverlay, btn);
  }));
  const natOverlay = $('#natalie-overlay');
  $$('[data-natalie-open]').forEach(btn => btn.addEventListener('click', () => natOverlay && openModal(natOverlay, btn)));

  /* ── Service & price finder ─────────────────────────────────────── */
  const finder = $('[data-finder]');
  if (finder) {
    const buttons = $$('[data-filter]', finder), cards = $$('[data-category]', finder);
    buttons.forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.filter;
      buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      cards.forEach(c => { c.hidden = !(f === 'all' || c.dataset.category.split(' ').includes(f)); });
      const live = $('#finder-count', finder);
      if (live) { const n = cards.filter(c => !c.hidden).length; live.textContent = `${n} service${n === 1 ? '' : 's'} shown`; }
    }));
  }

  /* ── Accessible pricing tabs (automatic activation, roving tabindex) ── */
  $$('[role=tablist]').forEach(list => {
    const tabs = $$('[role=tab]', list);
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t, false));
      t.addEventListener('keydown', e => {
        let j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = tabs.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(t, true); return; }
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  });


  /* ── Hero 3D liquid object ────────────────────────────────────────
     The medical bag, rebuilt in code with img2threejs and sunk behind a sheet of liquid the cursor
     stirs (Canvas UI "Liquid Object"). Touch stirs the liquid while retaining vertical page scrolling.
     Skipped for reduced motion, like every
     other motion path here; the still image in the stage covers all of those cases.
     Loaded with plain <script> tags and handed a blob: URL rather than an ES module import and a fetch
     of a file, because both of those are blocked when the page is opened straight from disk (file://),
     which is how the site is previewed from the Brain. ~310KB gzipped, fetched only after load, and
     reduced-motion visitors never download it. */
  const liquid = $('[data-liquid]');
  const liquidMotion = matchMedia('(prefers-reduced-motion: no-preference)');
  let liquidFx = null, liquidLoading = false, bagUrl = '';
  // Probe lazily, then release the temporary GPU context.
  let webgl2;
  const hasWebGL2 = () => {
    if (webgl2 === undefined) {
      try { const gl = document.createElement('canvas').getContext('webgl2'); webgl2 = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext(); }
      catch { webgl2 = false; }
    }
    return webgl2;
  };
  const loadScript = src => new Promise((ok, fail) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return ok();
    const el = Object.assign(document.createElement('script'), { src, async: true, onload: ok, onerror: () => fail(new Error(src)) });
    el.dataset.src = src; document.head.appendChild(el);
  });
  const stopLiquid = () => { liquidFx?.destroy(); liquidFx = null; liquid.classList.remove('is-ready'); };
  async function startLiquid() {
    if (liquidFx || liquidLoading || !liquidMotion.matches || !hasWebGL2()) return;
    liquidLoading = true;
    try {
      await Promise.all([loadScript('liquid-object.js'), loadScript('medical-bag-model.js')]);
      if (!liquidMotion.matches) return;                           // motion preference changed while loading
      if (!bagUrl) {
        const bin = atob(window.EGMC_BAG_GLB);
        const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        bagUrl = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      }
      // Canvas UI's own duck demo settings, so the bag reads at the same size and liquid quality.
      liquidFx = window.LiquidObject.createLiquidObject({ canvas: $('canvas', liquid) }, {
        src: bagUrl, dracoDecoderPath: 'draco/',                     // local path: the model is not Draco-compressed, so the library's Google-hosted default is never used
        scale: 3, yOffset: -0.2, cameraDistance: 4, fov: 60,
        orbit: matchMedia('(hover: hover) and (pointer: fine)').matches, zoom: false,
        distortion: 2, aberration: 0.75, grain: 1, sheen: 1.6, iridescence: 1.5, splash: 1.2,
        ambient: 1, persistence: 0.6, swirl: 0.5, saturation: 1.2, metallic: 0.15,
        floatIntensity: 1, rotationIntensity: 0.5, floatSpeed: 1.5, wobble: 0,
        background: '',                                            // transparent over the hero light field
        onLoad: () => liquid.classList.add('is-ready'),
        onError: stopLiquid,
      });
      if (!liquidFx) return;                                       // WebGL refused: the still stays
      // OrbitControls sets touch-action:none inline. Let touch users scroll vertically over the bag.
      if (matchMedia('(any-pointer: coarse)').matches) $('canvas', liquid).style.touchAction = '';
    } catch { stopLiquid(); } finally { liquidLoading = false; }
  }
  if (liquid) {
    const go = () => (window.requestIdleCallback || setTimeout)(startLiquid);
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
    liquidMotion.addEventListener('change', () => (liquidMotion.matches ? startLiquid() : stopLiquid()));
  }

  /* ── MOTION LAYER ───────────────────────────────────────────────────
     Everything below is decoration. It checks `reduce` first, uses only
     transform/opacity, and degrades to a plain, working page if any of it
     is unavailable. Nothing here loads a byte from another server. */

  /* "What brings you in today?" — a patient's words, mapped to the service
     card that answers them. Filters, scrolls, highlights, and hands keyboard
     focus to the card's own button rather than opening a dialog at them. */
  const CATEGORY_OF = { 'urgent-care': 'everyday', physicals: 'everyday', 'weight-loss': 'wellness', aesthetics: 'wellness' };
  $$('[data-need]').forEach(btn => btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target) { const el = $(target); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
    const id = btn.dataset.need, card = $(`[data-service="${id}"]`);
    if (!card) return;
    const wanted = CATEGORY_OF[id];
    const filter = wanted && $(`[data-filter="${wanted}"]`);
    if (filter) filter.click();
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    card.classList.add('is-pointed');
    setTimeout(() => card.classList.remove('is-pointed'), 2600);
    const more = $('[data-service-open]', card);
    if (more) setTimeout(() => more.focus({ preventScroll: true }), reduce ? 0 : 520);
  }));

  /* One line-drawing per service family, drawn once when the card arrives.
     Decorative, so it is injected rather than hand-written into ten cards,
     and hidden from screen readers. */
  const ACCENTS = {
    pulse: '<polyline points="4 34 16 34 21 22 28 46 35 34 44 34 52 34 60 34"/>',
    clip: '<path d="M22 12h20a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z"/><path d="M26 12a6 6 0 0 1 12 0"/><polyline points="26 32 30 36 39 26"/>',
    screen: '<path d="M10 16h36a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z"/><path d="M22 52h20"/><path d="M32 44v8"/><path d="M53 24l9-6v26l-9-6z"/>',
    leaf: '<path d="M14 50C14 30 30 14 50 14c0 20-16 36-36 36z"/><path d="M14 50C22 42 32 34 46 26"/>',
    spark: '<path d="M32 10l5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><path d="M50 40l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>',
    stitch: '<path d="M10 40C20 24 40 24 54 18"/><path d="M18 30l6 8"/><path d="M26 26l6 8"/><path d="M34 23l6 8"/><path d="M42 21l6 8"/>'
  };
  const ACCENT_OF = {
    'primary-care': 'pulse', 'urgent-care': 'pulse', physicals: 'clip', labs: 'clip',
    telemedicine: 'screen', 'weight-loss': 'leaf', peptides: 'leaf', mmj: 'leaf',
    aesthetics: 'spark', procedures: 'stitch'
  };
  $$('[data-service]').forEach(card => {
    const art = ACCENTS[ACCENT_OF[card.dataset.service]];
    if (!art || $('.card-accent', card)) return;
    const wrap = document.createElement('div');
    wrap.className = 'card-accent';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `<svg viewBox="0 0 64 64" focusable="false">${art}</svg>`;
    card.appendChild(wrap);
    // a real dash length per path, so every line draws at its own speed
    if (!reduce) $$('path,polyline,circle', wrap).forEach(el => {
      const len = el.getTotalLength ? Math.ceil(el.getTotalLength()) : 260;
      el.style.setProperty('--len', len);
    });
  });

  /* Pointer-led micro-motion. Desktop mouse only, a degree or two, and it
     reverses the moment the pointer leaves. Anything more reads as a demo. */
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  // read live: someone can turn "reduce motion" on while the page is open
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  const dropFx = () => $$('.is-magnetic, .is-tilt').forEach(el => { el.style.transform = ''; });
  if (motionQ.addEventListener) motionQ.addEventListener('change', dropFx);
  if (fine && !reduce) {
    $$('.hero-actions .btn, .call-card .btn').forEach(btn => {
      btn.classList.add('is-magnetic');
      btn.addEventListener('pointermove', e => {
        if (motionQ.matches) return;
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${(x * 7).toFixed(2)}px, ${(y * 5).toFixed(2)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
    $$('.card').forEach(card => {
      card.classList.add('is-tilt');
      card.addEventListener('pointermove', e => {
        if (motionQ.matches) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(-y * 2).toFixed(2)}deg) rotateY(${(x * 2).toFixed(2)}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* The visit line fills with the section, so the page reads as a sequence.
     Without JS the line is simply full — never empty and never broken. */
  const journey = $('[data-journey]');
  if (journey && !reduce && 'IntersectionObserver' in window) {
    let ticking = false, visible = false;
    const draw = () => {
      ticking = false;
      const r = journey.getBoundingClientRect(), h = innerHeight;
      const p = (h * 0.82 - r.top) / Math.max(1, r.height * 0.9);
      journey.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
    };
    const onScroll = () => { if (!ticking && visible) { ticking = true; requestAnimationFrame(draw); } };
    new IntersectionObserver(es => es.forEach(e => {
      visible = e.isIntersecting;
      if (visible) draw();
    }), { rootMargin: '120px' }).observe(journey);
    journey.style.setProperty('--p', '0');
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
  }

})();
