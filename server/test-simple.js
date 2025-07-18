const express = require('express');
const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
});
