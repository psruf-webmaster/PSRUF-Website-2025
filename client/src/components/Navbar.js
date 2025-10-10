import React, { useEffect, useMemo, useState } from "react";
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
    //{ to: "/calendar", label: "Calendar" },
      { to: "/contact", label: "Contact Us" },
    //{ to: "/members", label: "Members" },
    ],
    []
  );

  const memberLinks = useMemo(
    () => [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/events", label: "Events" },
      { to: "/announcements", label: "Announcements" },
      { to: "/calendar", label: "Calendar" },
    ],
    []
  );

  const isAdmin =
    Array.isArray(user?.role) &&
    (user.role.includes("webmaster") ||
      user.role.includes("exec") ||
      user.role.includes("officer"));

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
      {/* CONTAINER: centered, single row, no clipping */}
     <nav
  style={{
    width: "100%",                // ← full width
    padding: "10px 12px 10px 0",  // optional: 0 left padding for truly flush-left
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // left group vs right group
    gap: 12,
    flexWrap: "nowrap",
    whiteSpace: "nowrap",
    overflow: "visible",
  }}
>

        {/* LEFT: brand + public links */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0, // play nice with flex sizing
          }}
        >
          <NavLink
            to="/"
            style={{
              ...baseLinkStyle,
              fontSize: 18,
              color: "#222",
            }}
          >
            <span style={{ color: "#6d2c2c", fontWeight: 800 }}>PSR</span>{" "}
            <span style={{ opacity: 0.7 }}>Website</span>
          </NavLink>

          {publicLinks.map((l) => (
            <NavLink key={l.to} to={l.to} style={linkStyle}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* RIGHT: member links + admin + greeting + log out */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
          {!user ? (
            <>
              <NavLink to="/login" style={linkStyle}>
                Sign In
              </NavLink>
              <NavLink to="/signup" style={linkStyle}>
                Sign Up
              </NavLink>
            </>
          ) : (
            <>
              {memberLinks.map((l) => (
                <NavLink key={l.to} to={l.to} style={linkStyle}>
                  {l.label}
                </NavLink>
              ))}

              {isAdmin && (
                <>
                  <NavLink to="/admin/approvals" style={linkStyle}>
                    Approvals
                  </NavLink>
                  <NavLink to="/admin/users" style={linkStyle}>
                    Users
                  </NavLink>
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
