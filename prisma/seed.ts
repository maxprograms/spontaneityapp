import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

async function seedLocations() {
  const res = await fetch("https://campusmap.ufl.edu/assets/boundaries.json");
  const data = await res.json() as { features: any[] };

  const seenNames = new Set<string>();

  const locations = data.features
    .map((feature: any) => ({
      id: feature.properties.PropSTCode as string,
      name: feature.properties.PropName as string,
      latitude: feature.properties.Latitude as number,
      longitude: feature.properties.Longitude as number,
    }))
    .filter(
      (loc) =>
        loc.id &&
        loc.name &&
        loc.latitude != null &&
        loc.longitude != null
    )
    .filter((loc) => {
      if (seenNames.has(loc.name)) return false;
      seenNames.add(loc.name);
      return true;
    });

  const result = await db.location.createMany({
    data: locations,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} locations.`);
}

async function main() {
  await seedLocations();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
