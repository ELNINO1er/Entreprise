/* =========================================================
   EBURNÉA — interactions & animations (calquées sur la vidéo)
   ========================================================= */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const vh = () => window.innerHeight;
  const absTop = el => el.getBoundingClientRect().top + window.scrollY;

  /* ---------- 1. Titre du hero : lettres une par une ---------- */
  let delay = 0.25;
  $$('.hero__title .split').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach(c => {
      const s = document.createElement('span');
      if (c === ' ') { s.className = 'sp'; }
      else { s.className = 'ch'; s.textContent = c; s.style.animationDelay = delay.toFixed(2) + 's'; delay += 0.035; }
      el.appendChild(s);
    });
    el.setAttribute('aria-label', text);
  });

  /* ---------- 2. Texte flou → net, mot par mot, au rythme du scroll ---------- */
  const blurBlocks = $$('.blur-text').map(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(w => `<span class="w" aria-hidden="true">${w} </span>`).join('');
    const ws = $$('.w', el);
    const auto = el.hasAttribute('data-auto');
    if (auto) ws.forEach((w, i) => setTimeout(() => w.classList.add('on'), 1500 + i * 70));
    return { el, words: ws, auto };
  });
  function updateBlur() {
    blurBlocks.forEach(({ el, words, auto }) => {
      if (auto) return;
      const r = el.getBoundingClientRect();
      const start = vh() * 0.95, end = vh() * 0.42;
      const p = reduce ? 1 : clamp((start - r.top) / (start - end + r.height * 0.5));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  }

  /* ---------- 3. Apparitions au scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const sibs = $$('.reveal', e.target.parentElement);
      const idx = Math.max(0, sibs.indexOf(e.target));
      e.target.style.transitionDelay = Math.min(idx * 0.08, 0.4) + 's';
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Galerie : chaque photo sort du flou, dans un ordre « aléatoire »
  const galImgs = $$('.gallery__row img');
  const order = galImgs.map((_, i) => i).sort((a, b) => ((a * 7) % 11) - ((b * 7) % 11));
  const gio = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    order.forEach((idx, k) => setTimeout(() => galImgs[idx].classList.add('in'), k * 70));
    gio.disconnect();
  }, { threshold: 0.12 });
  gio.observe($('.gallery'));

  /* ---------- 4. En-tête : intégré au hero, puis pilule fixe ---------- */
  const header = $('#header');
  const topblur = $('.topblur');
  const hero = $('.hero__card');
  const burger = $('#burger');
  let headerFixed = false;
  function updateHeader() {
    const limit = hero.offsetHeight - 40;
    const shouldFix = window.scrollY > limit;
    if (shouldFix !== headerFixed) {
      headerFixed = shouldFix;
      if (shouldFix) {
        header.classList.remove('is-leaving');
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
        // remonte en douceur avant de redevenir partie du hero
        header.classList.add('is-leaving');
        setTimeout(() => { if (!headerFixed) header.classList.remove('is-leaving'); }, 340);
      }
      topblur.classList.toggle('on', shouldFix);
    }
  }
  burger.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.nav__link').forEach(a => a.addEventListener('click', () => {
    header.classList.remove('menu-open');
    $$('.nav__link').forEach(l => l.classList.remove('is-active'));
    a.classList.add('is-active');
  }));

  /* ---------- 5. Sections pilotées par le scroll ---------- */
  const progressOf = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / ((r.height - vh()) || 1));
  };

  // 5a. Cartes de projets inclinées : montent à des vitesses différentes,
  //     s'écartent vers les bords et pivotent de plus en plus
  const work = $('.work');
  const workCenter = $('.work__center');
  const mocks = $$('.mock').map(m => ({ el: m, speed: +m.dataset.speed, rot: +m.dataset.rot, dir: +m.dataset.x }));
  // Les cartes défilent un peu plus vite que la page et pivotent
  // davantage à mesure qu'elles montent vers le haut de l'écran.
  mocks.forEach(m => { m.top = m.el.offsetTop; m.h = m.el.offsetHeight; });
  function updateWork() {
    const r = work.getBoundingClientRect();
    mocks.forEach(m => {
      const extra = -(vh() - r.top - m.top) * 0.22;            // parallaxe
      const center = r.top + m.top + m.h / 2 + extra;            // position à l'écran
      const t = clamp(1 - center / vh(), -0.3, 1.3);             // 0 en bas, 1 en haut
      const a = m.rot + m.dir * t * 14;
      const x = m.dir * Math.max(0, t - 0.6) * 4;
      m.el.style.transform = `translate3d(${x}vw, ${extra}px, 0) rotate(${a}deg)`;
    });
  }

  // 5b. Image « Solutions tech » : arrondie → plein écran bord à bord
  const techStage = $('.tech__stage');
  const techMedia = $('#techMedia');
  function updateTech() {
    const r = techStage.getBoundingClientRect();
    // commence à grandir dès qu'elle entre à l'écran, finit à ~75 % de l'épinglage
    const p = clamp((vh() * 0.75 - r.top) / (vh() * 0.75 + (r.height - vh()) * 0.75));
    const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    techMedia.style.setProperty('--p', e.toFixed(4));
  }

  // 5c. Mosaïque de visages : pivote et grossit, puis les tuiles du bas
  //     disparaissent une à une quand la section s'en va
  const webStage = $('.webinar__stage');
  const mosaic = $('#mosaic');
  const faces = $$('.mosaic video');
  // Les vidéos ne se chargent et ne jouent que lorsque la section est visible
  const vio = new IntersectionObserver(es => {
    const on = es[es.length - 1].isIntersecting;
    faces.forEach(v => {
      if (on) { v.preload = 'auto'; v.play().catch(() => {}); }
      else v.pause();
    });
  }, { rootMargin: '300px 0px' });
  if (!reduce) vio.observe($('.webinar__stage'));
  function updateMosaic() {
    const p = progressOf(webStage);
    const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    mosaic.style.setProperty('--r', (e * 45).toFixed(2) + 'deg');
    mosaic.style.setProperty('--s', (1 + e * 0.6).toFixed(3));
    // disparition depuis le bas
    const out = clamp((p - 0.82) / 0.18);
    const line = vh() * (1.05 - out * 0.75);
    faces.forEach(f => {
      const fr = f.getBoundingClientRect();
      f.classList.toggle('gone', out > 0 && fr.top + fr.height * 0.4 > line);
    });
  }

  // 5d. Services : section épinglée, défilement horizontal des cartes
  const services = $('#services');
  const track = $('#track');
  let hDist = 0;
  function sizeServices() {
    const last = track.lastElementChild;
    hDist = Math.max(0, track.scrollWidth - last.offsetWidth - 20);
    services.style.height = (vh() + hDist) + 'px';
  }
  function updateServices() {
    const p = progressOf(services);
    track.style.transform = `translate3d(${-p * hDist}px,0,0)`;
  }
  $('#nextSlide').addEventListener('click', () => {
    const step = track.firstElementChild.offsetWidth + 20;
    window.scrollBy({ top: step, behavior: 'smooth' });
  });

  /* ---------- 6. Boucle de rendu ---------- */
  let ticking = false, lastY = window.scrollY, ringAngle = 0, ringBoost = 0;
  const ring = $('.talk__ring');
  function onScroll() {
    updateHeader();
    updateBlur();
    if (!reduce) { updateWork(); updateTech(); updateMosaic(); }
    updateServices();
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    ringBoost = Math.min(ringBoost + Math.abs(window.scrollY - lastY) * 0.06, 12);
    lastY = window.scrollY;
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', () => {
    mocks.forEach(m => { m.top = m.el.offsetTop; m.h = m.el.offsetHeight; });
    sizeServices(); onScroll();
  });
  window.addEventListener('load', () => { sizeServices(); onScroll(); });
  sizeServices();
  onScroll();

  // Badge « Parlons-en » : rotation continue qui accélère au scroll
  (function spin() {
    if (!reduce) {
      ringAngle += 0.3 + ringBoost;
      ringBoost *= 0.9;
      ring.style.transform = `rotate(${ringAngle}deg)`;
    }
    requestAnimationFrame(spin);
  })();

  /* ---------- 7. Halo qui suit la souris ---------- */
  const blob = $('.cursor-blob');
  // Le halo suit la souris avec retard et « traîne » dans le sens du scroll
  let mx = -300, my = -300, bx = -300, by = -300, vel = 0, prevY = window.scrollY;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; blob.classList.add('on'); });
  document.addEventListener('mouseleave', () => blob.classList.remove('on'));
  (function follow() {
    const dy = window.scrollY - prevY; prevY = window.scrollY;
    vel += (dy - vel) * 0.1;
    const lag = clamp(vel * 9, -180, 180);
    bx += (mx - bx) * 0.08;
    by += (my + lag - by) * 0.08;
    blob.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
    requestAnimationFrame(follow);
  })();

  /* ---------- 8. Interrupteur « osez » : s'allume à l'arrivée ---------- */
  const toggle = $('#toggle');
  toggle.classList.remove('is-on');
  const tio = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { setTimeout(() => toggle.classList.add('is-on'), 500); tio.disconnect(); }
  }, { threshold: 1 });
  tio.observe(toggle);
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-on');
    toggle.setAttribute('aria-pressed', toggle.classList.contains('is-on'));
  });

  // Carte en relief : la première par défaut, puis celle survolée
  const feats = $$('.feature');
  feats[0].classList.add('is-hl');
  feats.forEach(f => f.addEventListener('mouseenter', () => {
    feats.forEach(x => x.classList.remove('is-hl'));
    f.classList.add('is-hl');
  }));
})();
