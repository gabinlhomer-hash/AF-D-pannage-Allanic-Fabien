/* ============================================================
   AF Dépannage – Chatbot de lead capture
   Conversation guidée → appel ou rappel téléphonique
   ============================================================ */

'use strict';

/* ── Scénarios de conversation ──────────────────────────────
   Chaque nœud :
   - message  : texte affiché par le bot
   - replies  : boutons de réponse rapide
   - type     : comportement spécial (phone_input, call_direct, success)
   - delay    : délai de frappe simulé (ms)
   ─────────────────────────────────────────────────────────── */
const FLOW = {

  welcome: {
    message: "Bonjour 👋 Je suis l'assistant de <strong>Fabien Allanic</strong>, plombier à Locminé. Comment puis-je vous aider ?",
    delay: 800,
    replies: [
      { label: "💧 Fuite d'eau",        next: "fuite",        cls: "urgent" },
      { label: "🚨 Dépannage urgent",    next: "urgence",      cls: "urgent" },
      { label: "🔧 Installation",        next: "installation"               },
      { label: "🏠 Rénovation",          next: "renovation"                 },
      { label: "❓ Autre question",      next: "autre"                      },
    ]
  },

  fuite: {
    message: "Une fuite peut vite causer des dégâts. C'est urgent pour vous en ce moment ?",
    delay: 700,
    replies: [
      { label: "⚡ Oui, très urgent !",     next: "fuite_urgent", cls: "urgent" },
      { label: "Non, ça peut attendre",     next: "lead_name" },
    ]
  },

  fuite_urgent: {
    message: "Je comprends, on agit vite. Fabien peut généralement être chez vous <strong>en moins d'1h</strong>. Comment voulez-vous le contacter ?",
    delay: 800,
    replies: [
      { label: "📞 Appeler maintenant",     next: "call_direct", cls: "urgent" },
      { label: "📲 Me faire rappeler",      next: "lead_name"                  },
    ]
  },

  urgence: {
    message: "Pas de panique ! Fabien est <strong>disponible 7j/7</strong> et intervient rapidement sur Locminé et tout le Morbihan.",
    delay: 700,
    replies: [
      { label: "📞 Appeler maintenant",      next: "call_direct", cls: "urgent" },
      { label: "Je préfère être rappelé",    next: "lead_name"                  },
    ]
  },

  installation: {
    message: "Pour une installation, Fabien établit un <strong>devis gratuit et sans engagement</strong>. De quel équipement s'agit-il ?",
    delay: 750,
    replies: [
      { label: "WC / Lavabo",            next: "lead_name" },
      { label: "Douche / Baignoire",     next: "lead_name" },
      { label: "Chauffe-eau",            next: "lead_name" },
      { label: "Autre",                  next: "lead_name" },
    ]
  },

  renovation: {
    message: "Super projet ! Fabien réalise des rénovations de salle de bain complètes avec devis gratuit. Votre projet est pour quand ?",
    delay: 750,
    replies: [
      { label: "🔜 Bientôt (< 3 mois)",     next: "lead_name" },
      { label: "📅 Dans 3 à 6 mois",         next: "lead_name" },
      { label: "Je veux juste un devis",      next: "lead_name" },
    ]
  },

  autre: {
    message: "Pas de souci ! Laissez-moi vos coordonnées et Fabien vous répond personnellement dans la journée.",
    delay: 650,
    replies: [
      { label: "📞 Je préfère appeler",       next: "call_direct" },
      { label: "Laisser mon numéro",          next: "lead_name"   },
    ]
  },

  /* ── Appel direct ─────────────────────────────────────── */
  call_direct: {
    type: "call_direct",
    message: "Parfait ! Appuyez sur le bouton pour joindre Fabien directement 👇",
    delay: 500,
  },

  /* ── Collecte du prénom ───────────────────────────────── */
  lead_name: {
    message: "Pour que Fabien puisse vous rappeler, quel est votre prénom ?",
    delay: 650,
    type: "name_input",
  },

  /* ── Collecte du téléphone ────────────────────────────── */
  lead_phone: {
    message: "Merci {name} ! 🙌 Et votre numéro de téléphone ?",
    delay: 500,
    type: "phone_input",
  },

  /* ── Succès ───────────────────────────────────────────── */
  success: {
    type: "success",
    delay: 400,
  },

};

/* ── Numéro de téléphone de l'artisan ────────────────────── */
const PHONE_NUMBER     = "tel:+33XXXXXXXXX";
const WHATSAPP_NUMBER  = "https://wa.me/33XXXXXXXXX";

/* ── État global de la conversation ─────────────────────── */
const state = {
  currentNode: "welcome",
  userName: "",
  open: false,
  started: false,
};

/* ── DOM references ─────────────────────────────────────── */
let toggleBtn, widget, messagesEl, proactiveBubble;

