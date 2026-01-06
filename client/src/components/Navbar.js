// client/src/components/Navbar.js
import React, { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const baseLinkStyle = {
  padding: "6px 10px",
  borderRadius: 16,
  textDecoration: "none",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const linkStyle = ({ isActive }) => ({
  ...baseLinkStyle,
  color: isActive ? "#6d2c2c" : "#222",
  background: isActive ? "rgba(109,44,44,0.12)" : "transparent",
});

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

/** Hover dropdown; clicking the trigger navigates to /feeds/chapter */
function AnnouncementsMenu({ showOfficerFeed }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: "relative" }}
    >
      {/* Trigger navigates to Chapter Announcements */}
      <NavLink
        to="/feeds/chapter"
        style={{
          ...baseLinkStyle,
          color: "#222",
          background: open ? "rgba(109,44,44,0.12)" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Announcements ▾
      </NavLink>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 220,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: 6,
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <NavLink
              to="/feeds/chapter"
              style={({ isActive }) => ({
                ...baseLinkStyle,
                display: "block",
                color: isActive ? "#6d2c2c" : "#222",
                background: isActive ? "rgba(109,44,44,0.12)" : "transparent",
                borderRadius: 10,
              })}
            >
              Chapter Announcements
            </NavLink>

            <NavLink
              to="/feeds/penguins"
              style={({ isActive }) => ({
                ...baseLinkStyle,
                display: "block",
                color: isActive ? "#6d2c2c" : "#222",
                background: isActive ? "rgba(109,44,44,0.12)" : "transparent",
                borderRadius: 10,
              })}
            >
              Penguin Parties
            </NavLink>

            {showOfficerFeed && (
              <NavLink
                to="/feeds/officers"
                style={({ isActive }) => ({
                  ...baseLinkStyle,
                  display: "block",
                  color: isActive ? "#6d2c2c" : "#222",
                  background: isActive ? "rgba(109,44,44,0.12)" : "transparent",
                  borderRadius: 10,
                })}
              >
                Officer Feed
              </NavLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  // Removed /announcements here; dropdown replaces it
  const memberLinks = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/events", label: "Events" },
      { to: "/calendar", label: "Calendar" },
      { to: "/points", label: "Points" },
      { to: "/ledger", label: "Ledger", officerOnly: true },
      { to: "/points-overview", label: "Points Overview", officerOnly: true },
    ],
    []
  );

  const isAdmin = isOfficerLevel(user);

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <nav
        style={{
          width: "100%",
          padding: "10px 12px 10px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          overflow: "visible",
        }}
      >
        {/* LEFT: brand + public links */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <NavLink to="/" style={{ ...baseLinkStyle, fontSize: 18, color: "#222" }}>
            <span style={{ color: "#6d2c2c", fontWeight: 800 }}>ΦΣΡ</span>{" "}
            <span style={{ opacity: 0.7 }}>Phi Sigma Rho</span>
          </NavLink>

          {publicLinks.map((l) => (
            <NavLink key={l.to} to={l.to} style={linkStyle}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* RIGHT: member links + dropdown + admin + greeting + logout */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {!user ? (
            <>
              <NavLink to="/login" style={linkStyle}>Sign In</NavLink>
              <NavLink to="/signup" style={linkStyle}>Sign Up</NavLink>
            </>
          ) : (
            <>
              {memberLinks.map((l) => (
                (!l.officerOnly || isAdmin) && (
                  <NavLink key={l.to} to={l.to} style={linkStyle}>
                    {l.label}
                  </NavLink>
                )
              ))}

              <AnnouncementsMenu showOfficerFeed={isAdmin} />

              {isAdmin && (
                <>
                  <NavLink to="/admin/approvals" style={linkStyle}>Approvals</NavLink>
                  <NavLink to="/admin/users" style={linkStyle}>Users</NavLink>
                </>
              )}

              <span style={{ fontWeight: 600, color: "#6d2c2c" }}>
                Hi,&nbsp;{user.firstName || "Sister"}
              </span>
              <button
                onClick={onLogout}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#6d2c2c",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Log out
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
