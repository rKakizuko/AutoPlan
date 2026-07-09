import PaymentRules from '../models/PaymentRules.js';
import User from '../models/User.js';
import { registrarLogAuditoria } from '../utils/audit.js';

class PaymentRulesService {
  async get() {
    let rules = await PaymentRules.findOne();
    if (!rules) {
      rules = new PaymentRules();
      await rules.save();
    }
    return rules;
  }

  async atualizar(updates, actorId) {
    const actor = await User.findById(actorId);
    let rules = await PaymentRules.findOne();
    const previousRules = rules ? rules.toObject() : null;

    if (!rules) {
      rules = new PaymentRules(updates);
    } else {
      rules.pix = updates.pix || rules.pix;
      rules.boleto = updates.boleto || rules.boleto;
      rules.cartao = updates.cartao || rules.cartao;
    }
    await rules.save();

    await registrarLogAuditoria({
      action: previousRules ? 'payment_rules_updated' : 'payment_rules_created',
      entityType: 'payment_rules',
      entityId: rules._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        previousRules,
        updatedRules: rules.toObject(),
      },
    });

    return rules;
  }
}

export default new PaymentRulesService();
