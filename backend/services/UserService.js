import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { registrarLogAuditoria } from '../utils/audit.js';

const normalizarCpf = (value = '') => value.replace(/\D/g, '');
const cpfValido = (value = '') => {
  if (!/^\d{11}$/.test(value)) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(value)) {
    return false;
  }

  const digits = value.split('').map(Number);

  const calculateDigit = (baseDigits, factorStart) => {
    const sum = baseDigits.reduce((accumulator, digit, index) => accumulator + digit * (factorStart - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 9), 10);
  const secondDigit = calculateDigit(digits.slice(0, 10), 11);

  return firstDigit === digits[9] && secondDigit === digits[10];
};

const usuarioAtivo = (user) => user?.status !== 'inativo';

const buscarUsuarioAtivoPorId = (userId) => User.findOne({
  _id: userId,
  $or: [{ status: 'ativo' }, { status: { $exists: false } }],
});

class UserService {
  async registrar(email, password, cpf) {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    const normalizedCpf = normalizarCpf(cpf || '');

    if (!normalizedCpf) {
      throw new Error('CPF é obrigatório');
    }

    if (!cpfValido(normalizedCpf)) {
      throw new Error('CPF inválido');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Usuário já existe');
    }

    if (normalizedCpf) {
      const existingCpf = await User.findOne({ cpf: normalizedCpf });
      if (existingCpf) {
        throw new Error('CPF já está em uso');
      }
    }

    const user = new User({
      email,
      password,
      cpf: normalizedCpf || undefined,
      role: 'user',
    });
    await user.save();

    await registrarLogAuditoria({
      action: 'user_registered',
      entityType: 'user',
      entityId: user._id.toString(),
      actorEmail: user.email,
      details: { email: user.email, cpf: user.cpf, role: user.role },
    });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
      },
    };
  }

  async autenticar(email, password) {
    if (!email || !password) {
      throw new Error('Email e senha devem ser preenchidos');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    if (!usuarioAtivo(user)) {
      throw new Error('Usuário inativo');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    await registrarLogAuditoria({
      action: 'user_logged_in',
      entityType: 'auth',
      entityId: user._id.toString(),
      actorId: user._id,
      actorEmail: user.email,
      details: { email: user.email, role: user.role },
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
      },
    };
  }

  async obterPerfil(userId) {
    const user = await buscarUsuarioAtivoPorId(userId).select('-password');
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return {
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async atualizarPerfil(userId, email, cpf, password) {
    if (!email) {
      throw new Error('Email deve ser preenchido');
    }

    const normalizedCpf = normalizarCpf(cpf || '');

    if (normalizedCpf && !cpfValido(normalizedCpf)) {
      throw new Error('CPF é inválido');
    }

    if (password && password.length < 6) {
      throw new Error('A senha precisa conter pelo menos 6 caracteres');
    }

    const user = await buscarUsuarioAtivoPorId(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
    if (emailInUse) {
      throw new Error('Email já existe');
    }

    if (normalizedCpf) {
      const cpfInUse = await User.findOne({ cpf: normalizedCpf, _id: { $ne: userId } });
      if (cpfInUse) {
        throw new Error('CPF já existe');
      }
    }

    user.email = email;
    user.cpf = normalizedCpf || undefined;
    if (password) {
      user.password = password;
    }
    user.updatedAt = new Date();

    await user.save();

    await registrarLogAuditoria({
      action: 'user_profile_updated',
      entityType: 'user',
      entityId: user._id.toString(),
      actorId: user._id,
      actorEmail: user.email,
      details: { email: user.email, cpf: user.cpf },
    });

    return {
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async listarUsuarios() {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    return users;
  }

  async criarUsuario(email, password, role, cpf, actorId) {
    const normalizedCpf = normalizarCpf(cpf || '');

    if (!email || !password) {
      throw new Error('Email e senha devem ser preenchidos');
    }

    if (normalizedCpf && !cpfValido(normalizedCpf)) {
      throw new Error('CPF inválido');
    }

    if (password.length < 6) {
      throw new Error('A senha deve conter pelo menos 6 caracteres');
    }

    if (role && !['admin', 'user'].includes(role)) {
      throw new Error('Função inválida');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Usuário já existe');
    }

    if (normalizedCpf) {
      const existingCpf = await User.findOne({ cpf: normalizedCpf });
      if (existingCpf) {
        throw new Error('CPF já está em uso');
      }
    }

    const user = new User({
      email,
      password,
      cpf: normalizedCpf || undefined,
      role: role || 'user',
      status: 'ativo',
      updatedAt: new Date(),
      deletedAt: null,
    });
    await user.save();

    const actor = await User.findById(actorId);
    await registrarLogAuditoria({
      action: 'user_created',
      entityType: 'user',
      entityId: user._id.toString(),
      actorId: actorId,
      actorEmail: actor?.email || 'system',
      details: { email: user.email, cpf: user.cpf, role: user.role },
    });

    return {
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async atualizarUsuario(userId, updates, actorId) {
    const { email, password, role, cpf } = updates;
    const normalizedCpf = normalizarCpf(cpf || '');

    if (!email) {
      throw new Error('Email obrigatório');
    }
    if (!normalizedCpf) {
      throw new Error('CPF obrigatório');
    }

    if (normalizedCpf && !cpfValido(normalizedCpf)) {
      throw new Error('CPF inválido');
    }

    if (role && !['admin', 'user'].includes(role)) {
      throw new Error('Função inválida');
    }

    const user = await buscarUsuarioAtivoPorId(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
    if (emailInUse) {
      throw new Error('Email já existe');
    }

    if (normalizedCpf) {
      const cpfInUse = await User.findOne({ cpf: normalizedCpf, _id: { $ne: userId } });
      if (cpfInUse) {
        throw new Error('CPF já existe');
      }
    }

    user.email = email;
    user.cpf = normalizedCpf || undefined;
    user.role = role || user.role;
    user.updatedAt = new Date();

    if (password) {
      if (password.length < 6) {
        throw new Error('A senha precisa ter pelo menos 6 caracteres');
      }
      user.password = password;
    }

    await user.save();

    const actor = await User.findById(actorId);
    await registrarLogAuditoria({
      action: 'user_updated',
      entityType: 'user',
      entityId: user._id.toString(),
      actorId: actorId,
      actorEmail: actor?.email || 'system',
      details: { email: user.email, cpf: user.cpf, role: user.role },
    });

    return {
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async deletarUsuario(userId, actorId) {
    if (actorId.toString() === userId.toString()) {
      throw new Error('Não é possível excluir o próprio usuário');
    }

    const deletedUser = await User.findById(userId);
    if (!deletedUser) {
      throw new Error('Usuário não encontrado');
    }

    if (!usuarioAtivo(deletedUser)) {
      return deletedUser;
    }

    deletedUser.status = 'inativo';
    deletedUser.deletedAt = new Date();
    deletedUser.updatedAt = new Date();
    await deletedUser.save();

    const actor = await User.findById(actorId);
    await registrarLogAuditoria({
      action: 'user_inactivated',
      entityType: 'user',
      entityId: deletedUser._id.toString(),
      actorId: actorId,
      actorEmail: actor?.email || 'system',
      details: { email: deletedUser.email, cpf: deletedUser.cpf, role: deletedUser.role },
    });

    return deletedUser;
  }
}

export default new UserService();
