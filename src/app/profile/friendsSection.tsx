"use client";

import { useState } from "react";

interface Friend {
  friendshipId: string;
  friend: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
  };
  since: Date;
}

interface FriendsSectionProps {
  friends: Friend[];
}

export default function FriendsSection({ friends }: FriendsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = friends.filter((f) => {
    const name =
      `${f.friend.firstName ?? ""} ${f.friend.lastName ?? ""} ${f.friend.name ?? ""}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="rounded-[28px] border border-black/10 bg-white px-8 py-10 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-black">
          Friends{" "}
          <span className="text-lg font-normal text-neutral-400">
            ({friends.length})
          </span>
        </h2>

        <input
          type="text"
          placeholder="Search friends…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-2 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-[#050522] focus:ring-1 focus:ring-[#050522] focus:outline-none sm:w-64"
        />
      </div>

      {friends.length === 0 ? (
        <div className="mt-8 flex flex-col items-center py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <p className="mt-4 text-neutral-600">No friends yet.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Start connecting with classmates to plan spontaneous meetups!
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">
          No friends matching &ldquo;{searchQuery}&rdquo;
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map(({ friendshipId, friend }) => {
            const name =
              `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim() ??
              friend.name ??
              "Unnamed";

            const initial = friend.firstName?.[0] ?? friend.name?.[0] ?? "?";

            return (
              <div
                key={friendshipId}
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[#fafafa] p-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200">
                  {friend.image ? (
                    <img
                      src={friend.image}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-neutral-600">
                      {initial}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-black">
                    {name}
                  </p>
                  <p className="truncate text-sm text-neutral-500">
                    {friend.bio?.slice(0, 60) ?? friend.email ?? "No bio"}
                    {friend.bio && friend.bio.length > 60 ? "…" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
