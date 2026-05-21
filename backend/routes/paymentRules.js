import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PaymentRulesService from '../services/PaymentRulesService.js';

const router = express.Router();

// Verificar e validar JWT
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

router.get('/', verifyToken, async (req, res) => {
  try {
    const rules = await PaymentRulesService.get();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Obter regras de pagamento atuais// Atualizar regras de pagamento (PIX, Boleto, Cartão)
router.post('/', verifyToken, async (req, res) => {
  try {
    const rules = await PaymentRulesService.update(req.body, req.userId);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
