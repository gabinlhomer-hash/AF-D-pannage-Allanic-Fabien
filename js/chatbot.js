/* ============================================================
   AF Dépannage – Chatbot Widget (IA Claude + saisie libre)
   ============================================================ */

'use strict';

/* ── Configuration ──────────────────────────────────────────── */
const PHONE_NUMBER    = 'tel:+33XXXXXXXXX';           // ← remplacer par le vrai numéro
const WHATSAPP_NUMBER = 'https://wa.me/33XXXXXXXXX';  // ← remplacer par le vrai numéro
const API_ENDPOINT    = '/api/chat';
const MAX_AI_TURNS    = 3;  // après X échanges IA, bloquer la saisie

/* ── État global ────────────────────────────────────────────── */
const state = {
  open: false,
  started: false,
  phase: 'chat',      // 'chat' | 'lead_name' | 'lead_phone' | 'done'
  aiTurns: 0,
  history: [],        // [{role, content}]
  pendingName: '',
};

/* ── Références DOM ─────────────────────────────────────────── */
let elToggle, elWidget, elMessages, elInput, elSendBtn, elProactive;

/* ── Initialisation ─────────────────────────────────────────── */
function initChatbot() {
  _buildDOM();
  _bindEvents();

  // Bulle proactive après 5 secondes
  setTimeout(() => {
    if (!state.open) {
      elProactive.classList.remove('hidden');
    }
  }, 5000);
}

/* ── Construction du DOM ────────────────────────────────────── */
function _buildDOM() {
  // Bulle proactive
  elProactive = document.createElement('div');
  elProactive.className = 'chat-bubble-proactive hidden';
  elProactive.innerHTML = '<strong>💬 Besoin d\'aide ?</strong>Décrivez votre problème, Fabien intervient rapidement !';
  elProactive.addEventListener('click', openChat);
  document.body.appendChild(elProactive);

  // Bouton toggle
  elToggle = document.createElement('button');
  elToggle.className = 'chat-toggle';
  elToggle.setAttribute('aria-label', 'Ouvrir le chat');
  elToggle.innerHTML = `
    <svg class="icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
    <svg class="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
    <span class="notif-badge">1</span>
  `;
  document.body.appendChild(elToggle);

  // Widget
  elWidget = document.createElement('div');
  elWidget.className = 'chat-widget';
  elWidget.setAttribute('role', 'dialog');
  elWidget.setAttribute('aria-label', 'Chat AF Dépannage');
  elWidget.innerHTML = `
    <div class="chat-header">
      <div class="chat-avatar">&#128296;</div>
      <div class="chat-header-info">
        <span class="chat-header-name">AF Dépannage</span>
        <span class="chat-header-status">Fabien – disponible</span>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-footer">
      <div class="chat-input-bar" id="chatInputBar">
        <textarea
          id="chatInput"
          class="chat-textarea"
          placeholder="Décrivez votre problème…"
          rows="1"
          maxlength="600"
          aria-label="Votre message"
        ></textarea>
        <button id="chatSendBtn" class="chat-send-btn" aria-label="Envoyer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p class="chat-footer-note">Réponse par un assistant IA · Fabien Allanic, Locminé (56)</p>
    </div>
  `;
  document.body.appendChild(elWidget);

  elMessages = document.getElementById('chatMessages');
  elInput    = document.getElementById('chatInput');
  elSendBtn  = document.getElementById('chatSendBtn');
}

/* ── Événements ─────────────────────────────────────────────── */
function _bindEvents() {
  elToggle.addEventListener('click', toggleChat);

  elSendBtn.addEventListener('click', _handleSend);
  elInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _handleSend();
    }
  });

  // Auto-resize du textarea
  elInput.addEventListener('input', function() {
    elInput.style.height = 'auto';
    elInput.style.height = Math.min(elInput.scrollHeight, 120) + 'px';
  });
}

/* ── Ouvrir / fermer ────────────────────────────────────────── */
function toggleChat() {
  state.open ? closeChat() : openChat();
}

function openChat() {
  state.open = true;
  elWidget.classList.add('open');
  elToggle.classList.add('open');
  elToggle.setAttribute('aria-expanded', 'true');
  elProactive.classList.add('hidden');

  var badge = elToggle.querySelector('.notif-badge');
  if (badge) badge.remove();

  if (!state.started) {
    state.started = true;
    _showWelcome();
  } else {
    elInput.focus();
  }
}

