import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useMatch, useNavigate, useResolvedPath } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function isOfficerLevel(user) {
  if (!user) return false;
  if (user.isOfficer || user.isExec || user.isWebmaster) return true;
  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  return roles.some(r =>
    r === "officer" ||
    r === "exec" ||
    r === "webmaster" ||
    r === "webdev"
  );
}

function NavMenuLink({ to, children, end, onClick }) {
  const resolved = useResolvedPath(to);
  const isActive = useMatch({ path: resolved.pathname, end: end ?? to === "/" });

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`site-nav-pill ${isActive ? "site-nav-pill-active" : ""}`}
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isCompactNav, setIsCompactNav] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 980 : false));
  const profileMenuRef = useRef(null);

  const publicLinks = useMemo(
    () => [
      { to: "/", label: "Home" },
      { to: "/leadership", label: "Leadership" },
      { to: "/recruitment", label: "Recruitment" },
      { to: "/alumni", label: "Alumni" },
      { to: "/partners", label: "Partners" },
      { to: "/contact", label: "Contact Us" },
    ],
    []
  );

  const memberLinks = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/events", label: "Events" },
      { to: "/calendar", label: "Calendar" },
      { to: "/points", label: "Points" },
    ],
    []
  );

  const isAdmin = isOfficerLevel(user);

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin User"
    : "";
  const profileImage = user?.profilePicUrl || "/avatar-placeholder.svg";

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsCompactNav(window.innerWidth <= 980);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const compactAccountMeta = Array.isArray(user?.role) ? user.role.join(', ') : user?.role || 'Member';

  return (
    <header className="site-navbar">
      <nav className="site-nav">
        {/* Logo - always on the far left */}
        <NavLink to="/" className="site-brand">
          <span className="site-brand-mark">ΦΣΡ</span>
          <span className="site-brand-copy">
            <span>Phi Sigma Rho</span>
            <span>Tau Chapter • UF</span>
          </span>
        </NavLink>

        {/* Public links - only shown when NOT signed in */}
        {!user && !isCompactNav && (
          <div className="site-nav-links">
            {publicLinks.map((link) => (
              <NavMenuLink key={link.to} to={link.to}>
                {link.label}
              </NavMenuLink>
            ))}
          </div>
        )}

        <div className="site-nav-actions">
          {!user ? (
            <>
              {!isCompactNav && <NavMenuLink to="/login">Sign In</NavMenuLink>}
              {!isCompactNav && <NavMenuLink to="/signup">Sign Up</NavMenuLink>}
              {isCompactNav && (
                <button
                  className={`hamburger-menu-toggle ${menuOpen ? "active" : ""}`}
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              )}
            </>
          ) : (
            <>
              {!isCompactNav && <div className="site-nav-links">
                {memberLinks.map((link) => (
                  <NavMenuLink key={link.to} to={link.to}>
                    {link.label}
                  </NavMenuLink>
                ))}
              </div>}

              {!isCompactNav && <NavMenuLink to="/feeds/chapter">Feeds</NavMenuLink>}

              <button
                className={`hamburger-menu-toggle ${menuOpen ? "active" : ""}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {!isCompactNav && <div className="profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className={`profile-menu-trigger ${profileMenuOpen ? "active" : ""}`}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                >
                  <img
                    className="profile-avatar"
                    src={profileImage}
                    alt={`${displayName || 'User'} avatar`}
                  />
                  <span className="profile-name">{displayName}</span>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div className="profile-menu-dropdown" role="menu">
                    <NavLink
                      to="/profile"
                      className="profile-menu-link"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile settings
                    </NavLink>
                    <button
                      type="button"
                      className="profile-menu-item"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>}
            </>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="hamburger-menu-dropdown">
          {user && isCompactNav && (
            <div className="hamburger-account-card">
              <img
                className="profile-avatar"
                src={profileImage}
                alt={`${displayName || 'User'} avatar`}
              />
              <div>
                <div className="hamburger-account-name">{displayName}</div>
                <div className="hamburger-account-meta">{compactAccountMeta}</div>
              </div>
            </div>
          )}

          {user && isCompactNav && (
            <>
              {memberLinks.map((link) => (
                <NavMenuLink key={link.to} to={link.to} onClick={closeMenu}>
                  {link.label}
                </NavMenuLink>
              ))}
              <NavMenuLink to="/feeds/chapter" onClick={closeMenu}>Feeds</NavMenuLink>
              <NavMenuLink to="/profile" onClick={closeMenu}>Profile Settings</NavMenuLink>
              <div className="hamburger-divider"></div>
            </>
          )}

          {user && isAdmin && (
            <>
              <NavMenuLink 
                to="/admin/approvals" 
                onClick={closeMenu}
              >
                Approvals
              </NavMenuLink>
              <NavMenuLink 
                to="/admin/users" 
                onClick={closeMenu}
              >
                Users
              </NavMenuLink>
              <NavMenuLink 
                to="/ledger" 
                onClick={closeMenu}
              >
                Ledger
              </NavMenuLink>
              <NavMenuLink 
                to="/points-overview" 
                onClick={closeMenu}
              >
                Points Overview
              </NavMenuLink>
              <div className="hamburger-divider"></div>
            </>
          )}

          {publicLinks.map((link) => (
            <NavMenuLink key={link.to} to={link.to} onClick={closeMenu}>
              {link.label}
            </NavMenuLink>
          ))}

          {!user && isCompactNav && (
            <>
              <div className="hamburger-divider"></div>
              <NavMenuLink to="/login" onClick={closeMenu}>Sign In</NavMenuLink>
              <NavMenuLink to="/signup" onClick={closeMenu}>Sign Up</NavMenuLink>
            </>
          )}

          {user && isCompactNav && (
            <>
              <div className="hamburger-divider"></div>
              <button
                type="button"
                className="hamburger-menu-item-button"
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
              >
                Log out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
