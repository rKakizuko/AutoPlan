import AuditLog from '../models/AuditLog.js';

export const registrarLogAuditoria = async ({ action, entityType, entityId = null, actorId = null, actorEmail = 'system', details = {} }) => {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      actorId,
      actorEmail,
      details,
    });
  } catch (err) {
    console.error('Falha ao criar log de auditoria:', err.message);
  }
};