import mongoose from 'mongoose';

const PaymentRulesSchema = new mongoose.Schema({
  pix: {
    nome: { type: String, default: 'PIX (10% OFF)' },
    taxa: { type: Number, default: -0.10 }
  },
  boleto: {
    nome: { type: String, default: 'Boleto (5% Taxa)' },
    taxa: { type: Number, default: 0.05 },
    parcelas: { type: Boolean, default: true }
  },
  cartao: {
    taxaOperadora: { type: Number, default: 0.04 },
    jurosMensal: { type: Number, default: 0.0249 },
    parcelas: { type: Boolean, default: true }
  }
}, { timestamps: true });

export default mongoose.model('PaymentRules', PaymentRulesSchema);