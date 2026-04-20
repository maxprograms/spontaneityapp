import { db } from "~/server/db";
import { FriendshipStatus, AvailabilityStatus } from "../../../generated/prisma";


// helper to check that user exists
async function getUserOrThrow(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

// helper to find an existing friendship row between two users (in either direction)
async function findFriendship(userA: string, userB: string) {
    return db.friendship.findFirst({
        where: {
            OR: [
                { requesterId: userA, addresseeId: userB },
                { requesterId: userB, addresseeId: userA },
            ],
        },
    });
}

// shared select object for returning user info on friendship queries
const friendUserSelect = {
    id: true,
    name: true,
    firstName: true,
    lastName: true,
    email: true,
    image: true,
    bio: true,
} as const;


// SEND FRIEND REQUEST
export async function sendFriendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
        throw new Error("Cannot send a friend request to yourself");
    }

    await getUserOrThrow(requesterId);
    await getUserOrThrow(addresseeId);

    const existing = await findFriendship(requesterId, addresseeId);

    if (existing) {
        if (existing.status === FriendshipStatus.ACCEPTED) {
            throw new Error("Already friends");
        }
        if (existing.status === FriendshipStatus.PENDING) {
            throw new Error("Friend request already pending");
        }
        if (existing.status === FriendshipStatus.BLOCKED) {
            throw new Error("Cannot send friend request");
        }
    }

    return db.friendship.create({
        data: {
            requesterId,
            addresseeId,
            status: FriendshipStatus.PENDING,
        },
        include: {
            requester: { select: friendUserSelect },
            addressee: { select: friendUserSelect },
        },
    });
}

// ACCEPT FRIEINDSHIP REQUEST
export async function acceptFriendRequest(friendshipId: string, actingUserId: string) {
    const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
    });

    if (!friendship) {
        throw new Error("Friend request not found");
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
        throw new Error("Friend request is not pending");
    }

    // only the addressee (twho received the request) can accept
    if (friendship.addresseeId !== actingUserId) {
        throw new Error("Only the recipient can accept a friend request");
    }

    return db.friendship.update({
        where: { id: friendshipId },
        data: { status: FriendshipStatus.ACCEPTED },
        include: {
            requester: { select: friendUserSelect },
            addressee: { select: friendUserSelect },
        },
    });
}

// REJECT/CANCEL FRIENDSHIP
export async function rejectFriendRequest(friendshipId: string, actingUserId: string) {
    const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
    });

    if (!friendship) {
        throw new Error("Friend request not found");
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
        throw new Error("Friend request is not pending");
    }

    // the addressee can decline, or the requester can cancel their own request
    if (friendship.addresseeId !== actingUserId && friendship.requesterId !== actingUserId) {
        throw new Error("Unauthorized");
    }

    return db.friendship.delete({
        where: { id: friendshipId },
    });
}

// REMOVE FRIEND
export async function removeFriend(friendshipId: string, actingUserId: string) {
    const friendship = await db.friendship.findUnique({
        where: { id: friendshipId },
    });

    if (!friendship) {
        throw new Error("Friendship not found");
    }

    if (friendship.status !== FriendshipStatus.ACCEPTED) {
        throw new Error("Not currently friends");
    }

    // either party can unfriend
    if (friendship.requesterId !== actingUserId && friendship.addresseeId !== actingUserId) {
        throw new Error("Unauthorized");
    }

    return db.friendship.delete({
        where: { id: friendshipId },
    });
}

// BLOCK USER
export async function blockUser(blockerId: string, blockedUserId: string) {
    if (blockerId === blockedUserId) {
        throw new Error("Cannot block yourself");
    }

    await getUserOrThrow(blockerId);
    await getUserOrThrow(blockedUserId);

    const existing = await findFriendship(blockerId, blockedUserId);

    // if a friendship row already exists, update it to BLOCKED
    // making sure the blocker is always the requester for consistent lookups
    if (existing) {
        // if the blocker is already the requester, just update status
        if (existing.requesterId === blockerId) {
            return db.friendship.update({
                where: { id: existing.id },
                data: { status: FriendshipStatus.BLOCKED },
            });
        }

        // if the blocker is the addressee, delete the old row and create a new one
        // so the blocker is the requester (makes unblock logic simpler)
        await db.friendship.delete({ where: { id: existing.id } });
    }

    return db.friendship.create({
        data: {
            requesterId: blockerId,
            addresseeId: blockedUserId,
            status: FriendshipStatus.BLOCKED,
        },
    });
}

