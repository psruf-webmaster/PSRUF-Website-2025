import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const yearOptions = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' },
  { value: 'Alumni', label: 'Alumni' },
];

const majorOptions = [
  'Aerospace Engineering',
  'Agricultural & Biological Engineering',
  'Astronomy',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Science',
  'Data Science',
  'Digital Arts and Sciences',
  'Electrical Engineering',
  'Environmental Engineering',
  'Geomatics',
  'Industrial & Systems Engineering',
  'Materials Science & Engineering',
  'Mechanical Engineering',
  'Nuclear & Radiological Sciences',
  'Nuclear Engineering',
  'Undecided STEM',
];

function getDisplayName(user) {
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Your Profile';
}

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [preview, setPreview] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    personalEmail: '',
    ufEmail: '',
    major: '',
    year: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      personalEmail: user.personalEmail || '',
      ufEmail: user.ufEmail || '',
      major: user.major || '',
      year: user.year || '',
    });
    setPreview(user.profilePicUrl || '/avatar-placeholder.svg');
  }, [user]);

  const headerName = useMemo(() => getDisplayName(user), [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setMessage('');
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordError('');
    setPasswordMessage('');
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = new FormData();
      
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          payload.append(key, typeof value === 'string' ? value.trim() : value);
        }
      });
      
      if (selectedPhoto) {
        payload.append('profilePhoto', selectedPhoto);
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user?.id || user?._id || ''}`,
        },
        body: payload,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to save profile.');
      }

      updateUser(result.user);
      setMessage(result.message || 'Profile updated.');
      setPreview(result.user.profilePicUrl || '/avatar-placeholder.svg');
      setSelectedPhoto(null);
      setPhotoInputKey((current) => current + 1);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      const response = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id || user?._id || ''}`,
        },
        body: JSON.stringify(passwordForm),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to update password.');
      }

      setPasswordMessage(result.message || 'Password updated.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (saveError) {
      setPasswordError(saveError.message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <motion.div
      className="page-shell profile-page-shell"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <motion.div
        className="profile-hero"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
      >
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="page-title">Profile settings</h1>
          <p className="page-subtitle">
            Update your name, email, major, year, and profile photo in one place.
          </p>
        </div>
        <motion.button
          className="button-secondary"
          type="button"
          onClick={() => navigate('/dashboard')}
          whileHover={{ y: -1, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          Back to dashboard
        </motion.button>
      </motion.div>

      <div className="profile-grid">
        <motion.aside
          className="profile-summary-card"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
          whileHover={{ y: -2 }}
        >
          <label className="profile-summary-avatar-wrap" htmlFor="profile-photo-input">
            <motion.img
              className="profile-summary-avatar"
              src={preview || '/avatar-placeholder.svg'}
              alt="Profile preview"
              key={preview || 'avatar-placeholder'}
              initial={{ opacity: 0.7, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            />
            <span className="profile-summary-avatar-overlay">Change photo</span>
          </label>
          <input
            key={photoInputKey}
            id="profile-photo-input"
            className="profile-photo-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          <h3>{headerName}</h3>
          <p className="profile-email">{form.personalEmail || 'Personal email'}</p>
          <div className="profile-summary-divider"></div>
          <ul className="profile-summary-list">
            <li>
              <span className="label">Major</span>
              <span className="value">{form.major || 'Not set'}</span>
            </li>
            <li>
              <span className="label">Year</span>
              <span className="value">
                {yearOptions.find((opt) => opt.value === form.year)?.label || form.year || 'Not set'}
              </span>
            </li>
            <li>
              <span className="label">UF Email</span>
              <span className="value">{form.ufEmail || 'Not set'}</span>
            </li>
            <li>
              <span className="label">Phone</span>
              <span className="value">{form.phoneNumber || 'Not set'}</span>
            </li>
          </ul>
        </motion.aside>

        <div className="profile-sections-stack">
          <motion.section
            className="profile-form-card"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
          >
            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="profile-form-header">
                <h2>Edit profile</h2>
                <p>Personal email is what you use to sign in.</p>
              </div>

              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>First name</span>
                  <input name="firstName" value={form.firstName} onChange={handleChange} />
                </label>

                <label className="profile-field">
                  <span>Last name</span>
                  <input name="lastName" value={form.lastName} onChange={handleChange} />
                </label>

                <label className="profile-field profile-field-wide">
                  <span>Personal email</span>
                  <input type="email" name="personalEmail" value={form.personalEmail} onChange={handleChange} />
                </label>

                <label className="profile-field profile-field-wide">
                  <span>UF email</span>
                  <input type="email" name="ufEmail" value={form.ufEmail} onChange={handleChange} />
                </label>

                <label className="profile-field profile-field-wide">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    placeholder="3525551234"
                  />
                </label>

                <label className="profile-field">
                  <span>Major</span>
                  <select className="profile-select" name="major" value={form.major} onChange={handleChange}>
                    <option value="">Select a major</option>
                    {majorOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="profile-field">
                  <span>Year</span>
                  <select className="profile-select" name="year" value={form.year} onChange={handleChange}>
                    <option value="">Select a year</option>
                    {yearOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <div className="profile-feedback profile-feedback-error">{error}</div>}
              {message && <div className="profile-feedback profile-feedback-success">{message}</div>}

              <div className="profile-form-actions">
                <motion.button
                  className="button"
                  type="submit"
                  disabled={saving}
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </motion.button>
                <motion.button
                  className="button"
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.section>

          <motion.section
            className="profile-form-card"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.24, ease: 'easeOut' }}
          >
            <form className="profile-form" onSubmit={handlePasswordSubmit}>
              <div className="profile-form-header">
                <h2>Reset password</h2>
                <p>Change your sign-in password with your current password.</p>
              </div>

              <div className="profile-form-grid">
                <label className="profile-field profile-field-wide">
                  <span>Current password</span>
                  <input type="password" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange} />
                </label>

                <label className="profile-field">
                  <span>New password</span>
                  <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} />
                </label>

                <label className="profile-field">
                  <span>Confirm new password</span>
                  <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} />
                </label>
              </div>

              {passwordError && <div className="profile-feedback profile-feedback-error">{passwordError}</div>}
              {passwordMessage && <div className="profile-feedback profile-feedback-success">{passwordMessage}</div>}

              <div className="profile-form-actions">
                <motion.button
                  className="button"
                  type="submit"
                  disabled={savingPassword}
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {savingPassword ? 'Updating...' : 'Update password'}
                </motion.button>
              </div>
            </form>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}