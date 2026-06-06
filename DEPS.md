# Dependency triage policy

Two advisory gates run on every CI push (both use `continue-on-error: true` so they never block the pipeline):

| Gate | Command | Trigger |
| ---- | ------- | ------- |
| Unused/missing deps | `npm run dep:check` | depcheck v1.4 |
| Security advisories | `npm run dep:audit` | npm audit --audit-level=high |

## Depcheck (`dep:check`)

Configuration in `.depcheckrc`. Packages in `ignores` are tool-only (eslint plugins, postcss, vite plugins, types, test infrastructure) that depcheck cannot detect through import analysis alone. Virtual Vite modules (e.g. `virtual:pwa-register`) are also ignored.

**When depcheck flags a package:**

1. **Genuinely unused** -- remove it (`npm uninstall <pkg>`). Check git history to confirm it was never actually used.
2. **Tool-only false positive** -- add it to the `ignores` list in `.depcheckrc` with a comment in the PR describing why.
3. **Missing dep** -- add the package as a real dependency. If it is a Vite virtual module or a transitive type re-export, add it to `ignores`.

Goal: keep `npm run dep:check` returning "No depcheck issue" so any new unused package is visible immediately.

## npm audit (`dep:audit`)

Flags high and critical severity advisories in the dependency tree (direct + transitive).

**Triage ladder:**

1. **Direct dependency** with a fix available: upgrade it (`npm update <pkg>` or pin the patched version).
2. **Direct dependency** with no fix: evaluate the exposure. If the vulnerable code path is not reachable in this app, document the exception as an inline comment in this file under "Accepted advisories" below and note the next review date (quarter).
3. **Transitive dependency** with a fix in the parent: bump the parent.
4. **Transitive dependency** with no upstream fix yet: add an `overrides` entry in `package.json` to force the patched version, or document as accepted if the path is unreachable.

**Do not** pin major versions or add overrides without verifying the patched version is compatible.

## Accepted advisories

_None at this time. When an advisory is accepted, record it here:_

```
<advisory-id>  <pkg>@<version>  Accepted: <YYYY-MM-DD>  Review by: <YYYY-QN>
Reason: <one sentence explaining why the vulnerable code path is unreachable>
```
