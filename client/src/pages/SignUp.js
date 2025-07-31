import React, { useState } from 'react';
import './SignUp.css';

function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    phoneServiceProvider: '',
    personalEmail: '',
    personalPassword: '',
    ufEmail: '',
    birthday: '',
    major: '',
    year: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErrors(prev => ({ ...prev, [e.target.name]: null })); // clear error as they type
  };

  const handleSubmit = async (e) => {
    if (!e.target.checkValidity()) return;

    e.preventDefault();

    if (!formData.ufEmail.endsWith('@ufl.edu')) {
      setErrors({ ufEmail: 'UF email must end with @ufl.edu' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.status === 201) {
        setFormData({
          firstName: '',
          lastName: '',
          phoneNumber: '',
          phoneServiceProvider: '',
          personalEmail: '',
          personalPassword: '',
          ufEmail: '',
          birthday: '',
          major: '',
          year: ''
        });
        setErrors({});
        alert(result.message);
      } else if (response.status === 400 && result.errors) {
        const fieldErrors = {};
        result.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        alert(result.message || 'Something went wrong. Please try again later.');
      }
    } catch (err) {
      console.error('Signup failed:', err);
      alert('Signup failed. Please try again later.');
    }
  };

  return (
    <div className="signup-form-container">
      <h1>Sign Up</h1>
      <form className="signup-form" onSubmit={handleSubmit} noValidate={false}>
        <div className="form-row">
          <label>First Name<span>*</span></label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="capitalize"
            placeholder="Jane"
          />
          {errors.firstName && <p className="error-message">{errors.firstName}</p>}
        </div>

        <div className="form-row">
          <label>Last Name<span>*</span></label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="capitalize"
            placeholder="Doe"
          />
          {errors.lastName && <p className="error-message">{errors.lastName}</p>}
        </div>

        <div className="form-row">
          <label>Phone Number<span>*</span></label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            pattern="[0-9]{10}"
            placeholder="Enter a 10-digit US phone number"
            title="Enter a 10-digit US phone number"
          />
          {errors.phoneNumber && <p className="error-message">{errors.phoneNumber}</p>}
        </div>

        <div className="form-row">
          <label>Phone Service Provider<span>*</span></label>
          <select
            name="phoneServiceProvider"
            value={formData.phoneServiceProvider}
            onChange={handleChange}
            required
          >
            <option value="">Select your provider</option>
            <option value="AT&T">AT&T</option>
            <option value="Verizon">Verizon</option>
            <option value="T-Mobile">T-Mobile</option>
            <option value="Mint Mobile">Mint Mobile</option>
            <option value="Other">Other</option>
          </select>
          {errors.phoneServiceProvider && <p className="error-message">{errors.phoneServiceProvider}</p>}
        </div>

        <div className="form-row">
          <label>Personal Email<span>*</span></label>
          <input
            type="email"
            name="personalEmail"
            value={formData.personalEmail}
            onChange={handleChange}
            required
            placeholder="example@gmail.com"
          />
          {errors.personalEmail && <p className="error-message">{errors.personalEmail}</p>}
        </div>

        <div className="form-row">
          <label>Create Your Password!<span>*</span></label>
          <input
            type="text"
            name="personalPassword"
            value={formData.personalPassword}
            onChange={handleChange}
            required
            placeholder="Must be at least 6 characters!"
          />
          {errors.personalPassword && <p className="error-message">{errors.personalPassword}</p>}
        </div>

        <div className="form-row">
          <label>UF Email<span>*</span></label>
          <input
            type="email"
            name="ufEmail"
            value={formData.ufEmail}
            onChange={handleChange}
            required
            placeholder="gator@ufl.edu"
          />
          {errors.ufEmail && <p className="error-message">{errors.ufEmail}</p>}
        </div>

        <div className="form-row">
          <label>Birthday<span>*</span></label>
          <input
            type="date"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
          />
          {errors.birthday && <p className="error-message">{errors.birthday}</p>}
        </div>

        <div className="form-row">
          <label>Major<span>*</span></label>
          <select
            name="major"
            value={formData.major}
            onChange={handleChange}
            required
          >
            <option value="">Select your major</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Biomedical Engineering">Biomedical Engineering</option>
          </select>
          {errors.major && <p className="error-message">{errors.major}</p>}
        </div>

        <div className="form-row">
          <label>Year<span>*</span></label>
          <select
            name="year"
            value={formData.year}
            onChange={handleChange}
            required
          >
            <option value="">Select your year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
            <option value="Alumni">Alumni</option>
          </select>
          {errors.year && <p className="error-message">{errors.year}</p>}
        </div>

        <button type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}

export default SignUp;
