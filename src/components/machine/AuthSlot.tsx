import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div
        className="h-11 w-24 animate-pulse rounded-md border border-border bg-surface/80"
        aria-hidden
      />
    );
  }
  if (user) {
    return (
      <div className="flex h-11 max-w-[11rem] items-center truncate rounded-md border border-border bg-surface/80 px-2 text-fg backdrop-blur-sm sm:max-w-none">
        <UserButton />
      </div>
    );
  }
  return (
    <Link
      to="/login"
      className="grid h-11 place-items-center rounded-md border border-border bg-surface/80 px-3 text-sm text-fg backdrop-blur-sm transition-[background-color] duration-150 hover:bg-surface-2"
    >
      Sign in
    </Link>
  );
}
