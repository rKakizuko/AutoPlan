import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PaymentRulesService from '../services/PaymentRulesService.js';

const router = express.Router();

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'O cabeçalho Authorization deve conter um token Bearer' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token não informado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Assinatura ou formato do token inválido' });
    }

    return res.status(401).json({ message: 'Token inválido' });
  }
};

router.get('/', verificarToken, async (req, res) => {
  try {
    const rules = await PaymentRulesService.get();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});
router.post('/', verificarToken, async (req, res) => {
  try {
    const rules = await PaymentRulesService.atualizar(req.body, req.userId);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

export default router;
