import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../../generated/prisma";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { AvailabilityStatus } from "../../../../generated/prisma";

/* eslint-disable @typescript-eslint/prefer-optional-chain */

// ── Google Calendar helpers ──────────────────────────────────────────────────

type GoogleTokens = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

async function getValidAccessToken(
  tokens: GoogleTokens,
  userId: string,
  db: PrismaClient,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Token still valid
  if (
    tokens.access_token &&
    tokens.expires_at &&
    tokens.expires_at > now + 60
  ) {
    return tokens.access_token;
  }

  // Try to refresh
  if (!tokens.refresh_token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message:
        "Google Calendar access has expired. Please sign out and sign in again to reconnect.",
    });
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message:
        "Could not refresh Google Calendar access. Please sign out and sign in again.",
    });
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const newExpiresAt = now + data.expires_in;

  // Persist the new token
  await db.account.updateMany({
    where: { userId, provider: "google" },
    data: {
      access_token: data.access_token,
      expires_at: newExpiresAt,
    },
  });

  return data.access_token;
}

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
};

type GoogleCalendarResponse = {
  items?: GoogleCalendarEvent[];
  error?: { message: string };
};

async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const data = (await res.json()) as GoogleCalendarResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? "Unknown error";
    if (res.status === 401 || res.status === 403) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Google Calendar access denied: ${msg}. Please sign out and sign in again to grant calendar permissions.`,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Google Calendar API error: ${msg}`,
    });
  }

  return data.items ?? [];
}

// ── Router ───────────────────────────────────────────────────────────────────

export const scheduleRouter = createTRPCRouter({
  // Get all events for the authenticated user in a week window
  getWeekEvents: protectedProcedure
    .input(z.object({ weekStart: z.date() }))
    .query(async ({ ctx, input }) => {
      const weekEnd = new Date(input.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      return ctx.db.schedule.findMany({
        where: {
          userId: ctx.session.user.id,
          startDateTime: { gte: input.weekStart, lt: weekEnd },
        },
        orderBy: { startDateTime: "asc" },
      });
    }),

  createEvent: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        startDateTime: z.date(),
        endDateTime: z.date(),
        location: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.startDateTime >= input.endDateTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start time must be before end time.",
        });
      }

      return ctx.db.schedule.create({
        data: {
          userId: ctx.session.user.id,
          title: input.title,
          locationName: input.location,
          status: AvailabilityStatus.UNAVAILABLE,
          startDateTime: input.startDateTime,
          endDateTime: input.endDateTime,
        },
      });
    }),

  updateEvent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        startDateTime: z.date().optional(),
        endDateTime: z.date().optional(),
        location: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.schedule.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const newStart = input.startDateTime ?? existing.startDateTime;
      const newEnd = input.endDateTime ?? existing.endDateTime;

      if (newStart >= newEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start time must be before end time.",
        });
      }

      return ctx.db.schedule.update({
        where: { id: input.id },
        data: {
          title: input.title,
          locationName: input.location,
          startDateTime: input.startDateTime,
          endDateTime: input.endDateTime,
        },
      });
    }),

  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.schedule.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.schedule.delete({ where: { id: input.id } });
    }),

  // Sync events from Google Calendar into the DB (read-only from Google's side)
  syncGoogleCalendar: protectedProcedure
    .input(
      z
        .object({
          // Sync window: default to 4 weeks from today if not specified
          timeMin: z.date().optional(),
          timeMax: z.date().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: { userId: ctx.session.user.id, provider: "google" },
        select: {
          access_token: true,
          refresh_token: true,
          expires_at: true,
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No Google account linked.",
        });
      }

      const accessToken = await getValidAccessToken(
        account,
        ctx.session.user.id,
        ctx.db,
      );

      const now = new Date();
      const timeMin = input?.timeMin ?? now;
      const timeMax =
        input?.timeMax ??
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28);

      const events = await fetchGoogleCalendarEvents(
        accessToken,
        timeMin,
        timeMax,
      );

      let synced = 0;

      for (const event of events) {
        // Skip cancelled events and all-day events (no dateTime)
        if (event.status === "cancelled") continue;
        const startStr = event.start?.dateTime;
        const endStr = event.end?.dateTime;
        if (!startStr || !endStr) continue;

        const startDateTime = new Date(startStr);
        const endDateTime = new Date(endStr);

        await ctx.db.schedule.upsert({
          where: {
            userId_googleEventId: {
              userId: ctx.session.user.id,
              googleEventId: event.id,
            },
          },
          create: {
            userId: ctx.session.user.id,
            title: event.summary ?? "(No title)",
            locationName: event.location,
            googleEventId: event.id,
            status: AvailabilityStatus.UNAVAILABLE,
            startDateTime,
            endDateTime,
          },
          update: {
            title: event.summary ?? "(No title)",
            locationName: event.location,
            startDateTime,
            endDateTime,
          },
        });

        synced++;
      }

      return { synced };
    }),
});
