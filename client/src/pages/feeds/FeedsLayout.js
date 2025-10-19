import React from "react";
import { Outlet } from "react-router-dom";
import ChannelsSidebar from "../../components/ChannelsSidebar";

export default function FeedsLayout() {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "12px auto",
        padding: "0 16px",
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 16,
      }}
    >
      <ChannelsSidebar />
      <div>
        {/* Right pane = whatever child route renders */}
        <Outlet />
      </div>
    </div>
  );
}
