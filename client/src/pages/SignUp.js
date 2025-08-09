import React from 'react';
import './SignUp.css';

function SignUp() {
  return (
    <div className="signup-form-container">
      <h1>Sign Up</h1>
      <form className="signup-form">
        <div className="form-row">
          <label>First Name</label>
          <input type="text" name="firstName" required />
        </div>

        <div className="form-row">
          <label>Last Name</label>
          <input type="text" name="lastName" required />
        </div>

        <div className="form-row">
          <label>Phone Number</label>
          <input type="tel" name="phone" required />
        </div>

        <div className="form-row">
          <label>Phone Service Provider</label>
          <input type="text" name="provider" required />
        </div>

        <div className="form-row">
          <label>Personal Email</label>
          <input type="email" name="personalEmail" required />
        </div>

        <div className="form-row">
          <label>UF Email</label>
          <input type="email" name="ufEmail" required />
        </div>

        <div className="form-row">
          <label>Birthday</label>
          <input type="date" name="birthday" required />
        </div>

        <div className="form-row">
          <label>Major</label>
          <select name="major" required>
            <option value="">Select your major</option>
            <option value="Aerospace Engineering">Aerospace Engineering</option>
            <option value="Agricultural & Biological Engineering">Agricultural & Biological Engineering</option>
            <option value="Astronomy">Astronomy</option>
            <option value="Biomedical Engineering">Biomedical Engineering</option>
            <option value="Chemical Engineering">Chemical Engineering</option>
            <option value="Civil Engineering">Civil Engineering</option>
            <option value="Computer Engineering">Computer Engineering</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Data Science">Data Science</option>
            <option value="Digital Arts and Sciences">Digital Arts and Sciences</option>
            <option value="Electrical Engineering">Electrical Engineering</option>
            <option value="Environmental Engineering">Environmental Engineering</option>
            <option value="Geomatics">Geomatics</option>
            <option value="Industrial & Systems Engineering">Industrial & Systems Engineering</option>
            <option value="Materials Science & Engineering">Materials Science & Engineering</option>
            <option value="Mechanical Engineering">Mechanical Engineering</option>
            <option value="Nuclear & Radiological Sciences">Nuclear & Radiological Sciences</option>
            <option value="Nuclear Engineering">Nuclear Engineering</option>
            <option value="Undecided STEM">Undecided STEM</option>
          </select>
        </div>


        <div className="form-row">
          <label>Year</label>
          <select name="year" required>
            <option value="">Select your year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
          </select>
        </div>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default SignUp;
