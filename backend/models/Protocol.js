import mongoose from 'mongoose';

const protocolSchema = new mongoose.Schema({
  // ID único do protocolo
  protocolId: {
    type: String,
    unique: true,
    required: true,
  },
  // Referência ao usuário que criou
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Nome do cliente
  cliente: {
    type: String,
    required: true,
  },
  // Preço base antes de taxas
  precoBase: {
    type: Number,
    required: true,
  },
  // Método de pagamento: 'pix' | 'boleto' | 'cartao'
  metodo: {
    type: String,
    enum: ['pix', 'boleto', 'cartao'],
    required: true,
  },
  // Quantidade de parcelas
  parcelas: {
    type: Number,
    default: 1,
  },
  // Valor total com taxas aplicadas
  total: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  // Detalhes de cada parcela (valor, data, status)
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
