"use server";

import { revalidatePath } from "next/cache";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function updateBioAction(userId: string, bio: string) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    // users can only edit their own bio
    if (session.user.id !== userId) {
        throw new Error("Unauthorized");
    }

    if (bio.length > 500) {
        throw new Error("Bio must be 500 characters or fewer");
    }

    await db.user.update({
        where: { id: userId },
        data: { bio: bio.trim() || null },
    });

    revalidatePath("/profile");
}
