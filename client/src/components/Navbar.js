import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useMatch, useNavigate, useResolvedPath } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


function getRoles(user) {
  return Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
}

function isAlumniUser(user) {
  return getRoles(user).some(role => String(role).toLowerCase() === "alumni");
}

function canAccessPointsOverview(user) {
  const positions = Array.isArray(user?.positions) ? user.positions : [];
  const positionKeys = new Set(positions.map(position => position?.key).filter(Boolean));
  return positionKeys.has("PRESIDENT")
    || positionKeys.has("VP_STANDARDS")
    || positionKeys.has("VP_FINANCE");
}

function canAccessLedger(user) {
  return getRoles(user).some(role => String(role).toLowerCase() === "exec");
}

function canAccessApprovals(user) {
  const roles = getRoles(user).map((role) => String(role).toLowerCase());
  const positions = Array.isArray(user?.positions) ? user.positions : [];
  const positionKeys = new Set(positions.map(position => position?.key).filter(Boolean));
  return roles.includes("webmaster")
    || roles.includes("webdev")
    || positionKeys.has("WEBMASTER")
    || positionKeys.has("WEBDEV");
}

function isOfficerLevel(user) {
  if (!user) return false;
  if (user.isOfficer || user.isExec || user.isWebmaster) return true;
  const roles = getRoles(user);
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
  const isAlumni = isAlumniUser(user);
  const canSeePointsOverview = canAccessPointsOverview(user);
  const canSeeLedger = canAccessLedger(user);
  const canSeeApprovals = canAccessApprovals(user);

  const publicLinks = useMemo(
    () => [
      { to: "/", label: "Home" },
      { to: "/leadership", label: "Leadership" },
      { to: "/recruitment", label: "Recruitment" },
      { to: "/alumni", label: "Alumni" },
      { to: "/contact", label: "Contact us" },
    ],
    []
  );

  const memberLinks = useMemo(
    () => {
      const links = [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/events", label: "Events" },
        { to: "/calendar", label: "Calendar" },
      ];

      if (!isAlumni) {
        links.push({ to: "/points", label: "Points" });
      }

      return links;
    },
    [isAlumni]
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

  const compactAccountMeta = (Array.isArray(user?.role) ? user.role.join(', ') : user?.role || 'Member').toLowerCase();
  return (
    <header className="site-navbar">
      <nav className="site-nav">
        {/* Logo - always on the far left */}
          <NavLink 
            to="/" 
            className="site-brand"
            style={{ gap: "16px" }}
          >
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
              {!isCompactNav && (
                <div className="site-nav-links">
                  {memberLinks.map((link) => (
                    <NavMenuLink key={link.to} to={link.to}>
                      {link.label}
                    </NavMenuLink>
                  ))}
                  <NavMenuLink to="/feeds/chapter">Feeds</NavMenuLink>
                </div>
              )}

              <button
                className={`hamburger-menu-toggle ${menuOpen ? "active" : ""}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {!isCompactNav && (
                <div className="profile-menu" ref={profileMenuRef}>
                  <button
                      type="button"
                      className={`profile-menu-trigger ${profileMenuOpen ? "active" : ""}`}
                      onClick={() => setProfileMenuOpen((open) => !open)}
                      aria-haspopup="menu"
                      aria-expanded={profileMenuOpen}
                      style={{ marginLeft: "-35px", marginRight: "12px", display: "flex", alignItems: "center", gap: "8px" }}
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
                </div>
              )}
            </>
          )}
        </div>
      </nav>
        {menuOpen && (
          <div className="hamburger-menu-dropdown">
            {user && isCompactNav && (
              <>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  background: "#ffffff",
                  border: "1px solid #f0e1e3",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(107, 76, 82, 0.05)",
                  marginBottom: "6px"
                }}>
                  <img
                    src={profileImage}
                    alt={`${displayName || 'User'} avatar`}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #f6e4e7",
                      flexShrink: 0
                    }}
                  />
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    minWidth: 0,
                    textAlign: "left"
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: "#5a2229",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: "1.2"
                    }}>
                      {displayName}
                    </div>
                    <div style={{
                      fontSize: "0.7rem",
                      color: "#94757b",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginTop: "3px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {compactAccountMeta}
                    </div>
                  </div>
                </div>
                
                {/* Profile settings link for mobile view */}
                <NavMenuLink to="/profile" onClick={closeMenu}>
                  Profile settings
                </NavMenuLink>

                <div className="hamburger-section-divider"></div>

                {/* Member Pages Section for Mobile */}
                {memberLinks.map((link) => (
                  <NavMenuLink key={link.to} to={link.to} onClick={closeMenu}>
                    {link.label}
                  </NavMenuLink>
                ))}
                <NavMenuLink to="/feeds/chapter" onClick={closeMenu}>
                  Feeds
                </NavMenuLink>
              </>
            )}

            {/* Separate Admin Pages Section */}
            {user && (canSeeApprovals || canSeeLedger || canSeePointsOverview || isAdmin) && (
              <>
                <div className="hamburger-section-divider"></div>
                {canSeeApprovals && (
                  <NavMenuLink to="/admin/approvals" onClick={closeMenu}>
                    Approvals
                  </NavMenuLink>
                )}
                {isAdmin && (
                  <NavMenuLink to="/admin/users" onClick={closeMenu}>
                    User management
                  </NavMenuLink>
                )}
                {canSeeLedger && (
                  <NavMenuLink to="/ledger" onClick={closeMenu}>
                    Ledger
                  </NavMenuLink>
                )}
                {canSeePointsOverview && (
                  <NavMenuLink to="/points-overview" onClick={closeMenu}>
                    Points overview
                  </NavMenuLink>
                )}
              </>
            )}

            {/* FRONT-FACING PAGES SECTION */}
            <div className="hamburger-section-divider"></div>
            {publicLinks.map((link) => (
              <NavMenuLink key={link.to} to={link.to} onClick={closeMenu}>
                {link.label}
              </NavMenuLink>
            ))}

            {/* Authentication actions */}
            <div className="hamburger-section-divider"></div>
            {!user ? (
              <>
                <NavMenuLink to="/login" onClick={closeMenu}>Sign In</NavMenuLink>
                <NavMenuLink to="/signup" onClick={closeMenu}>Sign Up</NavMenuLink>
              </>
            ) : (
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
            )}
          </div>
        )}
    </header>
  );
}