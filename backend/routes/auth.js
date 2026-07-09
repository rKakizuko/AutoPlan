import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import UserService from '../services/UserService.js';

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

router.post('/register', async (req, res) => {
  try {
    const { email, password, cpf } = req.body;
    const result = await UserService.registrar(email, password, cpf);
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Usuário inativo') {
      return res.status(409).json({ message: err.message });
    }
    if (err.message === 'CPF inválido') {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await UserService.autenticar(email, password);
    res.json(result);
  } catch (err) {
    if (err.message === 'Usuário inativo') {
      return res.status(403).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
});

router.get('/me', verificarToken, async (req, res) => {
  try {
    const user = await UserService.obterPerfil(req.userId);
    res.json(user);
  } catch (err) {
    if (err.message === 'Usuário não encontrado') {
      return res.status(404).json({ message: err.message });
    }
    res.status(404).json({ message: err.message });
  }
});

router.put('/me', verificarToken, async (req, res) => {
  try {
    const { email, cpf, password } = req.body;
    const user = await UserService.atualizarPerfil(req.userId, email, cpf, password);
    res.json(user);
  } catch (err) {
    if (err.message === 'Usuário inativo') {
      return res.status(403).json({ message: err.message });
    }
    if (err.message === 'CPF inválido') {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
});

router.get('/users', verificarToken, exigirAdmin, async (req, res) => {
  try {
    const users = await UserService.listarUsuarios();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

router.post('/users', verificarToken, exigirAdmin, async (req, res) => {
  try {
    const { email, password, role, cpf } = req.body;
    const user = await UserService.criarUsuario(email, password, role, cpf, req.userId);
    res.status(201).json(user);
  } catch (err) {
    if (err.message === 'CPF inválido') {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
});

router.put('/users/:id', verificarToken, exigirAdmin, async (req, res) => {
  try {
    const user = await UserService.atualizarUsuario(req.params.id, req.body, req.userId);
    res.json(user);
  } catch (err) {
    if (err.message === 'Usuário inativo') {
      return res.status(409).json({ message: err.message });
    }
    if (err.message === 'CPF inválido') {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/users/:id', verificarToken, exigirAdmin, async (req, res) => {
  try {
    const user = await UserService.deletarUsuario(req.params.id, req.userId);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
