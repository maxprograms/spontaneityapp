import Link from "next/link";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-pink-300 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 h-40 w-40 rounded-full bg-purple-300 blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-8 py-24 text-center">
          <h2 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
            Meet up <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-cyan-300">spontaneously</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-white/80">
            Connect with friends on campus in the moment. We check your Google Calendar, 
            find mutual free time, and suggest the perfect spot to meet.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-purple-900 transition hover:bg-white/90 hover:scale-105"
            >
              Start Meeting People
            </Link>
          </div>
        </div>
      </div>

      <section className="bg-gray-50 px-8 py-20">
        <div className="mx-auto max-w-5xl">
          <h3 className="mb-12 text-center text-3xl font-bold text-gray-900">How it works</h3>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">📅</div>
              <h4 className="mb-2 text-xl font-semibold text-gray-900">Sync Your Calendar</h4>
              <p className="text-gray-600">Connect your Google Calendar and we&apos;ll automatically find your free windows.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-2xl">👥</div>
              <h4 className="mb-2 text-xl font-semibold text-gray-900">Add Friends</h4>
              <p className="text-gray-600">Connect with friends on campus and see when you&apos;re both free to hang out.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-2xl">📍</div>
              <h4 className="mb-2 text-xl font-semibold text-gray-900">Find a Spot</h4>
              <p className="text-gray-600">We suggest the perfect middle spot on campus based on your locations.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-purple-900 to-indigo-900 px-8 py-16 text-center text-white">
        <h3 className="text-3xl font-bold">Ready to meet up?</h3>
        <p className="mx-auto mt-4 max-w-lg text-white/80">
          Stop planning ahead. Let spontaneity bring you together with friends.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-semibold text-purple-900 transition hover:bg-white/90"
        >
          Get Started Free
        </Link>
      </section>

      <footer className="bg-gray-900 px-8 py-8 text-center text-gray-400">
        <p>&copy; 2026 Spontaneity. Made by students at the University of Florida.</p>
      </footer>
    </main>
  );
}
