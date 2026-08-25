// client/src/components/ChannelsSidebar.js
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const itemStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 600,
  color: isActive ? "#6d2c2c" : "#1f2937",
  background: isActive ? "rgba(109,44,44,0.10)" : "transparent",
});

export default function ChannelsSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 980 : false));
  const userId = user?._id || user?.id;

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth <= 980);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadChannels = async () => {
      if (!userId) {
        setChannels([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/channels', { headers: { 'x-user-id': userId } });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          setChannels([]);
          setLoading(false);
          return;
        }
        setChannels(Array.isArray(data) ? data : []);
      } catch {
        setChannels([]);
      }
      setLoading(false);
    };

    loadChannels();
  }, [userId]);

  const visibleChannels = useMemo(() => {
    const builtInOrder = ['chapterAnnouncements', 'penguinParties', 'alumniFeed', 'officerFeed'];
    const rank = new Map(builtInOrder.map((slug, index) => [slug, index]));
    return [...channels].sort((a, b) => {
      const aRank = rank.has(a.slug) ? rank.get(a.slug) : 100;
      const bRank = rank.has(b.slug) ? rank.get(b.slug) : 100;
      if (aRank !== bRank) return aRank - bRank;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [channels]);

  const iconBySlug = {
    chapterAnnouncements: '📣',
    penguinParties: '🐧',
    alumniFeed: '🎓',
    officerFeed: '🔒',
  };

  const longestChannelNameLength = useMemo(() => {
    return visibleChannels.reduce((maxLength, channel) => {
      return Math.max(maxLength, String(channel?.name || '').length);
    }, 22);
  }, [visibleChannels]);

  const sidebarWidth = `clamp(18rem, ${Math.min(longestChannelNameLength + 5, 32)}ch, 26rem)`;
  const activeSlug = String(location.pathname || "").split("/").filter(Boolean).pop() || "";
  const activeChannel = visibleChannels.find((channel) => channel.slug === activeSlug);

  if (isNarrow) {
    return (
      <section
        className="channels-sidebar channels-sidebar-mobile"
        style={{
          width: "100%",
          maxWidth: "100%",
          background: "linear-gradient(180deg, rgba(255,252,253,0.97), rgba(247,233,238,0.97))",
          border: "1px solid rgba(109,44,44,0.12)",
          borderRadius: 22,
          padding: 12,
          boxSizing: "border-box",
          boxShadow: "0 18px 32px rgba(109,44,44,0.08)",
          display: "grid",
          gap: 10,
        }}
      >
        <style>{`
          .channels-mobile-rail {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .channels-mobile-rail::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, color: "#3b2327", fontSize: 14 }}>Channels</div>
            <div style={{ color: "#7b5d63", fontSize: 12 }}>
              {activeChannel?.name || "Switch feeds"}
            </div>
          </div>
        </div>

        <nav className="channels-mobile-rail" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {loading && <div style={{ color: "#7b5d63", fontSize: 12, padding: "8px 2px" }}>Loading channels…</div>}
          {!loading && visibleChannels.map((channel) => (
            <NavLink
              key={channel._id || channel.slug}
              to={`/feeds/${channel.slug}`}
              style={({ isActive }) => ({
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 16,
                textDecoration: "none",
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: isActive ? "#6d2c2c" : "#3b2327",
                background: isActive ? "rgba(109,44,44,0.12)" : "rgba(255,255,255,0.7)",
                border: `1px solid ${isActive ? "rgba(109,44,44,0.18)" : "rgba(109,44,44,0.08)"}`,
                boxShadow: isActive ? "0 10px 18px rgba(109,44,44,0.08)" : "none",
              })}
            >
              <span>{iconBySlug[channel.slug] || "#"}</span>
              <span>{channel.name}</span>
            </NavLink>
          ))}
        </nav>
      </section>
    );
  }

  return (
    <aside
      className="channels-sidebar"
      style={{
        '--channels-sidebar-width': sidebarWidth,
        position: "sticky",
        top: 8,
        alignSelf: "start",
        width: sidebarWidth,
        maxWidth: "100%",
        background: "linear-gradient(180deg, rgba(255,252,253,0.97), rgba(247,233,238,0.97))",
        border: "1px solid rgba(109,44,44,0.12)",
        borderRadius: 22,
        padding: 14,
        height: "calc(100vh - 100px)",
        boxSizing: "border-box",
        boxShadow: "0 18px 32px rgba(109,44,44,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        .channels-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 96, 138, 0.22) rgba(255, 255, 255, 0.1);
          scrollbar-gutter: stable;
        }
        .channels-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .channels-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }
        .channels-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(236, 144, 184, 0.32), rgba(212, 96, 138, 0.22));
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.26);
        }
        .channels-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(236, 144, 184, 0.42), rgba(212, 96, 138, 0.3));
        }
      `}</style>
      <div style={{ fontWeight: 800, color: "#3b2327", marginBottom: 10, fontSize: 14 }}>
        Channels
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.1))", border: "1px solid rgba(109,44,44,0.05)", padding: "6px 10px 6px 0" }}>
      <nav className="channels-scroll" style={{ display: "grid", gap: 8, height: "100%", overflowY: "scroll", overflowX: "hidden", paddingRight: 22, overscrollBehaviorY: "contain", overscrollBehaviorX: "none", alignContent: "start" }}>
        {loading && <div style={{ color: '#7b5d63', fontSize: 12, padding: '6px 2px' }}>Loading channels…</div>}
        {!loading && visibleChannels.map(channel => (
          <NavLink key={channel._id || channel.slug} to={`/feeds/${channel.slug}`} style={itemStyle}>
            <span>{iconBySlug[channel.slug] || '#'} </span>
            <span style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.22 }}>{channel.name}</span>
          </NavLink>
        ))}
      </nav>
      </div>
    </aside>
  );
}
