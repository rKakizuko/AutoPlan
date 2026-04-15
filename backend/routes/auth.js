import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createAuditLog } from '../utils/audit.js';

const router = express.Router();

const normalizeCpf = (value = '') => value.replace(/\D/g, '');

const isValidCpfFormat = (value = '') => /^\d{11}$/.test(value);

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

// Middleware to require admin role
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

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, cpf } = req.body;
    const normalizedCpf = normalizeCpf(cpf || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    if (normalizedCpf && !isValidCpfFormat(normalizedCpf)) {
      return res.status(400).json({ message: 'CPF must have 11 digits' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (normalizedCpf) {
      const existingCpf = await User.findOne({ cpf: normalizedCpf });
      if (existingCpf) {
        return res.status(400).json({ message: 'CPF already in use' });
      }
    }

    const user = new User({
      email,
      password,
      cpf: normalizedCpf || undefined,
      role: 'user',
    });
    await user.save();
    await createAuditLog({
      action: 'user_registered',
      entityType: 'user',
      entityId: user._id.toString(),
      actorEmail: user.email,
      details: { email: user.email, cpf: user.cpf, role: user.role },
    });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user: { id: user._id, email: user.email, cpf: user.cpf, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    await createAuditLog({
      action: 'user_logged_in',
      entityType: 'auth',
      entityId: user._id.toString(),
      actorId: user._id,
      actorEmail: user.email,
      details: { email: user.email, role: user.role },
    });

    res.json({ token, user: { id: user._id, email: user.email, cpf: user.cpf, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get own profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId, '-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update own profile
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { email, cpf, password } = req.body;
    const normalizedCpf = normalizeCpf(cpf || '');

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (normalizedCpf && !isValidCpfFormat(normalizedCpf)) {
      return res.status(400).json({ message: 'CPF must have 11 digits' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must have at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const emailInUse = await User.findOne({ email, _id: { $ne: req.userId } });
    if (emailInUse) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    if (normalizedCpf) {
      const cpfInUse = await User.findOne({ cpf: normalizedCpf, _id: { $ne: req.userId } });
      if (cpfInUse) {
        return res.status(400).json({ message: 'CPF already in use' });
      }
    }

    user.email = email;
    user.cpf = normalizedCpf || undefined;
    if (password) {
      user.password = password;
    }

    await user.save();

    await createAuditLog({
      action: 'user_profile_updated',
      entityType: 'user',
      entityId: user._id.toString(),
      actorId: user._id,
      actorEmail: user.email,
      details: { email: user.email, cpf: user.cpf },
    });

    res.json({
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// List users (admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create user (admin only)
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role, cpf } = req.body;
    const normalizedCpf = normalizeCpf(cpf || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    if (normalizedCpf && !isValidCpfFormat(normalizedCpf)) {
      return res.status(400).json({ message: 'CPF must have 11 digits' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must have at least 6 characters' });
    }

    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (normalizedCpf) {
      const existingCpf = await User.findOne({ cpf: normalizedCpf });
      if (existingCpf) {
        return res.status(400).json({ message: 'CPF already in use' });
      }
    }

    const user = new User({
      email,
      password,
      cpf: normalizedCpf || undefined,
      role: role || 'user',
    });
    await user.save();
    await createAuditLog({
      action: 'user_created',
      entityType: 'user',
      entityId: user._id.toString(),
      actorId: req.userId,
      actorEmail: (await User.findById(req.userId))?.email || 'system',
      details: { email: user.email, cpf: user.cpf, role: user.role },
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update user (admin only)
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role, cpf } = req.body;
    const normalizedCpf = normalizeCpf(cpf || '');

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (normalizedCpf && !isValidCpfFormat(normalizedCpf)) {
      return res.status(400).json({ message: 'CPF must have 11 digits' });
    }

    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const emailInUse = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (emailInUse) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    if (normalizedCpf) {
      const cpfInUse = await User.findOne({ cpf: normalizedCpf, _id: { $ne: req.params.id } });
      if (cpfInUse) {
        return res.status(400).json({ message: 'CPF already in use' });
      }
    }

    user.email = email;
    user.cpf = normalizedCpf || undefined;
    user.role = role || user.role;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must have at least 6 characters' });
      }
      user.password = password;
    }

    await user.save();
    await createAuditLog({
      action: 'user_updated',
      entityType: 'user',
      entityId: user._id.toString(),
      actorId: req.userId,
      actorEmail: (await User.findById(req.userId))?.email || 'system',
      details: { email: user.email, cpf: user.cpf, role: user.role },
    });

    res.json({
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (req.userId.toString() === req.params.id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own user' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await createAuditLog({
      action: 'user_deleted',
      entityType: 'user',
      entityId: deletedUser._id.toString(),
      actorId: req.userId,
      actorEmail: (await User.findById(req.userId))?.email || 'system',
      details: { email: deletedUser.email, cpf: deletedUser.cpf, role: deletedUser.role },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
