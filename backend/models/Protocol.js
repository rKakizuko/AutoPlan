import mongoose from 'mongoose';

const protocolSchema = new mongoose.Schema({
  protocolId: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cliente: {
    type: String,
    required: true,
  },
  precoBase: {
    type: Number,
    required: true,
  },
  metodo: {
    type: String,
    enum: ['pix', 'boleto', 'cartao'],
    required: true,
  },
  parcelas: {
    type: Number,
    default: 1,
  },
  total: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  payments: [{
    parcelaNumero: Number,
    valor: Number,
    dataPagamento: Date,
    pago: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Protocol', protocolSchema);
