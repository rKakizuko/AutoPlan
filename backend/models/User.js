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
  // CPF opcional, único por usuário
  cpf: {
    type: String,
    unique: true,
    sparse: true,
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
