import { db } from "~/server/db";

// helper to check that location exists
export async function getLocationOrThrow(locationId: string) {
    const location = await db.location.findUnique({
        where: { id: locationId },
    });
    
    if (!location) {
        throw new Error("Location not found");
    }
    
    return location;
}

// create a new location
export async function createLocation(
    id: string,
    name: string,
    latitude: number,
    longitude: number
) {
    
    if (!id.trim()) {
        throw new Error("Location id cannot be empty");
    }

    if (!name.trim()) {
        throw new Error("Location name cannot be empty");
    }

    if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90");
    }

    if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180");
    }

    return db.location.create({
        data: {
            id: id.trim(),
            name: name.trim(),
            latitude,
            longitude,
        },
    });
}



// get location by id
export async function getLocationById(locationId: string) {
    return getLocationOrThrow(locationId);
}


// get all locations
export async function getAllLocations() {
    return db.location.findMany({
        orderBy: {
            name: "asc",
        },
    });
}


type UpdateLocationInput = {
    name?: string;
    latitude?: number;
    longitude?: number;
};

// update location
export async function updateLocation(
    locationId: string,
    updates: UpdateLocationInput
) {
    await getLocationOrThrow(locationId);
    
    if (updates.name !== undefined && !updates.name.trim()) {
        throw new Error("Location name cannot be empty");
    }
    
    if ( updates.latitude !== undefined && (updates.latitude < -90 || updates.latitude > 90)) {
        throw new Error("Latitude must be between -90 and 90");
    }
    
    if (updates.longitude !== undefined && (updates.longitude < -180 || updates.longitude > 180)) {
        throw new Error("Longitude must be between -180 and 180");
    }

    return db.location.update({
        where: { id: locationId },
        data: {
            name: updates.name?.trim(),
            latitude: updates.latitude,
            longitude: updates.longitude,
        },
    });
}

// delete location
export async function deleteLocation(locationId: string) {
    await getLocationOrThrow(locationId);
    
    return db.location.delete({
        where: { id: locationId },
    });
}