import { Router } from 'express';
import * as dotenv from 'dotenv';

const router = Router();

// Get API key status - only reports if keys are present, never returns the actual values
router.get('/api-keys', (req, res) => {
  try {
    const weatherApiKey = process.env.WEATHER_API_KEY || '';
    const openAiKey = process.env.OPENAI_API_KEY || '';

    res.json({
      weatherApiKey: weatherApiKey ? true : false,
      openAiKey: openAiKey ? true : false
    });
  } catch (error) {
    console.error('[SETTINGS] Error getting API key status:', error);
    res.status(500).json({ error: 'Failed to get API key status' });
  }
});

// Set Weather API key
router.post('/weather-api-key', (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // In a real app, this would store the key securely in a proper key management system
    // or environment variables with appropriate persistence
    process.env.WEATHER_API_KEY = key;
    
    console.log('[SETTINGS] Weather API key updated');
    res.json({ success: true });
  } catch (error) {
    console.error('[SETTINGS] Error setting Weather API key:', error);
    res.status(500).json({ error: 'Failed to set Weather API key' });
  }
});

// Set OpenAI API key
router.post('/openai-api-key', (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // In a real app, this would store the key securely in a proper key management system
    // or environment variables with appropriate persistence
    process.env.OPENAI_API_KEY = key;
    
    console.log('[SETTINGS] OpenAI API key updated');
    res.json({ success: true });
  } catch (error) {
    console.error('[SETTINGS] Error setting OpenAI API key:', error);
    res.status(500).json({ error: 'Failed to set OpenAI API key' });
  }
});

export default router;