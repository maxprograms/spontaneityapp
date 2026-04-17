import { scheduleRouter } from "~/server/api/routers/schedule";
import { locationRouter } from "~/server/api/routers/location";
import { meetupRouter } from "~/server/api/routers/meetup";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  schedule: scheduleRouter,
  location: locationRouter,
  meetup: meetupRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
