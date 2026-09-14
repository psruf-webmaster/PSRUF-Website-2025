import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { AppScreen, Card } from '../../../src/components/AppScreen';
import { useAuth } from '../../../src/context/AuthContext';
import { api, authHeaders } from '../../../src/lib/api';
import { Notice } from '../../../src/components/MobileUI';

export default function ProfileScreen() {
  const { logout, updateUser, user } = useAuth();
  const [form, setForm] = useState(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    personalEmail: user?.personalEmail || '',
    ufEmail: user?.ufEmail || '',
    major: user?.major || '',
    year: user?.year || '',
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileAsset, setProfileAsset] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePasswordField(key, value) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
  }

  async function pickProfilePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to select a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setProfileAsset(result.assets[0]);
      setMessage('Selected a new profile photo. Save changes to upload it.');
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = new FormData();
      payload.append('userId', user?._id || user?.id || '');
      Object.entries(form).forEach(([key, value]) => {
        payload.append(key, value || '');
      });

      if (profileAsset?.uri) {
        payload.append('profilePhoto', {
          uri: profileAsset.uri,
          name: profileAsset.fileName || 'profile-photo.jpg',
          type: profileAsset.mimeType || 'image/jpeg',
        });
      }

      const response = await api.patch('/users/me', payload, {
        headers: authHeaders(user),
      });
      await updateUser(response.data?.user || null);
      setProfileAsset(null);
      setMessage(response.data?.message || 'Profile updated.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    setError('');
    setMessage('');

    try {
      const response = await api.patch('/users/me/password', passwordForm, {
        headers: {
          ...authHeaders(user),
          'Content-Type': 'application/json',
        },
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(response.data?.message || 'Password updated.');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <AppScreen scroll>
      <Card className="items-center gap-4">
        {profileAsset?.uri || user?.profilePicUrl ? (
          <Image source={{ uri: profileAsset?.uri || user?.profilePicUrl }} className="h-24 w-24 rounded-full" />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-[#ead7c8]">
            <Text className="text-2xl font-semibold text-accent">
              {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}` || 'PS'}
            </Text>
          </View>
        )}
        <Text className="text-2xl font-semibold text-ink">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Member profile'}</Text>
        <Text className="text-base text-muted">{user?.personalEmail || 'No email available'}</Text>
        <Pressable onPress={pickProfilePhoto} className="rounded-full border border-line bg-card px-4 py-3">
          <Text className="text-sm font-semibold text-ink">Choose profile photo</Text>
        </Pressable>
      </Card>

      <Card className="gap-3">
        <Text className="text-lg font-semibold text-ink">Membership details</Text>
        <Text className="text-base text-muted">Year: {user?.year || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Major: {user?.major || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Phone: {user?.phoneNumber || 'Unavailable'}</Text>
        <Text className="text-base text-muted">Approval: {user?.approvalState || (user?.isApproved ? 'approved' : 'pending')}</Text>
      </Card>

      <Card className="gap-4">
        <Text className="text-lg font-semibold text-ink">Edit profile</Text>
        <TextInput value={form.firstName} onChangeText={(value) => updateField('firstName', value)} placeholder="First name" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={form.lastName} onChangeText={(value) => updateField('lastName', value)} placeholder="Last name" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={form.phoneNumber} onChangeText={(value) => updateField('phoneNumber', value)} placeholder="Phone number" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={form.personalEmail} onChangeText={(value) => updateField('personalEmail', value)} placeholder="Personal email" placeholderTextColor="#8b796d" autoCapitalize="none" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={form.ufEmail} onChangeText={(value) => updateField('ufEmail', value)} placeholder="UF email" placeholderTextColor="#8b796d" autoCapitalize="none" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={form.major} onChangeText={(value) => updateField('major', value)} placeholder="Major" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={form.year} onChangeText={(value) => updateField('year', value)} placeholder="Year" placeholderTextColor="#8b796d" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        {message ? <Notice text={message} /> : null}
        {error ? <Notice tone="warning" text={error} /> : null}
        <Pressable onPress={saveProfile} disabled={saving} className={`rounded-full px-5 py-4 ${saving ? 'bg-accent/60' : 'bg-accent'}`}>
          <Text className="text-center text-base font-semibold text-white">{saving ? 'Saving...' : 'Save changes'}</Text>
        </Pressable>
      </Card>

      <Card className="gap-4">
        <Text className="text-lg font-semibold text-ink">Change password</Text>
        <TextInput value={passwordForm.currentPassword} onChangeText={(value) => updatePasswordField('currentPassword', value)} placeholder="Current password" placeholderTextColor="#8b796d" secureTextEntry autoCapitalize="none" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={passwordForm.newPassword} onChangeText={(value) => updatePasswordField('newPassword', value)} placeholder="New password" placeholderTextColor="#8b796d" secureTextEntry autoCapitalize="none" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <TextInput value={passwordForm.confirmPassword} onChangeText={(value) => updatePasswordField('confirmPassword', value)} placeholder="Confirm new password" placeholderTextColor="#8b796d" secureTextEntry autoCapitalize="none" className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink" />
        <Pressable onPress={savePassword} disabled={savingPassword} className={`rounded-full px-5 py-4 ${savingPassword ? 'bg-accent/60' : 'bg-accent'}`}>
          <Text className="text-center text-base font-semibold text-white">{savingPassword ? 'Updating...' : 'Update password'}</Text>
        </Pressable>
      </Card>

      <Pressable onPress={logout} className="rounded-full bg-accent px-5 py-4">
        <Text className="text-center text-base font-semibold text-white">Log out</Text>
      </Pressable>
    </AppScreen>
  );
}
