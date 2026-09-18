import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { DEFAULT_BYLINE, publishedName } from "./names";

export type OrbitRow = {
  id: number;
  start_n: string;
  steps: number;
  peak: string;
  reached_one: boolean;
  created_at: string;
};

export type ShareRow = {
  slug: string;
  byline: string;
  start_n: string | null;
  steps: number | null;
  peak: string | null;
  reached_one: boolean | null;
  created_at: string;
};

function slug() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId}
    `;
    return { displayName: rows[0]?.display_name ?? DEFAULT_BYLINE };
  });

export const setMyByline = createServerFn({ method: "POST" })
  .validator((name: string) => name.trim().slice(0, 80))
  .middleware([authMiddleware])
  .handler(async ({ context, data: name }) => {
    const display = name || DEFAULT_BYLINE;
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name)
      values (${context.userId}, ${display})
      on conflict (user_id) do update
        set display_name = excluded.display_name, updated_at = now()
    `;
    return { displayName: display };
  });

export const listMyOrbits = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<OrbitRow>`
      select id, start_n, steps, peak, reached_one, created_at::text as created_at
      from orbits
      where user_id = ${context.userId}
      order by created_at desc
      limit 50
    `;
  });

export const saveOrbit = createServerFn({ method: "POST" })
  .validator((d: { n: string; steps: number; peak: string; reached: boolean }) => ({
    n: String(d.n).replace(/[^\d]/g, "").slice(0, 32),
    steps: Math.max(0, Math.floor(Number(d.steps)) || 0),
    peak: String(d.peak).slice(0, 40),
    reached: Boolean(d.reached),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.n) return { ok: false as const };
    const sql = await getSql();
    await sql`
      insert into orbits (user_id, start_n, steps, peak, reached_one)
      values (${context.userId}, ${data.n}, ${data.steps}, ${data.peak}, ${data.reached})
      on conflict (user_id, start_n) do update set
        steps = excluded.steps,
        peak = excluded.peak,
        reached_one = excluded.reached_one,
        created_at = now()
    `;
    return { ok: true as const };
  });

export const publishProof = createServerFn({ method: "POST" })
  .validator((d: { byline?: string; n?: string; steps?: number; peak?: string; reached?: boolean }) => ({
    byline: (d.byline ?? "").trim().slice(0, 80),
    n: d.n ? String(d.n).replace(/[^\d]/g, "").slice(0, 32) : "",
    steps: Math.max(0, Math.floor(Number(d.steps)) || 0),
    peak: d.peak ? String(d.peak).slice(0, 40) : "",
    reached: Boolean(d.reached),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const byline = publishedName(data.byline);
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name)
      values (${context.userId}, ${byline})
      on conflict (user_id) do update
        set display_name = excluded.display_name, updated_at = now()
    `;
    let s = slug();
    for (let i = 0; i < 4; i++) {
      try {
        await sql`
          insert into shares (user_id, slug, byline, start_n, steps, peak, reached_one)
          values (
            ${context.userId},
            ${s},
            ${byline},
            ${data.n || null},
            ${data.n ? data.steps : null},
            ${data.n ? data.peak : null},
            ${data.n ? data.reached : null}
          )
        `;
        if (data.n) {
          try {
            await sql`
              insert into orbits (user_id, start_n, steps, peak, reached_one)
              values (${context.userId}, ${data.n}, ${data.steps}, ${data.peak}, ${data.reached})
              on conflict (user_id, start_n) do update set
                steps = excluded.steps,
                peak = excluded.peak,
                reached_one = excluded.reached_one,
                created_at = now()
            `;
          } catch {
            /* share is live even if the library write fails */
          }
        }
        return { slug: s, byline };
      } catch {
        s = slug();
      }
    }
    throw new Error("Could not publish");
  });

export const listMyShares = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<ShareRow>`
      select slug, byline, start_n, steps, peak, reached_one, created_at::text as created_at
      from shares
      where user_id = ${context.userId}
      order by created_at desc
      limit 20
    `;
  });

/** Public read of a published proof — no session required. */
export const getShare = createServerFn({ method: "GET" })
  .validator((slug: string) => slug.trim().slice(0, 32))
  .handler(async ({ data: slug }) => {
    if (!slug) return null;
    const sql = await getSql();
    const rows = await sql<ShareRow>`
      select slug, byline, start_n, steps, peak, reached_one, created_at::text as created_at
      from shares
      where slug = ${slug}
      limit 1
    `;
    return rows[0] ?? null;
  });