/* ════════════════════════════════════════════════════════════
   Initialisation
   ════════════════════════════════════════════════════════════ */
function initChatbot() {
  // Build DOM
  buildChatDOM();
  attachEvents();

  // Show proactive bubble after 5s
  setTimeout(showProactiveBubble, 5000);
}

/* ── Construction du DOM ────────────────────────────────── */
function buildChatDOM() {
  // Proactive bubble
  proactiveBubble = el("div", "chat-bubble-proactive hidden");
  proactiveBubble.innerHTML = `<strong>Besoin d'un plombier ?</strong>Je réponds en quelques secondes 👋`;
  proactiveBubble.addEventListener("click", openChat);
  document.body.appendChild(proactiveBubble);

  // Toggle button
  toggleBtn = el("button", "chat-toggle");
  toggleBtn.setAttribute("aria-label", "Ouvrir le chat");
  toggleBtn.innerHTML = `
    <span class="notif-badge">1</span>
    <svg class="icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
    <svg class="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `;
  document.body.appendChild(toggleBtn);

  // Chat widget
  widget = el("div", "chat-widget");
  widget.innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar">🔧</div>
      <div class="chat-header-info">
        <span class="chat-header-name">Assistant AF Dépannage</span>
        <span class="chat-header-status">En ligne maintenant</span>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-footer">
      <p class="chat-footer-note">💬 Conversation avec Fabien Allanic · Plombier Locminé</p>
    </div>
  `;
  document.body.appendChild(widget);

  messagesEl = document.getElementById("chatMessages");
}

/* ── Événements ─────────────────────────────────────────── */
function attachEvents() {
  toggleBtn.addEventListener("click", () => {
    if (state.open) closeChat();
    else openChat();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open) closeChat();
  });
}

/* ── Ouvrir / Fermer ────────────────────────────────────── */
function openChat() {
  state.open = true;
  widget.classList.add("open");
  toggleBtn.classList.add("open");
  hideProactiveBubble();

  // Remove badge
  const badge = toggleBtn.querySelector(".notif-badge");
  if (badge) {
    badge.style.animation = "none";
    badge.style.transform = "scale(0)";
    setTimeout(() => badge.remove(), 300);
  }

  // Start conversation only once
  if (!state.started) {
    state.started = true;
    setTimeout(() => showNode("welcome"), 350);
  }
}

function closeChat() {
  state.open = false;
  widget.classList.remove("open");
  toggleBtn.classList.remove("open");
}

/* ── Bulle proactive ────────────────────────────────────── */
function showProactiveBubble() {
  if (state.open || state.started) return;
  proactiveBubble.classList.remove("hidden");
}
function hideProactiveBubble() {
  proactiveBubble.classList.add("hidden");
}

/* ════════════════════════════════════════════════════════════
   Moteur de conversation
   ════════════════════════════════════════════════════════════ */

function showNode(nodeKey) {
  const node = FLOW[nodeKey];
  if (!node) return;
  state.currentNode = nodeKey;

  const delay = node.delay || 700;

  // --- Typing indicator
  const typingEl = createTyping();
  messagesEl.appendChild(typingEl);
  scrollToBottom();

  // --- After delay: show message
  setTimeout(() => {
    typingEl.remove();

    // Resolve message (replace {name})
    if (node.message) {
      const text = node.message.replace("{name}", state.userName || "");
      appendBotMessage(text);
    }

    // Behavior based on type
    switch (node.type) {
      case "call_direct":
        renderCallButtons();
        break;
      case "name_input":
        renderNameInput(nodeKey);
        break;
      case "phone_input":
        renderPhoneInput();
        break;
      case "success":
        renderSuccess();
        break;
      default:
        if (node.replies && node.replies.length > 0) {
          setTimeout(() => renderReplies(node.replies), 200);
        }
    }

    scrollToBottom();
  }, delay);
}

/* ── Messages ───────────────────────────────────────────── */
function appendBotMessage(text) {
  const wrap = el("div", "msg bot");
  wrap.innerHTML = `
    <div class="msg-avatar">🔧</div>
    <div class="msg-bubble">${text}</div>
  `;
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

function appendUserMessage(text) {
  const wrap = el("div", "msg user");
  wrap.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>`;
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

/* ── Quick replies ──────────────────────────────────────── */
function renderReplies(replies) {
  // Remove previous reply containers
  removePreviousReplies();

  const container = el("div", "chat-replies");
  replies.forEach(r => {
    const btn = el("button", `reply-btn ${r.cls || ""}`);
    btn.textContent = r.label;
    btn.addEventListener("click", () => {
      container.remove();
      appendUserMessage(r.label);
      setTimeout(() => showNode(r.next), 300);
    });
    container.appendChild(btn);
  });
  messagesEl.appendChild(container);
  scrollToBottom();
}

/* ── Boutons d'appel ────────────────────────────────────── */
function renderCallButtons() {
  removePreviousReplies();
  const container = el("div", "chat-replies");
  container.style.flexDirection = "column";
  container.style.gap = "8px";

  const callBtn = document.createElement("a");
  callBtn.href = PHONE_NUMBER;
  callBtn.className = "chat-call-btn";
  callBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.72 12a19.79 19.79 0 01-3.07-8.67A2 2 0 013.63 1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 8.78a16 16 0 006.29 6.29l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
    📞 Appeler Fabien maintenant
  `;

  const waBtn = document.createElement("a");
  waBtn.href = WHATSAPP_NUMBER;
  waBtn.target = "_blank";
  waBtn.className = "chat-call-btn whatsapp";
  waBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
    WhatsApp
  `;

  const orBtn = el("button", "reply-btn");
  orBtn.textContent = "Je préfère être rappelé";
  orBtn.addEventListener("click", () => {
    container.remove();
    appendUserMessage("Je préfère être rappelé");
    setTimeout(() => showNode("lead_name"), 300);
  });

  container.appendChild(callBtn);
  container.appendChild(waBtn);
  container.appendChild(orBtn);
  messagesEl.appendChild(container);
  scrollToBottom();
}

/* ── Saisie du prénom ───────────────────────────────────── */
function renderNameInput() {
  removePreviousReplies();

  const form = el("div", "chat-phone-form");
  const input = el("input", "chat-name-input");
  input.type = "text";
  input.placeholder = "Votre prénom…";
  input.autocomplete = "given-name";

  const submitBtn = el("button", "chat-submit-btn");
  submitBtn.type = "button";
  submitBtn.innerHTML = `
    Continuer
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  `;

  const doSubmit = () => {
    const val = input.value.trim();
    if (!val) { input.classList.add("error"); input.focus(); return; }
    state.userName = capitalize(val);
    form.remove();
    appendUserMessage(state.userName);
    setTimeout(() => showNode("lead_phone"), 300);
  };

  submitBtn.addEventListener("click", doSubmit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSubmit(); });
  input.addEventListener("input", () => input.classList.remove("error"));

  form.appendChild(input);
  form.appendChild(submitBtn);
  messagesEl.appendChild(form);

  setTimeout(() => input.focus(), 150);
  scrollToBottom();
}

