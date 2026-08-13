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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (selectedPhoto) payload.append('profilePhoto', selectedPhoto);

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'x-user-id': user?.id || '',
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
          <h2>{headerName}</h2>
          <p>{form.personalEmail || 'Personal email'}</p>
          <dl className="profile-summary-list">
            <div>
              <dt>Major</dt>
              <dd>{form.major || 'Not set'}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{form.year || 'Not set'}</dd>
            </div>
            <div>
              <dt>UF Email</dt>
              <dd>{form.ufEmail || 'Not set'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{form.phoneNumber || 'Not set'}</dd>
            </div>
          </dl>
        </motion.aside>

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
      </div>
    </motion.div>
  );
}