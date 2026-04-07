package com.appguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AppGuardModule : Module() {

  private var broadcastReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("AppGuard")

    Events("onAppGuardPlayed")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
          val videoId = intent?.getStringExtra(InterceptActivity.EXTRA_VIDEO_ID) ?: return
          sendEvent("onAppGuardPlayed", mapOf("videoId" to videoId))
        }
      }
      val filter = IntentFilter(InterceptActivity.ACTION_VIDEO_PLAYED)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(broadcastReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("UnspecifiedRegisterReceiverFlag")
        context.registerReceiver(broadcastReceiver, filter)
      }
    }

    OnDestroy {
      val context = appContext.reactContext ?: return@OnDestroy
      broadcastReceiver?.let {
        try { context.unregisterReceiver(it) } catch (_: Exception) {}
      }
      broadcastReceiver = null
    }

    Function("isServiceEnabled") {
      val context = appContext.reactContext ?: return@Function false
      AppGuardService.isEnabled(context)
    }

    Function("openAccessibilitySettings") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      context.startActivity(intent)
      null
    }

    Function("setWatchedApps") { apps: List<Map<String, String>> ->
      val context = appContext.reactContext ?: return@Function null
      val parsed = apps.mapNotNull { map ->
        val pkg      = map["packageName"] ?: return@mapNotNull null
        val appName  = map["appName"]     ?: return@mapNotNull null
        val videoUri = map["videoUri"]    ?: return@mapNotNull null
        val videoId  = map["videoId"]     ?: return@mapNotNull null
        WatchedApp(pkg, appName, videoUri, videoId)
      }
      AppGuardService.updateWatchedApps(context, parsed)
      null
    }

    AsyncFunction("getInstalledApps") { promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val context = appContext.reactContext
          if (context == null) {
            promise.resolve(emptyList<Map<String, String>>())
            return@launch
          }
          val apps = InstalledAppsHelper.getInstalledApps(context)
          val result = apps.map {
            mapOf("packageName" to it.packageName, "appName" to it.appName)
          }
          promise.resolve(result)
        } catch (e: Exception) {
          promise.reject("ERR_GET_APPS", e.message ?: "Unknown error", e)
        }
      }
    }
  }
}