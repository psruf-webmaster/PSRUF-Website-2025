export const eventRoleOptions = ['pnm', 'candidate', 'member', 'alumni', 'officer', 'exec', 'webmaster', 'webdev', 'candOfficer'];

export const eventMemberStatusOptions = ['active', 'inactive', 'earlyAlumni', 'seniorStatus', 'co-op', 'dropped'];

export const eventPointCategoryOptions = [
  { label: 'Phi', value: 'phi' },
  { label: 'Sigma', value: 'sigma' },
  { label: 'Rho', value: 'rho' },
  { label: 'Tau', value: 'tau' },
];

export const eventRecurrenceOptions = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

export function createDefaultEventDraft(user) {
  const roles = Array.isArray(user?.role) ? user.role : user?.role ? [user.role] : [];
  const defaultRolesAllowed = roles.includes('candOfficer') ? ['candidate'] : ['member'];

  return {
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    location: '',
    capacityMax: '',
    pointsCategory: 'phi',
    defaultRatePerHour: '10',
    overrideTotalPoints: '',
    rolesAllowed: defaultRolesAllowed,
    memberStatusesAllowed: [],
    isMandatory: false,
    shiftBasedRegistration: false,
    shifts: [],
    recurrenceFrequency: 'none',
    recurrenceEndDate: '',
    isPublished: true,
    existingAttachments: [],
    existingImageUrl: '',
  };
}

export function formatDateTimeLocalInput(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toIsoOrEmpty(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString();
}

export function buildEventDraftFromEvent(event, user) {
  const draft = createDefaultEventDraft(user);
  return {
    ...draft,
    title: event?.title || '',
    description: event?.description || '',
    startAt: formatDateTimeLocalInput(event?.startAt),
    endAt: formatDateTimeLocalInput(event?.endAt),
    location: event?.location || '',
    capacityMax: event?.capacityMax == null ? '' : String(event.capacityMax),
    pointsCategory: event?.points?.category || 'phi',
    defaultRatePerHour: event?.points?.defaultRatePerHour == null ? '10' : String(event.points.defaultRatePerHour),
    overrideTotalPoints: event?.points?.overrideTotalPoints == null ? '' : String(event.points.overrideTotalPoints),
    rolesAllowed: Array.isArray(event?.visibility?.rolesAllowed) ? event.visibility.rolesAllowed : draft.rolesAllowed,
    memberStatusesAllowed: Array.isArray(event?.visibility?.memberStatusesAllowed) ? event.visibility.memberStatusesAllowed : [],
    isMandatory: !!event?.isMandatory,
    shiftBasedRegistration: !!event?.shiftBasedRegistration,
    shifts: Array.isArray(event?.shifts)
      ? event.shifts.map((shift, index) => ({
          shiftId: shift?.shiftId || `${Date.now()}-${index}`,
          label: shift?.label || `Shift ${index + 1}`,
          startAt: formatDateTimeLocalInput(shift?.startAt),
          endAt: formatDateTimeLocalInput(shift?.endAt),
          capacityMax: shift?.capacityMax == null ? '' : String(shift.capacityMax),
        }))
      : [],
    recurrenceFrequency: event?.recurrence?.frequency || 'none',
    recurrenceEndDate: formatDateTimeLocalInput(event?.recurrence?.endDate),
    isPublished: event?.isPublished !== false,
    existingAttachments: Array.isArray(event?.attachments) ? event.attachments : [],
    existingImageUrl: event?.imageUrl || '',
  };
}

export function validateEventDraft(draft) {
  if (!draft.title.trim()) {
    return 'Event title is required.';
  }

  if (!draft.startAt || !draft.endAt) {
    return 'Start and end times are required.';
  }

  const start = new Date(draft.startAt);
  const end = new Date(draft.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Start and end times must be valid.';
  }

  if (end <= start) {
    return 'End time must be after the start time.';
  }

  if (!Array.isArray(draft.rolesAllowed) || draft.rolesAllowed.length === 0) {
    return 'Choose at least one visible role.';
  }

  if (draft.shiftBasedRegistration) {
    for (let index = 0; index < draft.shifts.length; index += 1) {
      const shift = draft.shifts[index];
      if (!shift.label?.trim()) {
        return `Shift ${index + 1} needs a label.`;
      }

      const shiftStart = new Date(shift.startAt);
      const shiftEnd = new Date(shift.endAt);
      if (Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime())) {
        return `Shift ${index + 1} needs valid start and end times.`;
      }

      if (shiftEnd <= shiftStart) {
        return `Shift ${index + 1} must end after it starts.`;
      }
    }
  }

  if (draft.recurrenceFrequency !== 'none' && !draft.recurrenceEndDate) {
    return 'Recurring events need an end date.';
  }

  return '';
}

export function appendEventFormData(formData, draft, { imageAsset, attachmentAssets, applyToSeries = false } = {}) {
  formData.append('title', draft.title.trim());
  formData.append('description', draft.description.trim());
  formData.append('startAt', toIsoOrEmpty(draft.startAt));
  formData.append('endAt', toIsoOrEmpty(draft.endAt));
  formData.append('location', draft.location.trim());
  formData.append('capacityMax', draft.capacityMax);
  formData.append('isMandatory', String(!!draft.isMandatory));
  formData.append('shiftBasedRegistration', String(!!draft.shiftBasedRegistration));
  formData.append('isPublished', String(!!draft.isPublished));
  formData.append('applyToSeries', String(!!applyToSeries));
  formData.append('visibility', JSON.stringify({
    rolesAllowed: draft.rolesAllowed,
    memberStatusesAllowed: draft.memberStatusesAllowed,
  }));
  formData.append('points', JSON.stringify({
    category: draft.pointsCategory,
    defaultRatePerHour: draft.defaultRatePerHour === '' ? '' : Number(draft.defaultRatePerHour),
    overrideTotalPoints: draft.overrideTotalPoints === '' ? '' : Number(draft.overrideTotalPoints),
  }));
  formData.append('recurrence', JSON.stringify({
    frequency: draft.recurrenceFrequency,
    endDate: toIsoOrEmpty(draft.recurrenceEndDate),
  }));
  formData.append('shifts', JSON.stringify((draft.shifts || []).map((shift) => ({
    shiftId: shift.shiftId,
    label: shift.label.trim(),
    startAt: toIsoOrEmpty(shift.startAt),
    endAt: toIsoOrEmpty(shift.endAt),
    capacityMax: shift.capacityMax === '' ? '' : Number(shift.capacityMax),
  }))));
  formData.append('attachments', JSON.stringify(draft.existingAttachments || []));

  if (imageAsset?.uri) {
    formData.append('image', {
      uri: imageAsset.uri,
      name: imageAsset.name || imageAsset.fileName || 'event-image.jpg',
      type: imageAsset.mimeType || imageAsset.type || 'image/jpeg',
    });
  } else if (draft.existingImageUrl) {
    formData.append('imageUrl', draft.existingImageUrl);
  }

  (attachmentAssets || []).forEach((asset, index) => {
    if (!asset?.uri) {
      return;
    }

    formData.append('attachments', {
      uri: asset.uri,
      name: asset.name || asset.fileName || `attachment-${index + 1}`,
      type: asset.mimeType || asset.type || 'application/octet-stream',
    });
  });
}