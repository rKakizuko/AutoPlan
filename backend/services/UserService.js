import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createAuditLog } from '../utils/audit.js';

const normalizeCpf = (value = '') => value.replace(/\D/g, '');
const isValidCpf = (value = '') => {
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

const isActiveUser = (user) => user?.status !== 'inativo';

const findActiveUserById = (userId) => User.findOne({
  _id: userId,
  $or: [{ status: 'ativo' }, { status: { $exists: false } }],
});

class UserService {
  /**
   * Registra novo usuário no sistema
   */
  async register(email, password, cpf) {
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    const normalizedCpf = normalizeCpf(cpf || '');

    if (!normalizedCpf) {
      throw new Error('CPF is required');
    }

    if (!isValidCpf(normalizedCpf)) {
      throw new Error('CPF is invalid');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    if (normalizedCpf) {
      const existingCpf = await User.findOne({ cpf: normalizedCpf });
      if (existingCpf) {
        throw new Error('CPF already in use');
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

  /**
   * Autentica usuário e gera token JWT
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!isActiveUser(user)) {
      throw new Error('User inactive');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
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

  /**
   * Obtém perfil do usuário autenticado
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    const user = await findActiveUserById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Atualiza dados do perfil do usuário
   * @param {string} userId
   * @param {string} email
   * @param {string} cpf - optional
   * @param {string} password - optional
   * @returns {Promise<object>}
   */
  async updateProfile(userId, email, cpf, password) {
    if (!email) {
      throw new Error('Email is required');
    }

    const normalizedCpf = normalizeCpf(cpf || '');

    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      throw new Error('CPF is invalid');
    }

    if (password && password.length < 6) {
      throw new Error('Password must have at least 6 characters');
    }

    const user = await findActiveUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
    if (emailInUse) {
      throw new Error('Email already in use');
    }

    if (normalizedCpf) {
      const cpfInUse = await User.findOne({ cpf: normalizedCpf, _id: { $ne: userId } });
      if (cpfInUse) {
        throw new Error('CPF already in use');
      }
    }

    user.email = email;
    user.cpf = normalizedCpf || undefined;
    if (password) {
      user.password = password;
    }
    user.updatedAt = new Date();

    await user.save();

    await createAuditLog({
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

  /**
   * Lista todos os usuários do sistema
   * @returns {Promise<array>}
   */
  async listUsers() {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    return users;
  }

  /**
   * Cria novo usuário (por admin)
   * @param {string} email
   * @param {string} password
   * @param {string} role - 'admin' | 'user'
   * @param {string} cpf - optional
   * @param {string} actorId - admin user id
   * @returns {Promise<object>}
   */
  async createUser(email, password, role, cpf, actorId) {
    const normalizedCpf = normalizeCpf(cpf || '');

    if (!email || !password) {
      throw new Error('Email and password required');
    }

    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      throw new Error('CPF is invalid');
    }

    if (password.length < 6) {
      throw new Error('Password must have at least 6 characters');
    }

    if (role && !['admin', 'user'].includes(role)) {
      throw new Error('Invalid role');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    if (normalizedCpf) {
      const existingCpf = await User.findOne({ cpf: normalizedCpf });
      if (existingCpf) {
        throw new Error('CPF already in use');
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
    await createAuditLog({
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

  /**
   * Update a user (admin only)
   * @param {string} userId
   * @param {object} updates - {email, password, role, cpf}
   * @param {string} actorId - admin user id
   * @returns {Promise<object>}
   */
  async updateUser(userId, updates, actorId) {
    const { email, password, role, cpf } = updates;
    const normalizedCpf = normalizeCpf(cpf || '');

    if (!email) {
      throw new Error('Email is required');
    }
    if (!normalizedCpf) {
    throw new Error('CPF obrigatorio');
  }

    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      throw new Error('CPF is invalid');
    }

    if (role && !['admin', 'user'].includes(role)) {
      throw new Error('Invalid role');
    }

    const user = await findActiveUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
    if (emailInUse) {
      throw new Error('Email already in use');
    }

    if (normalizedCpf) {
      const cpfInUse = await User.findOne({ cpf: normalizedCpf, _id: { $ne: userId } });
      if (cpfInUse) {
        throw new Error('CPF already in use');
      }
    }

    user.email = email;
    user.cpf = normalizedCpf || undefined;
    user.role = role || user.role;
    user.updatedAt = new Date();

    if (password) {
      if (password.length < 6) {
        throw new Error('Senha precisa ter no minimo 6 caracteres');
      }
      user.password = password;
    }

    await user.save();

    const actor = await User.findById(actorId);
    await createAuditLog({
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

  /**
   * Delete a user (admin only)
   * @param {string} userId
   * @param {string} actorId - admin user id
   */
  async deleteUser(userId, actorId) {
    if (actorId.toString() === userId.toString()) {
      throw new Error('You cannot delete your own user');
    }

    const deletedUser = await User.findById(userId);
    if (!deletedUser) {
      throw new Error('User not found');
    }

    if (!isActiveUser(deletedUser)) {
      return deletedUser;
    }

    deletedUser.status = 'inativo';
    deletedUser.deletedAt = new Date();
    deletedUser.updatedAt = new Date();
    await deletedUser.save();

    const actor = await User.findById(actorId);
    await createAuditLog({
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
