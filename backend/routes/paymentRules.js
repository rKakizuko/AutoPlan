import express from 'express';
import jwt from 'jsonwebtoken';
import PaymentRules from '../models/PaymentRules.js';
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

// Get payment rules
router.get('/', verifyToken, async (req, res) => {
  try {
    let rules = await PaymentRules.findOne();
    if (!rules) {
      rules = new PaymentRules();
      await rules.save();
    }
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update payment rules
router.post('/', verifyToken, async (req, res) => {
  try {
    const actor = await User.findById(req.userId);
    let rules = await PaymentRules.findOne();
    const previousRules = rules ? rules.toObject() : null;
    if (!rules) {
      rules = new PaymentRules(req.body);
    } else {
      rules.pix = req.body.pix || rules.pix;
      rules.boleto = req.body.boleto || rules.boleto;
      rules.cartao = req.body.cartao || rules.cartao;
    }
    await rules.save();

    await createAuditLog({
      action: previousRules ? 'payment_rules_updated' : 'payment_rules_created',
      entityType: 'payment_rules',
      entityId: rules._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        previousRules,
        updatedRules: rules.toObject(),
      },
    });

    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
