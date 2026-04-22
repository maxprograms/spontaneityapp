import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getFriends } from "~/server/queries/FriendshipQueries";
import { userAvailabilityAtTime } from "~/server/queries/schedule";
import { getAllLocations } from "~/server/queries/locationQueries";
import { Graph } from "~/app/graph/graph";
import { AvailabilityStatus } from "../../../../generated/prisma";

export const meetupRouter = createTRPCRouter({
  // Returns the logged-in user's global availability status
  getMyAvailability: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { availability: true },
    });
    return user?.availability ?? AvailabilityStatus.AVAILABLE;
  }),

  // Persists the logged-in user's availability toggle to the DB
  setAvailability: protectedProcedure
    .input(z.object({ status: z.nativeEnum(AvailabilityStatus) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { availability: input.status },
        select: { availability: true },
      });
    }),

  requestMeetup: protectedProcedure
    .input(z.object({ friendId: z.string(), locationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: ctx.session.user.id, addresseeId: input.friendId },
            { requesterId: input.friendId, addresseeId: ctx.session.user.id },
          ],
        },
      });
      if (!friendship) throw new Error("Friendship not found");
      return ctx.db.friendship.update({
        where: { id: friendship.id },
        data: { meetupLocationId: input.locationId, meetupStatus: "PENDING", meetupRequesterId: ctx.session.user.id },
      });
    }),

  getMeetupRequest: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: ctx.session.user.id, addresseeId: input.friendId },
            { requesterId: input.friendId, addresseeId: ctx.session.user.id },
          ],
        },
      });
      if (!friendship?.meetupLocationId || !friendship?.meetupStatus) {
        return { status: null, location: null, iAmRequester: false };
      }
      const allLocations = await getAllLocations();
      const loc = allLocations.find(l => l.id === friendship.meetupLocationId);
      const iAmRequester = friendship.meetupRequesterId === ctx.session.user.id;
      return {
        status: friendship.meetupStatus as "PENDING" | "ACCEPTED" | "DECLINED",
        location: loc ? { id: loc.id, name: loc.name, lat: loc.latitude, lng: loc.longitude } : null,
        iAmRequester,
      };
    }),

  respondToMeetup: protectedProcedure
    .input(z.object({ friendId: z.string(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: ctx.session.user.id, addresseeId: input.friendId },
            { requesterId: input.friendId, addresseeId: ctx.session.user.id },
          ],
        },
      });
      if (!friendship) throw new Error("Friendship not found");
      return ctx.db.friendship.update({
        where: { id: friendship.id },
        data: { meetupStatus: input.accept ? "ACCEPTED" : "DECLINED" },
      });
    }),

  cancelMeetup: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: ctx.session.user.id, addresseeId: input.friendId },
            { requesterId: input.friendId, addresseeId: ctx.session.user.id },
          ],
        },
      });
      if (!friendship) throw new Error("Friendship not found");
      return ctx.db.friendship.update({
        where: { id: friendship.id },
        data: { meetupLocationId: null, meetupStatus: null, meetupRequesterId: null },
      });
    }),

  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const friends = await getFriends(ctx.session.user.id);
    return friends.filter((f) => f.friend.id !== ctx.session.user.id);
  }),

  getMeetupSpots: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const [myAvail, friendAvail, allLocations, myUser, friendUser] = await Promise.all([
        userAvailabilityAtTime(ctx.session.user.id, now),
        userAvailabilityAtTime(input.friendId, now),
        getAllLocations(),
        // Check global availability toggle for both users
        ctx.db.user.findUnique({ where: { id: ctx.session.user.id }, select: { availability: true } }),
        ctx.db.user.findUnique({ where: { id: input.friendId }, select: { availability: true } }),
      ]);

      const myUnavailable = myUser?.availability === AvailabilityStatus.UNAVAILABLE;
      const friendUnavailable = friendUser?.availability === AvailabilityStatus.UNAVAILABLE;

      // Short-circuit before graph work if either user opted out
      if (myUnavailable || friendUnavailable) {
        return { myLocation: null, friendLocation: null, suggestions: [], myUnavailable, friendUnavailable };
      }

      const graph = new Graph(0.001);
      for (const loc of allLocations) {
        try {
          graph.add_node({ id: loc.id, name: loc.name, lat: loc.latitude, lng: loc.longitude });
        } catch {
          // skip duplicates
        }
      }

      const myMatch = myAvail.buildingCode ? allLocations.find(l => l.buildingCode === myAvail.buildingCode) : null;
      const friendMatch = friendAvail.buildingCode ? allLocations.find(l => l.buildingCode === friendAvail.buildingCode) : null;

      const myLoc = myMatch ? graph.get_location(myMatch.id) : null;
      const friendLoc = friendMatch ? graph.get_location(friendMatch.id) : null;

      const suggestions =
        myLoc && friendLoc
          ? graph.findMeetupSpots(myLoc, friendLoc, 5, 5)
              .filter((s) => s.location.id !== myLoc.id && s.location.id !== friendLoc.id)
              .map((s) => ({
              id: s.location.id,
              name: s.location.name,
              lat: s.location.lat,
              lng: s.location.lng,
              distance: s.distance,
            }))
          : [];

      return {
        myLocation: myLoc ? { id: myLoc.id, name: myLoc.name, lat: myLoc.lat, lng: myLoc.lng } : null,
        friendLocation: friendLoc ? { id: friendLoc.id, name: friendLoc.name, lat: friendLoc.lat, lng: friendLoc.lng } : null,
        suggestions,
        myUnavailable: false,
        friendUnavailable: false,
      };
    }),
});
