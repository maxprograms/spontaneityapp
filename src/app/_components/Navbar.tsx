import Link from "next/link";
import { auth, signOut } from "~/server/auth";
import NavLinks from "./NavLinks";

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-800 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Spontaneity
        </Link>

        {session ? (
          <div className="flex items-center gap-4">
            <NavLinks />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white"
              >
                Sign Out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-purple-900 transition hover:bg-white/90"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
