import Protocol from '../models/Protocol.js';
import User from '../models/User.js';
import { createAuditLog } from '../utils/audit.js';

class ProtocolService {
  /**
   * Cria novo protocolo de pagamento com parcelas
   * @param {string} userId
   * @param {string} cliente
   * @param {number} precoBase
   * @param {string} metodo - 'pix' | 'boleto' | 'cartao'
   * @param {number} parcelas
   * @param {number} total
   * @returns {Promise<object>}
   */
  async create(userId, cliente, precoBase, metodo, parcelas, total) {
    const actor = await User.findById(userId);

    const protocolId = `PROTO-${Date.now()}`;

    const numParcelas = parcelas || 1;
    const parcelaValue = total / numParcelas;
    const payments = [];
    for (let i = 1; i <= numParcelas; i++) {
      payments.push({
        parcelaNumero: i,
        valor: parcelaValue,
        pago: false,
      });
    }

    const protocol = new Protocol({
      protocolId,
      userId,
      cliente,
      precoBase,
      metodo,
      parcelas: numParcelas,
      total,
      payments,
    });

    await protocol.save();

    await createAuditLog({
      action: 'protocol_created',
      entityType: 'protocol',
      entityId: protocol._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        protocolId,
        cliente,
        precoBase,
        metodo,
        parcelas: numParcelas,
        total,
      },
    });

    return protocol;
  }

  /**
   * Lista protocolos (filtro por admin ou usuário)
   * @param {string} userId
   * @param {boolean} isAdmin
   * @returns {Promise<array>}
   */
  async getAll(userId, isAdmin) {
    const filter = isAdmin ? {} : { userId };
    const protocols = await Protocol.find(filter).sort({ createdAt: -1 });
    return protocols;
  }

  /**
   * Obtém um protocolo com verificação de permissão
   * @param {string} protocolId
   * @param {string} userId
   * @param {boolean} isAdmin
   * @returns {Promise<object>}
   */
  async getById(protocolId, userId, isAdmin) {
    const protocol = await Protocol.findById(protocolId);

    if (!protocol) {
      throw new Error('Protocol not found');
    }

    if (!isAdmin && protocol.userId.toString() !== userId.toString()) {
      throw new Error('Not authorized');
    }

    return protocol;
  }

  /**
   * Atualiza status de pagamento de uma parcela
   * @param {string} protocolId
   * @param {string} userId
   * @param {number} parcelaNumero
   * @param {boolean} pago
   * @param {Date} dataPagamento - optional
   * @returns {Promise<object>}
   */
  async updatePaymentStatus(protocolId, userId, parcelaNumero, pago, dataPagamento) {
    const protocol = await Protocol.findById(protocolId);

    if (!protocol) {
      throw new Error('Protocol not found');
    }

    if (protocol.userId.toString() !== userId.toString()) {
      throw new Error('Not authorized');
    }

    const payment = protocol.payments.find((p) => p.parcelaNumero === parcelaNumero);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.pago = pago;
    if (pago) {
      payment.dataPagamento = dataPagamento || new Date();
    } else {
      payment.dataPagamento = null;
    }

    await protocol.save();

    const actor = await User.findById(userId);
    await createAuditLog({
      action: 'protocol_payment_updated',
      entityType: 'protocol_payment',
      entityId: protocol._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        protocolId: protocol.protocolId,
        parcelaNumero,
        pago,
        dataPagamento: payment.dataPagamento,
      },
    });

    return protocol;
  }
}

export default new ProtocolService();
