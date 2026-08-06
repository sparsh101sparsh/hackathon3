import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000/mobile';

const config: CapacitorConfig = {
  appId: 'com.codeforge.revision',
  appName: 'CodeForge Revision',
  webDir: 'capacitor-www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
