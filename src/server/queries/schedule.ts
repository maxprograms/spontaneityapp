import {db} from "~/server/db"
import { AvailabilityStatus, UserRole } from "../../../generated/prisma";


// helper to check that userID is valid
async function getUserOrThrow(userId: string) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
        },
    });

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}

// helper to check that schedule exists
async function getScheduleOrThrow(scheduleId: string) {
    const schedule = await db.schedule.findUnique({
        where: { id: scheduleId },
    });

    if (!schedule) {
        throw new Error("Schedule not found");
    }

    return schedule;
}

// helper that check if userID is admin or the owner of the schedule to modify/delete
async function getAuthorizedSchedule(scheduleId: string, actingUserId: string) {
    const user = await getUserOrThrow(actingUserId);
    const schedule = await getScheduleOrThrow(scheduleId);

    const isOwner = schedule.userId === actingUserId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new Error("Unauthorized");
    }

    return schedule;
}




// function to create new schedule entry for user
export async function createSchedule(
    userId: string, 
    buildingCode: string,
    startDateTime: Date,
    endDateTime: Date,
    status: AvailabilityStatus, // Available or Unavailable
    classCode?: string,
    locationName?: string
) {

    await getUserOrThrow(userId);

    if (startDateTime >= endDateTime) {
        throw new Error("startDateTime must be before endDateTime");
    }

    return db.schedule.create({
        data: {
            userId,
            buildingCode,
            startDateTime,
            endDateTime,
            status,
            classCode,
            locationName,
        },
    });
}


// function to get full schedule of specific user
export async function getScheduleForUser(userId: string) {
    
    await getUserOrThrow(userId);
    
    return db.schedule.findMany({
        where: {userId},
        orderBy: {startDateTime: "asc"}, // sorts schedules chronologically
    });
}

// function to retrive availability based on specific time
// !!!FOR CAMPUS GRAPH ALGORITHM!!!
export async function userAvailabilityAtTime(userId: string, time: Date) {
    
    await getUserOrThrow(userId);
    
    const scheduleEntry = await db.schedule.findFirst({
        where: {
            userId,
            startDateTime: {lte: time},
            endDateTime: {gt:time}
        },
        select: {
            status: true, 
            buildingCode: true
        }
    });

    // if user has no schedule at that time -> they are neither availbale/unavailable -> return false
    if (!scheduleEntry) {
        return {
            available: false, // we can modify with additional features in sprint 2
            buildingCode: null
        };
    }

    return {
        available: scheduleEntry.status === AvailabilityStatus.AVAILABLE, // if availble returns true 
        buildingCode: scheduleEntry.buildingCode,
    };
}



type UpdateScheduleInput = {
    buildingCode?: string;
    startDateTime?: Date;
    endDateTime?: Date;
    status?: AvailabilityStatus;
    classCode?: string | null;
    locationName?: string | null;
};

// update schedule
export async function updateSchedule(
    scheduleId: string,
    actingUserId: string,
    updates: UpdateScheduleInput
) {
    const existingSchedule = await getAuthorizedSchedule(scheduleId, actingUserId);

    const newStartDateTime = updates.startDateTime ?? existingSchedule.startDateTime;
    const newEndDateTime = updates.endDateTime ?? existingSchedule.endDateTime;

    if (newStartDateTime >= newEndDateTime) {
        throw new Error("startDateTime must be before endDateTime");
    }

    return db.schedule.update({
        where: { id: scheduleId },
        data: {
            buildingCode: updates.buildingCode,
            startDateTime: updates.startDateTime,
            endDateTime: updates.endDateTime,
            status: updates.status,
            classCode: updates.classCode,
            locationName: updates.locationName,
        },
    });
}

// delete schedule
export async function deleteSchedule(
    scheduleId: string,
    actingUserId: string
) {
    await getAuthorizedSchedule(scheduleId, actingUserId);

    return db.schedule.delete({
        where: { id: scheduleId },
    });
}