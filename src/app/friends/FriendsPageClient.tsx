"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    searchUsersAction,
    sendFriendRequestAction,
    acceptFriendRequestAction,
    rejectFriendRequestAction,
    removeFriendAction,
    type SearchUser,
    type FriendshipInfo,
} from "./actions";

// ── Types mirroring the query return shapes ──────────────────────────────────

type IncomingRequest = {
    friendshipId: string;
    from: {
        id: string;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        image: string | null;
        bio: string | null;
    };
    sentAt: Date;
};

type OutgoingRequest = {
    friendshipId: string;
    to: {
        id: string;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        image: string | null;
        bio: string | null;
    };
    sentAt: Date;
};

type Friend = {
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
};

interface Props {
    incoming: IncomingRequest[];
    outgoing: OutgoingRequest[];
    friends: Friend[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function displayName(user: {
    firstName: string | null;
    lastName: string | null;
    name: string | null;
}) {
    return (
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.name ||
        "Unknown"
    );
}

function initials(user: {
    firstName: string | null;
    lastName: string | null;
    name: string | null;
}) {
    const first = user.firstName?.[0] ?? user.name?.[0] ?? "?";
    const last = user.lastName?.[0] ?? "";
    return `${first}${last}`;
}

// ── Small reusable avatar ────────────────────────────────────────────────────

function Avatar({
    image,
    name,
    size = "md",
}: {
    image: string | null;
    name: string;
    size?: "sm" | "md";
}) {
    const dim = size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";
    return (
        <div
            className={`${dim} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200`}
        >
            {image ? (
                <img src={image} alt={name} className="h-full w-full object-cover" />
            ) : (
                <span className="font-semibold text-neutral-600">{name}</span>
            )}
        </div>
    );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "search" | "requests" | "friends";

function TabBar({
    active,
    onChange,
    requestCount,
}: {
    active: Tab;
    onChange: (t: Tab) => void;
    requestCount: number;
}) {
    const tabs: { id: Tab; label: string }[] = [
        { id: "search", label: "Find People" },
        { id: "requests", label: "Requests" },
        { id: "friends", label: "Friends" },
    ];

    return (
        <div className="flex gap-1 rounded-2xl border border-black/10 bg-[#fafafa] p-1">
            {tabs.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    className={`relative flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        active === t.id
                            ? "bg-[#050522] text-white shadow-sm"
                            : "text-neutral-500 hover:text-neutral-800"
                    }`}
                >
                    {t.label}
                    {t.id === "requests" && requestCount > 0 && (
                        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white leading-none">
                            {requestCount}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ── Find People tab ──────────────────────────────────────────────────────────

function FindPeopleTab() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchUser[] | null>(null);
    const [isSearching, startSearch] = useTransition();
    const [actionPending, startAction] = useTransition();

    // Track local friendship state for instant button feedback
    const [localFriendship, setLocalFriendship] = useState<
        Record<string, FriendshipInfo>
    >({});

    function friendship(user: SearchUser): FriendshipInfo {
        return localFriendship[user.id] ?? user.friendship;
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;
        startSearch(async () => {
            const data = await searchUsersAction(query);
            setResults(data);
        });
    }

    function handleSend(userId: string) {
        startAction(async () => {
            await sendFriendRequestAction(userId);
            setLocalFriendship((prev) => ({
                ...prev,
                [userId]: { status: "PENDING", friendshipId: "", direction: "OUTGOING" },
            }));
            router.refresh();
        });
    }

    function handleCancel(userId: string, friendshipId: string) {
        startAction(async () => {
            await rejectFriendRequestAction(friendshipId);
            setLocalFriendship((prev) => ({
                ...prev,
                [userId]: { status: "NONE", friendshipId: null },
            }));
            router.refresh();
        });
    }

    function handleAcceptFromSearch(userId: string, friendshipId: string) {
        startAction(async () => {
            await acceptFriendRequestAction(friendshipId);
            setLocalFriendship((prev) => ({
                ...prev,
                [userId]: { status: "ACCEPTED", friendshipId, direction: "INCOMING" },
            }));
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#fafafa] px-4 py-2.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-[#050522] focus:outline-none focus:ring-1 focus:ring-[#050522]"
                />
                <button
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="rounded-xl bg-[#050522] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                    {isSearching ? "Searching…" : "Search"}
                </button>
            </form>

            {results === null ? (
                <p className="text-center text-sm text-neutral-400">
                    Search for classmates by name or email to send them a friend request.
                </p>
            ) : results.length === 0 ? (
                <p className="text-center text-sm text-neutral-500">
                    No users found for &ldquo;{query}&rdquo;.
                </p>
            ) : (
                <div className="space-y-2">
                    {results.map((user) => {
                        const fs = friendship(user);
                        const name = displayName(user);

                        return (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[#fafafa] p-4"
                            >
                                <Avatar image={user.image} name={initials(user)} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-black">{name}</p>
                                    <p className="truncate text-sm text-neutral-500">
                                        {user.bio?.slice(0, 60) || user.email || "No bio"}
                                        {user.bio && user.bio.length > 60 ? "…" : ""}
                                    </p>
                                </div>

                                {/* Action button based on friendship state */}
                                {fs.status === "NONE" && (
                                    <button
                                        onClick={() => handleSend(user.id)}
                                        disabled={actionPending}
                                        className="shrink-0 rounded-xl bg-[#050522] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                                    >
                                        Add Friend
                                    </button>
                                )}
                                {fs.status === "PENDING" && fs.direction === "OUTGOING" && (
                                    <button
                                        onClick={() => handleCancel(user.id, fs.friendshipId)}
                                        disabled={actionPending}
                                        className="shrink-0 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                                    >
                                        Cancel
                                    </button>
                                )}
                                {fs.status === "PENDING" && fs.direction === "INCOMING" && (
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() =>
                                                handleAcceptFromSearch(user.id, fs.friendshipId)
                                            }
                                            disabled={actionPending}
                                            className="rounded-xl bg-[#050522] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleCancel(user.id, fs.friendshipId)}
                                            disabled={actionPending}
                                            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}
                                {fs.status === "ACCEPTED" && (
                                    <span className="shrink-0 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-400">
                                        Friends
                                    </span>
                                )}
                                {fs.status === "BLOCKED_BY_YOU" && (
                                    <span className="shrink-0 text-sm text-neutral-400">
                                        Blocked
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Requests tab ─────────────────────────────────────────────────────────────

function RequestsTab({
    incoming,
    outgoing,
    onUpdate,
}: {
    incoming: IncomingRequest[];
    outgoing: OutgoingRequest[];
    onUpdate: () => void;
}) {
    const [actionPending, startAction] = useTransition();

    function handleAccept(friendshipId: string) {
        startAction(async () => {
            await acceptFriendRequestAction(friendshipId);
            onUpdate();
        });
    }

    function handleDecline(friendshipId: string) {
        startAction(async () => {
            await rejectFriendRequestAction(friendshipId);
            onUpdate();
        });
    }

    function handleCancel(friendshipId: string) {
        startAction(async () => {
            await rejectFriendRequestAction(friendshipId);
            onUpdate();
        });
    }

    const isEmpty = incoming.length === 0 && outgoing.length === 0;

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center py-12 text-center">
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
                            d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                        />
                    </svg>
                </div>
                <p className="mt-4 text-neutral-600">No pending requests.</p>
                <p className="mt-1 text-sm text-neutral-400">
                    Head to &ldquo;Find People&rdquo; to send friend requests.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Incoming */}
            {incoming.length > 0 && (
                <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                        Incoming ({incoming.length})
                    </h3>
                    <div className="space-y-2">
                        {incoming.map(({ friendshipId, from }) => {
                            const name = displayName(from);
                            return (
                                <div
                                    key={friendshipId}
                                    className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[#fafafa] p-4"
                                >
                                    <Avatar image={from.image} name={initials(from)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-black">{name}</p>
                                        <p className="truncate text-sm text-neutral-500">
                                            {from.bio?.slice(0, 60) || from.email || "No bio"}
                                            {from.bio && from.bio.length > 60 ? "…" : ""}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => handleAccept(friendshipId)}
                                            disabled={actionPending}
                                            className="rounded-xl bg-[#050522] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleDecline(friendshipId)}
                                            disabled={actionPending}
                                            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Outgoing */}
            {outgoing.length > 0 && (
                <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                        Sent ({outgoing.length})
                    </h3>
                    <div className="space-y-2">
                        {outgoing.map(({ friendshipId, to }) => {
                            const name = displayName(to);
                            return (
                                <div
                                    key={friendshipId}
                                    className="flex items-center gap-4 rounded-2xl border border-black/10 bg-[#fafafa] p-4"
                                >
                                    <Avatar image={to.image} name={initials(to)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-black">{name}</p>
                                        <p className="truncate text-sm text-neutral-500">
                                            {to.bio?.slice(0, 60) || to.email || "No bio"}
                                            {to.bio && to.bio.length > 60 ? "…" : ""}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCancel(friendshipId)}
                                        disabled={actionPending}
                                        className="shrink-0 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Friends tab ──────────────────────────────────────────────────────────────

function FriendsTab({
    friends,
    onUpdate,
}: {
    friends: Friend[];
    onUpdate: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [actionPending, startAction] = useTransition();
    const [confirmUnfriend, setConfirmUnfriend] = useState<string | null>(null);

    const filtered = friends.filter((f) => {
        const name = displayName(f.friend).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    function handleUnfriend(friendshipId: string) {
        startAction(async () => {
            await removeFriendAction(friendshipId);
            setConfirmUnfriend(null);
            onUpdate();
        });
    }

    if (friends.length === 0) {
        return (
            <div className="flex flex-col items-center py-12 text-center">
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
        );
    }

    return (
        <div className="space-y-4">
            <input
                type="text"
                placeholder="Search friends…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-2 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-[#050522] focus:outline-none focus:ring-1 focus:ring-[#050522] sm:w-64"
            />

            {filtered.length === 0 ? (
                <p className="text-center text-sm text-neutral-500">
                    No friends matching &ldquo;{searchQuery}&rdquo;
                </p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {filtered.map(({ friendshipId, friend }) => {
                        const name = displayName(friend);
                        return (
                            <div
                                key={friendshipId}
                                className="group flex items-center gap-4 rounded-2xl border border-black/10 bg-[#fafafa] p-4"
                            >
                                <a href={`/profile/${friend.id}`} className="flex flex-1 items-center gap-4 min-w-0">
                                    <Avatar image={friend.image} name={initials(friend)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-black group-hover:text-[#050522]">
                                            {name}
                                        </p>
                                        <p className="truncate text-sm text-neutral-500">
                                            {friend.bio?.slice(0, 50) || friend.email || "No bio"}
                                            {friend.bio && friend.bio.length > 50 ? "…" : ""}
                                        </p>
                                    </div>
                                </a>

                                {/* Unfriend with confirm step */}
                                {confirmUnfriend === friendshipId ? (
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => handleUnfriend(friendshipId)}
                                            disabled={actionPending}
                                            className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setConfirmUnfriend(null)}
                                            className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400"
                                        >
                                            Keep
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmUnfriend(friendshipId)}
                                        className="shrink-0 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-400 transition hover:border-red-300 hover:text-red-500"
                                    >
                                        Unfriend
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function FriendsPageClient({ incoming, outgoing, friends }: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("requests");

    // Switch to Requests tab automatically if there are pending requests
    // (only on first render — don't override user's navigation)
    const [initialized, setInitialized] = useState(false);
    if (!initialized) {
        setInitialized(true);
        if (incoming.length > 0) setActiveTab("requests");
        else if (friends.length > 0) setActiveTab("friends");
    }

    function refresh() {
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <div className="rounded-[28px] border border-black/10 bg-white px-8 py-10 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-black">Friends</h1>
                    <span className="text-sm text-neutral-400">
                        {friends.length} {friends.length === 1 ? "friend" : "friends"}
                    </span>
                </div>

                <TabBar
                    active={activeTab}
                    onChange={setActiveTab}
                    requestCount={incoming.length}
                />

                <div className="mt-6">
                    {activeTab === "search" && <FindPeopleTab />}
                    {activeTab === "requests" && (
                        <RequestsTab
                            incoming={incoming}
                            outgoing={outgoing}
                            onUpdate={refresh}
                        />
                    )}
                    {activeTab === "friends" && (
                        <FriendsTab friends={friends} onUpdate={refresh} />
                    )}
                </div>
            </div>
        </div>
    );
}
