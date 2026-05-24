/* ============================================================
   AF Dépannage – Chatbot Widget (logique 100% côté client)
   - Détection mots-clés pour diagnostic plomberie
   - 2-3 échanges max puis redirection vers Fabien
   ============================================================ */
'use strict';

/* ── Configuration ──────────────────────────────────────────── */
const PHONE_NUMBER    = 'tel:+33XXXXXXXXX';           // ← remplacer par le vrai numéro
const WHATSAPP_NUMBER = 'https://wa.me/33XXXXXXXXX';  // ← remplacer par le vrai numéro
const MAX_AI_TURNS    = 3;

/* ── Base de connaissances plomberie ──────────────────────── */
const KNOWLEDGE_BASE = [
  {
    keywords: ['fuite', 'fuit', 'goutte', 'gouttes', 'écoule', 'eau qui coule', 'eau partout'],
    responses: [
      "Une fuite, c'est à traiter rapidement. <strong>Premier geste :</strong> coupez l'arrivée d'eau générale (vanne au compteur ou sous l'évier).<br><br>Pouvez-vous me dire <strong>où se trouve la fuite</strong> exactement ? (sous évier, robinet, WC, chauffe-eau, mur, plafond…)",
      "D'accord. <strong>En attendant l'intervention :</strong><br>• Placez une bassine ou des serviettes pour limiter les dégâts<br>• Coupez l'électricité de la zone si l'eau approche des prises<br>• Prenez une photo de la fuite (utile pour l'assurance)<br><br>Fabien intervient rapidement sur Locminé et alentours. Voulez-vous l'appeler maintenant ou être rappelé ?",
    ]
  },
  {
    keywords: ['wc', 'toilette', 'toilettes', 'chasse', 'cuvette', 'bouché', 'bouche'],
    responses: [
      "Problème de WC, je vois. Pour mieux vous aider : est-ce que c'est <strong>bouché</strong>, que la <strong>chasse fuit en continu</strong>, ou autre chose ?<br><br><em>💡 Si c'est bouché : évitez d'utiliser plusieurs fois la chasse, ça risque de déborder. Une ventouse peut parfois suffire pour un bouchon léger.</em>",
      "Compris. <strong>Avant l'intervention :</strong><br>• N'utilisez plus les WC pour éviter tout débordement<br>• Coupez le robinet d'arrivée d'eau derrière la cuvette (petite vanne)<br>• Si la chasse fuit : c'est souvent le joint ou le mécanisme à remplacer, une réparation rapide<br><br>Fabien peut intervenir aujourd'hui. Voulez-vous l'appeler ou être rappelé ?",
    ]
  },
  {
    keywords: ['chauffe-eau', 'chauffe eau', 'ballon', 'eau chaude', 'pas chaud', 'froide'],
    responses: [
      "Souci de chauffe-eau. Quelques questions pour cerner le problème :<br>• L'eau est <strong>froide</strong> ou <strong>tiède</strong> ?<br>• Le ballon <strong>fuit</strong> ou <strong>fait du bruit</strong> ?<br>• Il a quel âge environ ?<br><br><em>💡 Si vous avez un disjoncteur dédié au chauffe-eau, vérifiez qu'il n'a pas sauté.</em>",
      "Merci pour les infos. <strong>En attendant :</strong><br>• Coupez l'électricité du chauffe-eau au tableau (sécurité)<br>• S'il fuit : coupez aussi l'arrivée d'eau du ballon<br>• Notez la marque/modèle si possible<br><br>Fabien diagnostique et répare la plupart des chauffe-eaux (résistance, thermostat, groupe de sécurité). Voulez-vous l'appeler ?",
    ]
  },
  {
    keywords: ['robinet', 'mitigeur', 'évier', 'evier', 'lavabo'],
    responses: [
      "Problème de robinet. C'est plutôt :<br>• Une <strong>fuite</strong> au niveau du bec ou de la base ?<br>• Le robinet qui <strong>tourne dans le vide</strong> ?<br>• De l'eau qui <strong>coule mal</strong> ou pas du tout ?<br><br><em>💡 Pour une petite fuite, vous pouvez fermer la vanne sous l'évier en attendant.</em>",
      "Bien noté. <strong>Conseils en attendant :</strong><br>• Fermez la vanne d'arrêt sous l'évier (eau chaude + froide)<br>• Si c'est juste un mitigeur, c'est souvent une cartouche à changer (réparation rapide)<br>• Si le robinet est ancien, un remplacement complet peut être plus économique à long terme<br><br>Fabien peut passer rapidement. Vous préférez l'appeler ou être rappelé ?",
    ]
  },
  {
    keywords: ['canalisation', 'évacuation', 'evacuation', 'tuyau', 'engorgé', 'odeur', 'remonte'],
    responses: [
      "Canalisation bouchée ou qui remonte. Pour bien comprendre :<br>• C'est à quel niveau ? (douche, évier, WC, sol)<br>• Ça <strong>évacue lentement</strong> ou <strong>plus du tout</strong> ?<br>• Avez-vous des <strong>odeurs</strong> qui remontent ?<br><br><em>💡 Évitez les déboucheurs chimiques agressifs, ils peuvent abîmer les joints et tuyauteries.</em>",
      "OK. <strong>En attendant Fabien :</strong><br>• N'utilisez plus le point d'eau concerné<br>• Pour une légère obstruction : eau très chaude + bicarbonate + vinaigre peuvent aider<br>• Pour un blocage important : il faudra un débouchage mécanique (furet) ou hydraulique<br><br>Fabien a le matériel professionnel pour déboucher proprement. On organise l'intervention ?",
    ]
  },
  {
    keywords: ['radiateur', 'chauffage', 'froid', 'purger', 'purge', 'chaudière'],
    responses: [
      "Souci de chauffage. Pour bien diagnostiquer :<br>• <strong>Un seul radiateur</strong> froid ou <strong>tous</strong> ?<br>• Il est froid <strong>en haut</strong> ou <strong>en bas</strong> ?<br>• Entendez-vous des <strong>bruits</strong> (gargouillis, claquements) ?<br><br><em>💡 Radiateur froid en haut : souvent une purge à faire. Radiateur froid en bas : peut être un problème de circulation ou de boue.</em>",
      "D'accord. <strong>Ce que vous pouvez vérifier :</strong><br>• La pression de la chaudière (entre 1 et 1,5 bar normalement)<br>• Si un radiateur a besoin d'être purgé : clé de purge + chiffon, ouvrir doucement jusqu'à l'eau<br>• Si vraiment tout est froid : vérifier que la chaudière n'est pas en défaut<br><br>Pour un diagnostic complet, Fabien peut passer. On prend rendez-vous ?",
    ]
  },
  {
    keywords: ['installation', 'installer', 'poser', 'nouveau', 'changement', 'remplacer', 'rénovation', 'renovation'],
    responses: [
      "Très bien, un projet d'installation ! Pour préparer le devis, dites-moi :<br>• Quel <strong>équipement</strong> ? (WC, lavabo, douche, baignoire, chauffe-eau, mitigeur…)<br>• C'est un <strong>remplacement</strong> ou une <strong>première installation</strong> ?<br>• Avez-vous déjà <strong>acheté le matériel</strong> ou besoin de conseils ?",
      "Parfait. Fabien établit un <strong>devis gratuit et sans engagement</strong> après une visite ou sur photos pour les cas simples. Il fournit aussi le matériel si besoin (souvent à meilleur prix qu'en grande surface).<br><br>Pour avancer, le plus simple est d'échanger directement avec lui. Voulez-vous l'appeler ou être rappelé ?",
    ]
  },
  {
    keywords: ['devis', 'prix', 'tarif', 'coût', 'cout', 'combien'],
    responses: [
      "Bonne question ! Fabien établit un <strong>devis gratuit et sans engagement</strong>. Le tarif dépend de plusieurs facteurs :<br>• La nature de l'intervention<br>• L'urgence (jour, soir, week-end)<br>• Le matériel à fournir<br><br>Pour vous donner une fourchette précise, pouvez-vous me dire <strong>quel type de travaux</strong> vous envisagez ?",
      "Compris. Pour un devis précis et personnalisé, le mieux est de discuter directement avec Fabien — il pourra évaluer le travail soit par téléphone, soit en se déplaçant.<br><br>Voulez-vous l'appeler maintenant ou laisser votre numéro pour être rappelé ?",
    ]
  },
  {
    keywords: ['urgent', 'urgence', 'vite', 'rapidement', 'tout de suite', 'maintenant'],
    responses: [
      "Compris, c'est urgent. <strong>Fabien intervient 7j/7 sur Locminé et le Morbihan</strong>, souvent en moins d'une heure.<br><br>Pour qu'il vous aide au mieux, dites-moi en quelques mots <strong>quel est le problème</strong> ? (fuite, WC, chauffe-eau, pas d'eau…)",
      "OK. <strong>Pour une urgence, le plus rapide c'est l'appel direct.</strong> Fabien décroche personnellement et peut être chez vous très vite.<br><br>Appuyez sur le bouton ci-dessous pour l'appeler immédiatement.",
    ]
  },
];

