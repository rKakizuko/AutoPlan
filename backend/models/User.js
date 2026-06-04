import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Email único para login
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // CPF, único por usuário
  cpf: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Estado lógico do usuário para soft delete
  status: {
    type: String,
    enum: ['ativo', 'inativo'],
    default: 'ativo',
  },
  // Senha (criptografada)
  password: {
    type: String,
    required: true,
  },
  // Perfil: 'admin' ou 'user'
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});


userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
