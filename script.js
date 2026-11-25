/**
 * MY Place Guest House Ho
 * Navigation, reveal animations, stay estimator & WhatsApp booking
 */

(() => {
  'use strict';

  const WHATSAPP_NUMBER = '233551806312';
  const ROOMS = {
    standard: { name: 'Standard Cozy Room', rate: 450 },
    executive: { name: 'Executive Queen Suite', rate: 620 },
    deluxe: { name: 'Deluxe Twin / Family Suite', rate: 850 }
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const header = $('#siteHeader');
  const nav = $('#siteNav');
  const navToggle = $('#navToggle');

  // Quick bar (hero)
  const quickForm = $('#quickForm');
  const quickCheckIn = $('#quickCheckIn');
  const quickCheckOut = $('#quickCheckOut');
  const quickRoom = $('#quickRoom');

  // Estimator
  const stayRoom = $('#stayRoom');
  const stayCheckIn = $('#stayCheckIn');
  const stayCheckOut = $('#stayCheckOut');
  const stayGuests = $('#stayGuests');
  const bookWhatsApp = $('#bookWhatsApp');

  // Summary outputs
  const sumRoom = $('#sumRoom');
  const sumCheckIn = $('#sumCheckIn');
  const sumCheckOut = $('#sumCheckOut');
  const sumGuests = $('#sumGuests');
  const sumRate = $('#sumRate');
  const sumNights = $('#sumNights');
  const sumTotal = $('#sumTotal');
  const sumBreakdown = $('#sumBreakdown');

  /* ---- Utilities ---- */
  const pad = (n) => String(n).padStart(2, '0');
  const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (value) => {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };
  const formatDate = (value) => {
    const d = parseDate(value);
    if (!d) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const formatGHS = (amount) => `GHS ${Number(amount).toLocaleString('en-GH')}`;
  const calcNights = (checkIn, checkOut) => {
    const a = parseDate(checkIn);
    const b = parseDate(checkOut);
    if (!a || !b) return 0;
    const diff = Math.round((b - a) / 86400000);
    return diff > 0 ? diff : 0;
  };
  const getRoom = (key) => ROOMS[key] || ROOMS.standard;

  /* ---- Date defaults ---- */
  function setDefaultDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = toISODate(today);
    const tomorrowStr = toISODate(tomorrow);

    [quickCheckIn, stayCheckIn].forEach((el) => {
      el.min = todayStr;
      if (!el.value) el.value = todayStr;
    });
    [quickCheckOut, stayCheckOut].forEach((el) => {
      el.min = tomorrowStr;
      if (!el.value) el.value = tomorrowStr;
    });
  }

  function syncCheckoutMin(sourceCheckIn, targetCheckOut) {
    const checkIn = parseDate(sourceCheckIn.value);
    if (!checkIn) return;
    const minOut = new Date(checkIn);
    minOut.setDate(minOut.getDate() + 1);
    const minStr = toISODate(minOut);
    targetCheckOut.min = minStr;
    const currentOut = parseDate(targetCheckOut.value);
    if (!currentOut || currentOut <= checkIn) {
      targetCheckOut.value = minStr;
    }
  }

  /* ---- Sync quick bar <-> estimator ---- */
  function syncFromQuick() {
    stayRoom.value = quickRoom.value;
    stayCheckIn.value = quickCheckIn.value;
    stayCheckOut.min = quickCheckOut.min;
    stayCheckOut.value = quickCheckOut.value;
    syncCheckoutMin(stayCheckIn, stayCheckOut);
    updateSummary();
  }

  function syncFromEstimator() {
    quickRoom.value = stayRoom.value;
    quickCheckIn.value = stayCheckIn.value;
    quickCheckOut.min = stayCheckOut.min;
    quickCheckOut.value = stayCheckOut.value;
  }

  /* ---- Summary / cost ---- */
  function updateSummary() {
    const room = getRoom(stayRoom.value);
    const checkIn = stayCheckIn.value;
    const checkOut = stayCheckOut.value;
    const guests = parseInt(stayGuests.value, 10) || 1;
    const nights = calcNights(checkIn, checkOut);
    const total = nights * room.rate;

    sumRoom.textContent = room.name;
    sumCheckIn.textContent = formatDate(checkIn);
    sumCheckOut.textContent = formatDate(checkOut);
    sumGuests.textContent = `${guests} Guest${guests > 1 ? 's' : ''}`;
    sumRate.textContent = formatGHS(room.rate);
    sumNights.textContent = String(nights);
    sumTotal.textContent = formatGHS(total);

    if (nights > 0) {
      sumBreakdown.textContent = `${nights} night${nights > 1 ? 's' : ''} × ${formatGHS(room.rate)} per night`;
    } else if (checkIn && checkOut) {
      sumBreakdown.textContent = 'Check-out must be after check-in';
    } else {
      sumBreakdown.textContent = 'Select your dates to see your total';
    }

    // Keep quick bar in step when estimator is the source of truth
    syncFromEstimator();
  }

  /* ---- WhatsApp message ---- */
  function buildBookingMessage(source) {
    const room = getRoom(source.room);
    const checkIn = source.checkIn;
    const checkOut = source.checkOut;
    const guests = parseInt(source.guests, 10) || 2;
    const nights = calcNights(checkIn, checkOut);
    const hasDates = nights > 0;
    const total = nights * room.rate;

    const lines = [
      'Hello MY Place Guest House Ho,',
      '',
      "I'd like to request a room reservation.",
      '',
      `Room: ${room.name}`,
      `Check-in: ${hasDates ? formatDate(checkIn) : 'To be confirmed'}`,
      `Check-out: ${hasDates ? formatDate(checkOut) : 'To be confirmed'}`,
      `Guests: ${guests}`,
      `Nights: ${hasDates ? nights : 'To be confirmed'}`,
      `Estimated total: ${hasDates ? formatGHS(total) : formatGHS(room.rate) + ' per night'}`,
      '',
      'Please let me know availability and the next steps. Thank you!'
    ];

    return lines.join('\n');
  }

  function openWhatsApp(message) {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  }

  /* ---- Event wiring ---- */
  function bindEvents() {
    // Header scroll
    const onScroll = () => {
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile nav
    if (navToggle && nav) {
      navToggle.addEventListener('click', () => {
        const open = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!open));
        nav.classList.toggle('is-open', !open);
      });

      $$('#siteNav a').forEach((a) => {
        a.addEventListener('click', () => {
          navToggle.setAttribute('aria-expanded', 'false');
          nav.classList.remove('is-open');
        });
      });

      document.addEventListener('click', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (nav.contains(e.target) || navToggle.contains(e.target)) return;
        navToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
          navToggle.setAttribute('aria-expanded', 'false');
          nav.classList.remove('is-open');
          navToggle.focus();
        }
      });
    }

    // Quick bar changes -> estimator
    quickCheckIn.addEventListener('change', () => {
      syncCheckoutMin(quickCheckIn, quickCheckOut);
      syncFromQuick();
    });
    quickCheckOut.addEventListener('change', syncFromQuick);
    quickRoom.addEventListener('change', syncFromQuick);

    quickForm.addEventListener('submit', (e) => {
      e.preventDefault();
      syncFromQuick();
      openWhatsApp(buildBookingMessage({
        room: quickRoom.value,
        checkIn: quickCheckIn.value,
        checkOut: quickCheckOut.value,
        guests: stayGuests.value
      }));
    });

    // Estimator changes
    stayCheckIn.addEventListener('change', () => {
      syncCheckoutMin(stayCheckIn, stayCheckOut);
      updateSummary();
    });
    stayCheckOut.addEventListener('change', updateSummary);
    stayRoom.addEventListener('change', updateSummary);
    stayGuests.addEventListener('change', updateSummary);

    bookWhatsApp.addEventListener('click', () => {
      updateSummary();
      openWhatsApp(buildBookingMessage({
        room: stayRoom.value,
        checkIn: stayCheckIn.value,
        checkOut: stayCheckOut.value,
        guests: stayGuests.value
      }));
    });

    // Room card "Reserve This Room" buttons
    $$('.reserve-room').forEach((btn) => {
      btn.addEventListener('click', () => {
        const room = btn.dataset.room;
        if (room && ROOMS[room]) {
          stayRoom.value = room;
          quickRoom.value = room;
          updateSummary();
        }
        const target = $('#reserve');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Subtle focus for accessibility after scroll settles
          window.setTimeout(() => {
            stayCheckIn.focus({ preventScroll: true });
          }, 450);
        }
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  function initReveal() {
    const reveals = $$('.reveal');
    if (!reveals.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach((el) => observer.observe(el));
  }

  /* ---- Image fallbacks ---- */
  function initImageFallbacks() {
    $$('img[data-fallback]').forEach((img) => {
      img.addEventListener('error', () => {
        const fallback = img.getAttribute('data-fallback');
        if (!fallback || img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = 'true';
        img.src = fallback;
      }, { once: false });
    });
  }

  /* ---- Footer year ---- */
  function setYear() {
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---- Init ---- */
  function init() {
    setDefaultDates();
    syncCheckoutMin(quickCheckIn, quickCheckOut);
    syncCheckoutMin(stayCheckIn, stayCheckOut);
    // Ensure estimator reflects initial state
    syncFromQuick();
    updateSummary();
    bindEvents();
    initReveal();
    initImageFallbacks();
    setYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