const DEFAULT_RESPONSES = [
  "Merci pour votre message. Pour mieux vous aider, pouvez-vous préciser :<br>• De quel <strong>équipement</strong> il s'agit ? (WC, robinet, chauffe-eau, canalisation…)<br>• Le <strong>problème exact</strong> ? (fuite, blocage, panne, installation)<br>• Si c'est <strong>urgent</strong> ou planifié ?",
  "D'accord. Pour traiter votre demande au mieux, le plus efficace est de parler directement avec Fabien. Il pourra vous poser les bonnes questions et vous donner un premier diagnostic.<br><br>Voulez-vous l'appeler maintenant ou être rappelé ?",
];

const FINAL_MESSAGE = "Merci pour ces précisions. Pour aller plus loin et organiser l'intervention, <strong>Fabien sera plus efficace en direct</strong>. Il pourra confirmer le diagnostic, vous donner un tarif et fixer un rendez-vous.<br><br>👇 Choisissez l'option qui vous convient :";

/* ── État global ────────────────────────────────────────────── */
const state = {
  open: false,
  started: false,
  phase: 'chat',
  aiTurns: 0,
  detectedTopic: null,
  pendingName: '',
};

let elToggle, elWidget, elMessages, elInput, elSendBtn, elProactive;

/* ── Initialisation ─────────────────────────────────────────── */
function initChatbot() {
  _buildDOM();
  _bindEvents();
  setTimeout(() => {
    if (!state.open) elProactive.classList.remove('hidden');
  }, 5000);
}

