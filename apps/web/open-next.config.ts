import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Every page is dynamic (revalidate = 0), so no incremental cache is needed.
export default defineCloudflareConfig();
