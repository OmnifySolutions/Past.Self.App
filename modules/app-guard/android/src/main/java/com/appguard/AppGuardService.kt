package com.appguard

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import org.json.JSONArray
import org.json.JSONObject

class AppGuardService : AccessibilityService() {

  companion object {
    private const val PREFS_NAME  = "AppGuardPrefs"
    private const val KEY_WATCHED = "watchedApps"

    // Minimum gap between any two intercepts — prevents re-fire during orientation
    // changes or spurious events. The configured cooldown is applied on top.
    private const val MIN_COOLDOWN_MS = 3_000L

    // Called from AppGuardModule.setWatchedApps — persists the list so the
    // service can read it even after a process restart.
    fun updateWatchedApps(context: Context, apps: List<WatchedApp>) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val arr   = JSONArray()
      for (app in apps) {
        arr.put(JSONObject().apply {
          put("packageName", app.packageName)
          put("appName",     app.appName)
          put("videoUri",    app.videoUri)
          put("videoId",     app.videoId)
          put("cooldownMs",  app.cooldownMs)
        })
      }
      prefs.edit().putString(KEY_WATCHED, arr.toString()).apply()
    }

    fun isEnabled(context: Context): Boolean {
      val enabledServices = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      ) ?: return false
      val componentName = "${context.packageName}/${AppGuardService::class.java.name}"
      return enabledServices.split(':').any { it.equals(componentName, ignoreCase = true) }
    }

    private fun loadWatchedApps(prefs: SharedPreferences): List<WatchedApp> {
      val json = prefs.getString(KEY_WATCHED, null) ?: return emptyList()
      return try {
        val arr = JSONArray(json)
        (0 until arr.length()).map { i ->
          val obj = arr.getJSONObject(i)
          WatchedApp(
            packageName = obj.getString("packageName"),
            appName     = obj.getString("appName"),
            videoUri    = obj.getString("videoUri"),
            videoId     = obj.getString("videoId"),
            cooldownMs  = obj.optLong("cooldownMs", 30 * 60 * 1000L),
          )
        }
      } catch (e: Exception) {
        emptyList()
      }
    }
  }

  private lateinit var prefs: SharedPreferences

  // Per-package cooldown tracking — key: packageName, value: last intercept timestamp
  private val lastInterceptTimes = mutableMapOf<String, Long>()

  override fun onServiceConnected() {
    prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    serviceInfo = AccessibilityServiceInfo().apply {
      eventTypes    = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      feedbackType  = AccessibilityServiceInfo.FEEDBACK_GENERIC
      flags         = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
      notificationTimeout = 100
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return

    // Ignore our own app — don't intercept Past.Self. itself
    if (pkg == applicationContext.packageName) return

    // Ignore system UI and launchers
    if (pkg == "com.android.systemui" || pkg == "com.sec.android.app.launcher") return

    val now      = System.currentTimeMillis()
    val lastTime = lastInterceptTimes[pkg] ?: 0L

    // Fast path: skip if within minimum cooldown (avoids loading JSON on every event)
    if ((now - lastTime) < MIN_COOLDOWN_MS) return

    val watched = loadWatchedApps(prefs)
    val match   = watched.find { it.packageName == pkg } ?: return

    // Apply the configured cooldown for this video (minimum 3s floor)
    val cooldown = maxOf(MIN_COOLDOWN_MS, match.cooldownMs)
    if ((now - lastTime) < cooldown) return

    lastInterceptTimes[pkg] = now

    val intent = Intent(applicationContext, InterceptActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
              Intent.FLAG_ACTIVITY_CLEAR_TOP or
              Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra(InterceptActivity.EXTRA_VIDEO_URI,  match.videoUri)
      putExtra(InterceptActivity.EXTRA_VIDEO_ID,   match.videoId)
      putExtra(InterceptActivity.EXTRA_APP_NAME,   match.appName)
      putExtra(InterceptActivity.EXTRA_PACKAGE,    match.packageName)
    }
    applicationContext.startActivity(intent)
  }

  override fun onInterrupt() {
    // Required override — no-op
  }
}
