const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY    = process.env.GOOGLE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

app.get('/directions', async (req, res) => {
  try {
    const { origin, destination, mode } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      { params: { origin, destination, mode, key: GOOGLE_KEY, region: 'au' } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/advice', async (req, res) => {
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server.' });
  }
  try {
    const { prompt } = req.body;
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: `You are Flaneur, a smart local friend giving transport advice. Think like Rory Sutherland — fastest isn't always best, some walks are worth taking, some transfers are miserable and a cab is the obvious call. Be specific, confident, no hedging.

Return ONLY valid JSON, no markdown, no preamble:
{
  "routes": [
    {
      "title": "short descriptive title",
      "recommended": true,
      "duration": "X min",
      "cost": "free or ~$X",
      "legs": [{"icon": "ti-walk or ti-bus or ti-train or ti-car or ti-tram", "label": "short leg description"}],
      "flaneur_take": "1-2 sentences of honest trade-off reasoning specific to this journey"
    }
  ]
}`,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (e) {
    const status  = e.response?.status  || 500;
    const body    = e.response?.data;
    const message = body?.error?.message || body?.error || e.message;
    console.error('Advice error:', status, JSON.stringify(body));
    res.status(status).json({ error: message, detail: body });
  }
});

// Health — exposes whether env vars are present
app.get('/health', (req, res) => res.json({
  status: 'ok',
  hasGoogleKey:    !!GOOGLE_KEY,
  hasAnthropicKey: !!ANTHROPIC_KEY
}));

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flaneur proxy running on port ${PORT}`));
