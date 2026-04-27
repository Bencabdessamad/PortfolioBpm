// ===== NAV SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// ===== REVEAL ON SCROLL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== ACTIVE NAV LINK ON SCROLL =====
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(link => link.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => navObserver.observe(s));

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== STATS COUNTER =====
function animateCounter(el) {
  const target = parseInt(el.closest('.stat-card').dataset.target);
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current);
  }, 16);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.counter').forEach(animateCounter);
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const statsSection = document.getElementById('stats');
if (statsSection) statsObserver.observe(statsSection);

// ===== BPMN INTERACTIVE DEMO =====
const nodeInfo = {
  'node-start': {
    title: '🟢 Start Event — Process Triggered',
    desc: 'In Appian, a process starts when a user submits a form, an API call is received, or a scheduled timer fires. The SAIL interface captures the initial data.'
  },
  'node-validate': {
    title: '⚙️ Validate Data — Expression Rules',
    desc: 'Appian Expression Rules validate the submitted data in real-time. Business rules check completeness, formatting, and authorization before proceeding.'
  },
  'node-gateway': {
    title: '✦ XOR Gateway — Decision Point',
    desc: 'An exclusive gateway routes the process based on conditions. If approved → continue. If rejected → loop back. This is the heart of intelligent BPM routing.'
  },
  'node-approve': {
    title: '✅ Manager Approval — Human Task',
    desc: 'Appian assigns a task to the manager with deadline and escalation. If no action within SLA, the process auto-escalates to the next level (exception handling).'
  },
  'node-notify': {
    title: '🔔 Notify User — Automated Action',
    desc: 'Appian automatically sends email/push notifications, updates the Appian Record, triggers REST API calls to external systems like SAP or ServiceNow.'
  },
  'node-end': {
    title: '⏹ Process Complete — Audit Trail',
    desc: 'The process ends with a complete audit trail. All actions, decisions, and timestamps are logged in Appian for compliance and reporting dashboards.'
  }
};

const nodeOrder = ['node-start', 'node-validate', 'node-gateway', 'node-approve', 'node-notify', 'node-end'];
let currentNode = null;

function activateNode(el) {
  const nodeId = el.id;
  const info = nodeInfo[nodeId];
  if (!info) return;

  if (currentNode && currentNode !== el) {
    currentNode.classList.remove('active');
    currentNode.classList.add('completed');
  }

  const idx = nodeOrder.indexOf(nodeId);
  document.querySelectorAll('.bpmn-arrow').forEach((arrow, i) => {
    arrow.classList.toggle('active', i < idx);
  });

  el.classList.add('active');
  currentNode = el;

  document.getElementById('infoTitle').textContent = info.title;
  document.getElementById('infoDesc').textContent = info.desc;
  document.getElementById('bpmnStatus').textContent =
    idx === nodeOrder.length - 1
      ? '🎉 Process completed! This is how Appian BPM works.'
      : `Step ${idx + 1} of ${nodeOrder.length} — Click next node →`;
}

function resetBpmn() {
  document.querySelectorAll('.bpmn-node').forEach(n => n.classList.remove('active', 'completed'));
  document.querySelectorAll('.bpmn-arrow').forEach(a => a.classList.remove('active'));
  currentNode = null;
  document.getElementById('infoTitle').textContent = 'How it works';
  document.getElementById('infoDesc').textContent = 'This is a simplified Appian BPM workflow. Click each node to walk through the process steps.';
  document.getElementById('bpmnStatus').textContent = '👆 Click a node to start the process';
}

