package com.appguard

data class WatchedApp(
  val packageName: String,
  val appName: String,
  val videoUri: String,
  val videoId: String,
  val cooldownMs: Long = 30 * 60 * 1000L, // default 30 minutes
)
