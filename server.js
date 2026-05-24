/* ============================================================
   AF Dépannage – Allanic Fabien
   Serveur backend – chatbot IA (Anthropic Claude)
   ============================================================ */

'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PORT   = process.env.PORT || 3000;

/* ── Système de prompt ──────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es l'assistant virtuel d'AF Dépannage, entreprise de plomberie artisanale dirigée par Fabien Allanic, basée à Locminé dans le Morbihan (56). Fabien intervient sur Locminé, Pontivy, Vannes, Ploërmel, Auray et toute la région.

Ses domaines d'expertise :
- Fuites d'eau et dégâts des eaux (urgences 7j/7)
- Débouchage canalisations et WC
- Installation et remplacement de chauffe-eau / ballons d'eau chaude
- Rénovation salle de bain complète
- Plomberie neuve et remplacement robinetterie

Ton rôle quand un client décrit un problème :
1. Identifier et reformuler son problème en UNE phrase max
2. Donner 1 conseil pratique TRÈS court (couper l'eau si fuite, ne pas utiliser des produits chimiques agressifs, etc.) — jamais un tutoriel complet
3. Confirmer que c'est exactement dans les compétences de Fabien et qu'il peut intervenir rapidement

RÈGLES ABSOLUES :
- Répondre UNIQUEMENT en français
- Maximum 3 phrases au total, réponse concise
- Ton rassurant, professionnel et bienveillant
- NE JAMAIS donner de tutoriel DIY détaillé qui empêcherait le client d'appeler
- NE JAMAIS mentionner d'autres plombiers ou entreprises
- Terminer par une phrase du type : "Fabien peut intervenir rapidement pour vous." ou "C'est typiquement ce que Fabien résout au quotidien."
- Si le message n'est pas lié à la plomberie, rediriger poliment vers les services de Fabien`;

/* ── Middlewares ────────────────────────────────────────────── */
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname)));

/* ── Route /api/chat ────────────────────────────────────────── */
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message manquant.' });
  }

  if (message.trim().length > 600) {
    return res.status(400).json({ error: 'Message trop long.' });
  }

  // Reconstituer l'historique de conversation (max 6 échanges pour limiter les tokens)
  const recentHistory = (Array.isArray(history) ? history : []).slice(-6);

  const messages = [
    ...recentHistory.map(turn => ({
      role: turn.role,
      content: turn.content,
    })),
    {
      role: 'user',
      content: message.trim(),
    },
  ];

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 220,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return res.json({ reply });

  } catch (err) {
    console.error('[chatbot] Erreur Anthropic :', err.message ?? err);

    // Message de repli – redirige vers appel direct
    const fallback =
      "Je rencontre une petite difficulté technique. Pour une réponse immédiate, n'hésitez pas à appeler Fabien directement — il sera ravi de vous aider !";

    return res.json({ reply: fallback, fallback: true });
  }
});

/* ── Démarrage ──────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`✅ Serveur AF Dépannage démarré sur http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY non définie – les requêtes IA utiliseront le message de repli.');
  }
});
