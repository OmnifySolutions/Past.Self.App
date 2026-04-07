const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

// ─── Step 1: Copy res files into the app's android res directory ──────────────
const withAppGuardResources = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

      // Ensure target directories exist
      const xmlDir    = path.join(androidResDir, 'xml');
      const valuesDir = path.join(androidResDir, 'values');
      if (!fs.existsSync(xmlDir))    fs.mkdirSync(xmlDir,    { recursive: true });
      if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });

      // Copy appguard_accessibility_config.xml
      const srcXml  = path.join(projectRoot, 'modules', 'app-guard', 'android', 'src', 'main', 'res', 'xml', 'appguard_accessibility_config.xml');
      const destXml = path.join(xmlDir, 'appguard_accessibility_config.xml');
      fs.copyFileSync(srcXml, destXml);

      // Copy/merge strings.xml — append our string if not already present
      const destStrings = path.join(valuesDir, 'strings.xml');
      const appGuardString = `  <string name="appguard_service_description">Past.Self. App Guard detects when you open selected apps and plays a motivational video message from your past self before you can use them.</string>`;

      if (fs.existsSync(destStrings)) {
        let existing = fs.readFileSync(destStrings, 'utf8');
        if (!existing.includes('appguard_service_description')) {
          existing = existing.replace('</resources>', `${appGuardString}\n</resources>`);
          fs.writeFileSync(destStrings, existing, 'utf8');
        }
      } else {
        const srcStrings = path.join(projectRoot, 'modules', 'app-guard', 'android', 'src', 'main', 'res', 'values', 'strings.xml');
        fs.copyFileSync(srcStrings, destStrings);
      }

      return config;
    },
  ]);
};

// ─── Step 2: Merge service + activity into AndroidManifest ───────────────────
const withAppGuardManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    if (!app.service)  app.service  = [];
    if (!app.activity) app.activity = [];

    const serviceExists = app.service.some(
      (s) => s.$?.['android:name'] === 'com.appguard.AppGuardService'
    );
    if (!serviceExists) {
      app.service.push({
        $: {
          'android:name':       'com.appguard.AppGuardService',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported':   'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name':     'android.accessibilityservice',
              'android:resource': '@xml/appguard_accessibility_config',
            },
          },
        ],
      });
    }

    const activityExists = app.activity.some(
      (a) => a.$?.['android:name'] === 'com.appguard.InterceptActivity'
    );
    if (!activityExists) {
      app.activity.push({
        $: {
          'android:name':             'com.appguard.InterceptActivity',
          'android:theme':            '@android:style/Theme.Black.NoTitleBar.Fullscreen',
          'android:launchMode':       'singleTop',
          'android:showOnLockScreen': 'true',
          'android:turnScreenOn':     'true',
          'android:exported':         'false',
        },
      });
    }

    return config;
  });
};

// ─── Compose both plugins ─────────────────────────────────────────────────────
const withAppGuard = (config) => {
  config = withAppGuardResources(config);
  config = withAppGuardManifest(config);
  return config;
};

module.exports = withAppGuard;