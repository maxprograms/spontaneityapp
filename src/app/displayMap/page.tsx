import Map from "./Map";

export default function DisplayMapPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-900/5">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Spontaneity Map</h1>
          <p className="text-sm text-slate-600">
            This map displays location data from the location router
          </p>
        </div>
        <Map />
      </div>
    </main>
  );
}
