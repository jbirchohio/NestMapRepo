import 'dotenv/config.js';
import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
