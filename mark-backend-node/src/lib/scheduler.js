const cron = require('node-cron');
const db = require('../db');

// Schedule the cron job to run at midnight on December 31st
cron.schedule('0 0 31 12 *', async () => {
  console.log('Running annual marks expiration...');
  try {
    await db.query('SELECT run_annual_expiration()');
    console.log('Annual marks expiration completed successfully.');
  } catch (error) {
    console.error('Error during annual marks expiration:', error);
  }
});

console.log('Scheduler initialized.');
