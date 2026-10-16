/* =========================================================
   Abdessamad Bencheraik — Portfolio interactions
   No dependencies. Everything degrades to static content.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var SVGNS = 'http://www.w3.org/2000/svg';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  /* ---------- Intro ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  });

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Navigation ---------- */
  var toggle = $('#navToggle');
  var links = $('#navLinks');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', links).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
  }

  var navMap = {};
  $$('.nav__links a').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('.nav__links a').forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        var link = navMap[entry.target.id];
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'about', 'expertise', 'work', 'experience', 'contact'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navObs.observe(s);
    });
  }

  /* =========================================================
     The orchestration core — a procedural 3D scene on Canvas.
     Orbits = layers I connect. Moving lights = BPMN tokens.
     ========================================================= */
  function createCore(canvas, opts) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    var labels = opts.labels || [];
    var W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0, F = 700;
    var pointer = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
    var rings = [], particles = [], tokens = [];
    var running = false, visible = true, raf = 0, last = 0, time = 0, scrollShift = 0;
    var small = false;

    var ringDefs = [
      { inc: 1.15, node: 0.0, speed: 0.16 },
      { inc: 0.55, node: 1.2, speed: -0.11 },
      { inc: 1.42, node: 2.3, speed: 0.09 },
      { inc: 0.9, node: 3.6, speed: -0.07 },
      { inc: 1.3, node: 4.8, speed: 0.06 }
    ];

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      small = W < 900;
      var c = opts.center(W, H, small);
      cx = c.x; cy = c.y; R = c.r;

      rings = ringDefs.slice(0, opts.rings || 5).map(function (d, i) {
        return {
          r: R * (0.62 + i * 0.17), inc: d.inc, node: d.node, speed: d.speed,
          phase: i * 1.7, label: labels[i] || ''
        };
      });

      var count = Math.round((small ? 70 : 180) * (opts.density || 1));
      particles = [];
      for (var p = 0; p < count; p++) {
        particles.push({
          x: (Math.random() - 0.5) * W * 1.6,
          y: (Math.random() - 0.5) * H * 1.6,
          z: Math.random() * 900 - 300,
          s: Math.random() * 1.3 + 0.3,
          tw: Math.random() * Math.PI * 2,
          vy: -(Math.random() * 6 + 2)
        });
      }
      if (!running) frame(performance.now(), true);
    }

    /* Point on ring i at angle t, then the global camera rotation. */
    function ringPoint(ring, t) {
      var x = ring.r * Math.cos(t), y = ring.r * Math.sin(t), z = 0;
      // inclination about X
      var ci = Math.cos(ring.inc), si = Math.sin(ring.inc);
      var y1 = y * ci - z * si, z1 = y * si + z * ci;
      // ascending node about Z
      var cn = Math.cos(ring.node), sn = Math.sin(ring.node);
      var x2 = x * cn - y1 * sn, y2 = x * sn + y1 * cn;
      return camera(x2, y2, z1);
    }

    function camera(x, y, z) {
      var yaw = time * 0.05 + tilt.x * 0.5;
      var pitch = -0.35 + tilt.y * 0.35;
      var cyw = Math.cos(yaw), syw = Math.sin(yaw);
      var x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var k = F / (F + z2);
      return { x: cx + x1 * k, y: cy - scrollShift + y1 * k, z: z2, k: k };
    }

    function spawnToken() {
      if (!rings.length) return;
      var ring = rings[(Math.random() * rings.length) | 0];
      tokens.push({ ring: ring, s: 0, inward: Math.random() > 0.35, speed: 0.35 + Math.random() * 0.35 });
    }

    function drawCore(t) {
      var c = camera(0, 0, 0);
      var pulse = 1 + Math.sin(t * 1.4) * 0.04;
      var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 1.25 * pulse);
      g.addColorStop(0, 'rgba(160,139,255,0.42)');
      g.addColorStop(0.35, 'rgba(124,99,245,0.16)');
      g.addColorStop(1, 'rgba(124,99,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.25 * pulse, 0, Math.PI * 2); ctx.fill();

      // wire sphere: latitude and longitude lines
      var sr = R * 0.36;
      ctx.lineWidth = 0.8;
      for (var lat = -2; lat <= 2; lat++) {
        var phi = lat * 0.5, rr = sr * Math.cos(phi), yy = sr * Math.sin(phi);
        ctx.beginPath();
        for (var a = 0; a <= 48; a++) {
          var th = a / 48 * Math.PI * 2;
          var p = camera(rr * Math.cos(th), yy, rr * Math.sin(th));
          if (a === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(160,139,255,0.28)';
        ctx.stroke();
      }
      for (var lon = 0; lon < 6; lon++) {
        var th0 = lon / 6 * Math.PI + t * 0.2;
        ctx.beginPath();
        for (var b = 0; b <= 48; b++) {
          var ph = b / 48 * Math.PI * 2;
          var q = camera(sr * Math.cos(ph) * Math.cos(th0), sr * Math.sin(ph), sr * Math.cos(ph) * Math.sin(th0));
          if (b === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.strokeStyle = 'rgba(98,230,240,0.16)';
        ctx.stroke();
      }

      var inner = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, sr * 0.75);
      inner.addColorStop(0, 'rgba(236,235,255,0.95)');
      inner.addColorStop(0.25, 'rgba(160,139,255,0.75)');
      inner.addColorStop(1, 'rgba(124,99,245,0)');
      ctx.fillStyle = inner;
      ctx.beginPath(); ctx.arc(c.x, c.y, sr * 0.75, 0, Math.PI * 2); ctx.fill();
      return c;
    }

    function frame(now, once) {
      var dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      if (!once) time += dt;

      tilt.x += (pointer.x - tilt.x) * 0.04;
      tilt.y += (pointer.y - tilt.y) * 0.04;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // drifting particle field with parallax
      for (var i = 0; i < particles.length; i++) {
        var pt = particles[i];
        if (!once) {
          pt.y += pt.vy * dt;
          if (pt.y < -H * 0.8) pt.y = H * 0.8;
        }
        var k = F / (F + pt.z);
        var px = cx + (pt.x - tilt.x * 40 * (1 - pt.z / 900)) * k;
        var py = H / 2 + (pt.y - tilt.y * 30 * (1 - pt.z / 900)) * k - scrollShift * 0.5;
        var a = (0.35 + 0.35 * Math.sin(time * 1.6 + pt.tw)) * k;
        ctx.fillStyle = 'rgba(190,200,255,' + clamp(a, 0, 0.8).toFixed(3) + ')';
        ctx.fillRect(px, py, pt.s * k, pt.s * k);
      }

      var core = drawCore(time);

      // orbits, nodes and spokes
      var nodes = [];
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        ctx.beginPath();
        for (var s = 0; s <= 120; s++) {
          var p = ringPoint(ring, s / 120 * Math.PI * 2);
          if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = r % 2 ? 'rgba(98,230,240,0.14)' : 'rgba(160,139,255,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        var np = ringPoint(ring, ring.phase + time * ring.speed);
        nodes.push(np);
        ring._p = np;

        var grd = ctx.createLinearGradient(core.x, core.y, np.x, np.y);
        grd.addColorStop(0, 'rgba(160,139,255,0.0)');
        grd.addColorStop(1, 'rgba(98,230,240,0.22)');
        ctx.strokeStyle = grd;
        ctx.beginPath(); ctx.moveTo(core.x, core.y); ctx.lineTo(np.x, np.y); ctx.stroke();

        var nr = 3.2 * np.k + 1;
        var halo = ctx.createRadialGradient(np.x, np.y, 0, np.x, np.y, nr * 6);
        halo.addColorStop(0, 'rgba(98,230,240,0.55)');
        halo.addColorStop(1, 'rgba(98,230,240,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(np.x, np.y, nr * 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(236,250,255,0.95)';
        ctx.beginPath(); ctx.arc(np.x, np.y, nr, 0, Math.PI * 2); ctx.fill();
      }

      // tokens travelling between nodes and the core
      if (!once && Math.random() < dt * (small ? 2.5 : 5)) spawnToken();
      for (var j = tokens.length - 1; j >= 0; j--) {
        var tk = tokens[j];
        tk.s += dt * tk.speed;
        if (tk.s >= 1) { tokens.splice(j, 1); continue; }
        var from = tk.inward ? tk.ring._p : core, to = tk.inward ? core : tk.ring._p;
        if (!from || !to) continue;
        var e = tk.s < 0.5 ? 2 * tk.s * tk.s : 1 - Math.pow(-2 * tk.s + 2, 2) / 2;
        var tx = from.x + (to.x - from.x) * e, ty = from.y + (to.y - from.y) * e;
        var tail = 0.08;
        var e2 = Math.max(0, e - tail);
        var bx = from.x + (to.x - from.x) * e2, by = from.y + (to.y - from.y) * e2;
        var fade = Math.sin(tk.s * Math.PI);
        ctx.strokeStyle = 'rgba(98,230,240,' + (0.8 * fade).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = 'rgba(236,250,255,' + fade.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(tx, ty, 1.8, 0, Math.PI * 2); ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      // labels for each orbit's node (desktop only)
      if (labels.length && !small) {
        ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
        ctx.textBaseline = 'middle';
        for (var n = 0; n < nodes.length; n++) {
          if (!rings[n].label) continue;
          var nd = nodes[n];
          var right = nd.x >= core.x;
          ctx.textAlign = right ? 'left' : 'right';
          ctx.fillStyle = 'rgba(200,205,240,' + clamp(0.35 + nd.k * 0.45, 0, 0.9).toFixed(3) + ')';
          ctx.fillText(rings[n].label, nd.x + (right ? 14 : -14), nd.y);
        }
      }

      if (!once && running) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion.matches || !visible || document.hidden) return;
      running = true; last = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    window.addEventListener('resize', function () { resize(); });
    if (opts.interactive) {
      window.addEventListener('pointermove', function (e) {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      window.addEventListener('scroll', function () {
        scrollShift = Math.min(window.scrollY, H) * 0.25;
        if (!running) frame(performance.now(), true);
      }, { passive: true });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    reduceMotion.addEventListener && reduceMotion.addEventListener('change', function () {
      if (reduceMotion.matches) { stop(); frame(performance.now(), true); } else start();
    });

    resize();
    start();
    return { start: start, stop: stop };
  }

  try {
    var heroCanvas = $('#core');
    if (heroCanvas) {
      createCore(heroCanvas, {
        interactive: true,
        labels: ['Processes', 'Applications', 'APIs', 'Automation', 'Data & AI'],
        center: function (w, h, small) {
          return small
            ? { x: w * 0.5, y: h * 0.26, r: Math.min(w * 0.3, h * 0.16) }
            : { x: w * 0.71, y: h * 0.5, r: Math.min(w * 0.17, h * 0.27) };
        }
      });
    }
    var echo = $('#coreEcho');
    if (echo) {
      createCore(echo, {
        rings: 3, density: 0.5,
        center: function (w, h, small) {
          return small ? { x: w * 0.85, y: h * 0.12, r: w * 0.25 } : { x: w * 0.92, y: h * 0.5, r: h * 0.26 };
        }
      });
    }
  } catch (err) {
    /* The CSS gradient behind the canvas stays as the fallback. */
  }

  /* =========================================================
     Expertise constellation
     ========================================================= */
  var DOMAINS = [
    {
      id: 'bpm', name: 'Enterprise BPM & Appian', x: 500, y: 270, hub: true,
      text: 'Designing and delivering process applications on Appian Cloud, from the BPMN model to the interface users work in every day.',
      tools: ['Appian Cloud', 'BPMN 2.0', 'SAIL interfaces', 'Records', 'Expression & business rules', 'KPI dashboards'],
      where: [['Enterprise BPM case study', '#bpm'], ['CGI experience', '#experience']]
    },
    {
      id: 'int', name: 'Enterprise Integration', x: 250, y: 120,
      text: 'Connecting process platforms to the systems of record so data moves without re-keying.',
      tools: ['SAP Gateway', 'REST APIs', 'SOAP web services', 'JSON', 'XML', 'Connected systems'],
      where: [['Enterprise BPM', '#bpm'], ['Service Desk Manager', '#sdm']]
    },
    {
      id: 'sec', name: 'Security & Identity', x: 150, y: 360,
      text: 'Single sign-on, access control and protecting data on the device and in transit.',
      tools: ['Microsoft Entra ID', 'SAML 2.0', 'SSO', 'RBAC', 'OAuth2', 'JWT', 'OTP', 'AES-256'],
      where: [['Enterprise BPM', '#bpm'], ['Service Desk Manager', '#sdm']]
    },
    {
      id: 'eng', name: 'Software Engineering', x: 730, y: 110,
      text: 'The general-purpose engineering underneath everything else: languages, frameworks and data stores.',
      tools: ['Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'PostgreSQL', 'MongoDB', 'SQLite'],
      where: [['IoT Monitoring', '#iot'], ['PMIS', '#pmis']]
    },
    {
      id: 'mob', name: 'Web & Mobile Development', x: 830, y: 340,
      text: 'Cross-platform and native apps that keep working in the field, with or without a network.',
      tools: ['React', 'Vue.js', 'React Native', 'Ionic', 'Android', 'Offline-first sync', 'Firebase', 'UHF RFID'],
      where: [['PMIS', '#pmis'], ['Barque Identification', '#barque'], ['Service Desk Manager', '#sdm']]
    },
    {
      id: 'ai', name: 'Applied AI & Decision Support', x: 640, y: 480,
      text: 'Models and rules that help operators decide: what to allocate, and how much traffic to expect.',
      tools: ['Python', 'Rule-based allocation', 'Traffic forecasting', 'Confidence intervals', 'Master’s in Applied AI'],
      where: [['PMIS case study', '#pmis']]
    },
    {
      id: 'ops', name: 'DevOps & Delivery', x: 340, y: 490,
      text: 'How work gets from a workshop to production: analysis, specification, testing and support.',
      tools: ['Requirements workshops', 'Specifications', 'Agile / Scrum', 'Jira', 'Confluence', 'ServiceNow', 'Unit & functional testing', 'Git', 'GitLab', 'Docker', 'Linux'],
      where: [['Career path', '#experience']]
    }
  ];
  var LINKS = [['bpm', 'int'], ['bpm', 'sec'], ['bpm', 'ops'], ['bpm', 'ai'], ['bpm', 'eng'], ['int', 'sec'], ['int', 'eng'], ['eng', 'mob'], ['mob', 'ai'], ['ai', 'ops'], ['sec', 'ops']];

  (function buildConstellation() {
    var host = $('#constellation');
    if (!host) return;
    var svg = $('.constellation__lines', host);
    var nodesWrap = $('.constellation__nodes', host);
    var panel = $('#domainPanel');
    var byId = {};
    DOMAINS.forEach(function (d) { byId[d.id] = d; });

    var lineEls = LINKS.map(function (l) {
      var a = byId[l[0]], b = byId[l[1]];
      var line = svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      line._ids = l;
      svg.appendChild(line);
      return line;
    });

    var buttons = DOMAINS.map(function (d, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'node' + (d.hub ? ' node--hub' : '');
      btn.id = 'tab-' + d.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'domainPanel');
      btn.style.left = (d.x / 10) + '%';
      btn.style.top = (d.y / 5.6) + '%';
      btn.innerHTML = '<span class="node__dot" aria-hidden="true"></span><span class="node__name"></span>';
      btn.querySelector('.node__name').textContent = d.name;
      btn.addEventListener('click', function () { select(i, false); });
      btn.addEventListener('keydown', function (e) {
        var k = e.key, next = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') next = (i + 1) % DOMAINS.length;
        if (k === 'ArrowLeft' || k === 'ArrowUp') next = (i - 1 + DOMAINS.length) % DOMAINS.length;
        if (k === 'Home') next = 0;
        if (k === 'End') next = DOMAINS.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
      nodesWrap.appendChild(btn);
      return btn;
    });

    function select(i, focus) {
      var d = DOMAINS[i];
      buttons.forEach(function (b, j) {
        b.setAttribute('aria-selected', String(i === j));
        b.tabIndex = i === j ? 0 : -1;
      });
      if (focus) buttons[i].focus();
      panel.setAttribute('aria-labelledby', 'tab-' + d.id);
      lineEls.forEach(function (l) { l.classList.toggle('is-lit', l._ids.indexOf(d.id) !== -1); });

      panel.innerHTML = '';
      var h = document.createElement('h3'); h.className = 'panel__title'; h.textContent = d.name;
      var p = document.createElement('p'); p.className = 'panel__text'; p.textContent = d.text;
      var ul = document.createElement('ul'); ul.className = 'panel__tools';
      d.tools.forEach(function (t) { var li = document.createElement('li'); li.className = 'tool'; li.textContent = t; ul.appendChild(li); });
      var w = document.createElement('p'); w.className = 'panel__where';
      w.appendChild(document.createTextNode('Applied in: '));
      d.where.forEach(function (pair, k) {
        var a = document.createElement('a'); a.href = pair[1]; a.textContent = pair[0];
        if (k) w.appendChild(document.createTextNode(', '));
        w.appendChild(a);
      });
      panel.appendChild(h); panel.appendChild(p); panel.appendChild(ul); panel.appendChild(w);
    }
    select(0, false);
  })();

  /* =========================================================
     Architecture diagrams (illustrations, built from data)
     ========================================================= */
  var DIAGRAMS = {
    pmis: {
      w: 640, h: 300,
      nodes: [
        { id: 'app', x: 95, y: 75, label: 'Mobile app', sub: 'React Native', w: 160, kind: 'accent' },
        { id: 'db', x: 95, y: 215, label: 'Local store', sub: 'SQLite', w: 150 },
        { id: 'api', x: 320, y: 145, label: 'REST API', sub: 'sync, modules' },
        { id: 'fb', x: 320, y: 255, label: 'Firebase', sub: 'cloud services' },
        { id: 'alloc', x: 540, y: 55, label: 'Allocation', sub: 'Python rules', kind: 'ai' },
        { id: 'fc', x: 540, y: 150, label: 'Forecasting', sub: 'Python, intervals', kind: 'ai' },
        { id: 'dash', x: 540, y: 245, label: 'Dashboards', sub: 'KPIs, reports' }
      ],
      edges: [['app', 'db', 'sync'], ['app', 'api', 'flow'], ['api', 'fb'], ['api', 'alloc', 'flow'], ['api', 'fc', 'flow'], ['api', 'dash', 'flow']]
    },
    barque: {
      w: 640, h: 200,
      nodes: [
        { id: 'tag', x: 80, y: 120, label: 'UHF RFID tag', sub: 'on the vessel', w: 136 },
        { id: 'pda', x: 255, y: 120, label: 'Industrial PDA', sub: 'Android app', w: 140, kind: 'accent' },
        { id: 'q', x: 420, y: 40, label: 'Local store', sub: 'offline queue', w: 132 },
        { id: 'be', x: 560, y: 120, label: 'Backend', sub: 'licence registry', w: 140 }
      ],
      edges: [['tag', 'pda', 'flow'], ['pda', 'q', 'sync'], ['q', 'be', 'sync'], ['pda', 'be', 'flow']]
    },
    sdm: {
      w: 640, h: 200,
      nodes: [
        { id: 'app', x: 85, y: 100, label: 'Mobile app', sub: 'React Native', w: 140, kind: 'accent' },
        { id: 'api', x: 285, y: 100, label: 'REST API', sub: 'OTP auth', w: 140 },
        { id: 'sdm', x: 495, y: 45, label: 'SDM backend', sub: 'changes, tasks', w: 150 },
        { id: 'gw', x: 495, y: 155, label: 'Notif. gateway', sub: 'OTP, push', w: 150 }
      ],
      edges: [['app', 'api', 'flow'], ['api', 'sdm', 'flow'], ['api', 'gw'], ['gw', 'app', 'sync']]
    },
    bpm: {
      w: 640, h: 210,
      nodes: [
        { id: 'u', x: 75, y: 140, label: 'Users', sub: 'business teams', w: 130 },
        { id: 'idp', x: 235, y: 40, label: 'Entra ID', sub: 'SAML 2.0 SSO', w: 140 },
        { id: 'ap', x: 320, y: 140, label: 'Appian Cloud', sub: 'BPMN, SAIL, Records', w: 180, kind: 'accent' },
        { id: 'sap', x: 545, y: 70, label: 'SAP Gateway', sub: 'secured REST', w: 140 },
        { id: 'leg', x: 545, y: 170, label: 'Legacy', sub: 'SOAP services', w: 140 }
      ],
      edges: [['u', 'idp'], ['idp', 'ap'], ['u', 'ap', 'flow'], ['ap', 'sap', 'flow'], ['ap', 'leg', 'flow']]
    },
    iot: {
      w: 640, h: 200,
      nodes: [
        { id: 's', x: 80, y: 100, label: 'Sensors', sub: 'temp, humidity', w: 136 },
        { id: 'api', x: 270, y: 100, label: 'Spring Boot', sub: 'JPA, Hibernate', w: 150, kind: 'accent' },
        { id: 'db', x: 470, y: 160, label: 'PostgreSQL', sub: 'readings', w: 140 },
        { id: 'ui', x: 470, y: 40, label: 'Vue.js', sub: 'dashboard', w: 140 }
      ],
      edges: [['s', 'api', 'flow'], ['api', 'db'], ['api', 'ui', 'flow']]
    }
  };

  function curve(a, b) {
    var mx = (a.x + b.x) / 2;
    if (Math.abs(a.x - b.x) < 20) {
      return 'M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y;
    }
    return 'M' + a.x + ' ' + a.y + ' C' + mx + ' ' + a.y + ',' + mx + ' ' + b.y + ',' + b.x + ' ' + b.y;
  }

  $$('.diagram[data-diagram]').forEach(function (fig) {
    var d = DIAGRAMS[fig.getAttribute('data-diagram')];
    if (!d) return;
    var svg = svgEl('svg', { viewBox: '0 0 ' + d.w + ' ' + d.h, role: 'img' });
    var title = svgEl('title', {});
    title.textContent = 'Architecture diagram: ' + d.nodes.map(function (n) { return n.label; }).join(', ');
    svg.appendChild(title);
    var map = {};
    d.nodes.forEach(function (n) { map[n.id] = n; });

    d.edges.forEach(function (e) {
      var path = curve(map[e[0]], map[e[1]]);
      svg.appendChild(svgEl('path', { d: path, 'class': 'dg-edge' + (e[2] === 'sync' ? ' dg-edge--sync' : '') }));
      if (e[2] === 'flow') svg.appendChild(svgEl('path', { d: path, 'class': 'dg-flow' }));
    });

    d.nodes.forEach(function (n) {
      var w = n.w || 140, h = 50;
      var g = svgEl('g', { 'class': 'dg-node' + (n.kind ? ' dg-node--' + n.kind : '') });
      g.appendChild(svgEl('rect', { x: n.x - w / 2, y: n.y - h / 2, width: w, height: h, rx: 12 }));
      var t1 = svgEl('text', { x: n.x, y: n.y - 3, 'text-anchor': 'middle', 'class': 'dg-label' });
      t1.textContent = n.label;
      var t2 = svgEl('text', { x: n.x, y: n.y + 15, 'text-anchor': 'middle', 'class': 'dg-sub' });
      t2.textContent = n.sub;
      g.appendChild(t1); g.appendChild(t2);
      svg.appendChild(g);
    });

    fig.insertBefore(svg, fig.firstChild);
  });

  /* ---------- Forecast illustration (seeded, illustrative) ---------- */
  (function buildForecast() {
    var svg = $('.forecast__svg');
    if (!svg) return;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var W = 520, H = 220, padL = 16, padR = 16, top = 24, bottom = 186;
    var hist = 30, fut = 12, n = hist + fut;
    var vals = [];
    for (var i = 0; i < n; i++) {
      vals.push(52 + i * 0.6 + Math.sin(i / 2.6) * 11 + (i < hist ? (rnd() - 0.5) * 9 : 0));
    }
    function X(i) { return padL + i / (n - 1) * (W - padL - padR); }
    function Y(v) { return bottom - (v - 20) / 80 * (bottom - top); }

    var histPath = '', predPath = '', up = [], lo = [];
    for (var j = 0; j < n; j++) {
      if (j < hist) histPath += (j ? 'L' : 'M') + X(j).toFixed(1) + ' ' + Y(vals[j]).toFixed(1);
      if (j >= hist - 1) {
        predPath += (j === hist - 1 ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Y(vals[j]).toFixed(1);
        var spread = 3 + (j - hist + 1) * 1.6;
        up.push(X(j).toFixed(1) + ' ' + Y(vals[j] + spread).toFixed(1));
        lo.unshift(X(j).toFixed(1) + ' ' + Y(vals[j] - spread).toFixed(1));
      }
    }
    svg.appendChild(svgEl('line', { x1: padL, y1: bottom, x2: W - padR, y2: bottom, 'class': 'fc-axis' }));
    svg.appendChild(svgEl('path', { d: 'M' + up.join(' L') + ' L' + lo.join(' L') + 'Z', 'class': 'fc-band' }));
    svg.appendChild(svgEl('line', { x1: X(hist - 1), y1: top - 6, x2: X(hist - 1), y2: bottom, 'class': 'fc-now' }));
    svg.appendChild(svgEl('path', { d: histPath, 'class': 'fc-hist' }));
    svg.appendChild(svgEl('path', { d: predPath, 'class': 'fc-pred' }));

    [['Historical vessel visits', padL, 'start'], ['Forecast and interval', W - padR, 'end']].forEach(function (l) {
      var t = svgEl('text', { x: l[1], y: 208, 'text-anchor': l[2], 'class': 'fc-text' });
      t.textContent = l[0];
      svg.appendChild(t);
    });
  })();

  /* ---------- Reveal diagrams once ---------- */
  var figs = $$('.diagram, .forecast');
  if ('IntersectionObserver' in window) {
    var figObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-drawn'); figObs.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    figs.forEach(function (f) { figObs.observe(f); });
  } else {
    figs.forEach(function (f) { f.classList.add('is-drawn'); });
  }

  /* ---------- About journey: light each step as it is reached ---------- */
  var steps = $$('#thread li');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var stepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-lit'); stepObs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -35% 0px' });
    steps.forEach(function (li) { stepObs.observe(li); });
  } else {
    steps.forEach(function (li) { li.classList.add('is-lit'); });
  }

  /* ---------- Timeline progress line ---------- */
  var timeline = $('#timeline');
  if (timeline && !reduceMotion.matches) {
    var ticking = false;
    var update = function () {
      var r = timeline.getBoundingClientRect();
      var p = clamp((window.innerHeight * 0.65 - r.top) / r.height, 0, 1);
      timeline.style.setProperty('--progress', p.toFixed(3));
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Pointer details: magnetic buttons, case spotlight ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        btn.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
    $$('.case').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--px', (e.clientX - r.left) + 'px');
        c.style.setProperty('--py', (e.clientY - r.top) + 'px');
      });
    });
  }
})();
