const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const voucherRoutes = require('./routes/vouchers');
const studentRoutes = require('./routes/students');
require('./lib/scheduler');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/students', studentRoutes);

app.get('/', (req, res) => {
  res.send('Mark Backend API');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
