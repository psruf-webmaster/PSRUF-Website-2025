// client/src/components/ChannelsSidebar.js
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const itemStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 600,
  color: isActive ? "#6d2c2c" : "#1f2937",
  background: isActive ? "rgba(109,44,44,0.10)" : "transparent",
});

export default function ChannelsSidebar() {
  const { user } = useAuth();
  const isOfficer =
    Array.isArray(user?.role) &&
    (user.role.includes("officer") ||
      user.role.includes("exec") ||
      user.role.includes("webmaster"));

  return (
    <aside
      style={{
        position: "sticky",
        top: 64, // sits under your navbar
        alignSelf: "start",
        width: 260,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 12,
        height: "fit-content",
      }}
    >
      <div style={{ fontWeight: 800, color: "#111827", marginBottom: 8 }}>
        Channels
      </div>

      <nav style={{ display: "grid", gap: 6 }}>
        <NavLink to="/feeds/chapter" style={itemStyle}>
          <span>📣</span> <span>Chapter Announcements</span>
        </NavLink>

        <NavLink to="/feeds/penguins" style={itemStyle}>
          <span>🐧</span> <span>Penguin Parties</span>
        </NavLink>

        {isOfficer && (
          <NavLink to="/feeds/officers" style={itemStyle}>
            <span>🔒</span> <span>Officer Feed</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
