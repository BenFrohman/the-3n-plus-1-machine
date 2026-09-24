# The 3n+1 Machine

**A cinematic visual proof of almost everything that is known about the Collatz conjecture.**

Copyright (c) 2026 **Benjamin Stanley Frohman**.

**Use is allowed only for a fee.** See [LICENSE](LICENSE). A paid license
starts only when the copyright holder confirms payment in writing. There is
no free license to copy, run as a product, or share this Work.

| | |
|---|---|
| Author | Benjamin Stanley Frohman |
| Version | `1.1.0` |
| Status | Public · paid-use license |
| First fixed | 18 September 2026 |
| License | Paid use — fee set by the author |

Request a license: [github.com/BenFrohman](https://github.com/BenFrohman)

## What it is

An interactive film of the `3n+1` map:

- the rule
- the hailstone of 27 (peak 9232)
- the reverse coral tree
- Terras density
- the parity-vector engine
- the remaining lemma (Tao 2019, machine check below \(2^{68}\), no other cycle proven)

Signed-in visitors can save orbits and publish a proof under their name.
The default byline is **Benjamin Stanley Frohman**.

The Collatz conjecture itself remains open. This Work is a presentation of
known results, not a claimed proof of the conjecture.

## Layout

```
LICENSE COPYRIGHT NOTICE CITATION.cff SECURITY.md
package.json          npm package metadata (not published to npm)
src/                  application
  components/machine  HUD, explorer, library, share
  lib/collatz         trajectories, Terras, coral, bijection
  lib/machine         film engine
  lib/orbits          per-user saves and public share slugs
  routes              /  /login  /p/$slug  /api/auth
public/               brand assets
migrations/           auth + orbits schema
scripts/              build / preview helpers
```

## Rights

Use, copying, and commercial deployment require a **paid license** from
Benjamin Stanley Frohman. Third-party packages keep their own licenses — see
[NOTICE](NOTICE).

Tag `v1.0.0-priority` is the 18 September 2026 first-fixation and is not rewritten.
