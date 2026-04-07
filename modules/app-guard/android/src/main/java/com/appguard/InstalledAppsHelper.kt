package com.appguard

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build

data class InstalledApp(val packageName: String, val appName: String)

object InstalledAppsHelper {
  fun getInstalledApps(context: Context): List<InstalledApp> {
    val pm = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).apply {
      addCategory(Intent.CATEGORY_LAUNCHER)
    }

    val resolveFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      PackageManager.ResolveInfoFlags.of(PackageManager.MATCH_ALL.toLong())
    } else {
      null
    }

    val resolvedApps = if (resolveFlags != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentActivities(intent, resolveFlags)
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(intent, 0)
    }

    return resolvedApps
      .map { info ->
        InstalledApp(
          packageName = info.activityInfo.packageName,
          appName     = info.loadLabel(pm).toString(),
        )
      }
      .filter { it.packageName != context.packageName } // exclude Past.Self. itself
      .sortedBy { it.appName.lowercase() }
      .distinctBy { it.packageName }
  }
}
