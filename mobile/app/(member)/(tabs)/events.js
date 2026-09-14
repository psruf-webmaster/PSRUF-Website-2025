import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../../src/components/AppScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders } from '../../../src/lib/api';
import { ChoiceChips, LabeledInput, Notice, SectionTitle, ToggleTile, AttachmentPill } from '../../../src/components/MobileUI';
import { createDefaultEventDraft, appendEventFormData, buildEventDraftFromEvent, eventMemberStatusOptions, eventPointCategoryOptions, eventRecurrenceOptions, eventRoleOptions, formatDateTimeLocalInput, validateEventDraft } from '../../../src/lib/eventForm';
import { getRoles } from '../../../src/lib/access';

function formatEventDate(value) {
  if (!value) {
    return 'Date pending';
  }

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

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerMode, setComposerMode] = useState('create');
  const [editingEventId, setEditingEventId] = useState('');
  const [draft, setDraft] = useState(createDefaultEventDraft(user));
  const [draftError, setDraftError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageAsset, setImageAsset] = useState(null);
  const [attachmentAssets, setAttachmentAssets] = useState([]);
  const [pickerField, setPickerField] = useState(null);
  const [applyToSeries, setApplyToSeries] = useState(false);

  const roles = useMemo(() => getRoles(user), [user]);
  const canCreateEvents = roles.some((role) => ['officer', 'exec', 'webmaster', 'webdev', 'candofficer'].includes(role));

  async function loadEvents(isRefreshing = false) {
    if (!user) {
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get('/events', {
        params: { view: 'allUpcoming' },
        headers: authHeaders(user),
      });
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [user]);

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleDraftList(key, value) {
    setDraft((current) => {
      const list = current[key] || [];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value],
      };
    });
  }

  function updateShift(index, key, value) {
    setDraft((current) => ({
      ...current,
      shifts: current.shifts.map((shift, shiftIndex) => shiftIndex === index ? { ...shift, [key]: value } : shift),
    }));
  }

  function addShift() {
    setDraft((current) => ({
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

  function removeShift(index) {
    setDraft((current) => ({
      ...current,
      shifts: current.shifts.filter((_, shiftIndex) => shiftIndex !== index),
    }));
  }

  function openCreateComposer() {
    setComposerMode('create');
    setEditingEventId('');
    setDraft(createDefaultEventDraft(user));
    setImageAsset(null);
    setAttachmentAssets([]);
    setApplyToSeries(false);
    setDraftError('');
    setDraftMessage('');
    setComposerVisible(true);
  }

  function openEditComposer(eventItem) {
    setComposerMode('edit');
    setEditingEventId(eventItem._id);
    setDraft(buildEventDraftFromEvent(eventItem, user));
    setImageAsset(null);
    setAttachmentAssets([]);
    setApplyToSeries(false);
    setDraftError('');
    setDraftMessage('');
    setComposerVisible(true);
  }

  async function pickEventImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setDraftError('Photo library permission is required to select an event image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setImageAsset({
        uri: asset.uri,
        name: asset.fileName || 'event-image.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setDraftMessage('Selected a new event image.');
    }
  }

  async function pickAttachments() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    });

    if (result.canceled) {
      return;
    }

    const assets = Array.isArray(result.assets) ? result.assets : [];
    setAttachmentAssets((current) => [...current, ...assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/octet-stream',
      size: asset.size,
    }))]);
  }

  async function submitEvent() {
    const validationError = validateEventDraft(draft);
    if (validationError) {
      setDraftError(validationError);
      return;
    }

    setSubmitting(true);
    setDraftError('');
    setDraftMessage('');

    try {
      const formData = new FormData();
      appendEventFormData(formData, draft, { imageAsset, attachmentAssets, applyToSeries });

      if (composerMode === 'create') {
        await api.post('/events', formData, { headers: authHeaders(user) });
        setDraftMessage('Event created.');
      } else {
        await api.patch(`/events/${editingEventId}`, formData, { headers: authHeaders(user) });
        setDraftMessage('Event updated.');
      }

      await loadEvents(true);
      setComposerVisible(false);
    } catch (requestError) {
      setDraftError(requestError?.response?.data?.message || requestError.message || 'Unable to save event.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEvent(eventItem) {
    setError('');

    try {
      await api.delete(`/events/${eventItem._id}`, {
        params: { scope: eventItem?.recurrence?.seriesId ? 'series' : 'single' },
        headers: authHeaders(user),
      });
      await loadEvents(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to delete event.');
    }
  }

  function renderDateField(label, value, fieldKey, onChangeValue) {
    const parsed = value ? new Date(value) : new Date();
    return (
      <View className="gap-2">
        <Text className="text-sm font-semibold text-ink">{label}</Text>
        <Pressable onPress={() => setPickerField(fieldKey)} className="rounded-3xl border border-line bg-white px-4 py-4">
          <Text className="text-base text-ink">{value ? formatEventDate(new Date(value).toISOString()) : 'Choose date and time'}</Text>
        </Pressable>
        {pickerField === fieldKey ? (
          <DateTimePicker
            value={parsed}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, selectedDate) => {
              if (Platform.OS !== 'ios') {
                setPickerField(null);
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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-shell">
      <ScrollView
        className="flex-1 bg-shell"
        contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(true)} />}
      >
        <Card className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">Upcoming</Text>
          <Text className="text-3xl font-semibold text-ink">Chapter events</Text>
          <Text className="text-base leading-6 text-muted">This screen reads the live `/api/events?view=allUpcoming` list with the same bearer-id auth pattern used on web.</Text>
          <View className="flex-row flex-wrap gap-3">
            <Pressable onPress={() => loadEvents(true)} className="self-start rounded-full border border-line px-5 py-3">
              <Text className="text-sm font-semibold text-ink">Reload events</Text>
            </Pressable>
            {canCreateEvents ? (
              <Pressable onPress={openCreateComposer} className="self-start rounded-full bg-accent px-5 py-3">
                <Text className="text-sm font-semibold text-white">Create event</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>

        {loading ? <Text className="text-base text-muted">Loading events...</Text> : null}
        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        {!loading && !events.length && !error ? (
          <Card>
            <Text className="text-base leading-6 text-muted">No upcoming events are visible for this account yet.</Text>
          </Card>
        ) : null}

        {events.map((eventItem) => (
          <Card key={eventItem._id} className="gap-3">
            <Link href={`/(member)/events/${eventItem._id}`} asChild>
              <Pressable>
                <View className="gap-2">
                  <Text className="text-xl font-semibold text-ink">{eventItem.title || 'Untitled event'}</Text>
                  <Text className="text-sm font-medium uppercase tracking-[2px] text-accent">{formatEventDate(eventItem.startAt)}</Text>
                  <Text className="text-base leading-6 text-muted">{eventItem.location || 'Location to be announced'}</Text>
                  {eventItem.imageUrl ? <Image source={{ uri: eventItem.imageUrl }} className="h-44 w-full rounded-[20px]" resizeMode="cover" /> : null}
                  {eventItem.currentUserRsvp ? <Text className="text-sm font-semibold uppercase tracking-[2px] text-accent">RSVP: {eventItem.currentUserRsvp}</Text> : null}
                  {eventItem.description ? <Text className="text-base leading-6 text-muted">{eventItem.description}</Text> : null}
                  <Text className="text-sm font-semibold uppercase tracking-[2px] text-accent">Open details</Text>
                </View>
              </Pressable>
            </Link>
            {canCreateEvents ? (
              <View className="flex-row flex-wrap gap-3">
                <Pressable onPress={() => openEditComposer(eventItem)} className="rounded-full border border-line bg-card px-5 py-3">
                  <Text className="text-sm font-semibold text-ink">Edit</Text>
                </Pressable>
                <Pressable onPress={() => deleteEvent(eventItem)} className="rounded-full bg-[#8b3f3f] px-5 py-3">
                  <Text className="text-sm font-semibold text-white">Delete</Text>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
      </ScrollView>

      <Modal visible={composerVisible} animationType="slide" onRequestClose={() => setComposerVisible(false)}>
        <SafeAreaView className="flex-1 bg-shell">
          <ScrollView className="flex-1 bg-shell" contentContainerStyle={{ padding: 24, gap: 16 }}>
            <SectionTitle title={composerMode === 'create' ? 'Create event' : 'Edit event'} detail="This mobile editor uses the same multipart event endpoints as the website, including visibility, points, shifts, attachments, and recurrence." />
            {draftError ? <Notice tone="warning" text={draftError} /> : null}
            {draftMessage ? <Notice text={draftMessage} /> : null}

            <Card className="gap-4">
              <LabeledInput label="Title" value={draft.title} onChangeText={(value) => updateDraft('title', value)} placeholder="Event title" />
              <LabeledInput label="Description" value={draft.description} onChangeText={(value) => updateDraft('description', value)} placeholder="Add event details" multiline />
              <LabeledInput label="Location" value={draft.location} onChangeText={(value) => updateDraft('location', value)} placeholder="Room, building, or address" />
              {renderDateField('Start', draft.startAt, 'startAt', (value) => updateDraft('startAt', value))}
              {renderDateField('End', draft.endAt, 'endAt', (value) => updateDraft('endAt', value))}
              <LabeledInput label="Capacity" value={draft.capacityMax} onChangeText={(value) => updateDraft('capacityMax', value)} placeholder="Optional max attendees" keyboardType="numeric" />
            </Card>

            <Card className="gap-4">
              <Text className="text-lg font-semibold text-ink">Visibility and points</Text>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Visible roles</Text>
                <ChoiceChips options={eventRoleOptions} selectedValues={draft.rolesAllowed} onToggle={(value) => toggleDraftList('rolesAllowed', value)} />
              </View>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Member statuses</Text>
                <ChoiceChips options={eventMemberStatusOptions} selectedValues={draft.memberStatusesAllowed} onToggle={(value) => toggleDraftList('memberStatusesAllowed', value)} />
              </View>
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Point category</Text>
                <ChoiceChips options={eventPointCategoryOptions} selectedValues={draft.pointsCategory} onToggle={(value) => updateDraft('pointsCategory', value)} multi={false} />
              </View>
              <LabeledInput label="Default rate per hour" value={draft.defaultRatePerHour} onChangeText={(value) => updateDraft('defaultRatePerHour', value)} placeholder="10" keyboardType="numeric" />
              <LabeledInput label="Override total points" value={draft.overrideTotalPoints} onChangeText={(value) => updateDraft('overrideTotalPoints', value)} placeholder="Optional" keyboardType="numeric" />
            </Card>

            <Card className="gap-4">
              <Text className="text-lg font-semibold text-ink">Publishing</Text>
              <ToggleTile label="Mandatory event" detail="Marks the event as required for visible members." selected={draft.isMandatory} onPress={() => updateDraft('isMandatory', !draft.isMandatory)} />
              <ToggleTile label="Shift-based registration" detail="Adds per-shift RSVP times and capacity controls." selected={draft.shiftBasedRegistration} onPress={() => updateDraft('shiftBasedRegistration', !draft.shiftBasedRegistration)} />
              <ToggleTile label="Published" detail="Keep this on to show the event in visible views." selected={draft.isPublished} onPress={() => updateDraft('isPublished', !draft.isPublished)} />
              <View className="gap-2">
                <Text className="text-sm font-semibold text-ink">Recurrence</Text>
                <ChoiceChips options={eventRecurrenceOptions} selectedValues={draft.recurrenceFrequency} onToggle={(value) => updateDraft('recurrenceFrequency', value)} multi={false} />
                {draft.recurrenceFrequency !== 'none' ? renderDateField('Repeat until', draft.recurrenceEndDate, 'recurrenceEndDate', (value) => updateDraft('recurrenceEndDate', value)) : null}
                {composerMode === 'edit' && draft.recurrenceFrequency !== 'none' ? <ToggleTile label="Apply edit to series" detail="Updates every event in the recurring series." selected={applyToSeries} onPress={() => setApplyToSeries((current) => !current)} /> : null}
              </View>
            </Card>

            {draft.shiftBasedRegistration ? (
              <Card className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-ink">Shifts</Text>
                  <Pressable onPress={addShift} className="rounded-full border border-line bg-card px-4 py-2">
                    <Text className="text-sm font-semibold text-ink">Add shift</Text>
                  </Pressable>
                </View>
                {(draft.shifts || []).map((shift, index) => (
                  <View key={shift.shiftId} className="gap-3 rounded-[24px] border border-line bg-white p-4">
                    <LabeledInput label="Shift label" value={shift.label} onChangeText={(value) => updateShift(index, 'label', value)} placeholder="Shift name" />
                    {renderDateField('Shift start', shift.startAt, `shift-start-${index}`, (value) => updateShift(index, 'startAt', value))}
                    {renderDateField('Shift end', shift.endAt, `shift-end-${index}`, (value) => updateShift(index, 'endAt', value))}
                    <LabeledInput label="Shift capacity" value={shift.capacityMax} onChangeText={(value) => updateShift(index, 'capacityMax', value)} placeholder="Optional" keyboardType="numeric" />
                    <Pressable onPress={() => removeShift(index)} className="self-start rounded-full bg-[#8b3f3f] px-4 py-2">
                      <Text className="text-sm font-semibold text-white">Remove shift</Text>
                    </Pressable>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card className="gap-4">
              <Text className="text-lg font-semibold text-ink">Media and attachments</Text>
              {imageAsset?.uri || draft.existingImageUrl ? <Image source={{ uri: imageAsset?.uri || draft.existingImageUrl }} className="h-44 w-full rounded-[20px]" resizeMode="cover" /> : null}
              <View className="flex-row flex-wrap gap-3">
                <Pressable onPress={pickEventImage} className="rounded-full bg-accent px-5 py-3">
                  <Text className="text-sm font-semibold text-white">Choose image</Text>
                </Pressable>
                <Pressable onPress={pickAttachments} className="rounded-full border border-line bg-card px-5 py-3">
                  <Text className="text-sm font-semibold text-ink">Add attachments</Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {(draft.existingAttachments || []).map((attachment, index) => (
                  <AttachmentPill key={`${attachment.url || attachment.name}-${index}`} label={attachment.name || 'Attachment'} onRemove={() => updateDraft('existingAttachments', draft.existingAttachments.filter((_, attachmentIndex) => attachmentIndex !== index))} />
                ))}
                {attachmentAssets.map((asset, index) => (
                  <AttachmentPill key={`${asset.uri}-${index}`} label={asset.name || `Attachment ${index + 1}`} onRemove={() => setAttachmentAssets((current) => current.filter((_, assetIndex) => assetIndex !== index))} />
                ))}
              </View>
            </Card>

            <View className="flex-row flex-wrap gap-3 pb-6">
              <Pressable onPress={submitEvent} disabled={submitting} className={`rounded-full px-5 py-4 ${submitting ? 'bg-accent/60' : 'bg-accent'}`}>
                <Text className="text-base font-semibold text-white">{submitting ? 'Saving...' : composerMode === 'create' ? 'Create event' : 'Save event'}</Text>
              </Pressable>
              <Pressable onPress={() => setComposerVisible(false)} className="rounded-full border border-line bg-card px-5 py-4">
                <Text className="text-base font-semibold text-ink">Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
