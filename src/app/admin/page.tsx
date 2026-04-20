import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function AdminPage() {
  const [totalUsers, totalSpots] = await Promise.all([
    db.user.count(),
    db.location.count(), // adjust model name to match your schema
  ]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border p-6">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-4xl font-bold">{totalUsers}</p>
        </div>
        <div className="rounded-xl border p-6">
          <p className="text-sm text-gray-500">Total Spots</p>
          <p className="text-4xl font-bold">{totalSpots}</p>
        </div>
      </div>
    </main>
  );
}
