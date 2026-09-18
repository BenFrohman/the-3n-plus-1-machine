# The 3n+1 Machine

**A cinematic visual proof of almost everything that is known about the Collatz conjecture.**

Copyright (c) 2026 **Benjamin Stanley Frohman**. All rights reserved.

This repository is a **private priority deposit**. It is not a public release.
No license to copy, share, or fork is granted. See [LICENSE](LICENSE) and
[COPYRIGHT](COPYRIGHT).

| | |
|---|---|
| Author | Benjamin Stanley Frohman |
| Version | `1.0.0-priority` |
| Status | Private · unpublished · awaiting signed priority release |
| First fixed | 18 September 2026 |

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
package.json          npm package metadata (private)
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

Original software, audiovisual sequence, and brand assets: **All rights reserved.**
Third-party packages keep their own licenses — see [NOTICE](NOTICE).

Do not publish, mirror, or change the visibility of this repository without
the copyright holder’s written instruction.

To convert this deposit into a public, signed release: publish the GitHub
Release `v1.0.0-priority` (currently a **draft prerelease**) and, if desired,
elect a public license in LICENSE.
