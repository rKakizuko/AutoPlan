import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import protocolRoutes from './routes/protocols.js';
import paymentRulesRoutes from './routes/paymentRules.js';
import auditLogsRoutes from './routes/auditLogs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const origensPermitidas = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors(origensPermitidas.length > 0 ? { origin: origensPermitidas } : undefined));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.log('Erro na conexão com o MongoDB:', err));

app.use('/api/auth', authRoutes);
app.use('/api/protocols', protocolRoutes);
app.use('/api/paymentRules', paymentRulesRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API AutoPlan em execução' });
});

app.listen(PORT, () => {
  console.log(`Servidor em execução em http://localhost:${PORT}`);
});
