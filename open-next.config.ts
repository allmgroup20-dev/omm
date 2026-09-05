import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Cloudflare Workers config for OMM (omm.jobayergroup.com)
  // R2/KV/D1 bindings are declared in wrangler.jsonc
});