function _buildDOM() {
  elProactive = document.createElement('div');
  elProactive.className = 'chat-bubble-proactive hidden';
  elProactive.innerHTML = '<strong>💬 Besoin d\'aide ?</strong>Décrivez votre problème, Fabien intervient rapidement !';
  elProactive.addEventListener('click', openChat);
  document.body.appendChild(elProactive);

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
        <textarea id="chatInput" class="chat-textarea" placeholder="Décrivez votre problème…" rows="1" maxlength="600" aria-label="Votre message"></textarea>
        <button id="chatSendBtn" class="chat-send-btn" aria-label="Envoyer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p class="chat-footer-note">Assistant virtuel · Fabien Allanic, Locminé (56)</p>
    </div>
  `;
  document.body.appendChild(elWidget);

  elMessages = document.getElementById('chatMessages');
  elInput    = document.getElementById('chatInput');
  elSendBtn  = document.getElementById('chatSendBtn');
}

function _bindEvents() {
  elToggle.addEventListener('click', toggleChat);
  elSendBtn.addEventListener('click', _handleSend);
  elInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _handleSend();
    }
  });
  elInput.addEventListener('input', function() {
    elInput.style.height = 'auto';
    elInput.style.height = Math.min(elInput.scrollHeight, 120) + 'px';
  });
}

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

function _showWelcome() {
  _showTyping(700, function() {
    appendBotMessage('&#128075; Bonjour ! Je suis l\'assistant d\'<strong>AF Dépannage</strong>.<br>Décrivez-moi votre problème de plomberie et je vous aide immédiatement.');
    elInput.focus();
  });
}

function _handleSend() {
  if (state.phase === 'lead_name') return _submitName();
  if (state.phase === 'lead_phone') return _submitPhone();
  if (state.phase === 'done') return;

  var text = elInput.value.trim();
  if (!text) return;

  elInput.value = '';
  elInput.style.height = 'auto';
  _setSendDisabled(true);
  appendUserMessage(text);

  var reply = _generateReply(text);

  _showTyping(900, function() {
    appendBotMessage(reply);
    state.aiTurns++;
    _setSendDisabled(false);

    if (state.aiTurns >= MAX_AI_TURNS) {
      setTimeout(function() {
        appendBotMessage(FINAL_MESSAGE);
        _showContactCTA();
        _lockInputWithMessage();
      }, 800);
    } else if (state.aiTurns >= 2) {
      setTimeout(_showContactCTA, 600);
    }
  });
}

function _generateReply(userText) {
  var lower = userText.toLowerCase();

  if (state.detectedTopic !== null && state.aiTurns === 1) {
    var topic = KNOWLEDGE_BASE[state.detectedTopic];
    return topic.responses[1] || DEFAULT_RESPONSES[1];
  }

  for (var i = 0; i < KNOWLEDGE_BASE.length; i++) {
    var entry = KNOWLEDGE_BASE[i];
    for (var j = 0; j < entry.keywords.length; j++) {
      if (lower.indexOf(entry.keywords[j]) !== -1) {
        if (state.aiTurns === 0) {
          state.detectedTopic = i;
          return entry.responses[0];
        } else {
          return entry.responses[1] || entry.responses[0];
        }
      }
    }
  }

  var defaultIdx = Math.min(state.aiTurns, DEFAULT_RESPONSES.length - 1);
  return DEFAULT_RESPONSES[defaultIdx];
}

function _showContactCTA() {
  var oldCTA = elMessages.querySelector('.chat-cta-block');
  if (oldCTA) oldCTA.remove();

  var block = document.createElement('div');
  block.className = 'chat-cta-block';
  block.innerHTML = '<p class="cta-hint">&#128222; Fabien peut intervenir rapidement :</p>';

  var callLink = document.createElement('a');
  callLink.href      = PHONE_NUMBER;
  callLink.className = 'chat-call-btn';
  callLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.04 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> Appeler Fabien maintenant';
  block.appendChild(callLink);

  var callbackBtn = document.createElement('button');
  callbackBtn.className = 'chat-call-btn chat-callback-btn';
  callbackBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.04 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg> Me faire rappeler';
  callbackBtn.addEventListener('click', _startLeadCapture);
  block.appendChild(callbackBtn);

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
  if (!name) { input.classList.add('error'); input.focus(); return; }
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
  elSendBtn.disabled = disabled;
  elSendBtn.style.opacity = disabled ? '0.4' : '';
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initChatbot);