/* ── Saisie du téléphone ────────────────────────────────── */
function renderPhoneInput() {
  removePreviousReplies();

  const form = el("div", "chat-phone-form");
  const input = el("input", "chat-phone-input");
  input.type = "tel";
  input.placeholder = "06 XX XX XX XX";
  input.autocomplete = "tel";

  const submitBtn = el("button", "chat-submit-btn");
  submitBtn.type = "button";
  submitBtn.innerHTML = `
    Envoyer ma demande
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  `;

  const doSubmit = () => {
    const raw = input.value.replace(/[\s\-\.]/g, "");
    const valid = /^(\+33|0)[0-9]{9}$/.test(raw);
    if (!valid) { input.classList.add("error"); input.focus(); return; }

    // Simulate submission
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="animation:spin .7s linear infinite">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
      </svg>
      Envoi…
    `;
    setTimeout(() => {
      form.remove();
      appendUserMessage(input.value.trim());
      setTimeout(() => showNode("success"), 300);
    }, 900);
  };

  submitBtn.addEventListener("click", doSubmit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSubmit(); });
  input.addEventListener("input", () => input.classList.remove("error"));

  form.appendChild(input);
  form.appendChild(submitBtn);
  messagesEl.appendChild(form);

  setTimeout(() => input.focus(), 150);
  scrollToBottom();
}

/* ── Succès ─────────────────────────────────────────────── */
function renderSuccess() {
  removePreviousReplies();

  // Final bot message
  appendBotMessage(
    `✅ Parfait <strong>${state.userName}</strong> ! Fabien a bien reçu votre demande. Il vous rappelle <strong>dans l'heure</strong> en semaine. À très vite !`
  );

  // Offer to call now too
  setTimeout(() => {
    const cta = el("div", "chat-replies");
    const callBtn = document.createElement("a");
    callBtn.href = PHONE_NUMBER;
    callBtn.className = "reply-btn green";
    callBtn.textContent = "📞 Appeler quand même";
    cta.appendChild(callBtn);
    messagesEl.appendChild(cta);
    scrollToBottom();
  }, 600);
}

/* ── Typing indicator ───────────────────────────────────── */
function createTyping() {
  const wrap = el("div", "typing-indicator");
  wrap.innerHTML = `
    <div class="msg-avatar">🔧</div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  return wrap;
}

/* ── Helpers ────────────────────────────────────────────── */
function el(tag, cls = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}
function removePreviousReplies() {
  messagesEl.querySelectorAll(".chat-replies, .chat-phone-form").forEach(e => e.remove());
}

/* ── Lancement ──────────────────────────────────────────── */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatbot);
} else {
  initChatbot();
}
