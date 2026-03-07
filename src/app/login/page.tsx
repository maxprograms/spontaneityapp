import { signIn } from "~/server/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Spontaneity
        </h1>
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl text-center text-white/80">
            Welcome back! Sign in to continue.
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-full bg-white px-10 py-3 font-semibold text-[#2e026d] transition hover:bg-white/90"
            >
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
