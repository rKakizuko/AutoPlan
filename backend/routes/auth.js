import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserService from '../services/UserService.js';

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

// Verificar se usuário tem permissão de admin
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

// Registro de novo usuário
router.post('/register', async (req, res) => {
  try {
    const { email, password, cpf } = req.body;
    const result = await UserService.register(email, password, cpf);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Autenticação de usuário (gerar token JWT)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await UserService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Obter perfil do usuário autenticado
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await UserService.getProfile(req.userId);
    res.json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// Atualizar dados do próprio perfil
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { email, cpf, password } = req.body;
    const user = await UserService.updateProfile(req.userId, email, cpf, password);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Listar todos os usuários (apenas admin)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await UserService.listUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Criar novo usuário (apenas admin)
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role, cpf } = req.body;
    const user = await UserService.createUser(email, password, role, cpf, req.userId);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Editar dados de usuário (apenas admin)
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body, req.userId);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Deletar usuário (apenas admin)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id, req.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
