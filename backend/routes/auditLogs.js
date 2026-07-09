import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditService from '../services/AuditService.js';

const router = express.Router();

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'O cabeçalho Authorization deve conter um token Bearer' });
  }

  const token = authHeader.split(' ')[1];

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

const exigirAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso de administrador necessário' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
};

router.get('/', verificarToken, exigirAdmin, async (req, res) => {
  try {
    const { action, entityType, actorEmail, limit = 100 } = req.query;
    const filters = {};

    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (actorEmail) filters.actorEmail = actorEmail;

    const logs = await AuditService.query(filters, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

export default router;
