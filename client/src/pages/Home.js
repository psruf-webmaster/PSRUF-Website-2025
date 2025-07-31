import React from 'react';
import './Home.css';

export default function Home() {
  return (
    <>
      {/* Hero Section with Background Image */}
      <div
        className="hero"
        style={{
          backgroundImage: "url('/dbb97d8762356babafe63b3cef9f46fcfedf78a1.png')",
        }}
      >
        <div className="home-header">
          <h1 className="psr">PHI SIGMA RHO</h1>
          <h2 className="sub-header">
            <span className="uf">University of Florida</span>
            <span className="divider"> | </span>
            <span className="tau">Tau Chapter</span>
          </h2>
        </div>
        </div>
      {/* Blurb Section */}
      <div className="section">
        <h6 className="third-header">RE-ENGINEERING SORORITY LIFE</h6>
        <p className="blurb">
          Phi Sigma Rho was founded in 1984 with the vision to be the foremost social sorority
          for women in engineering and engineering technology by fostering among its members
          lifelong friendship, scholarship, and encouragement.
        </p>
      </div>
    </>
  );
}
