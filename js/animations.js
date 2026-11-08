function initVaultAnimation() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.timeline({ scrollTrigger: { trigger: '#vault-wrapper', start: 'top top', end: '+=100%', scrub: 1, pin: true } })
    .to('#vault-door-left',  { xPercent: -100, ease: 'power2.inOut' }, 0)
    .to('#vault-door-right', { xPercent:  100, ease: 'power2.inOut' }, 0);
}

function animateMercury(color) {
  gsap.to('#grad-stop-3', { stopColor: color, duration: 0.8 });
  gsap.to('#mercury-blob', { scale: 'random(0.85,1.15)', rotation: 'random(-30,30)', duration: 0.8, ease: 'back.out(1.7)' });
}

function initMetallicCardHovers() {
  document.querySelectorAll('.metallic-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = document.documentElement.classList.contains('dark');
      card.style.background = d
        ? `radial-gradient(circle at ${x}px ${y}px,rgba(217,119,6,0.12) 0%,rgba(17,17,17,1) 60%)`
        : `radial-gradient(circle at ${x}px ${y}px,rgba(217,119,6,0.08) 0%,rgba(255,255,255,1) 60%)`;
    });
    card.addEventListener('mouseleave', () => { card.style.background = ''; });
  });
}
