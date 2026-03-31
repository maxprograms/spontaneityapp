import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { getUserById } from "~/server/queries/userQueries";
import Navbar from "~/components/Navbar";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/");
    }

    const user = await getUserById(session.user.id);

    const fullName =
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.name ||
        "Unnamed User";

    const initials =
        `${user.firstName?.[0] ?? user.name?.[0] ?? "U"}${user.lastName?.[0] ?? ""}`;

    const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

    return (
        <main className="min-h-screen bg-[#f5f5f7]">
        <Navbar />
        <div className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-[28px] border border-black/10 bg-white px-8 py-12 shadow-sm">
                    <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-neutral-200">
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={`${fullName} profile`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-2xl font-semibold text-neutral-600">
                                {initials || "U"}
                            </span>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-3">
                        <h1 className="text-center text-4xl font-bold tracking-tight text-black">
                            {fullName}
                        </h1>
                        <span className="rounded-full bg-[#050522] px-3 py-1 text-sm font-semibold text-white">
                            {roleLabel}
                        </span>
                    </div>

                    <p className="mt-4 text-center text-neutral-600">
                        {user.email ?? "No email available"}
                    </p>

                    <div className="mt-4 flex justify-center">
                        <button className="rounded-xl bg-[#050522] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                            Edit Profile
                        </button>
                    </div>

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-6">
                            <h2 className="text-lg font-semibold text-black">Full Name</h2>
                            <p className="mt-2 text-neutral-700">{fullName}</p>
                        </div>

                        <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-6">
                            <h2 className="text-lg font-semibold text-black">Email</h2>
                            <p className="mt-2 text-neutral-700">
                                {user.email ?? "No email available"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-6 md:col-span-2">
                            <h2 className="text-lg font-semibold text-black">Bio</h2>
                            <p className="mt-2 text-neutral-700">
                                {user.bio?.trim() || "No bio added yet."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </main>
    );
}