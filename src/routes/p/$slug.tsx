import { createFileRoute, Link } from "@tanstack/react-router";
import { MachineApp } from "@/components/machine/MachineApp";
import { getShare } from "@/lib/orbits/api";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => getShare({ data: params.slug }),
  component: SharedProof,
});

function SharedProof() {
  const share = Route.useLoaderData();
  if (!share) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
        <div className="max-w-sm space-y-4">
          <p className="text-xs tracking-[0.35em] text-muted uppercase">Proof not found</p>
          <h1 className="text-2xl text-primary">This share is gone</h1>
          <Link to="/" className="inline-block text-sm text-muted hover:text-fg">
            Open the machine
          </Link>
        </div>
      </main>
    );
  }
  const n = share.start_n ? Number(share.start_n) : undefined;
  return (
    <MachineApp
      attribution={share.byline}
      featuredN={Number.isFinite(n) && n! >= 1 ? n : undefined}
    />
  );
}
