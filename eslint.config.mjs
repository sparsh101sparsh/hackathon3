import nextConfig from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextConfig,
  {
    rules: {
      // Existing data-fetching and browser-sync effects intentionally update
      // local state from external systems after mount.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    ignores: [
      '.agents/**',
      'android/**/build/**',
      'android/.gradle/**',
      'android/app/src/main/assets/**',
    ],
  },
];

export default config;
