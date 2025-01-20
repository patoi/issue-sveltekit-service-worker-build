# Service Worker build issue demo for SvelteKit

**Expected:**

With `"@sveltejs/kit": "2.12.1",` the `service-worker/index.ts` file compiled and generated in `.svelte-kit/output/client/service-worker.mjs` (see "Initial commit")

**Issue:**

With `"@sveltejs/kit": "2.12.2",` and later versions doesn't compile the `service-worker/index.ts` file and it's missing from the app dir (see "Issue" commit message)
