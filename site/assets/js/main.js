/* Vérto (projeto conceptual ConectaWeb) — interações partilhadas por todas as páginas */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => matchMedia('(max-width: 820px)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  // sem número: o WhatsApp abre com a mensagem pronta e não aponta para nenhum contacto real
  const waLink = (msg) => `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  // experiência narrativa: cada visita começa no topo (exceto links com âncora)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------------------------------------------------- transição de página */
  const veil = $('.page-veil');
  if (veil) {
    requestAnimationFrame(() => setTimeout(() => veil.classList.add('is-out'), reduced ? 0 : 280));
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || reduced) return;
      const url = new URL(a.href, location.href);
      const internal = url.origin === location.origin && !a.target && !a.hasAttribute('download');
      const samePage = url.pathname === location.pathname;
      if (!internal || samePage || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      veil.classList.remove('is-out');
      veil.classList.add('is-in');
      setTimeout(() => { location.href = a.href; }, 560);
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) { veil.classList.remove('is-in'); veil.classList.add('is-out'); } });
  }

  /* ---------------------------------------------------- scroll suave (Lenis) */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollTo = (target, offset = 0) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    document.body.classList.remove('menu-open');
    scrollTo(el);
  }));

  /* ---------------------------------------------------- header + menu */
  const header = $('.site-header');
  const mcta = $('.mobile-cta');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 30);
    mcta?.classList.toggle('is-visible', y > innerHeight * 0.7);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('.burger')?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    $('.burger').setAttribute('aria-expanded', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    lenis?.start();
  }));

  /* ---------------------------------------------------- ano */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------------------------------------------------- botões magnéticos */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18, y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = `translate(${x}px, ${y}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  if (!hasGSAP) return;

  /* ---------------------------------------------------- títulos palavra a palavra */
  $$('[data-split]').forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.tagName === 'EM') {
            const w = document.createElement('span');
            w.className = 'w';
            n.replaceWith(w);
            const i = document.createElement('span');
            i.appendChild(n);
            w.appendChild(i);
          } else walk(n);
        }
      });
    };
    walk(el);
    if (reduced) return;
    const words = $$('.w > span', el);
    const hero = el.closest('.hero, .page-hero');
    gsap.from(words, {
      yPercent: 115, rotateX: -55, opacity: 0, duration: 1.15, ease: 'expo.out', stagger: 0.055,
      delay: hero ? 0.55 : 0,
      scrollTrigger: hero ? undefined : { trigger: el, start: 'top 85%' },
    });
  });

  /* ---------------------------------------------------- reveals */
  if (!reduced) {
    $$('[data-reveal]').forEach((el) => {
      const hero = el.closest('.hero, .page-hero');
      gsap.from(el, {
        y: 36, opacity: 0, duration: 1.1, ease: 'expo.out',
        delay: hero ? 0.9 + (+el.dataset.reveal || 0) * 0.12 : (+el.dataset.reveal || 0) * 0.08,
        scrollTrigger: hero ? undefined : { trigger: el, start: 'top 88%' },
      });
    });
    $$('[data-stagger]').forEach((wrap) => {
      gsap.from(wrap.children, {
        y: 44, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: wrap, start: 'top 85%' },
      });
    });
    $$('[data-parallax]').forEach((el) => {
      gsap.fromTo(el, { yPercent: -(+el.dataset.parallax || 8) }, {
        yPercent: +el.dataset.parallax || 8, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
    // revelação com recorte que se abre (banner de desporto)
    $$('[data-clip]').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(12% 9% 12% 9% round 48px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 25%', scrub: true },
      });
    });
    // passos da abordagem: linha de progresso
    $$('.steps li').forEach((li, i) => {
      gsap.from(li, { x: 40, opacity: 0, duration: 1, ease: 'expo.out', delay: i * 0.1, scrollTrigger: { trigger: li, start: 'top 88%' } });
    });
  }

  /* ---------------------------------------------------- contadores */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const fmt = (v) => v.toFixed(dec).replace('.', ',');
    if (reduced) { el.textContent = fmt(end); return; }
    const o = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'expo.out',
      onUpdate: () => { el.textContent = fmt(o.v); },
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  /* ---------------------------------------------------- mapa da dor */
  const map = $('.map-sec');
  if (map) {
    const tabs = $$('.map-tabs button', map);
    const panels = $$('.map-panel', map);
    const steps = $$('.map-steps > div', map);
    const bars = $$('.map-progress b', map);
    let active = -1;
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      tabs.forEach((t, k) => t.setAttribute('aria-selected', k === i));
      panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
    };
    setActive(0);
    ScrollTrigger.create({
      trigger: map, start: 'top top', end: 'bottom bottom',
      onUpdate: (st) => {
        const p = st.progress * steps.length;
        // mesma regra do motor 3D: a etapa ativa é a mais próxima do centro do ecrã
        let i = 0, best = Infinity;
        steps.forEach((el, k) => {
          const r = el.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
          if (d < best) { best = d; i = k; }
        });
        setActive(i);
        bars.forEach((b, k) => gsap.set(b, { scaleX: Math.min(1, Math.max(0, p - k)) }));
      },
    });
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      const r = steps[i].getBoundingClientRect();
      scrollTo(window.scrollY + r.top + r.height / 2 - innerHeight / 2);
    }));
  }

  /* ---------------------------------------------------- testemunhos em 3D */
  const track = $('.reviews-track');
  if (track && !reduced) {
    const cards = $$('.review', track);
    const tilt = () => {
      const cx = innerWidth / 2;
      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        const d = (r.left + r.width / 2 - cx) / innerWidth;
        gsap.set(c, { transformPerspective: 1400, rotateY: d * -16, z: -Math.abs(d) * 70, opacity: 1 - Math.min(0.4, Math.abs(d) * 0.45) });
      });
    };
    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', () => {
      const dist = () => track.scrollWidth - innerWidth + 40;
      const tw = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.reviews-pin', start: 'center center', end: () => '+=' + dist(),
          pin: true, scrub: 0.6, invalidateOnRefresh: true, onUpdate: tilt,
        },
      });
      tilt();
      return () => tw.kill();
    });
    mm.add('(max-width: 820px)', () => {
      track.addEventListener('scroll', tilt, { passive: true });
      tilt();
      return () => track.removeEventListener('scroll', tilt);
    });
  }

  /* ---------------------------------------------------- tratamentos: imagem fixa */
  const txStage = $('.tx-stage');
  if (txStage) {
    const figs = $$('figure', txStage);
    $$('.tx-item').forEach((item, i) => {
      ScrollTrigger.create({
        trigger: item, start: 'top 55%', end: 'bottom 55%',
        onToggle: (st) => {
          if (!st.isActive) return;
          $$('.tx-item').forEach((x) => x.classList.toggle('is-active', x === item));
          figs.forEach((f, k) => f.classList.toggle('is-active', k === i));
        },
      });
    });
  }

  /* ---------------------------------------------------- linha da 1.ª consulta */
  const jbar = $('.journey .bar');
  if (jbar && !reduced) {
    gsap.to(jbar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.journey', start: 'top 80%', end: 'bottom 55%', scrub: true } });
    gsap.from('.jstep', { y: 30, opacity: 0, stagger: 0.15, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.journey', start: 'top 80%' } });
  }

  /* ---------------------------------------------------- benefícios (texto que preenche) */
  $$('.benefit').forEach((b) => {
    if (reduced) { b.style.backgroundPosition = '0 0'; return; }
    gsap.to(b, { backgroundPosition: '0% 0', ease: 'none', scrollTrigger: { trigger: b, start: 'top 80%', end: 'top 40%', scrub: true } });
  });

  /* ---------------------------------------------------- cartões com inclinação */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.inj, .value').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(c, { rotateY: x * 10, rotateX: -y * 10, transformPerspective: 900, duration: 0.5, ease: 'power3.out' });
      });
      c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'expo.out' }));
    });
  }

  /* ---------------------------------------------------- construtor de mensagem WhatsApp */
  const builder = $('#builder');
  if (builder) {
    const out = $('#preview');
    const btn = $('#send');
    const build = () => {
      const fd = new FormData(builder);
      const nome = (fd.get('nome') || '').toString().trim();
      const motivo = fd.get('motivo');
      const periodo = fd.get('periodo');
      const nota = (fd.get('nota') || '').toString().trim();
      let msg = `Olá${nome ? `, sou ${nome}` : ''}! `;
      msg += motivo === 'Outro' ? 'Gostaria de marcar uma consulta.' : `Gostaria de marcar uma consulta — motivo: ${motivo.toLowerCase()}.`;
      if (periodo && periodo !== 'Indiferente') msg += `\nPreferência de horário: ${periodo.toLowerCase()}.`;
      if (nota) msg += `\n${nota}`;
      msg += '\nQual a próxima disponibilidade?';
      out.textContent = msg;
      btn.href = waLink(msg);
    };
    builder.addEventListener('input', build);
    builder.addEventListener('change', build);
    builder.addEventListener('submit', (e) => { e.preventDefault(); window.open(btn.href, '_blank', 'noopener'); });
    build();
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
