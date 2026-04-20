import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getFriends } from "~/server/queries/FriendshipQueries";
import { userAvailabilityAtTime } from "~/server/queries/schedule";
import { getAllLocations } from "~/server/queries/locationQueries";
import { Graph } from "~/app/graph/graph";

export const meetupRouter = createTRPCRouter({
  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const friends = await getFriends(ctx.session.user.id);
    return friends.filter((f) => f.friend.id !== ctx.session.user.id);
  }),

  getMeetupSpots: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const [myAvail, friendAvail, allLocations] = await Promise.all([
        userAvailabilityAtTime(ctx.session.user.id, now),
        userAvailabilityAtTime(input.friendId, now),
        getAllLocations(),
      ]);

      const graph = new Graph(0.001);
      for (const loc of allLocations) {
        try {
          graph.add_node({ id: loc.id, name: loc.name, lat: loc.latitude, lng: loc.longitude });
        } catch {
          // skip duplicates
        }
      }

      const myLoc = myAvail.buildingCode ? graph.get_location(myAvail.buildingCode) : null;
      const friendLoc = friendAvail.buildingCode ? graph.get_location(friendAvail.buildingCode) : null;

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
      };
    }),
});
