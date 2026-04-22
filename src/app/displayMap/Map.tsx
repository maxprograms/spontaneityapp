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

const confirmedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
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

  const utils = api.useUtils();

  // Availability toggle - reads and writes User.availability in the DB
  const { data: availability } = api.meetup.getMyAvailability.useQuery();
  const { mutate: setAvailability, isPending: isUpdating } =
    api.meetup.setAvailability.useMutation({
      onSuccess: () => {
        void utils.meetup.getMyAvailability.invalidate();
        void utils.meetup.getMeetupSpots.invalidate();
      },
    });
  const isAvailable = availability === "AVAILABLE";
  const handleToggle = () =>
    setAvailability({ status: isAvailable ? "UNAVAILABLE" : "AVAILABLE" });

  const { data: friends = [], isLoading: loadingFriends } =
    api.meetup.getFriends.useQuery();

  const { data: meetupData, isLoading: loadingMeetup } =
    api.meetup.getMeetupSpots.useQuery(
      { friendId: selectedFriendId! },
      { enabled: !!selectedFriendId },
    );

  // Polls every 3s so both sides see state changes without a refresh
  const { data: meetupRequest } = api.meetup.getMeetupRequest.useQuery(
    { friendId: selectedFriendId! },
    { enabled: !!selectedFriendId, refetchInterval: 3000 },
  );

  const { mutate: requestMeetup } = api.meetup.requestMeetup.useMutation({
    onSuccess: () => void utils.meetup.getMeetupRequest.invalidate(),
  });

  const { mutate: respondToMeetup } = api.meetup.respondToMeetup.useMutation({
    onSuccess: () => void utils.meetup.getMeetupRequest.invalidate(),
  });

  const { mutate: cancelMeetup } = api.meetup.cancelMeetup.useMutation({
    onSuccess: () => void utils.meetup.getMeetupRequest.invalidate(),
  });

  const selectedFriend = friends.find((f) => f.friend.id === selectedFriendId);
  const friendName = selectedFriend
    ? ((`${selectedFriend.friend.firstName ?? ""} ${selectedFriend.friend.lastName ?? ""}`.trim() || selectedFriend.friend.name) ?? "Friend")
    : null;

  const boundsPoints: [number, number][] = [
    ...(meetupData?.myLocation ? [[meetupData.myLocation.lat, meetupData.myLocation.lng] as [number, number]] : []),
    ...(meetupData?.friendLocation ? [[meetupData.friendLocation.lat, meetupData.friendLocation.lng] as [number, number]] : []),
  ];

  const confirmedLocation = meetupRequest?.status === "ACCEPTED" ? meetupRequest.location : null;

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Friend picker panel */}
      <div className="w-full shrink-0 space-y-4 lg:w-72">

        {/* Availability toggle - persists to User.availability in DB */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Your status</h2>
          <button
            onClick={handleToggle}
            disabled={isUpdating || availability === undefined}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
              isAvailable
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <span>{isAvailable ? "Available to meet up" : "Not available"}</span>
            <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isAvailable ? "bg-emerald-500" : "bg-slate-300"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isAvailable ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </button>
        </div>

        {/* Friend picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Meet up with...</h2>

          {loadingFriends ? (
            <p className="text-sm text-slate-400">Loading friends...</p>
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

        {/* Results / meetup request panel */}
        {selectedFriendId && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            {/* Meetup request states take priority over suggestions */}
            {meetupRequest?.status === "ACCEPTED" && meetupRequest.location ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Meetup confirmed!</h3>
                <p className="text-sm text-slate-600">{meetupRequest.location.name}</p>
                <button
                  onClick={() => cancelMeetup({ friendId: selectedFriendId })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
                >
                  Reset
                </button>
              </div>
            ) : meetupRequest?.status === "PENDING" && meetupRequest.iAmRequester ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Waiting for response...</h3>
                <p className="text-sm text-slate-500">
                  You suggested <span className="font-medium text-slate-700">{meetupRequest.location?.name}</span> to {friendName}.
                </p>
                <button
                  onClick={() => cancelMeetup({ friendId: selectedFriendId })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            ) : meetupRequest?.status === "PENDING" && !meetupRequest.iAmRequester ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Meetup suggestion</h3>
                <p className="text-sm text-slate-600">
                  {friendName} wants to meet at <span className="font-medium text-slate-800">{meetupRequest.location?.name}</span>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToMeetup({ friendId: selectedFriendId, accept: true })}
                    className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToMeetup({ friendId: selectedFriendId, accept: false })}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : meetupRequest?.status === "DECLINED" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  {meetupRequest.iAmRequester ? `${friendName} declined.` : "You declined."} Try another spot.
                </p>
                <button
                  onClick={() => cancelMeetup({ friendId: selectedFriendId })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
                >
                  Reset
                </button>
              </div>
            ) : loadingMeetup ? (
              <p className="text-sm text-slate-400">Finding meetup spots...</p>
            ) : meetupData?.myUnavailable ? (
              <p className="text-sm text-slate-500">You are set to unavailable. Toggle your status above to find meetup spots.</p>
            ) : meetupData?.friendUnavailable ? (
              <p className="text-sm text-slate-500">{friendName} is currently unavailable.</p>
            ) : !meetupData?.myLocation && !meetupData?.friendLocation ? (
              <p className="text-sm text-slate-500">
                Neither you nor {friendName} have a current schedule entry with a building code set. Meetup spots cannot be calculated.
              </p>
            ) : !meetupData?.myLocation ? (
              <p className="text-sm text-slate-500">You do not have a building set in your current schedule.</p>
            ) : !meetupData?.friendLocation ? (
              <p className="text-sm text-slate-500">{friendName} does not have a building set right now.</p>
            ) : (
              <>
                <h3 className="mb-2 font-semibold text-slate-900">Suggested meetup spots</h3>
                <p className="mb-2 text-xs text-slate-400">Click a pin on the map to suggest a spot.</p>
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

        {/* Legend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" /> You</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500" /> Friend</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-400" /> Suggested spots</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-400" /> Confirmed meetup</div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 lg:self-start overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <MapContainer center={UF_CENTER} zoom={15} style={{ height: "32rem", width: "100%" }} className="z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {boundsPoints.length >= 2 && <FitBounds spots={boundsPoints} />}

          {meetupData?.myLocation && (
            <Marker position={[meetupData.myLocation.lat, meetupData.myLocation.lng]} icon={myIcon}>
              <Popup>You - {meetupData.myLocation.name}</Popup>
            </Marker>
          )}

          {meetupData?.friendLocation && (
            <Marker position={[meetupData.friendLocation.lat, meetupData.friendLocation.lng]} icon={friendIcon}>
              <Popup>{friendName} - {meetupData.friendLocation.name}</Popup>
            </Marker>
          )}

          {/* Suggestion pins - show gold if confirmed, orange otherwise */}
          {meetupData?.suggestions.map((s, i) => {
            const isConfirmed = confirmedLocation?.id === s.id;
            return (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={isConfirmed ? confirmedIcon : suggestionIcon}>
                <Popup>
                  <div className="space-y-1">
                    <p className="font-medium">#{i + 1} {s.name}</p>
                    {!meetupRequest?.status && selectedFriendId && (
                      <button
                        onClick={() => requestMeetup({ friendId: selectedFriendId, locationId: s.id })}
                        className="mt-1 w-full rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
                      >
                        Suggest this spot
                      </button>
                    )}
                    {isConfirmed && <p className="text-xs font-semibold text-yellow-600">Confirmed meetup spot!</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Confirmed location if not already in suggestions list */}
          {confirmedLocation && !meetupData?.suggestions.find(s => s.id === confirmedLocation.id) && (
            <Marker position={[confirmedLocation.lat, confirmedLocation.lng]} icon={confirmedIcon}>
              <Popup>Confirmed meetup: {confirmedLocation.name}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}