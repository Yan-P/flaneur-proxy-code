const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY    = process.env.GOOGLE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL         = 'claude-sonnet-4-5';

const ANTHROPIC_HEADERS = {
  'x-api-key':         ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01',
  'content-type':      'application/json'
};

// Google Places autocomplete
app.get('/autocomplete', async (req, res) => {
  try {
    const { input, sessiontoken } = req.query;
    if (!input) return res.json({ predictions: [] });
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      { params: { input, key: GOOGLE_KEY, sessiontoken, types: 'geocode' } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/directions', async (req, res) => {
  try {
    const { origin, destination, mode } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/directions/json',
      { params: { origin, destination, mode, key: GOOGLE_KEY } }
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
        model: MODEL,
        max_tokens: 1500,
        system: `You are Flâneur, a brilliantly opinionated local guide for any city in the world. You give transport advice the way a smart, well-travelled friend would — not just the fastest or cheapest route, but the *right* route given who's asking and why.

Your job is to recommend exactly 3 routes, ordered from most to least recommended. Think creatively about combinations — a route might be "walk to avoid a hellish interchange", or "the slower train because it has tables and you can work", or "metro halfway then walk through the interesting part". Don't just parrot the three Google modes back. Synthesise.

Consider:
- Time of day and day of week (rush hour vs weekend)
- The character of the journey (city grid, creekside trail, underground tunnel)
- Whether changing transit is worth it vs walking between stops
- Hidden costs: time spent waiting, standing in a tunnel, dealing with luggage, navigating confusing interchanges
- What the user actually asked for via their preferences

Return ONLY valid JSON, no markdown, no preamble — exactly this structure:
{
  "routes": [
    {
      "title": "evocative 4-6 word title",
      "recommended": true,
      "duration": "X min",
      "cost": "free or ~$X or ~€X or ~¥X",
      "legs": [
        {"icon": "ti-walk or ti-bus or ti-train or ti-car or ti-tram or ti-ferry", "label": "concise leg description"}
      ],
      "flaneur_take": "2-3 sentences. Be specific to this journey — name streets, lines, landmarks. Give the real trade-off. Sound like you've done this commute a hundred times."
    }
  ]
}`,
        messages: [{ role: 'user', content: prompt }]
      },
      { headers: { ...ANTHROPIC_HEADERS, 'x-api-key': ANTHROPIC_KEY } }
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

app.get('/health', (req, res) => res.json({
  status: 'ok',
  hasGoogleKey:    !!GOOGLE_KEY,
  hasAnthropicKey: !!ANTHROPIC_KEY,
  model: MODEL
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flâneur proxy running on port ${PORT}`));
