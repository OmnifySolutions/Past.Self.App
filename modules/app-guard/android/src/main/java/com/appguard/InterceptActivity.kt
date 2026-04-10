package com.appguard

import android.app.Activity
import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.VideoView
import android.widget.TextView
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.graphics.Color
import android.view.Gravity

// InterceptActivity
//
// Launched by AppGuardService when a watched app is opened.
// Appears full-screen over the lockscreen / above the target app.
// Plays the video. When it ends, a Done button appears — tapping it launches
// the target app (returning the user to where they were going) and dismisses.
// Skip (after 5s) also marks the video played so play-once works correctly.
//
// No React Native context here — this is a pure Android Activity.
// We notify App.tsx via a local broadcast so it can update AsyncStorage.

class InterceptActivity : Activity() {

  companion object {
    const val EXTRA_VIDEO_URI = "videoUri"
    const val EXTRA_VIDEO_ID  = "videoId"
    const val EXTRA_APP_NAME  = "appName"
    const val EXTRA_PACKAGE   = "packageName"

    // Broadcast action — App.tsx listens for this to mark the video played
    const val ACTION_VIDEO_PLAYED = "com.pastself.app.APP_GUARD_PLAYED"
  }

  private lateinit var videoView: VideoView
  private var videoId: String       = ""
  private var appName: String       = ""
  private var targetPackage: String = ""
  private var videoEnded: Boolean   = false
  private var playedNotified: Boolean = false  // guard against double-broadcast

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Show over lockscreen on all Android versions
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }

    val videoUri  = intent.getStringExtra(EXTRA_VIDEO_URI) ?: run { finish(); return }
    videoId       = intent.getStringExtra(EXTRA_VIDEO_ID)  ?: ""
    appName       = intent.getStringExtra(EXTRA_APP_NAME)  ?: ""
    targetPackage = intent.getStringExtra(EXTRA_PACKAGE)   ?: ""

    buildUI(videoUri)
  }

  private fun buildUI(videoUri: String) {
    // Root — black background
    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.BLACK)
    }

    // VideoView — fills screen
    videoView = VideoView(this).apply {
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT,
        Gravity.CENTER
      )
    }
    root.addView(videoView)

    // Top bar — "A message from your past self" label + skip button
    val topBar = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(48, 64, 48, 16)
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.TOP
      )
    }

    val label = TextView(this).apply {
      text = "A message from your past self"
      setTextColor(Color.WHITE)
      textSize = 14f
      alpha = 0.85f
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
    }

    val skipBtn = TextView(this).apply {
      text = "Skip ›"
      setTextColor(Color.WHITE)
      textSize = 14f
      alpha = 0.7f
      setPadding(24, 16, 0, 16)
      visibility = View.INVISIBLE // revealed after 5 seconds
      setOnClickListener {
        // Mark played even on skip — ensures play-once doesn't re-trigger
        notifyPlayed()
        dismiss()
      }
    }

    topBar.addView(label)
    topBar.addView(skipBtn)
    root.addView(topBar)

    // Done button — shown after video ends, bottom-center
    // Tapping it launches the target app and dismisses the intercept
    val doneBtnBg = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = 999f
      setColor(Color.argb(200, 103, 68, 84)) // #674454 at ~78% opacity
    }
    val doneBtn = TextView(this).apply {
      text = "Done  ✓"
      setTextColor(Color.WHITE)
      textSize = 16f
      setPadding(64, 28, 64, 28)
      background = doneBtnBg
      visibility = View.INVISIBLE
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
      ).apply {
        bottomMargin = 120
      }
      setOnClickListener {
        notifyPlayed()
        launchTargetApp()
        dismiss()
      }
    }
    root.addView(doneBtn)

    setContentView(root)

    // Full-screen immersive — must be called after setContentView so DecorView exists
    makeFullScreen()

    // Set up video
    videoView.setVideoURI(Uri.parse(videoUri))
    videoView.setOnPreparedListener { mp ->
      mp.isLooping = false
      videoView.start()

      // Reveal skip button after 5s
      videoView.postDelayed({ skipBtn.visibility = View.VISIBLE }, 5000)
    }
    videoView.setOnCompletionListener {
      if (!videoEnded) {
        videoEnded = true
        // Don't auto-dismiss — show Done so user consciously continues to the target app
        skipBtn.visibility = View.INVISIBLE
        doneBtn.visibility = View.VISIBLE
      }
    }
    videoView.setOnErrorListener { _, _, _ ->
      dismiss()
      true
    }
  }

  private fun notifyPlayed() {
    if (playedNotified) return  // prevent double-broadcast
    playedNotified = true
    val intent = Intent(ACTION_VIDEO_PLAYED).apply {
      putExtra(EXTRA_VIDEO_ID, videoId)
      setPackage(applicationContext.packageName)
    }
    sendBroadcast(intent)
  }

  private fun launchTargetApp() {
    if (targetPackage.isEmpty()) return
    val launchIntent = packageManager.getLaunchIntentForPackage(targetPackage) ?: return
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
    startActivity(launchIntent)
  }

  private fun dismiss() {
    finish()
    // No animation — instant dismiss
    overridePendingTransition(0, 0)
  }

  private fun makeFullScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.insetsController?.let { ctrl ->
        ctrl.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
        ctrl.systemBarsBehavior =
          WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      }
    } else {
      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility = (
        View.SYSTEM_UI_FLAG_FULLSCREEN or
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      )
    }
  }

  override fun onBackPressed() {
    // Block back button — the user must watch (or skip after 5s)
    // This is the intentional friction that makes App Guard work
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    // If a second intercept fires while we're already showing, ignore it
  }
}
