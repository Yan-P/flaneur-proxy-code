const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY = process.env.GOOGLE_API_KEY;

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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flâneur proxy running on port ${PORT}`));