/**
 * Test seed: creates fake friends + schedules for the meetup map feature.
 *
 * Usage:
 *   npx tsx prisma/seedTest.ts your@email.com
 *
 * What it does:
 *   1. Finds your real user by email
 *   2. Picks 4 random locations from the DB as "current buildings"
 *   3. Creates 3 fake friend users
 *   4. Creates ACCEPTED friendships between you and each fake friend
 *   5. Creates schedule entries covering NOW for you + all fake friends
 *      (each placed in a different campus building)
 *
 * Run again safely — uses upsert/skipDuplicates so it won't double-create.
 * To clean up: delete users with email ending in @test.spontaneity.dev
 */

import { PrismaClient, FriendshipStatus, AvailabilityStatus } from "../generated/prisma";

const db = new PrismaClient();

const FAKE_FRIENDS = [
  { email: "alice@test.spontaneity.dev", firstName: "Alice", lastName: "Nguyen" },
  { email: "bob@test.spontaneity.dev",   firstName: "Bob",   lastName: "Martinez" },
  { email: "cara@test.spontaneity.dev",  firstName: "Cara",  lastName: "Osei" },
];

async function main() {
  const myEmail = process.argv[2];
  if (!myEmail) {
    console.error("Usage: npx tsx prisma/seedTest.ts <your-email>");
    process.exit(1);
  }

  // 1. Find the real logged-in user
  const me = await db.user.findUnique({ where: { email: myEmail } });
  if (!me) {
    console.error(`No user found with email: ${myEmail}`);
    console.error("Make sure you have logged in at least once before running this seed.");
    process.exit(1);
  }
  console.log(`Found user: ${me.firstName ?? me.name ?? me.email} (${me.id})`);

  // 2. Pick locations from DB to use as building codes
  const locations = await db.location.findMany({ take: 10 });
  if (locations.length < 4) {
    console.error("Not enough locations in DB. Run `npx prisma db seed` first.");
    process.exit(1);
  }
  // Spread the users across different buildings
  const myBuilding      = locations[0]!;
  const friendBuildings = [locations[2]!, locations[5]!, locations[8]!];

  console.log(`Your building:      ${myBuilding.name} (${myBuilding.id})`);
  friendBuildings.forEach((b, i) =>
    console.log(`Friend ${i + 1} building: ${b.name} (${b.id})`)
  );

  // 3. Time window: now → +2 hours
  const now     = new Date();
  const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // 4. Upsert your own schedule entry so your pin shows on the map
  await db.schedule.create({
    data: {
      userId:        me.id,
      title:         "Test: studying",
      buildingCode:  myBuilding.id,
      locationName:  myBuilding.name,
      status:        AvailabilityStatus.AVAILABLE,
      startDateTime: now,
      endDateTime:   twoHours,
    },
  });
  console.log(`Created schedule for you at ${myBuilding.name}`);

  // 5. Create fake friends, friendships, and their schedules
  for (let i = 0; i < FAKE_FRIENDS.length; i++) {
    const fake    = FAKE_FRIENDS[i]!;
    const building = friendBuildings[i % friendBuildings.length]!;

    // Upsert fake user
    const friend = await db.user.upsert({
      where:  { email: fake.email },
      update: {},
      create: {
        email:     fake.email,
        firstName: fake.firstName,
        lastName:  fake.lastName,
        name:      `${fake.firstName} ${fake.lastName}`,
      },
    });
    console.log(`Upserted fake user: ${friend.firstName} ${friend.lastName}`);

    // Create ACCEPTED friendship (skip if already exists)
    await db.friendship.upsert({
      where: {
        requesterId_addresseeId: { requesterId: me.id, addresseeId: friend.id },
      },
      update: { status: FriendshipStatus.ACCEPTED },
      create: {
        requesterId: me.id,
        addresseeId: friend.id,
        status:      FriendshipStatus.ACCEPTED,
      },
    });
    console.log(`  Friendship with ${friend.firstName}: ACCEPTED`);

    // Create schedule entry covering now
    await db.schedule.create({
      data: {
        userId:        friend.id,
        title:         `Test: ${fake.firstName} studying`,
        buildingCode:  building.id,
        locationName:  building.name,
        status:        AvailabilityStatus.AVAILABLE,
        startDateTime: now,
        endDateTime:   twoHours,
      },
    });
    console.log(`  Schedule at ${building.name}`);
  }

  console.log("\nDone! Open /displayMap and you should see Alice, Bob, and Cara in your friend picker.");
  console.log("Schedules expire in 2 hours — re-run the seed to refresh them.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
