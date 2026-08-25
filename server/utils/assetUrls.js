function normalizeAssetUrl(value) {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('/uploads/')) return '';

  try {
    const parsed = new URL(trimmed, 'https://placeholder.local');
    if (parsed.pathname.startsWith('/uploads/')) {
      return '';
    }
  } catch (_err) {
    return '';
  }

  return trimmed;
}

function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;

  const url = normalizeAssetUrl(
    attachment.url || attachment.src || attachment.link || ''
  );

  if (!url) return null;

  return {
    ...attachment,
    url,
  };
}

function normalizeAttachmentList(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments.map(normalizeAttachment).filter(Boolean);
}

module.exports = {
  normalizeAssetUrl,
  normalizeAttachment,
  normalizeAttachmentList,
};