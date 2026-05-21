import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ProtocolService from '../services/ProtocolService.js';

const router = express.Router();

// Verificar e validar JWT no header Authorization
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

router.post('/', verifyToken, async (req, res) => {
  try {
    const { cliente, precoBase, metodo, parcelas, total } = req.body;
    const protocol = await ProtocolService.create(
      req.userId,
      cliente,
      precoBase,
      metodo,
      parcelas,
      total
    );
    res.status(201).json(protocol);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Criar novo protocolo de pagamento// Listar protocolos (admin vê todos, usuário vê seus)
router.get('/', verifyToken, async (req, res) => {
  try {
    const actor = await User.findById(req.userId);
    const isAdmin = actor?.role === 'admin';
    const protocols = await ProtocolService.getAll(req.userId, isAdmin);
    res.json(protocols);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Obter detalhes de um protocolo específico
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const actor = await User.findById(req.userId);
    const isAdmin = actor?.role === 'admin';
    const protocol = await ProtocolService.getById(req.params.id, req.userId, isAdmin);
    res.json(protocol);
  } catch (err) {
    if (err.message === 'Not authorized') {
      return res.status(403).json({ message: err.message });
    }
    if (err.message === 'Protocol not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Atualizar status de pagamento de uma parcela
router.patch('/:id/payment', verifyToken, async (req, res) => {
  try {
    const { parcelaNumero, pago, dataPagamento } = req.body;
    const protocol = await ProtocolService.updatePaymentStatus(
      req.params.id,
      req.userId,
      parcelaNumero,
      pago,
      dataPagamento
    );
    res.json(protocol);
  } catch (err) {
    if (err.message === 'Not authorized') {
      return res.status(403).json({ message: err.message });
    }
    if (err.message === 'Protocol not found' || err.message === 'Payment not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
