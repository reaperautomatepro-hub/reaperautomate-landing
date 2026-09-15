'use strict';

(() => {
  const demos = [...document.querySelectorAll('[data-scale-demo]')];
  if (!demos.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const automatic = () => !motion.matches && !connection?.saveData;
  const controllers = [];

  demos.forEach((demo) => {
    const video = demo.querySelector('.scale-demo-video');
    const button = demo.querySelector('.scale-demo-toggle');
    const label = button.querySelector('.scale-demo-label');
    const icon = button.querySelector('.scale-demo-icon');
    const status = demo.querySelector('.scale-demo-status');
    const phone = demo.querySelector('.phone-shell');
    let near = false;
    let visible = false;
    let intent = null;
    let loaded = false;
    let failed = false;
    let pending = false;
    let attempt = 0;
    video.muted = true;
    button.hidden = false;

    const requested = () => intent === 'play' || (intent !== 'pause' && automatic());
    const shouldPlay = () => visible && !document.hidden && requested() && !failed;
    const render = () => {
      const playing = pending || !video.paused;
      label.textContent = playing ? 'Pausar demonstração' : 'Reproduzir demonstração';
      icon.textContent = playing ? 'Ⅱ' : '▶';
    };
    const load = () => {
      if (loaded || failed) return;
      video.src = video.dataset.src;
      video.load();
      loaded = true;
    };
    const pause = () => {
      attempt += 1;
      pending = false;
      video.pause();
      render();
    };
    const sync = () => {
      if (near && requested() && !document.hidden) load();
      if (!shouldPlay()) { pause(); return; }
      if (pending || !video.paused) return;
      load();
      pending = true;
      const currentAttempt = ++attempt;
      render();
      const result = video.play();
      if (!result?.then) { pending = false; render(); return; }
      result.then(() => {
        if (currentAttempt !== attempt) return;
        pending = false;
        if (!shouldPlay()) video.pause();
        render();
      }).catch((error) => {
        if (currentAttempt !== attempt) return;
        pending = false;
        if (error.name !== 'AbortError') intent = 'pause';
        render();
      });
    };

    button.addEventListener('click', () => {
      if (failed) return;
      if (pending || !video.paused) intent = 'pause';
      else intent = 'play';
      sync();
    });
    video.addEventListener('playing', () => {
      if (!shouldPlay()) { pause(); return; }
      demo.classList.add('has-started');
      render();
    });
    video.addEventListener('pause', render);
    video.addEventListener('error', () => {
      failed = true;
      pause();
      demo.classList.add('is-unavailable');
      button.hidden = true;
      status.textContent = 'Vídeo indisponível. A imagem do player continua aqui.';
    });

    if ('IntersectionObserver' in window) {
      const nearby = new IntersectionObserver((entries) => {
        near = entries[0].isIntersecting;
        sync();
      }, { rootMargin: '200px 0px' });
      const viewport = new IntersectionObserver((entries) => {
        const entry = entries[0];
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        sync();
      }, { threshold: [0, 0.15] });
      nearby.observe(phone);
      viewport.observe(phone);
    } else {
      const measure = () => {
        const rect = phone.getBoundingClientRect();
        near = rect.bottom > -200 && rect.top < window.innerHeight + 200;
        visible = rect.bottom > 0 && rect.top < window.innerHeight;
        sync();
      };
      window.addEventListener('scroll', measure, { passive: true });
      window.addEventListener('resize', measure);
      measure();
    }
    controllers.push({ sync, preferencesChanged() {
      if (!automatic()) {
        intent = null;
        demo.classList.remove('has-started');
      }
      sync();
    } });
  });
  document.addEventListener('visibilitychange', () => controllers.forEach((item) => item.sync()));
  motion.addEventListener('change', () => controllers.forEach((item) => item.preferencesChanged()));
  connection?.addEventListener('change', () => controllers.forEach((item) => item.preferencesChanged()));
})();