// ===== BPMN HERO CANVAS ANIMATION =====
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  let smoothPX = 0, smoothPY = 0;
  let targetPX = 0, targetPY = 0;
  let dashOffset = 0;
  let rafId = null;

  const NODE_LABELS = ['Start', 'Validate', 'Approve', 'Deploy', 'End'];
  const BADGE_LABELS = ['BPMN', 'SAIL', 'CDT', 'REST', 'RBAC', 'XOR', 'AND', 'SSO', 'API', 'BPM'];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  class Particle {
    constructor(type) {
      this.type = type;
      this.pf = rnd(0.008, 0.025);
      this.spawn(true);
    }
    spawn(scatter) {
      this.x = rnd(0, W);
      this.y = scatter ? rnd(0, H) : rnd(-80, -20);
      this.vx = rnd(-0.3, 0.3);
      this.vy = rnd(-0.3, 0.3);
      this.rot = rnd(0, Math.PI * 2);
      this.vr = rnd(-0.006, 0.006);
      if (this.type === 'node') {
        this.label = NODE_LABELS[Math.floor(Math.random() * NODE_LABELS.length)];
        this.vr = rnd(-0.003, 0.003);
      }
      if (this.type === 'badge') {
        this.label = BADGE_LABELS[Math.floor(Math.random() * BADGE_LABELS.length)];
        this.vr = 0;
      }
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.rot += this.vr;
      const pad = 80;
      if (this.x < -pad) this.x = W + pad;
      else if (this.x > W + pad) this.x = -pad;
      if (this.y < -pad) this.y = H + pad;
      else if (this.y > H + pad) this.y = -pad;
    }
    draw() {
      const px = this.x + smoothPX * this.pf;
      const py = this.y + smoothPY * this.pf;
      const d = isDark();
      ctx.save();
      switch (this.type) {
        case 'node': {
          const a = d ? 0.22 : 0.14;
          const nw = 80, nh = 35, r = 6;
          ctx.translate(px + nw / 2, py + nh / 2);
          ctx.rotate(this.rot);
          const x = -nw / 2, y = -nh / 2;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + nw - r, y);
          ctx.quadraticCurveTo(x + nw, y, x + nw, y + r);
          ctx.lineTo(x + nw, y + nh - r);
          ctx.quadraticCurveTo(x + nw, y + nh, x + nw - r, y + nh);
          ctx.lineTo(x + r, y + nh);
          ctx.quadraticCurveTo(x, y + nh, x, y + nh - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.strokeStyle = `rgba(27,94,166,${a})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = `rgba(27,94,166,${a * 0.2})`;
          ctx.fill();
          ctx.fillStyle = `rgba(27,94,166,${Math.min(a * 1.2, 0.3)})`;
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.label, 0, 0);
          break;
        }
        case 'badge': {
          const a = d ? 0.28 : 0.18;
          ctx.translate(px, py);
          ctx.font = '11px monospace';
          ctx.fillStyle = `rgba(27,94,166,${a})`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(this.label, 0, 0);
          break;
        }
        case 'diamond': {
          const a = d ? 0.18 : 0.12;
          const s = 16;
          ctx.translate(px, py);
          ctx.rotate(this.rot);
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s, 0);
          ctx.closePath();
          ctx.strokeStyle = `rgba(193,39,45,${a * 1.3})`;
          ctx.fillStyle = `rgba(193,39,45,${a})`;
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'hexagon': {
          const a = d ? 0.13 : 0.08;
          const s = 20;
          ctx.translate(px, py);
          ctx.rotate(this.rot);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = (Math.PI / 3) * i - Math.PI / 6;
            i === 0
              ? ctx.moveTo(Math.cos(ang) * s, Math.sin(ang) * s)
              : ctx.lineTo(Math.cos(ang) * s, Math.sin(ang) * s);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(27,94,166,${a})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  let particles = [], nodePtcls = [], arrowPairs = [];

  function build() {
    particles = [];
    nodePtcls = [];
    arrowPairs = [];
    const mobile = window.innerWidth < 768;
    const counts = mobile
      ? { node: 3, badge: 3, diamond: 2, hexagon: 2 }
      : { node: 10, badge: 18, diamond: 7, hexagon: 12 };

    for (const [type, n] of Object.entries(counts)) {
      for (let i = 0; i < n; i++) {
        const p = new Particle(type);
        particles.push(p);
        if (type === 'node') nodePtcls.push(p);
      }
    }

    const maxArrows = mobile ? 2 : 6;
    const used = new Set();
    let attempts = 0;
    while (arrowPairs.length < maxArrows && attempts < 200) {
      const i = Math.floor(Math.random() * nodePtcls.length);
      const j = Math.floor(Math.random() * nodePtcls.length);
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (i !== j && !used.has(key)) {
        used.add(key);
        arrowPairs.push([i, j]);
      }
      attempts++;
    }
  }

  function drawArrows() {
    if (!arrowPairs.length) return;
    const a = isDark() ? 0.12 : 0.08;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -dashOffset;
    ctx.strokeStyle = `rgba(27,94,166,${a})`;
    ctx.lineWidth = 1;
    for (const [i, j] of arrowPairs) {
      const n1 = nodePtcls[i], n2 = nodePtcls[j];
      ctx.beginPath();
      ctx.moveTo(n1.x + smoothPX * n1.pf + 40, n1.y + smoothPY * n1.pf + 17.5);
      ctx.lineTo(n2.x + smoothPX * n2.pf + 40, n2.y + smoothPY * n2.pf + 17.5);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function loop() {
    if (!document.hidden) {
      smoothPX += (targetPX - smoothPX) * 0.05;
      smoothPY += (targetPY - smoothPY) * 0.05;
      dashOffset += 0.4;
      ctx.clearRect(0, 0, W, H);
      drawArrows();
      particles.forEach(p => { p.update(); p.draw(); });
    }
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('mousemove', e => {
    targetPX = e.clientX - window.innerWidth / 2;
    targetPY = e.clientY - window.innerHeight / 2;
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !rafId) loop();
  });

  window.addEventListener('resize', () => { resize(); build(); }, { passive: true });

  function start() { resize(); build(); loop(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
