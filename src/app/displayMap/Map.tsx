"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { api } from "~/trpc/react";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const myIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const friendIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const suggestionIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const UF_CENTER: [number, number] = [29.6436, -82.3549];


function FitBounds({ spots }: { spots: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (spots.length >= 2) {
      map.fitBounds(spots, { padding: [60, 60] });
    }
  }, [map, spots]);
  return null;
}

export default function Map() {
  const [mounted, setMounted] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const { data: friends = [], isLoading: loadingFriends } =
    api.meetup.getFriends.useQuery();

  const { data: meetupData, isLoading: loadingMeetup } =
    api.meetup.getMeetupSpots.useQuery(
      { friendId: selectedFriendId! },
      { enabled: !!selectedFriendId },
    );

  const selectedFriend = friends.find((f) => f.friend.id === selectedFriendId);
  const friendName = selectedFriend
    ? ((`${selectedFriend.friend.firstName ?? ""} ${selectedFriend.friend.lastName ?? ""}`.trim() || selectedFriend.friend.name) ?? "Friend")
    : null;

  const boundsPoints: [number, number][] = [
    ...(meetupData?.myLocation ? [[meetupData.myLocation.lat, meetupData.myLocation.lng] as [number, number]] : []),
    ...(meetupData?.friendLocation ? [[meetupData.friendLocation.lat, meetupData.friendLocation.lng] as [number, number]] : []),
  ];

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* ── Friend picker panel ── */}
      <div className="w-full shrink-0 space-y-4 lg:w-72">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Meet up with…</h2>

          {loadingFriends ? (
            <p className="text-sm text-slate-400">Loading friends…</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-slate-400">No friends yet. Add some from the Friends page!</p>
          ) : (
            <ul className="space-y-1">
              {friends.map(({ friend, friendshipId }) => {
                const name = (`${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim() || friend.name) ?? "Unknown";
                const isSelected = friend.id === selectedFriendId;
                return (
                  <li key={friendshipId}>
                    <button
                      onClick={() => setSelectedFriendId(isSelected ? null : friend.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSelected ? "bg-white text-slate-900" : "bg-slate-200 text-slate-600"}`}>
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="truncate font-medium">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Results panel ── */}
        {selectedFriendId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {loadingMeetup ? (
              <p className="text-sm text-slate-400">Finding meetup spots…</p>
            ) : !meetupData?.myLocation && !meetupData?.friendLocation ? (
              <p className="text-sm text-slate-500">
                Neither you nor {friendName} have a current schedule entry with a building code set. Meetup spots can&apos;t be calculated.
              </p>
            ) : !meetupData?.myLocation ? (
              <p className="text-sm text-slate-500">You don&apos;t have a building set in your current schedule.</p>
            ) : !meetupData?.friendLocation ? (
              <p className="text-sm text-slate-500">{friendName} doesn&apos;t have a building set right now.</p>
            ) : (
              <>
                <h3 className="mb-2 font-semibold text-slate-900">Suggested meetup spots</h3>
                {meetupData.suggestions.length === 0 ? (
                  <p className="text-sm text-slate-400">No nearby locations found.</p>
                ) : (
                  <ul className="space-y-2">
                    {meetupData.suggestions.map((s, i) => (
                      <li key={s.id} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                          {i + 1}
                        </span>
                        <span className="text-slate-700">{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Legend ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" /> You</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500" /> Friend</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-400" /> Suggested spots</div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <MapContainer center={UF_CENTER} zoom={15} style={{ height: "32rem", width: "100%" }} className="z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {boundsPoints.length >= 2 && <FitBounds spots={boundsPoints} />}

          {meetupData?.myLocation && (
            <Marker position={[meetupData.myLocation.lat, meetupData.myLocation.lng]} icon={myIcon}>
              <Popup>📍 You — {meetupData.myLocation.name}</Popup>
            </Marker>
          )}

          {meetupData?.friendLocation && (
            <Marker position={[meetupData.friendLocation.lat, meetupData.friendLocation.lng]} icon={friendIcon}>
              <Popup>👤 {friendName} — {meetupData.friendLocation.name}</Popup>
            </Marker>
          )}

          {meetupData?.suggestions.map((s, i) => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={suggestionIcon}>
              <Popup>#{i + 1} {s.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
