/* ============================================================
   AF Dépannage – Allanic Fabien
   JavaScript principal
   ============================================================ */

'use strict';

/* ── Sticky Header ────────────────────────────────────────── */
const header = document.getElementById('header');
const onScroll = () => {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ── Mobile Menu ──────────────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

hamburger.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// Close menu when clicking a nav link
nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
    nav.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ── Smooth Scroll for anchor links ──────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const headerHeight = header.offsetHeight;
    const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ── Scroll Reveal Animation ─────────────────────────────── */
const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = el.dataset.delay ? parseInt(el.dataset.delay) : 0;
      setTimeout(() => {
        el.classList.add('revealed');
      }, delay);
      revealObserver.unobserve(el);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -48px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

/* ── Active Nav Link on Scroll ───────────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

const activeSectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${id}`) {
          link.style.color = 'var(--primary)';
          link.style.background = 'var(--primary-xlight)';
        } else {
          link.style.color = '';
          link.style.background = '';
        }
      });
    }
  });
}, {
  threshold: 0.3,
});

sections.forEach(section => activeSectionObserver.observe(section));

/* ── Contact Form ────────────────────────────────────────── */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validation
    let isValid = true;
    const requiredFields = contactForm.querySelectorAll('[required]');

    requiredFields.forEach(field => {
      field.classList.remove('error');
      if (!field.value.trim()) {
        field.classList.add('error');
        isValid = false;
      }
      // Phone basic validation
      if (field.type === 'tel' && field.value.trim()) {
        const cleanPhone = field.value.replace(/[\s\-\.]/g, '');
        if (!/^(\+33|0)[0-9]{9}$/.test(cleanPhone)) {
          field.classList.add('error');
          isValid = false;
        }
      }
    });

    if (!isValid) {
      // Shake animation on invalid
      contactForm.style.animation = 'shake 0.4s ease';
      setTimeout(() => { contactForm.style.animation = ''; }, 400);
      // Focus first invalid field
      const firstError = contactForm.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    // Simulate form submission
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .8s linear infinite">
        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
      </svg>
      Envoi en cours...
    `;

    setTimeout(() => {
      contactForm.style.display = 'none';
      formSuccess.style.display = 'flex';
    }, 1200);
  });

  // Remove error class on input
  contactForm.querySelectorAll('input, textarea, select').forEach(field => {
    field.addEventListener('input', () => field.classList.remove('error'));
  });
}

/* ── Counter animation for hero stats ───────────────────── */
function animateCounter(el, target, suffix = '', duration = 1500) {
  const isDecimal = target % 1 !== 0;
  const start = 0;
  const startTime = performance.now();

  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const statNumbers = entry.target.querySelectorAll('.stat-number');
      statNumbers.forEach(el => {
        const text = el.textContent;
        const match = text.match(/^(\+?)(\d+\.?\d*)(.*)$/);
        if (match) {
          const prefix = match[1];
          const num = parseFloat(match[2]);
          const suffix = match[3];
          el.textContent = prefix + '0' + suffix;
          animateCounter(el, num, suffix, 1200);
          if (prefix) {
            setTimeout(() => { el.textContent = prefix + el.textContent; }, 50);
          }
        }
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

/* ── Floating CTA visibility on mobile ──────────────────── */
const floatingButtons = document.querySelector('.floating-buttons');
let lastScrollY = 0;
let ticking = false;

const handleFloating = () => {
  const scrollY = window.scrollY;
  const heroSection = document.getElementById('hero');
  const heroBottom = heroSection ? heroSection.offsetTop + heroSection.offsetHeight : 300;

  if (scrollY > heroBottom - 100) {
    floatingButtons.style.opacity = '1';
    floatingButtons.style.pointerEvents = 'all';
    floatingButtons.style.transform = 'translateY(0)';
  } else {
    floatingButtons.style.opacity = '0';
    floatingButtons.style.pointerEvents = 'none';
    floatingButtons.style.transform = 'translateY(20px)';
  }

  lastScrollY = scrollY;
  ticking = false;
};

if (floatingButtons) {
  floatingButtons.style.transition = 'opacity .3s ease, transform .3s ease';
  floatingButtons.style.opacity = '0';
  floatingButtons.style.transform = 'translateY(20px)';

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(handleFloating);
      ticking = true;
    }
  }, { passive: true });
  handleFloating();
}

/* ── Water ripple on CTA click ───────────────────────────── */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const circle = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    circle.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:rgba(255,255,255,.35);
      transform:translate(-50%,-50%) scale(0);
      left:${e.clientX - rect.left}px;
      top:${e.clientY - rect.top}px;
      animation:ripple .6s linear;
      pointer-events:none;
    `;
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  });
});

/* ── Add keyframe animations dynamically ────────────────── */
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px); }
    60%      { transform: translateX(-6px); }
    80%      { transform: translateX(6px); }
  }
  @keyframes ripple {
    to { transform: translate(-50%,-50%) scale(4); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

/* ── Parallax subtle effect on hero ─────────────────────── */
const heroVisual = document.querySelector('.hero-card');
if (heroVisual && window.matchMedia('(min-width: 1024px)').matches) {
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    heroVisual.style.transform = `translateY(${scrolled * 0.06}px)`;
  }, { passive: true });
}

/* ── Service card hover ripple ───────────────────────────── */
document.querySelectorAll('.service-card:not(.service-card--cta)').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.background = `radial-gradient(circle at ${x}% ${y}%, #f0f9ff 0%, white 60%)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.background = '';
  });
});

/* ── Preloader ───────────────────────────────────────────── */
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  // Trigger hero animations immediately
  document.querySelectorAll('.hero .reveal-up, .hero .reveal-right').forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), i * 100);
  });
});
