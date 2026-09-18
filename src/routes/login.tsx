import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { SignInGate, UserButton } from "@/lib/auth/gates";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm space-y-6">
        <p className="text-xs tracking-[0.35em] text-muted uppercase">The 3n+1 Machine</p>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Sign in</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted">
          Save orbits and publish a proof under your name.
        </p>
        <SignInGate
          fallback={
            authEnabled ? (
              <div className="flex flex-col gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                    className="h-11 w-full rounded-md border border-border bg-surface text-sm text-fg transition-[background-color,transform] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
                  >
                    Continue with {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Sign-in is disabled.</p>
            )
          }
        >
          <div className="rounded-lg border border-border bg-surface p-4">
            <UserButton />
            <Link
              to="/"
              className="mt-4 block text-sm text-primary underline-offset-4 hover:underline"
            >
              Back to the machine
            </Link>
          </div>
        </SignInGate>
        <Link to="/" className="block text-sm text-muted hover:text-fg">
          Watch without signing in
        </Link>
      </div>
    </main>
  );
}
