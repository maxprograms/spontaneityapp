"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

type LocationPoint = {
  id: string;
  buildingName: string;
  latitude: number;
  longitude: number;
};

const MAP_IMAGE_URL ="https://static.wixstatic.com/media/5fe702_ca834e8870534dfeac5d82c59800cdb3~mv2.png/v1/fill/w_1380,h_866,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/Screenshot%202024-01-13%20at%202_26_55%20PM.png";

function boundary(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function Map() {
  const { data, isLoading, error } = api.location.getLocation.useQuery({ query: "all" });
  const locations = (data ?? []) as LocationPoint[];

  const pins = useMemo<LocationPoint & { x: number; y: number }[]>(() => {
    if (!locations.length) return [];

    const latitudes = locations.map((location) => location.latitude);
    const longitudes = locations.map((location) => location.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLong = Math.min(...longitudes);
    const maxLong = Math.max(...longitudes);

    const latitudeRange = Math.max(maxLat - minLat, 0.0001);
    const longitudeRange = Math.max(maxLong - minLong, 0.0001);

    return locations.map((location) => {
      const x = boundary(((location.longitude - minLong) / longitudeRange) * 100, 8, 92);
      const y = boundary(100 - ((location.latitude - minLat) / latitudeRange) * 100, 8, 92);

      return {
        ...location,
        x,
        y,
      };
    });
  }, [locations]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-900/5">
        <div className="mb-4 space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Location-based Map</h2>
          <p className="text-sm text-slate-600">
            The map image is styled with CSS and receives location pins from the location router.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-300 bg-slate-950/10 shadow-inner">
          <img
            src={MAP_IMAGE_URL}
            alt="Map background"
            className="h-[28rem] w-full object-cover opacity-90 grayscale contrast-[1.15]"
          />

          <div className="pointer-events-none absolute inset-0">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="inline-flex h-4 w-4 rounded-full bg-cyan-500 ring-2 ring-white shadow-lg shadow-cyan-500/30" />
                  <span className="rounded-full bg-slate-950/90 px-2 py-1 text-xs font-medium tracking-wide text-white shadow-sm shadow-black/20">
                    {pin.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {(isLoading || error) && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/60 text-white">
              {isLoading ? "Loading map locations..." : error?.message ?? "Unable to load locations."}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {pins.map((pin) => (
            <div key={pin.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="font-semibold text-slate-900">{pin.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                Latitude: {pin.latitude.toFixed(5)}, Longitude: {pin.longitude.toFixed(5)}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                Rendered from location router
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
