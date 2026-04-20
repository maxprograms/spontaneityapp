"use server";

import { revalidatePath } from "next/cache";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendshipStatus,
} from "~/server/queries/FriendshipQueries";

// The friendship field mirrors the return shape of getFriendshipStatus(),
// excluding the "SELF" case since search results never include the current user.
export type FriendshipInfo =
    | { status: "NONE"; friendshipId: null }
    | { status: "BLOCKED_BY_YOU"; friendshipId: string }
    | { status: "PENDING"; friendshipId: string; direction: "OUTGOING" | "INCOMING" }
    | { status: "ACCEPTED"; friendshipId: string; direction: "OUTGOING" | "INCOMING" };

export type SearchUser = {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
    friendship: FriendshipInfo;
};

// Search users by first name, last name, or email.
// Returns up to 20 results with the current friendship status for each.
export async function searchUsersAction(query: string): Promise<SearchUser[]> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const q = query.trim();
    if (q.length < 1) return [];

    const users = await db.user.findMany({
        where: {
            AND: [
                { id: { not: session.user.id } },
                {
                    OR: [
                        { firstName: { contains: q, mode: "insensitive" } },
                        { lastName: { contains: q, mode: "insensitive" } },
                        { name: { contains: q, mode: "insensitive" } },
                        { email: { contains: q, mode: "insensitive" } },
                    ],
                },
            ],
        },
        select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            bio: true,
        },
        take: 20,
    });

    const results = await Promise.all(
        users.map(async (user) => {
            const fs = await getFriendshipStatus(session.user.id, user.id);
            // getFriendshipStatus can return "SELF" but we already excluded the
            // current user above, so we can safely cast.
            return { ...user, friendship: fs as FriendshipInfo };
        })
    );

    return results;
}

export async function sendFriendRequestAction(addresseeId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    await sendFriendRequest(session.user.id, addresseeId);
    revalidatePath("/friends");
}

export async function acceptFriendRequestAction(friendshipId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    await acceptFriendRequest(friendshipId, session.user.id);
    revalidatePath("/friends");
}

// Used for both "Decline" (by the recipient) and "Cancel" (by the sender).
export async function rejectFriendRequestAction(friendshipId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    await rejectFriendRequest(friendshipId, session.user.id);
    revalidatePath("/friends");
}

export async function removeFriendAction(friendshipId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    await removeFriend(friendshipId, session.user.id);
    revalidatePath("/friends");
}