// UNBLOCK USER
export async function unblockUser(blockerId: string, blockedUserId: string) {
    // because blockUser always stores the blocker as requester,
    // we can look up directly
    const friendship = await db.friendship.findFirst({
        where: {
            requesterId: blockerId,
            addresseeId: blockedUserId,
            status: FriendshipStatus.BLOCKED,
        },
    });

    if (!friendship) {
        throw new Error("Block relationship not found");
    }

    // unblock removes the row entirely --> they'd need to re-request to be friends!!!
    return db.friendship.delete({
        where: { id: friendship.id },
    });
}

// GET ALL FRIENDS (only the ones that accepted)
export async function getFriends(userId: string) {
    await getUserOrThrow(userId);

    const friendships = await db.friendship.findMany({
        where: {
            status: FriendshipStatus.ACCEPTED,
            OR: [
                { requesterId: userId },
                { addresseeId: userId },
            ],
        },
        include: {
            requester: { select: friendUserSelect },
            addressee: { select: friendUserSelect },
        },
        orderBy: { updatedAt: "desc" },
    });

    // return the other user in each friendship row
    return friendships.map((f) => ({
        friendshipId: f.id,
        friend: f.requesterId === userId ? f.addressee : f.requester,
        since: f.updatedAt, // updatedAt reflects when it was accepted
    }));
}

// GET PENDING INCOMING REQUESTS
export async function getIncomingFriendRequests(userId: string) {
    await getUserOrThrow(userId);

    const requests = await db.friendship.findMany({
        where: {
            addresseeId: userId,
            status: FriendshipStatus.PENDING,
        },
        include: {
            requester: { select: friendUserSelect },
        },
        orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => ({
        friendshipId: r.id,
        from: r.requester,
        sentAt: r.createdAt,
    }));
}

// GET PENDING OUTGOING REQUESTS
export async function getOutgoingFriendRequests(userId: string) {
    await getUserOrThrow(userId);

    const requests = await db.friendship.findMany({
        where: {
            requesterId: userId,
            status: FriendshipStatus.PENDING,
        },
        include: {
            addressee: { select: friendUserSelect },
        },
        orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => ({
        friendshipId: r.id,
        to: r.addressee,
        sentAt: r.createdAt,
    }));
}

// GET FREINDSHIP STATUS BETWEEN TWO USERS
export async function getFriendshipStatus(userA: string, userB: string) {
    if (userA === userB) {
        return { status: "SELF" as const, friendshipId: null };
    }

    const friendship = await findFriendship(userA, userB);

    if (!friendship) {
        return { status: "NONE" as const, friendshipId: null };
    }

    // for BLOCKED, only reveal the block to the person who initiated it
    if (friendship.status === FriendshipStatus.BLOCKED) {
        if (friendship.requesterId === userA) {
            return { status: "BLOCKED_BY_YOU" as const, friendshipId: friendship.id };
        }
        // don't reveal to the blocked user that they're blocked
        return { status: "NONE" as const, friendshipId: null };
    }

    return {
        status: friendship.status, // "PENDING" or "ACCEPTED"
        friendshipId: friendship.id,
        direction: friendship.requesterId === userA ? "OUTGOING" as const : "INCOMING" as const,
    };
}

// GET AVAILABLE FRIENDS AT A GIVEN TIME --> IMPORTANT FOR GRAPH
export async function getAvailableFriendsAtTime(userId: string, time: Date) {
    await getUserOrThrow(userId);

    // get all accepted friend IDs
    const friendships = await db.friendship.findMany({
        where: {
            status: FriendshipStatus.ACCEPTED,
            OR: [
                { requesterId: userId },
                { addresseeId: userId },
            ],
        },
        select: {
            requesterId: true,
            addresseeId: true,
        },
    });

    const friendIds = friendships.map((f) =>
        f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    if (friendIds.length === 0) {
        return [];
    }

    // find which of those friends have an AVAILABLE schedule entry at the given time
    const availableSchedules = await db.schedule.findMany({
        where: {
            userId: { in: friendIds },
            status: AvailabilityStatus.AVAILABLE,
            startDateTime: { lte: time },
            endDateTime: { gt: time },
        },
        include: {
            user: { select: friendUserSelect },
        },
    });

    return availableSchedules.map((s) => ({
        friend: s.user,
        buildingCode: s.buildingCode,
        locationName: s.locationName,
        availableUntil: s.endDateTime,
    }));
}