// Mobile nav toggle
const header = document.querySelector(".site-header");
const navToggle = document.getElementById("nav-toggle");

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Cookie consent — GDPR/ePrivacy: no non-essential cookies/scripts run
// before explicit, granular, freely given consent (reject is as easy as accept).
const CONSENT_STORAGE_KEY = "webys_cookie_consent";
const CONSENT_VERSION = 1;

const cookieBanner = document.getElementById("cookie-banner");
const cookieModalOverlay = document.getElementById("cookie-modal-overlay");
const analyticsToggle = document.getElementById("consent-analytics");
const marketingToggle = document.getElementById("consent-marketing");

function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeConsent(analytics, marketing) {
  const consent = {
    necessary: true,
    analytics,
    marketing,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  // Any future analytics/marketing script should listen for this event
  // instead of running unconditionally, so nothing loads without consent.
  document.dispatchEvent(new CustomEvent("webys:consent-changed", { detail: consent }));
  return consent;
}

function applyConsentToToggles(consent) {
  if (!analyticsToggle || !marketingToggle) return;
  analyticsToggle.checked = Boolean(consent && consent.analytics);
  marketingToggle.checked = Boolean(consent && consent.marketing);
}

function showBanner() {
  if (cookieBanner) cookieBanner.hidden = false;
}

function hideBanner() {
  if (cookieBanner) cookieBanner.hidden = true;
}

function openModal() {
  const consent = readConsent();
  applyConsentToToggles(consent);
  if (cookieModalOverlay) cookieModalOverlay.hidden = false;
}

function closeModal() {
  if (cookieModalOverlay) cookieModalOverlay.hidden = true;
}

const existingConsent = readConsent();
if (!existingConsent || existingConsent.version !== CONSENT_VERSION) {
  showBanner();
} else {
  document.dispatchEvent(new CustomEvent("webys:consent-changed", { detail: existingConsent }));
}

document.getElementById("cookie-accept")?.addEventListener("click", () => {
  writeConsent(true, true);
  hideBanner();
});

document.getElementById("cookie-reject")?.addEventListener("click", () => {
  writeConsent(false, false);
  hideBanner();
});

document.getElementById("cookie-reject-modal")?.addEventListener("click", () => {
  writeConsent(false, false);
  hideBanner();
  closeModal();
});

document.getElementById("cookie-settings")?.addEventListener("click", openModal);
document.getElementById("open-cookie-settings")?.addEventListener("click", openModal);

document.getElementById("cookie-save")?.addEventListener("click", () => {
  writeConsent(Boolean(analyticsToggle?.checked), Boolean(marketingToggle?.checked));
  hideBanner();
  closeModal();
});

document.getElementById("cookie-modal-close")?.addEventListener("click", closeModal);

cookieModalOverlay?.addEventListener("click", (event) => {
  if (event.target === cookieModalOverlay) closeModal();
});

document.getElementById("open-cookie-details")?.addEventListener("click", () => {
  openModal();
  document.getElementById("cookie-details-panel")?.setAttribute("open", "");
  document.getElementById("cookie-details-panel")?.scrollIntoView({ block: "nearest" });
});

// Contact form -> submits to Formspree so it lands directly in the inbox,
// no mailto redirect and no page reload.
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
const FORM_STATUS_DEFAULT = formStatus ? formStatus.textContent : "";

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn = contactForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    if (formStatus) {
      formStatus.textContent = "Odesílám…";
      formStatus.classList.remove("form-note-error", "form-note-ok");
    }

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        contactForm.reset();
        if (formStatus) {
          formStatus.textContent = "Díky! Poptávka je odeslaná, ozvu se co nejdřív.";
          formStatus.classList.add("form-note-ok");
        }
      } else {
        throw new Error("Formspree response not ok");
      }
    } catch {
      if (formStatus) {
        formStatus.textContent = "Odeslání se nepovedlo. Napište mi prosím přímo na webyswebys@gmail.com.";
        formStatus.classList.add("form-note-error");
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Floating "network" background in the hero — dots drifting slowly and
// connecting with thin lines when close, like a loose spider web.
const canvas = document.getElementById("network-bg");

if (canvas && canvas.getContext) {
  const ctx = canvas.getContext("2d");
  const hero = canvas.closest(".hero");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let nodes = [];

  const LINK_DISTANCE = 140;
  const NODE_COLOR = "124, 58, 237"; // purple
  const LINE_COLOR = "124, 58, 237";

  function nodeCountFor(area) {
    return Math.min(70, Math.max(24, Math.round(area / 18000)));
  }

  function createNodes() {
    const count = nodeCountFor(width * height);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 1,
    }));
  }

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createNodes();
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    // move + draw nodes
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
      n.x = Math.max(0, Math.min(width, n.x));
      n.y = Math.max(0, Math.min(height, n.y));

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${NODE_COLOR}, 0.55)`;
      ctx.fill();
    });

    // draw connecting lines between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < LINK_DISTANCE) {
          const opacity = (1 - dist / LINK_DISTANCE) * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${LINE_COLOR}, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (!prefersReducedMotion) {
      requestAnimationFrame(step);
    }
  }

  resize();
  step();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });
}
