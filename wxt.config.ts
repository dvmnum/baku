import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: ({ mode }) => ({
    name: '__MSG_extName__',
    short_name: '__MSG_extShortName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // No host permissions up front: each site is requested on demand when the user adds it.
    permissions: ['storage', 'scripting', 'activeTab'],
    optional_host_permissions: ['*://*/*'],
    // E2E tests can't click permission prompts, so grant everything up front there.
    ...(mode === 'e2e' || process.env.BAKU_E2E ? { host_permissions: ['*://*/*'] } : {}),
    action: {
      default_title: '__MSG_extShortName__',
    },
  }),
});
