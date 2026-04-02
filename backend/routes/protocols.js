import express from 'express';
import jwt from 'jsonwebtoken';
import Protocol from '../models/Protocol.js';
import User from '../models/User.js';
import { createAuditLog } from '../utils/audit.js';

const router = express.Router();

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header must be Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token signature or format' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Create protocol
router.post('/', verifyToken, async (req, res) => {
  try {
    const { cliente, precoBase, metodo, parcelas, total } = req.body;
    const actor = await User.findById(req.userId);
    
    const protocolId = `PROTO-${Date.now()}`;
    
    // Criar array de pagamentos
    const numParcelas = parcelas || 1;
    const parcelaValue = total / numParcelas;
    const payments = [];
    for (let i = 1; i <= numParcelas; i++) {
      payments.push({
        parcelaNumero: i,
        valor: parcelaValue,
        pago: false
      });
    }
    
    const protocol = new Protocol({
      protocolId,
      userId: req.userId,
      cliente,
      precoBase,
      metodo,
      parcelas: numParcelas,
      total,
      payments
    });

    await protocol.save();
    await createAuditLog({
      action: 'protocol_created',
      entityType: 'protocol',
      entityId: protocol._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        protocolId,
        cliente,
        precoBase,
        metodo,
        parcelas: numParcelas,
        total,
      },
    });
    res.status(201).json(protocol);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all protocols for authenticated users
router.get('/', verifyToken, async (req, res) => {
  try {
    const protocols = await Protocol.find().sort({ createdAt: -1 });
    res.json(protocols);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single protocol
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const protocol = await Protocol.findById(req.params.id);
    
    if (!protocol) {
      return res.status(404).json({ message: 'Protocol not found' });
    }

    res.json(protocol);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update payment status
router.patch('/:id/payment', verifyToken, async (req, res) => {
  try {
    const { parcelaNumero, pago, dataPagamento } = req.body;
    
    const protocol = await Protocol.findById(req.params.id);
    
    if (!protocol) {
      return res.status(404).json({ message: 'Protocol not found' });
    }

    if (protocol.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Encontrar e atualizar a parcela
    const payment = protocol.payments.find(p => p.parcelaNumero === parcelaNumero);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.pago = pago;
    if (pago) {
      payment.dataPagamento = dataPagamento || new Date();
    } else {
      payment.dataPagamento = null;
    }

    await protocol.save();
    const actor = await User.findById(req.userId);
    await createAuditLog({
      action: 'protocol_payment_updated',
      entityType: 'protocol_payment',
      entityId: protocol._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        protocolId: protocol.protocolId,
        parcelaNumero,
        pago,
        dataPagamento: payment.dataPagamento,
      },
    });
    res.json(protocol);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
