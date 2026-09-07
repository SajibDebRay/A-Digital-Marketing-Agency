console.log('✅ testServer.js loaded');

require('dotenv').config();
console.log('dotenv loaded:', process.env.MONGO_URI ? true : false);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Server is working');
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));