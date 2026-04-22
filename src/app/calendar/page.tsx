"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

// ── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8am – 9pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

function formatHour(hour: number): string {
  if (hour === 12) return "12:00 PM";
  return hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
}

// ── UI Event type (derived from DB schedule for display) ─────────────────────

type UIEvent = {
  id: string;
  title: string;
  day: number; // 0 = Mon, 6 = Sun
  startHour: number;
  endHour: number;
  location: string;
  fromGoogle: boolean;
};

function dbEventToUI(
  event: {
    id: string;
    title: string | null;
    locationName: string | null;
    startDateTime: Date;
    endDateTime: Date;
    googleEventId: string | null;
  },
  weekStart: Date,
): UIEvent | null {
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  const dayOffset = Math.floor(
    (start.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dayOffset < 0 || dayOffset > 6) return null;

  const startHour = start.getHours();
  const endHour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);

  // Only show events that overlap with our display window (8am-9pm)
  if (endHour <= 8 || startHour >= 22) return null;

  return {
    id: event.id,
    title: event.title ?? "(No title)",
    day: dayOffset,
    startHour: Math.max(startHour, 8),
    endHour: Math.min(endHour, 22),
    location: event.locationName ?? "",
    fromGoogle: !!event.googleEventId,
  };
}

function buildDateTime(weekStart: Date, day: number, hour: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMondayOfWeek(new Date()),
  );
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    day: 0,
    startHour: 9,
    endHour: 10,
    location: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // ── tRPC ────────────────────────────────────────────────────────────────────

  const utils = api.useUtils();

  const { data: dbEvents = [], isLoading } =
    api.schedule.getWeekEvents.useQuery(
      { weekStart },
      { refetchOnWindowFocus: false },
    );

  const createEvent = api.schedule.createEvent.useMutation({
    onSuccess: () => void utils.schedule.getWeekEvents.invalidate(),
  });

  const updateEvent = api.schedule.updateEvent.useMutation({
    onSuccess: () => void utils.schedule.getWeekEvents.invalidate(),
  });

  const deleteEvent = api.schedule.deleteEvent.useMutation({
    onSuccess: () => void utils.schedule.getWeekEvents.invalidate(),
  });

  const syncGoogle = api.schedule.syncGoogleCalendar.useMutation({
    onSuccess: (data) => {
      void utils.schedule.getWeekEvents.invalidate();
      setSyncMessage(`Synced ${data.synced} events from Google Calendar.`);
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onError: (err) => {
      setSyncMessage(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncMessage(null), 8000);
    },
  });

  // ── Derived UI events ────────────────────────────────────────────────────────

  const events: UIEvent[] = useMemo(
    () =>
      dbEvents
        .map((e) => dbEventToUI(e, weekStart))
        .filter((e): e is UIEvent => e !== null),
    [dbEvents, weekStart],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const startDateTime = buildDateTime(
      weekStart,
      formData.day,
      formData.startHour,
    );
    const endDateTime = buildDateTime(
      weekStart,
      formData.day,
      formData.endHour,
    );

    if (editingId) {
      updateEvent.mutate({
        id: editingId,
        title: formData.title,
        startDateTime,
        endDateTime,
        location: formData.location,
      });
    } else {
      createEvent.mutate({
        title: formData.title,
        startDateTime,
        endDateTime,
        location: formData.location,
      });
    }

    setFormData({ title: "", day: 0, startHour: 9, endHour: 10, location: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (event: UIEvent) => {
    if (event.fromGoogle) return; // Google events are read-only
    setFormData({
      title: event.title,
      day: event.day,
      startHour: event.startHour,
      endHour: event.endHour,
      location: event.location,
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteEvent.mutate({ id });
  };

  const handleSync = () => {
    setSyncMessage(null);
    const now = new Date();
    const timeMax = new Date(now);
    timeMax.setDate(timeMax.getDate() + 28);
    syncGoogle.mutate({ timeMin: now, timeMax });
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // ── Grid helpers ──────────────────────────────────────────────────────────────

  const getEventAtSlot = (day: number, hour: number) =>
    events.find(
      (e) => e.day === day && hour >= e.startHour && hour < e.endHour,
    );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <Link href="/" className="text-purple-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevWeek}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
            >
              ← Prev
            </button>
            <span className="text-sm font-medium text-gray-700">
              {formatDate(weekStart)} – {formatDate(weekEnd)}
            </span>
            <button
              onClick={nextWeek}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
            >
              Next →
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncGoogle.isPending}
              className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              {syncGoogle.isPending ? "Syncing…" : "Sync Google Calendar"}
            </button>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setFormData({
                  title: "",
                  day: 0,
                  startHour: 9,
                  endHour: 10,
                  location: "",
                });
              }}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
            >
              {showForm ? "Cancel" : "+ Add Event"}
            </button>
          </div>
        </div>

        {/* Sync status message */}
        {syncMessage && (
          <div className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {syncMessage}
          </div>
        )}

        {/* Add / Edit form */}
        {showForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {editingId ? "Edit Event" : "Add New Event"}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Event Name
                </label>
                <input
                  type="text"
                  placeholder="Study group, lunch, etc."
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Day
                </label>
                <select
                  value={formData.day}
                  onChange={(e) =>
                    setFormData({ ...formData, day: parseInt(e.target.value) })
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}{" "}
                      {formatDate(
                        new Date(weekStart.getTime() + index * 86400000),
                      )}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <select
                  value={formData.startHour}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startHour: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHour(hour)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <select
                  value={formData.endHour}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endHour: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  {HOURS.filter((h) => h > formData.startHour).map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHour(hour)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Library, cafe, etc."
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-5">
                <button
                  type="submit"
                  disabled={createEvent.isPending || updateEvent.isPending}
                  className="rounded-md bg-purple-600 px-6 py-2 text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {editingId ? "Update Event" : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Calendar grid */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          {/* Header row */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="border-r border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
              Time
            </div>
            {DAYS.map((day, index) => (
              <div
                key={day}
                className="border-r border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-500 last:border-r-0"
              >
                <div>{day}</div>
                <div className="text-xs font-normal">
                  {formatDate(new Date(weekStart.getTime() + index * 86400000))}
                </div>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          <div className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Loading…
              </div>
            ) : (
              HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-8 border-b border-gray-100"
                >
                  <div className="border-r border-gray-200 bg-gray-50 p-2 py-4 text-right text-xs text-gray-500">
                    {formatHour(hour)}
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const event = getEventAtSlot(dayIndex, hour);
                    const isStart = event?.startHour === hour;
                    const height = event
                      ? (event.endHour - event.startHour) * 64 - 4
                      : 0;

                    return (
                      <div
                        key={dayIndex}
                        className="relative border-r border-gray-100"
                        style={{ minHeight: "64px" }}
                      >
                        {isStart && event && (
                          <div
                            className={`absolute top-1 right-1 left-1 z-10 rounded-md p-2 text-xs text-white shadow-sm ${
                              event.fromGoogle
                                ? "bg-blue-500"
                                : "cursor-pointer bg-purple-500 hover:bg-purple-600"
                            }`}
                            style={{ height: `${height}px` }}
                            onClick={() =>
                              !event.fromGoogle && handleEdit(event)
                            }
                          >
                            <div className="truncate font-medium">
                              {event.title}
                            </div>
                            {event.location && (
                              <div className="truncate opacity-80">
                                {event.location}
                              </div>
                            )}
                            {event.fromGoogle && (
                              <div className="truncate opacity-70">Google</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event list */}
        {events.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              This Week&apos;s Events
            </h2>
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {event.title}
                      </span>
                      {event.fromGoogle && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          Google
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {DAYS[event.day]} · {formatHour(event.startHour)} –{" "}
                      {formatHour(event.endHour)}
                      {event.location && ` · ${event.location}`}
                    </div>
                  </div>
                  {!event.fromGoogle && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="rounded-md bg-purple-100 px-3 py-1 text-sm text-purple-700 hover:bg-purple-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deleteEvent.isPending}
                        className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
