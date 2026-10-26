# The 3n+1 Machine

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23653011.svg)](https://doi.org/10.5281/zenodo.23653011) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**A cinematic visual proof of almost everything that is known about the Collatz conjecture.**

Copyright (c) 2026 **Benjamin Stanley Frohman**.

Open source under the Apache License, Version 2.0. See [LICENSE](LICENSE).
The paid-use restriction of 23 September 2026 was a mistake and is withdrawn.

| | |
|---|---|
| Author | Benjamin Stanley Frohman |
| Version | `1.1.0` |
| Status | Public · Apache-2.0 |
| First fixed | 18 September 2026 |
| License | Apache-2.0 |

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

Copyright (c) 2026 Benjamin Stanley Frohman. Licensed under Apache-2.0.
Third-party packages keep their own licenses. See [NOTICE](NOTICE).

Tag `v1.0.0-priority` is the 18 September 2026 first-fixation and is not rewritten.

---
## Archival DOI & Cryptographic Provenance

- **Dedicated 1-to-1 Zenodo DOI:** [10.5281/zenodo.23653011](https://doi.org/10.5281/zenodo.23653011)
- **Author:** Benjamin Stanley Frohman (ORCID: [0009-0006-7068-3718](https://orcid.org/0009-0006-7068-3718))
- **License:** Apache License, Version 2.0 (`Copyright (c) 2026 Benjamin Stanley Frohman`)
- **Earliest Commit Provenance:** `ce2663622c04171e4273646bd8520aefe9341d7d` (2026-09-18 04:27:42 PM CDT (UTC-5))
- **SealGuard SHA-256 Merkle Root:** `792f2652b5a51d351bdf19ecd11688b3ed751823c5956012a3aa59a30e6e5e8d` (`PROVENANCE_MERKLE_ROOT.json`)
- **Titan Audit Certificate:** `audit/TITAN_AUDIT_CERTIFICATE.json` (Ed25519 key `b428fb72676f1c52`)
- **Scope & Scientific Boundary:** Computational and visual exploration platform for verified finite-range Collatz dynamics and algebraic cycle identities; does not claim an unconditional proof of the global 3n+1 conjecture.
