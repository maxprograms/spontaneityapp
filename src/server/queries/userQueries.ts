import { db } from "~/server/db";
import { UserRole } from "../../../generated/prisma";

// helper to check that user exists
export async function getUserOrThrow(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            bio: true,
            role: true,
        },
    });

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

// helper to check if acting user is admin or the same user
async function getAuthorizedUser(targetUserId: string, actingUserId: string) {
    const actingUser = await db.user.findUnique({
        where: { id: actingUserId },
        select: {
            id: true,
            role: true,
        },
    });
    
    if (!actingUser) {
        throw new Error("Acting user not found");
    }

    const targetUser = await getUserOrThrow(targetUserId);
    const isSelf = targetUserId === actingUserId;
    const isAdmin = actingUser.role === UserRole.ADMIN;
    
    if (!isSelf && !isAdmin) {
        throw new Error("Unauthorized");
    }
    
    return targetUser;
}

// get user by id
export async function getUserById(userId: string) {
    return getUserOrThrow(userId);
}


// get all users
export async function getAllUsers() {
    return db.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            bio: true,
            role: true,
        },
    
        orderBy: [
            { lastName: "asc" },
            { firstName: "asc" },
        ],
    });
}




type UpdateUserInput = {
    firstName?: string;
    lastName?: string;
    image?: string | null;
};

// update user profile
export async function updateUserProfile(
    targetUserId: string,
    actingUserId: string,
    updates: UpdateUserInput
) {
    
    await getAuthorizedUser(targetUserId, actingUserId);
    
    if (updates.firstName !== undefined && !updates.firstName.trim()) {
        throw new Error("firstName cannot be empty");
    }
    
    if (updates.lastName !== undefined && !updates.lastName.trim()) {
        throw new Error("lastName cannot be empty");
    }
    
    return db.user.update({
        where: { id: targetUserId },
        data: {
            firstName: updates.firstName?.trim(),
            lastName: updates.lastName?.trim(),
            image: updates.image,
        },
        
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            role: true,
        },
    });
}

// delete user
export async function deleteUser(
    targetUserId: string,
    actingUserId: string
) {
    
    await getAuthorizedUser(targetUserId, actingUserId);
    
    return db.user.delete({
        where: { id: targetUserId },
    });
}