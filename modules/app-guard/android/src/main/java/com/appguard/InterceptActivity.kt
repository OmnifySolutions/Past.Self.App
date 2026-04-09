package com.appguard

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.VideoView
import android.widget.ImageButton
import android.widget.TextView
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.graphics.Color
import android.view.Gravity
import android.widget.MediaController

// InterceptActivity
//
// Launched by AppGuardService when a watched app is opened.
// Appears full-screen over the lockscreen / above the target app.
// Plays the video, then dismisses itself (returning the user to wherever they were,
// which may be the target app or the home screen — that's intentional friction).
//
// No React Native context here — this is a pure Android Activity.
// We navigate into the RN app via an explicit Intent after the video ends,
// so the main app can mark the video as played in AsyncStorage.

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
  private var videoId: String  = ""
  private var appName: String  = ""
  private var videoEnded: Boolean = false

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

    val videoUri = intent.getStringExtra(EXTRA_VIDEO_URI) ?: run { finish(); return }
    videoId      = intent.getStringExtra(EXTRA_VIDEO_ID)  ?: ""
    appName      = intent.getStringExtra(EXTRA_APP_NAME)  ?: ""

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
      setOnClickListener { dismiss() }
    }

    topBar.addView(label)
    topBar.addView(skipBtn)
    root.addView(topBar)

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
        notifyPlayed()
        dismiss()
      }
    }
    videoView.setOnErrorListener { _, _, _ ->
      dismiss()
      true
    }
  }

  private fun notifyPlayed() {
    // Broadcast so App.tsx can mark this video as played in AsyncStorage
    val intent = Intent(ACTION_VIDEO_PLAYED).apply {
      putExtra(EXTRA_VIDEO_ID, videoId)
      setPackage(applicationContext.packageName)
    }
    sendBroadcast(intent)
  }

  private fun dismiss() {
    finish()
    // No animation — instant dismiss so the user lands on whatever is beneath
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
