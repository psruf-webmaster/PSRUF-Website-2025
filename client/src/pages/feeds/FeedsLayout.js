import React from "react";
import { Outlet } from "react-router-dom";
import ChannelsSidebar from "../../components/ChannelsSidebar";

export default function FeedsLayout() {
  return (
    <div className="feeds-layout">
      <ChannelsSidebar />
      <div className="feeds-layout-main">
        <Outlet />
      </div>
    </div>
  );
}
