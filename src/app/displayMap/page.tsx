"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), { ssr: false });

export default function DisplayMapPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">Spontaneity Map</h1>
          <p className="text-sm text-slate-500">Select a friend to find meetup spots between you</p>
        </div>
        <Map />
      </div>
    </main>
  );
}
