import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../../src/components/AppScreen';
import { AttachmentPill, ChoiceChips, InfoBlock, LabeledInput, ListItem, Notice, ScreenHero, ToggleTile } from '../../../src/components/MobileUI';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders } from '../../../src/lib/api';
import { memberStatusOptions, roleOptions, rsvpStatusOptions } from '../../../src/lib/adminOptions';
import { appendEventFormData, buildEventDraftFromEvent, createDefaultEventDraft, eventMemberStatusOptions, eventPointCategoryOptions, eventRecurrenceOptions, eventRoleOptions, formatDateTimeLocalInput, validateEventDraft } from '../../../src/lib/eventForm';

function formatDateTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date pending';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams();
  const { user } = useAuth();
  const headers = useMemo(() => authHeaders(user), [user]);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manageData, setManageData] = useState(null);
  const [cohostOptions, setCohostOptions] = useState([]);
  const [selectedCohostIds, setSelectedCohostIds] = useState([]);
  const [massRoles, setMassRoles] = useState([]);
  const [massStatuses, setMassStatuses] = useState([]);
  const [massRsvpStatus, setMassRsvpStatus] = useState('going');
  const [memberQuery, setMemberQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [manualRsvpStatus, setManualRsvpStatus] = useState('going');
  const [manualAttendanceStatus, setManualAttendanceStatus] = useState('present');
  const [manualPoints, setManualPoints] = useState('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorDraft, setEditorDraft] = useState(createDefaultEventDraft(user));
  const [editorError, setEditorError] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const [editorImageAsset, setEditorImageAsset] = useState(null);
  const [editorAttachmentAssets, setEditorAttachmentAssets] = useState([]);
  const [editorPickerField, setEditorPickerField] = useState(null);
  const [applyEditToSeries, setApplyEditToSeries] = useState(false);

  function toggleValue(values, nextValue) {
    return values.includes(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue];
  }

  function updateEditorDraft(key, value) {
    setEditorDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleEditorList(key, value) {
    setEditorDraft((current) => {
      const list = current[key] || [];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value],
      };
    });
  }

  function updateEditorShift(index, key, value) {
    setEditorDraft((current) => ({
      ...current,
      shifts: current.shifts.map((shift, shiftIndex) => shiftIndex === index ? { ...shift, [key]: value } : shift),
    }));
  }

  function addEditorShift() {
    setEditorDraft((current) => ({
      ...current,
      shifts: [...current.shifts, {
        shiftId: `${Date.now()}-${current.shifts.length + 1}`,
        label: `Shift ${current.shifts.length + 1}`,
        startAt: current.startAt,
        endAt: current.endAt,
        capacityMax: '',
      }],
    }));
  }

  function removeEditorShift(index) {
    setEditorDraft((current) => ({
      ...current,
      shifts: current.shifts.filter((_, shiftIndex) => shiftIndex !== index),
    }));
  }

  function openEditor() {
    setEditorDraft(buildEventDraftFromEvent(event, user));
    setEditorVisible(true);
    setEditorError('');
    setEditorMessage('');
    setEditorImageAsset(null);
    setEditorAttachmentAssets([]);
    setApplyEditToSeries(false);
  }

  async function pickEditorImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setEditorError('Photo library permission is required to select an event image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setEditorImageAsset({ uri: asset.uri, name: asset.fileName || 'event-image.jpg', mimeType: asset.mimeType || 'image/jpeg' });
    }
  }

  async function pickEditorAttachments() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    });

    if (result.canceled) {
      return;
    }

    setEditorAttachmentAssets((current) => [...current, ...(result.assets || []).map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/octet-stream',
    }))]);
  }

  async function saveEventEdits() {
    const validationError = validateEventDraft(editorDraft);
    if (validationError) {
      setEditorError(validationError);
      return;
    }

    setSaving(true);
    setEditorError('');
    setEditorMessage('');

    try {
      const formData = new FormData();
      appendEventFormData(formData, editorDraft, {
        imageAsset: editorImageAsset,
        attachmentAssets: editorAttachmentAssets,
        applyToSeries: applyEditToSeries,
      });
      await api.patch(`/events/${eventId}`, formData, { headers });
      setEditorMessage('Event updated.');
      await loadEvent();
      await loadManage();
      setEditorVisible(false);
    } catch (requestError) {
      setEditorError(requestError?.response?.data?.message || requestError.message || 'Unable to update this event.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentEvent() {
    if (!eventId) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.delete(`/events/${eventId}`, {
        params: { scope: event?.recurrence?.seriesId ? 'series' : 'single' },
        headers,
      });
      setEvent(null);
      setManageData(null);
      setEditorVisible(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to delete event.');
    } finally {
      setSaving(false);
    }
  }

  function renderEditorDateField(label, value, fieldKey, onChangeValue) {
    const parsed = value ? new Date(value) : new Date();
    return (
      <View className="gap-2">
        <Text className="text-sm font-semibold text-ink">{label}</Text>
        <Pressable onPress={() => setEditorPickerField(fieldKey)} className="rounded-3xl border border-line bg-white px-4 py-4">
          <Text className="text-base text-ink">{value ? formatDateTime(value) : 'Choose date and time'}</Text>
        </Pressable>
        {editorPickerField === fieldKey ? (
          <DateTimePicker
            value={parsed}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, selectedDate) => {
              if (Platform.OS !== 'ios') {
                setEditorPickerField(null);
              }

              if (selectedDate) {
                onChangeValue(formatDateTimeLocalInput(selectedDate.toISOString()));
              }
            }}
          />
        ) : null}
      </View>
    );
  }

  async function loadEvent() {
    if (!eventId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/events/${eventId}`, { headers });
      setEvent(response.data || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to load event.');
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadManage() {
    if (!eventId) {
      return;
    }

    try {
      const [manageResponse, cohostResponse] = await Promise.all([
        api.get(`/events/${eventId}/manage`, { headers }),
        api.get('/users/cohosts', { headers }),
      ]);

      setManageData(manageResponse.data || null);
      setSelectedCohostIds((manageResponse.data?.event?.coHosts || []).map((entry) => entry?._id || entry).filter(Boolean));
      setCohostOptions(Array.isArray(cohostResponse.data) ? cohostResponse.data : []);
    } catch (_requestError) {
      setManageData(null);
      setCohostOptions([]);
    }
  }

  async function setRsvp(status) {
    if (!eventId) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post(`/events/${eventId}/rsvp`, { status }, { headers });
      await loadEvent();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to update RSVP.');
    } finally {
      setSaving(false);
    }
  }

  async function saveCohosts() {
    if (!eventId) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.patch(`/events/${eventId}/cohosts`, { coHostIds: selectedCohostIds }, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      await loadManage();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to save co-hosts.');
    } finally {
      setSaving(false);
    }
  }

  async function runMassRsvp() {
    if (!eventId) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post(`/events/${eventId}/mass-rsvp`, {
        roles: massRoles,
        memberStatuses: massStatuses,
        status: massRsvpStatus,
      }, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      await loadEvent();
      await loadManage();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to mass RSVP members.');
    } finally {
      setSaving(false);
    }
  }

  async function addManagedMember() {
    if (!eventId || !selectedMemberId) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post(`/events/${eventId}/manage-members`, {
        userId: selectedMemberId,
        rsvpStatus: manualRsvpStatus,
        attendanceStatus: manualAttendanceStatus,
        pointsAwarded: manualPoints === '' ? undefined : Number(manualPoints),
      }, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      setSelectedMemberId('');
      setMemberQuery('');
      setManualPoints('');
      await loadEvent();
      await loadManage();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to add member to event.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadEvent();
    loadManage();
  }, [eventId, headers]);

  const filteredMembers = (manageData?.eligibleMembers || [])
    .filter((member) => `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().includes(memberQuery.toLowerCase()))
    .slice(0, 12);

  return (
    <AppScreen scroll>
      {loading ? <Text className="text-base text-muted">Loading event...</Text> : null}
      {error ? <Notice tone="warning" text={error} /> : null}
      {event ? (
        <>
          <ScreenHero
            eyebrow="Event details"
            title={event.title || 'Chapter event'}
            description={`${formatDateTime(event.startAt)}${event.location ? ` • ${event.location}` : ''}`}
          />

          <InfoBlock title="About this event" detail={event.description || 'No description posted yet.'} />

          {manageData ? (
            <InfoBlock title="Creator tools" detail="Use the same create, edit, and delete endpoints from the website on this native screen.">
              <View className="flex-row flex-wrap gap-3">
                <Pressable onPress={openEditor} className="rounded-full border border-line bg-card px-5 py-3">
                  <Text className="text-sm font-semibold text-ink">Edit event</Text>
                </Pressable>
                <Pressable onPress={deleteCurrentEvent} disabled={saving} className="rounded-full bg-[#8b3f3f] px-5 py-3">
                  <Text className="text-sm font-semibold text-white">Delete event</Text>
                </Pressable>
              </View>
            </InfoBlock>
          ) : null}

          <InfoBlock title="Attendance" detail={`Current RSVP: ${event.currentUserRsvp || 'none'}`}>
            <View className="mt-2 flex-row flex-wrap gap-3">
              {rsvpStatusOptions.map((option) => {
                const selected = event.currentUserRsvp === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setRsvp(option.value)}
                    disabled={saving}
                    className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
                  >
                    <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </InfoBlock>

          {manageData ? (
            <>
              <InfoBlock title="Manage event" detail={`RSVPs: ${manageData.goingCount || 0} going, ${manageData.maybeCount || 0} maybe, ${manageData.notGoingCount || 0} not going`}>
                <Text className="text-sm leading-6 text-muted">This mobile screen now exposes the same event-management routes as the website for co-host assignment, targeted RSVP actions, and manual member additions.</Text>
              </InfoBlock>

              <InfoBlock title="Co-hosts" detail="Select up to 7 approved officer-level co-hosts.">
                <ChoiceChips
                  options={cohostOptions.map((option) => ({ label: `${option.firstName || ''} ${option.lastName || ''}`.trim() || 'Member', value: option._id }))}
                  selectedValues={selectedCohostIds}
                  onToggle={(value) => setSelectedCohostIds((current) => current.includes(value) ? current.filter((item) => item !== value) : current.length >= 7 ? current : [...current, value])}
                />
                <Pressable onPress={saveCohosts} disabled={saving} className="mt-3 rounded-full bg-accent px-5 py-3">
                  <Text className="text-center text-sm font-semibold text-white">{saving ? 'Saving...' : 'Save co-hosts'}</Text>
                </Pressable>
              </InfoBlock>

              <InfoBlock title="Mass RSVP" detail="Target roles and member statuses, then apply a single RSVP state.">
                <Text className="text-sm font-semibold text-ink">Roles</Text>
                <ChoiceChips options={roleOptions} selectedValues={massRoles} onToggle={(value) => setMassRoles((current) => toggleValue(current, value))} />
                <Text className="mt-3 text-sm font-semibold text-ink">Member statuses</Text>
                <ChoiceChips options={memberStatusOptions} selectedValues={massStatuses} onToggle={(value) => setMassStatuses((current) => toggleValue(current, value))} />
                <Text className="mt-3 text-sm font-semibold text-ink">RSVP result</Text>
                <ChoiceChips options={rsvpStatusOptions} selectedValues={massRsvpStatus} onToggle={(value) => setMassRsvpStatus(value)} multi={false} />
                <Pressable onPress={runMassRsvp} disabled={saving} className="mt-3 rounded-full bg-accent px-5 py-3">
                  <Text className="text-center text-sm font-semibold text-white">{saving ? 'Saving...' : 'Run mass RSVP'}</Text>
                </Pressable>
              </InfoBlock>

              <InfoBlock title="Add or update one member" detail="Search eligible members, then assign RSVP and attendance in one action.">
                <TextInput value={memberQuery} onChangeText={setMemberQuery} placeholder="Search eligible members" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
                {filteredMembers.map((member) => (
                  <Pressable key={member._id} onPress={() => setSelectedMemberId(member._id)} className={`rounded-[24px] border px-4 py-4 ${selectedMemberId === member._id ? 'border-accent bg-[#f3e2d6]' : 'border-line bg-white'}`}>
                    <Text className="text-base font-semibold text-ink">{`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member'}</Text>
                    <Text className="mt-1 text-sm leading-5 text-muted">Roles: {(member.role || []).join(', ') || 'none'} • Status: {(member.memberStatus || []).join(', ') || 'none'}</Text>
                  </Pressable>
                ))}
                <Text className="mt-3 text-sm font-semibold text-ink">RSVP</Text>
                <ChoiceChips options={rsvpStatusOptions} selectedValues={manualRsvpStatus} onToggle={(value) => setManualRsvpStatus(value)} multi={false} />
                <Text className="mt-3 text-sm font-semibold text-ink">Attendance</Text>
                <ChoiceChips options={[{ label: 'Present', value: 'present' }, { label: 'Excused', value: 'excused' }, { label: 'Absent', value: 'absent' }]} selectedValues={manualAttendanceStatus} onToggle={(value) => setManualAttendanceStatus(value)} multi={false} />
                <TextInput value={manualPoints} onChangeText={setManualPoints} placeholder="Optional points override" placeholderTextColor="#8b796d" keyboardType="numeric" className="mt-3 rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
                <Pressable onPress={addManagedMember} disabled={saving || !selectedMemberId} className={`mt-3 rounded-full px-5 py-3 ${saving || !selectedMemberId ? 'bg-accent/60' : 'bg-accent'}`}>
                  <Text className="text-center text-sm font-semibold text-white">{saving ? 'Saving...' : 'Add member action'}</Text>
                </Pressable>
              </InfoBlock>

              <InfoBlock title="Current co-hosts" detail="Officer assignments already attached to this event.">
                {(manageData.event?.coHosts || []).length ? (manageData.event.coHosts || []).map((member) => (
                  <ListItem key={member._id || member} title={`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Co-host'} detail={(member.role || []).join(', ') || 'No role'} />
                )) : <Text className="text-base text-muted">No co-hosts assigned yet.</Text>}
              </InfoBlock>
            </>
          ) : null}
        </>
      ) : null}

      <Modal visible={editorVisible} animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <AppScreen scroll>
          <ScreenHero eyebrow="Creator tools" title="Edit event" description="Update the same event fields the website supports, including points, visibility, recurrence, and attachments." />
          {editorError ? <Notice tone="warning" text={editorError} /> : null}
          {editorMessage ? <Notice text={editorMessage} /> : null}

          <InfoBlock title="Basics" detail="Event metadata and schedule.">
            <View className="gap-4">
              <LabeledInput label="Title" value={editorDraft.title} onChangeText={(value) => updateEditorDraft('title', value)} placeholder="Event title" />
              <LabeledInput label="Description" value={editorDraft.description} onChangeText={(value) => updateEditorDraft('description', value)} placeholder="Add event details" multiline />
              <LabeledInput label="Location" value={editorDraft.location} onChangeText={(value) => updateEditorDraft('location', value)} placeholder="Room, building, or address" />
              {renderEditorDateField('Start', editorDraft.startAt, 'startAt', (value) => updateEditorDraft('startAt', value))}
              {renderEditorDateField('End', editorDraft.endAt, 'endAt', (value) => updateEditorDraft('endAt', value))}
              <LabeledInput label="Capacity" value={editorDraft.capacityMax} onChangeText={(value) => updateEditorDraft('capacityMax', value)} placeholder="Optional max attendees" keyboardType="numeric" />
            </View>
          </InfoBlock>

          <InfoBlock title="Visibility and points" detail="Target the audience and scoring.">
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Visible roles</Text>
                <ChoiceChips options={eventRoleOptions} selectedValues={editorDraft.rolesAllowed} onToggle={(value) => toggleEditorList('rolesAllowed', value)} />
              </View>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Member statuses</Text>
                <ChoiceChips options={eventMemberStatusOptions} selectedValues={editorDraft.memberStatusesAllowed} onToggle={(value) => toggleEditorList('memberStatusesAllowed', value)} />
              </View>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Point category</Text>
                <ChoiceChips options={eventPointCategoryOptions} selectedValues={editorDraft.pointsCategory} onToggle={(value) => updateEditorDraft('pointsCategory', value)} multi={false} />
              </View>
              <LabeledInput label="Default rate per hour" value={editorDraft.defaultRatePerHour} onChangeText={(value) => updateEditorDraft('defaultRatePerHour', value)} placeholder="10" keyboardType="numeric" />
              <LabeledInput label="Override total points" value={editorDraft.overrideTotalPoints} onChangeText={(value) => updateEditorDraft('overrideTotalPoints', value)} placeholder="Optional" keyboardType="numeric" />
            </View>
          </InfoBlock>

          <InfoBlock title="Publishing" detail="Set requirements, recurrence, and visibility state.">
            <View className="gap-4">
              <ToggleTile label="Mandatory event" detail="Marks the event as required for visible members." selected={editorDraft.isMandatory} onPress={() => updateEditorDraft('isMandatory', !editorDraft.isMandatory)} />
              <ToggleTile label="Shift-based registration" detail="Adds per-shift RSVP times and capacity controls." selected={editorDraft.shiftBasedRegistration} onPress={() => updateEditorDraft('shiftBasedRegistration', !editorDraft.shiftBasedRegistration)} />
              <ToggleTile label="Published" detail="Keep this on to show the event in visible views." selected={editorDraft.isPublished} onPress={() => updateEditorDraft('isPublished', !editorDraft.isPublished)} />
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Recurrence</Text>
                <ChoiceChips options={eventRecurrenceOptions} selectedValues={editorDraft.recurrenceFrequency} onToggle={(value) => updateEditorDraft('recurrenceFrequency', value)} multi={false} />
                {editorDraft.recurrenceFrequency !== 'none' ? renderEditorDateField('Repeat until', editorDraft.recurrenceEndDate, 'recurrenceEndDate', (value) => updateEditorDraft('recurrenceEndDate', value)) : null}
                {editorDraft.recurrenceFrequency !== 'none' ? <ToggleTile label="Apply edit to series" detail="Update every event in this recurring series." selected={applyEditToSeries} onPress={() => setApplyEditToSeries((current) => !current)} /> : null}
              </View>
            </View>
          </InfoBlock>

          {editorDraft.shiftBasedRegistration ? (
            <InfoBlock title="Shifts" detail="Update any shift windows and capacities.">
              <View className="gap-4">
                <Pressable onPress={addEditorShift} className="self-start rounded-full border border-line bg-card px-4 py-2">
                  <Text className="text-sm font-semibold text-ink">Add shift</Text>
                </Pressable>
                {(editorDraft.shifts || []).map((shift, index) => (
                  <View key={shift.shiftId} className="gap-3 rounded-[24px] border border-line bg-white p-4">
                    <LabeledInput label="Shift label" value={shift.label} onChangeText={(value) => updateEditorShift(index, 'label', value)} placeholder="Shift name" />
                    {renderEditorDateField('Shift start', shift.startAt, `shift-start-${index}`, (value) => updateEditorShift(index, 'startAt', value))}
                    {renderEditorDateField('Shift end', shift.endAt, `shift-end-${index}`, (value) => updateEditorShift(index, 'endAt', value))}
                    <LabeledInput label="Shift capacity" value={shift.capacityMax} onChangeText={(value) => updateEditorShift(index, 'capacityMax', value)} placeholder="Optional" keyboardType="numeric" />
                    <Pressable onPress={() => removeEditorShift(index)} className="self-start rounded-full bg-[#8b3f3f] px-4 py-2">
                      <Text className="text-sm font-semibold text-white">Remove shift</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </InfoBlock>
          ) : null}

          <InfoBlock title="Media and attachments" detail="Replace the hero image and keep or remove existing files.">
            <View className="gap-4">
              {editorImageAsset?.uri || editorDraft.existingImageUrl ? <Image source={{ uri: editorImageAsset?.uri || editorDraft.existingImageUrl }} className="h-44 w-full rounded-[20px]" resizeMode="cover" /> : null}
              <View className="flex-row flex-wrap gap-3">
                <Pressable onPress={pickEditorImage} className="rounded-full bg-accent px-5 py-3">
                  <Text className="text-sm font-semibold text-white">Choose image</Text>
                </Pressable>
                <Pressable onPress={pickEditorAttachments} className="rounded-full border border-line bg-card px-5 py-3">
                  <Text className="text-sm font-semibold text-ink">Add attachments</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {(editorDraft.existingAttachments || []).map((attachment, index) => (
                  <AttachmentPill key={`${attachment.url || attachment.name}-${index}`} label={attachment.name || 'Attachment'} onRemove={() => updateEditorDraft('existingAttachments', editorDraft.existingAttachments.filter((_, attachmentIndex) => attachmentIndex !== index))} />
                ))}
                {editorAttachmentAssets.map((asset, index) => (
                  <AttachmentPill key={`${asset.uri}-${index}`} label={asset.name || `Attachment ${index + 1}`} onRemove={() => setEditorAttachmentAssets((current) => current.filter((_, assetIndex) => assetIndex !== index))} />
                ))}
              </View>
            </View>
          </InfoBlock>

          <View className="flex-row flex-wrap gap-3 pb-6">
            <Pressable onPress={saveEventEdits} disabled={saving} className={`rounded-full px-5 py-4 ${saving ? 'bg-accent/60' : 'bg-accent'}`}>
              <Text className="text-base font-semibold text-white">{saving ? 'Saving...' : 'Save event'}</Text>
            </Pressable>
            <Pressable onPress={() => setEditorVisible(false)} className="rounded-full border border-line bg-card px-5 py-4">
              <Text className="text-base font-semibold text-ink">Close</Text>
            </Pressable>
          </View>
        </AppScreen>
      </Modal>
    </AppScreen>
  );
}

