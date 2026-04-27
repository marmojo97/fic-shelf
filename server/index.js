const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware — allow configured origin(s) or all in dev
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: allowedOrigin === '*'
    ? true  // reflect any origin in dev
    : [allowedOrigin, 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/fics', require('./routes/fics'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/shelves', require('./routes/shelves'));
app.use('/api/reclists', require('./routes/reclists'));
app.use('/api/ao3', require('./routes/ao3'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/import', require('./routes/import'));
app.use('/api/social', require('./routes/social'));

// Beta features
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/changelog', require('./routes/changelog'));
app.use('/api/beta-banner', require('./routes/betabanner'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.listen(PORT, () => {
  console.log(`\n🗃️  Archivd API running at http://localhost:${PORT}`);
  console.log(`📚 Ready to track your fics!\n`);

  // WIP checker — runs once per day at 3am
  cron.schedule('0 3 * * *', async () => {
    try {
      const { runGlobalWipCheck } = require('./jobs/wipChecker');
      await runGlobalWipCheck();
    } catch (e) {
      console.error('[Cron] WIP check failed:', e.message);
    }
  });
  console.log('[Cron] WIP checker scheduled — runs daily at 3am');
});
