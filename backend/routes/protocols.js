import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ProtocolService from '../services/ProtocolService.js';

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

router.post('/', verificarToken, async (req, res) => {
  try {
    const { cliente, precoBase, metodo, parcelas, total } = req.body;
    const protocol = await ProtocolService.criar(
      req.userId,
      cliente,
      precoBase,
      metodo,
      parcelas,
      total
    );
    res.status(201).json(protocol);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});
router.get('/', verificarToken, async (req, res) => {
  try {
    const actor = await User.findById(req.userId);
    const isAdmin = actor?.role === 'admin';
    const protocols = await ProtocolService.listarTodos(req.userId, isAdmin);
    res.json(protocols);
  } catch (err) {
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

router.get('/:id', verificarToken, async (req, res) => {
  try {
    const actor = await User.findById(req.userId);
    const isAdmin = actor?.role === 'admin';
    const protocol = await ProtocolService.obterPorId(req.params.id, req.userId, isAdmin);
    res.json(protocol);
  } catch (err) {
    if (err.message === 'Não autorizado') {
      return res.status(403).json({ message: err.message });
    }
    if (err.message === 'Protocolo não encontrado') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

router.patch('/:id/payment', verificarToken, async (req, res) => {
  try {
    const { parcelaNumero, pago, dataPagamento } = req.body;
    const protocol = await ProtocolService.atualizarStatusPagamento(
      req.params.id,
      req.userId,
      parcelaNumero,
      pago,
      dataPagamento
    );
    res.json(protocol);
  } catch (err) {
    if (err.message === 'Não autorizado') {
      return res.status(403).json({ message: err.message });
    }
    if (err.message === 'Protocolo não encontrado' || err.message === 'Pagamento não encontrado') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Erro no servidor', error: err.message });
  }
});

export default router;
