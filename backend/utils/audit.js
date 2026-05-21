import AuditLog from '../models/AuditLog.js';

// Registrar uma ação do usuário no log de auditoria
export const createAuditLog = async ({ action, entityType, entityId = null, actorId = null, actorEmail = 'system', details = {} }) => {
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
    console.error('Failed to create audit log:', err.message);
  }
};