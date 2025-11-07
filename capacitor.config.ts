import { CapacitorConfig } from '@capacitor/cli';
import { config } from 'dotenv';

// Load environment variables
config();

const capacitorConfig: CapacitorConfig = {
  appId: 'com.pawmap.app',
  appName: 'PawMap',
  webDir: 'src',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  // Add environment variables to be accessible in the app
  cordova: {
    preferences: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
    }
  }
};

export default capacitorConfig;
