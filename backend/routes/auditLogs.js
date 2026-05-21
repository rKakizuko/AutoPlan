import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditService from '../services/AuditService.js';

const router = express.Router();

// Verificar JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header must be Bearer token' });
  }

  const token = authHeader.split(' ')[1];

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

// Filtrar e verificar permissão de admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { action, entityType, actorEmail, limit = 100 } = req.query;
    const filters = {};

    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (actorEmail) filters.actorEmail = actorEmail;

    const logs = await AuditService.query(filters, limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