function closeChat() {
  state.open = false;
  elWidget.classList.remove('open');
  elToggle.classList.remove('open');
  elToggle.setAttribute('aria-expanded', 'false');
}

/* ── Message de bienvenue ───────────────────────────────────── */
function _showWelcome() {
  _showTyping(700, function() {
    appendBotMessage('&#128075; Bonjour ! Je suis l\'assistant d\'<strong>AF Dépannage</strong>.<br>Décrivez-moi votre problème de plomberie et je vous aide immédiatement.');
    elInput.focus();
  });
}

/* ── Envoi du message utilisateur ───────────────────────────── */
async function _handleSend() {
  if (state.phase === 'lead_name') return _submitName();
  if (state.phase === 'lead_phone') return _submitPhone();
  if (state.phase === 'done') return;

  var text = elInput.value.trim();
  if (!text) return;

  elInput.value = '';
  elInput.style.height = 'auto';
  _setSendDisabled(true);

  appendUserMessage(text);

  var typing = _showTypingIndicator();
  var reply  = await _callClaudeAPI(text);
  typing.remove();

  appendBotMessage(reply);

  state.aiTurns++;
  _setSendDisabled(false);

  // Toujours proposer les boutons de contact après la réponse IA
  _showContactCTA();

  // Après MAX_AI_TURNS échanges, bloquer la saisie
  if (state.aiTurns >= MAX_AI_TURNS) {
    _lockInputWithMessage();
  }
}

/* ── Appel à l'API backend ──────────────────────────────────── */
async function _callClaudeAPI(userMessage) {
  try {
    var res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: state.history,
      }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    var data  = await res.json();
    var reply = data.reply || _fallbackMessage();

    // Mettre à jour l'historique de conversation
    state.history.push({ role: 'user',      content: userMessage });
    state.history.push({ role: 'assistant', content: reply });

    return reply;

  } catch (err) {
    console.warn('[chatbot] Erreur API :', err.message);
    return _fallbackMessage();
  }
}

function _fallbackMessage() {
  return 'Je rencontre une petite difficulté technique. Pour une aide immédiate, n\'hésitez pas à appeler Fabien directement — il est disponible et répondra à toutes vos questions !';
}

/* ── Boutons de contact après réponse IA ───────────────────── */
function _showContactCTA() {
  // Supprimer les anciens CTA
  var oldCTA = elMessages.querySelector('.chat-cta-block');
  if (oldCTA) oldCTA.remove();

  var block = document.createElement('div');
  block.className = 'chat-cta-block';
  block.innerHTML = '<p class="cta-hint">&#128222; Fabien peut intervenir rapidement :</p>';

  // Bouton Appeler
  var callLink = document.createElement('a');
  callLink.href      = PHONE_NUMBER;
  callLink.className = 'chat-call-btn';
  callLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.04 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> Appeler Fabien maintenant';
  block.appendChild(callLink);

  // Bouton Rappel
  var callbackBtn    = document.createElement('button');
  callbackBtn.className = 'chat-call-btn chat-callback-btn';
  callbackBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.04 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> Me faire rappeler';
  callbackBtn.addEventListener('click', _startLeadCapture);
  block.appendChild(callbackBtn);

  // Bouton WhatsApp
  var waLink = document.createElement('a');
  waLink.href = WHATSAPP_NUMBER;
  waLink.target = '_blank';
  waLink.rel = 'noopener';
  waLink.className = 'chat-call-btn whatsapp';
  waLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp';
  block.appendChild(waLink);

  elMessages.appendChild(block);
  _scrollToBottom();
}

/* ── Lead capture – rappel ──────────────────────────────────── */
function _lockInputWithMessage() {
  _setSendDisabled(true);
  elInput.placeholder = 'Utilisez les boutons ci-dessus pour contacter Fabien.';
  elInput.disabled = true;
}

function _startLeadCapture() {
  var ctaBlock = elMessages.querySelector('.chat-cta-block');
  if (ctaBlock) ctaBlock.remove();

  state.phase = 'lead_name';
  _setSendDisabled(true);
  elInput.disabled = true;

  _showTyping(500, function() {
    appendBotMessage('Super ! Pour que Fabien vous rappelle, j\'ai besoin de votre <strong>prénom</strong> :');
    _renderNameInput();
  });
}

