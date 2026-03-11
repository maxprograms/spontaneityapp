"use client";

import { useState } from "react";

type Event = {
  id: string;
  title: string;
  day: number;
  startHour: number;
  endHour: number;
  location: string;
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    day: 0,
    startHour: 9,
    endHour: 10,
    location: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingId) {
      setEvents(events.map((ev) => (ev.id === editingId ? { ...formData, id: editingId } : ev)));
    } else {
      const newEvent: Event = {
        ...formData,
        id: Date.now().toString(),
      };
      setEvents([...events, newEvent]);
    }

    setFormData({ title: "", day: 0, startHour: 9, endHour: 10, location: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (event: Event) => {
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
    setEvents(events.filter((e) => e.id !== id));
  };

  const getEventAtSlot = (day: number, hour: number) => {
    return events.find((e) => e.day === day && hour >= e.startHour && hour < e.endHour);
  };

  const isEventStart = (day: number, hour: number, event: Event) => {
    return event.day === day && event.startHour === hour;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <a href="/" className="text-purple-600 hover:underline">
            ← Back to Home
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ title: "", day: 0, startHour: 9, endHour: 10, location: "" });
            }}
            className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            {showForm ? "Cancel" : "+ Add Event"}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {editingId ? "Edit Event" : "Add New Event"}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Event Name</label>
                <input
                  type="text"
                  placeholder="Study group, lunch, etc."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Day</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                <select
                  value={formData.startHour}
                  onChange={(e) => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
                <select
                  value={formData.endHour}
                  onChange={(e) => setFormData({ ...formData, endHour: parseInt(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {HOURS.filter((h) => h > formData.startHour).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  placeholder="Library, cafe, etc."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-5">
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
                >
                  {editingId ? "Update Event" : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="border-r border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
              Time
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="border-r border-gray-200 bg-gray-50 p-3 text-center text-sm font-medium text-gray-500 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                <div className="border-r border-gray-200 bg-gray-50 p-2 py-4 text-right text-xs text-gray-500">
                  {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                </div>
                {DAYS.map((_, dayIndex) => {
                  const event = getEventAtSlot(dayIndex, hour);
                  const isStart = event && isEventStart(dayIndex, hour, event);
                  const height = event ? (event.endHour - event.startHour) * 64 - 4 : 0;

                  return (
                    <div
                      key={dayIndex}
                      className="relative border-r border-gray-100"
                      style={{ minHeight: "64px" }}
                    >
                      {isStart && event && (
                        <div
                          className="absolute left-1 right-1 top-1 z-10 cursor-pointer rounded-md bg-purple-500 p-2 text-xs text-white shadow-sm hover:bg-purple-600"
                          style={{ height: `${height}px` }}
                          onClick={() => handleEdit(event)}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          {event.location && (
                            <div className="truncate opacity-80">{event.location}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {events.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Your Events</h2>
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-500">
                      {DAYS[event.day]} · {event.startHour > 12 ? event.startHour - 12 : event.startHour}:00{" "}
                      {event.startHour >= 12 ? "PM" : "AM"} -{" "}
                      {event.endHour > 12 ? event.endHour - 12 : event.endHour}:00{" "}
                      {event.endHour >= 12 ? "PM" : "AM"}
                      {event.location && ` · ${event.location}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="rounded-md bg-purple-100 px-3 py-1 text-sm text-purple-700 hover:bg-purple-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
