const mongoose = require('mongoose');

mongoose.connect('YOUR_MONGO_URI_HERE')
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌ Error:', err));