function _renderNameInput() {
  var form = document.createElement('div');
  form.className = 'chat-phone-form';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'leadName';
  input.className = 'chat-name-input';
  input.placeholder = 'Votre prénom';
  input.maxLength = 50;
  input.autocomplete = 'given-name';

  var btn = document.createElement('button');
  btn.className = 'chat-submit-btn';
  btn.textContent = 'Continuer →';

  form.appendChild(input);
  form.appendChild(btn);
  elMessages.appendChild(form);
  _scrollToBottom();

  setTimeout(function() { input.focus(); }, 100);

  btn.addEventListener('click', _submitName);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') _submitName(); });
}

function _submitName() {
  var input = document.getElementById('leadName');
  if (!input) return;
  var name = input.value.trim();
  if (!name) {
    input.classList.add('error');
    input.focus();
    return;
  }
  state.pendingName = name;
  appendUserMessage(name);

  var form = input.closest('.chat-phone-form');
  if (form) form.remove();

  state.phase = 'lead_phone';

  _showTyping(500, function() {
    appendBotMessage('Merci <strong>' + _esc(name) + '</strong> ! Quel est votre <strong>numéro de téléphone</strong> ?');
    _renderPhoneInput();
  });
}

function _renderPhoneInput() {
  var form = document.createElement('div');
  form.className = 'chat-phone-form';

  var input = document.createElement('input');
  input.type = 'tel';
  input.id = 'leadPhone';
  input.className = 'chat-phone-input';
  input.placeholder = '06 XX XX XX XX';
  input.maxLength = 20;
  input.autocomplete = 'tel';

  var btn = document.createElement('button');
  btn.className = 'chat-submit-btn';
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Valider';

  form.appendChild(input);
  form.appendChild(btn);
  elMessages.appendChild(form);
  _scrollToBottom();

  setTimeout(function() { input.focus(); }, 100);

  btn.addEventListener('click', _submitPhone);
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') _submitPhone(); });
}

function _submitPhone() {
  var input = document.getElementById('leadPhone');
  if (!input) return;
  var raw   = input.value.trim();
  var clean = raw.replace(/[\s\-\.]/g, '');

  if (!/^(\+33|0)[0-9]{9}$/.test(clean)) {
    input.classList.add('error');
    input.placeholder = 'Format invalide – ex: 06 12 34 56 78';
    input.focus();
    return;
  }

  appendUserMessage(raw);

  var form = input.closest('.chat-phone-form');
  if (form) form.remove();

  state.phase = 'done';

  _showTyping(700, _renderSuccess);
}

function _renderSuccess() {
  var block = document.createElement('div');
  block.className = 'chat-success';
  block.innerHTML = '<div class="chat-success-icon">&#9989;</div>' +
    '<p><strong>Parfait, ' + _esc(state.pendingName) + ' !</strong><br>Fabien vous rappellera dans les plus brefs délais.</p>' +
    '<p style="margin-top:6px;font-size:.8rem;color:#94a3b8">Si c\'est urgent, vous pouvez aussi l\'appeler directement :</p>';

  var callBtn = document.createElement('a');
  callBtn.href = PHONE_NUMBER;
  callBtn.className = 'chat-call-btn';
  callBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.04 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> Appeler maintenant';

  block.appendChild(callBtn);
  elMessages.appendChild(block);

  elInput.disabled = true;
  elInput.placeholder = 'Conversation terminée.';
  _setSendDisabled(true);

  _scrollToBottom();
}

/* ── Utilitaires DOM ────────────────────────────────────────── */
function appendBotMessage(html) {
  var msg = document.createElement('div');
  msg.className = 'msg bot';
  msg.innerHTML = '<div class="msg-avatar">&#128296;</div><div class="msg-bubble">' + html + '</div>';
  elMessages.appendChild(msg);
  _scrollToBottom();
}

function appendUserMessage(text) {
  var msg = document.createElement('div');
  msg.className = 'msg user';
  msg.innerHTML = '<div class="msg-bubble">' + _esc(text) + '</div>';
  elMessages.appendChild(msg);
  _scrollToBottom();
}

function _showTypingIndicator() {
  var indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<div class="msg-avatar">&#128296;</div><div class="typing-dots"><span></span><span></span><span></span></div>';
  elMessages.appendChild(indicator);
  _scrollToBottom();
  return indicator;
}

function _showTyping(delay, callback) {
  var indicator = _showTypingIndicator();
  setTimeout(function() {
    indicator.remove();
    callback();
  }, delay);
}

function _scrollToBottom() {
  elMessages.scrollTop = elMessages.scrollHeight;
}

function _setSendDisabled(disabled) {
  elSendBtn.disabled    = disabled;
  elSendBtn.style.opacity = disabled ? '0.4' : '';
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Lancement ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initChatbot);
