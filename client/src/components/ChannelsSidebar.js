// client/src/components/ChannelsSidebar.js
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createAppSocket } from "../lib/socket";

export default function ChannelsSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 980 : false));
  const userId = user?._id || user?.id;
  const userScopeKey = useMemo(() => JSON.stringify({
    role: user?.role || [],
    memberStatus: user?.memberStatus || [],
    positions: user?.positions || [],
    permissions: user?.permissions || [],
  }), [user?.memberStatus, user?.permissions, user?.positions, user?.role]);

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

    if (!userId) {
      return undefined;
    }

    const socket = createAppSocket({ auth: { userId } });
    const reload = () => loadChannels();

    socket.on("channels:updated", reload);
    socket.on("channel:updated", reload);
    socket.on("user:updated", reload);

    return () => {
      socket.disconnect();
    };
  }, [userId, userScopeKey]);

  const visibleChannels = useMemo(() => {
    const builtInOrder = ['chapterAnnouncements', 'penguinParties', 'alumniFeed', 'officerFeed'];
    const rank = new Map(builtInOrder.map((slug, index) => [slug, index]));
    return [...channels].filter((channel) => channel?.canView !== false).sort((a, b) => {
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

  const activeSlug = String(location.pathname || "").split("/").filter(Boolean).pop() || "";
  const activeChannel = visibleChannels.find((channel) => channel.slug === activeSlug);

  if (isNarrow) {
    return (
      <section
        className="channels-sidebar channels-sidebar-mobile"
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
              className={({ isActive }) => isActive ? "channel-link active" : "channel-link"}
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

      <div className="channels-list-wrap">
      <nav className="channels-scroll">
        {loading && <div style={{ color: '#7b5d63', fontSize: 12, padding: '6px 2px' }}>Loading channels…</div>}
        {!loading && visibleChannels.map(channel => (
          <NavLink key={channel._id || channel.slug} to={`/feeds/${channel.slug}`} className={({ isActive }) => isActive ? "channel-link active" : "channel-link"}>
            <span>{iconBySlug[channel.slug] || '#'} </span>
            <span style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.22 }}>{channel.name}</span>
          </NavLink>
        ))}
      </nav>
      </div>
    </aside>
  );
}
