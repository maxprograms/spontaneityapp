import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { getAllLocations } from "~/server/queries/locationQueries";

export const locationRouter = createTRPCRouter({
  getLocation: publicProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async () => {
      return getAllLocations();
    }),
});
