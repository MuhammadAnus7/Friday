import { Router } from 'express';
import { generateAssistantReply } from '../services/openai.js';
import { getConversationHistory, saveMessage } from '../services/memory.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ error: 'A non-empty "userId" string is required.' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty "message" string is required.' });
    }

    const normalizedUserId = userId.trim();
    const normalizedMessage = message.trim();

    await saveMessage(normalizedUserId, normalizedMessage, 'user');

    const history = await getConversationHistory(normalizedUserId);
    const reply = await generateAssistantReply(normalizedMessage, history);

    await saveMessage(normalizedUserId, reply, 'assistant');

    return res.json({ reply });
  } catch (error) {
    console.error('Chat route error:', error);

    if (
      error.message.includes('OPENAI_API_KEY') ||
      error.message.includes('WEATHER_API_KEY') ||
      error.message.includes('NEWS_API_KEY') ||
      error.message.includes('SMTP_')
    ) {
      return res.status(500).json({ error: `Server configuration error: ${error.message}` });
    }

    return res.status(500).json({ error: 'Failed to generate assistant response.' });
  }
});

export default router;
