import { defineConfig } from 'wxt';

export default defineConfig({
  // The sources zip AMO asks for: only what the build needs, not store or site images.
  zip: {
    excludeSources: ['store/**', 'site/**', '.claude/**', '.github/**'],
  },
  manifest: ({ mode, browser }) => ({
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
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'baku@dvmnum.github.io',
              // optional_host_permissions and :has() in the UI need a recent Firefox (128 is the current ESR).
              strict_min_version: '128.0',
              // Required by AMO for new extensions: Baku sends nothing anywhere.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
});
