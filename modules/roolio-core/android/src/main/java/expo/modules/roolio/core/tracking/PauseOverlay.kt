package expo.modules.roolio.core.tracking

import android.animation.ValueAnimator
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.PixelFormat
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.Drawable
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.ContextThemeWrapper
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.RoundedBitmapDrawableFactory
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import expo.modules.roolio.core.R
import expo.modules.roolio.core.budgets.KeepGoing
import expo.modules.roolio.core.budgets.PauseStatus
import expo.modules.roolio.core.theme.AppTheme

private const val TAG = "RoolioCore"
private const val ENTER_MS = 200L
// App icons are rounded squares with corners a quarter of their width, the
// way Roolio shows its own icon.
private const val ICON_CORNER_FRACTION = 0.25f
// Home and Recents close the pause screen. Roolio's own trip home right after
// showing it can raise the same signal, so that is ignored for this long.
private const val OWN_HOME_GRACE_MS = 1_000L
// ACTION_CLOSE_SYSTEM_DIALOGS reasons that mean Home or Recents.
private val HOME_REASONS = setOf("homekey", "recentapps", "fs_gesture")

/**
 * The pause screen: a card over the dimmed home screen, in a window over
 * other apps (Display over other apps). By the time it shows, the paused app
 * is already closed, so dismissing it (Back, a tap outside the card, Home or
 * Recents) is the same as "Got it": reopening the app shows it again.
 *
 * The window covers the whole screen, so the home screen behind can't be
 * tapped into while it's up.
 *
 * Owned by [TrackingService]. Every method may be called from any thread and
 * runs on the main thread; the window and its views never leave it.
 */
internal class PauseOverlay(
  private val context: Context,
  private val onClose: () -> Unit,
  private val onKeepGoing: (KeepGoing) -> Unit,
  // The window couldn't be shown, e.g. the permission was just turned off.
  private val onShowFailed: () -> Unit,
) {
  private val handler = Handler(Looper.getMainLooper())
  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

  // Main thread only.
  private var root: PauseRoot? = null
  private var status: PauseStatus? = null
  // One choice per screen: a second tap, or Back after a tap, sends nothing.
  private var chosen = false
  private var homeStartedAt = 0L

  // Home and Recents, which the window can't see as key events.
  private val systemDialogsReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        if (intent.getStringExtra("reason") !in HOME_REASONS) return
        if (SystemClock.uptimeMillis() - homeStartedAt < OWN_HOME_GRACE_MS) return
        choose(onClose)
      }
    }

  /**
   * Shows the card, then sends the user home behind it, so the paused app
   * stops (video and sound too) and its time stops counting. The window
   * goes up first: a visible window lets Roolio start the home screen from
   * the background.
   *
   * An app that isn't `inFront` (a small window, picture-in-picture) floats
   * over the home screen, and Android gives other apps no way to close it.
   * Its media is paused instead, and the card covers it.
   */
  fun show(status: PauseStatus, inFront: Boolean) {
    handler.post {
      if (root != null) {
        bindNow(status)
        return@post
      }
      if (!addNow(status, animate = true)) return@post
      if (!inFront) pauseMedia()
      startHome()
    }
  }

  /** Shows new choices or words, e.g. after a reset or an edit. */
  fun update(status: PauseStatus) {
    handler.post { if (root != null) bindNow(status) }
  }

  /** Sends the user home again, when the paused app is still in front. */
  fun goHome() {
    handler.post { if (root != null) startHome() }
  }

  /** "Got it": the user is home already, unless `goHome` says otherwise. */
  fun close(goHome: Boolean) {
    handler.post {
      if (goHome) startHome()
      removeNow()
    }
  }

  /**
   * Opens the app again where the user left it, like its launcher icon does,
   * and takes the pause screen down. The app starts while the window is still
   * up, for the same reason as [show].
   */
  fun resume(packageName: String) {
    handler.post {
      launch(packageName)
      removeNow()
    }
  }

  fun hide() {
    handler.post { removeNow() }
  }

  /** Rebuilds the card for a new theme, orientation or font size. */
  fun onConfigurationChanged() {
    handler.post {
      val current = status ?: return@post
      val wasChosen = chosen
      removeNow()
      if (addNow(current, animate = false)) chosen = wasChosen
    }
  }

  private fun addNow(status: PauseStatus, animate: Boolean): Boolean {
    // The window isn't an activity, so it takes no theme of its own, and
    // light or dark follows Roolio's theme choice only through AppTheme.
    val themed = ContextThemeWrapper(AppTheme.themed(context), android.R.style.Theme_DeviceDefault_NoActionBar)
    val root = PauseRoot(themed) { choose(onClose) }
    root.setBackgroundColor(ContextCompat.getColor(themed, R.color.roolio_pause_scrim))
    // A tap on the dim, outside the card. The card takes its own taps.
    root.setOnClickListener { choose(onClose) }
    root.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    LayoutInflater.from(themed).inflate(R.layout.roolio_pause_screen, root, true)
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val bars =
        insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      // Dim under the status and navigation bars too, as on newer versions.
      @Suppress("DEPRECATION")
      root.systemUiVisibility =
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
          View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
    }
    val card = root.findViewById<View>(R.id.roolio_pause_card)
    // Content scrolling under the rounded corners is clipped to them.
    card.clipToOutline = true
    val resources = root.resources
    root.findViewById<ImageView>(R.id.roolio_pause_icon).apply {
      val icon = shapedIcon(status.packageName, resources.getDimensionPixelSize(R.dimen.roolio_pause_icon_size))
      setImageDrawable(icon)
      visibility = if (icon == null) View.GONE else View.VISIBLE
    }
    root.findViewById<ImageView>(R.id.roolio_pause_brand_icon).apply {
      val icon = shapedIcon(context.packageName, resources.getDimensionPixelSize(R.dimen.roolio_pause_brand_icon_size))
      setImageDrawable(icon)
      visibility = if (icon == null) View.GONE else View.VISIBLE
    }
    root.findViewById<TextView>(R.id.roolio_pause_brand_name).text =
      context.applicationInfo.loadLabel(context.packageManager)
    this.root = root
    bindNow(status)

    try {
      windowManager.addView(root, layoutParams())
    } catch (error: RuntimeException) {
      // BadTokenException, or a SecurityException without the permission.
      Log.w(TAG, "Couldn't show the pause screen", error)
      this.root = null
      this.status = null
      onShowFailed()
      return false
    }
    // Sent by the system on Home and Recents; only sending it is restricted.
    @Suppress("DEPRECATION")
    val homeFilter = IntentFilter(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
    ContextCompat.registerReceiver(
      context,
      systemDialogsReceiver,
      homeFilter,
      ContextCompat.RECEIVER_NOT_EXPORTED,
    )
    if (animate && animationsEnabled()) {
      // A calm entrance: the dim fades in, and the card rises into place.
      root.alpha = 0f
      root.animate().alpha(1f).setDuration(ENTER_MS)
      card.translationY = root.resources.getDimension(R.dimen.roolio_pause_card_rise)
      card.animate().translationY(0f).setDuration(ENTER_MS).setInterpolator(DecelerateInterpolator())
    }
    focusTitleForScreenReader(root)
    return true
  }

  private fun bindNow(status: PauseStatus) {
    val root = root ?: return
    this.status = status
    chosen = false
    val screen = PauseCopy.screen(root.context, status)

    val title = root.findViewById<TextView>(R.id.roolio_pause_title)
    title.text = screen.title
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      title.isAccessibilityHeading = true
      root.findViewById<View>(R.id.roolio_pause_card).accessibilityPaneTitle = screen.title
    }
    root.findViewById<TextView>(R.id.roolio_pause_body).showText(screen.body)
    root.findViewById<TextView>(R.id.roolio_pause_note).showText(screen.note)

    root.findViewById<Button>(R.id.roolio_pause_close).setOnClickListener { choose(onClose) }
    root.findViewById<Button>(R.id.roolio_pause_use_period).bindChoice(screen.nextPeriod) { keepGoing ->
      choose { onKeepGoing(keepGoing) }
    }
    root.findViewById<Button>(R.id.roolio_pause_extra).bindChoice(screen.extra) { keepGoing ->
      choose { onKeepGoing(keepGoing) }
    }

    // A readable width on wide screens; the margin keeps it off the edges on phones.
    val card = root.findViewById<View>(R.id.roolio_pause_card)
    val resources = root.resources
    val maxWidth = resources.getDimensionPixelSize(R.dimen.roolio_pause_max_width)
    val margin = resources.getDimensionPixelSize(R.dimen.roolio_pause_card_margin)
    val screenWidth = (resources.configuration.screenWidthDp * resources.displayMetrics.density).toInt()
    card.layoutParams =
      card.layoutParams.apply {
        width = if (screenWidth - 2 * margin > maxWidth) maxWidth else FrameLayout.LayoutParams.MATCH_PARENT
      }
  }

  private fun choose(action: () -> Unit) {
    if (root == null || chosen) return
    chosen = true
    action()
  }

  private fun removeNow() {
    val root = root ?: return
    this.root = null
    status = null
    try {
      context.unregisterReceiver(systemDialogsReceiver)
    } catch (ignored: IllegalArgumentException) {
      // Never registered: the window failed to show.
    }
    root.animate().cancel()
    try {
      windowManager.removeViewImmediate(root)
    } catch (error: IllegalArgumentException) {
      // Already removed, e.g. when the permission was turned off.
      Log.w(TAG, "The pause screen was already gone", error)
    }
  }

  private fun layoutParams(): WindowManager.LayoutParams {
    val type =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      }
    // Focusable, so it takes key input: Back reaches it, and the paused app's
    // keyboard closes.
    return WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        type,
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
          WindowManager.LayoutParams.FLAG_LAYOUT_INSET_DECOR or
          WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
      )
      .apply {
        title = context.getString(R.string.roolio_pause_window_title)
        softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          // Dim the system bars too; the card is kept clear of them by padding.
          fitInsetsTypes = 0
          layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
      }
  }

  /**
   * Pauses whatever is playing. The pause key goes to the app playing media,
   * as a headset's button would. Players without a media session stop when
   * another app takes audio focus for good, and they aren't given it back.
   * Roolio plays nothing, so it lets go of focus straight away.
   */
  private fun pauseMedia() {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    for (action in intArrayOf(KeyEvent.ACTION_DOWN, KeyEvent.ACTION_UP)) {
      audio.dispatchMediaKeyEvent(KeyEvent(action, KeyEvent.KEYCODE_MEDIA_PAUSE))
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val attributes =
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
          .build()
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attributes).build()
      audio.requestAudioFocus(request)
      audio.abandonAudioFocusRequest(request)
    } else {
      val listener = AudioManager.OnAudioFocusChangeListener {}
      @Suppress("DEPRECATION")
      audio.requestAudioFocus(listener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
      @Suppress("DEPRECATION")
      audio.abandonAudioFocus(listener)
    }
  }

  // Not a trip home by the user: an app leaving the front then doesn't get
  // the "user is leaving" signal, which is what puts a video app into
  // picture-in-picture (both its own and Android's automatic one).
  private fun startHome() {
    val home =
      Intent(Intent.ACTION_MAIN)
        .addCategory(Intent.CATEGORY_HOME)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
    homeStartedAt = SystemClock.uptimeMillis()
    try {
      context.startActivity(home)
    } catch (error: RuntimeException) {
      // Blocked or no launcher; the enforcer tries again while the app is in front.
      Log.w(TAG, "Couldn't open the home screen", error)
    }
  }

  private fun launch(packageName: String) {
    val intent =
      context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
      } ?: return
    try {
      context.startActivity(intent)
    } catch (error: RuntimeException) {
      // The user can open it from the launcher; the choice is saved either way.
      Log.w(TAG, "Couldn't reopen $packageName", error)
    }
  }

  /**
   * An app's icon as a rounded square, the same whatever shape the launcher
   * uses, or null if the app is gone. An adaptive icon is drawn from its
   * layers, which reach a quarter of its size past each edge, so no shape
   * from the system's own mask shows.
   */
  private fun shapedIcon(packageName: String, sizePx: Int): Drawable? {
    val icon =
      try {
        context.packageManager.getApplicationIcon(packageName)
      } catch (ignored: PackageManager.NameNotFoundException) {
        return null
      }
    val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && icon is AdaptiveIconDrawable) {
      val bleed = sizePx / 4
      for (layer in listOfNotNull(icon.background, icon.foreground)) {
        layer.setBounds(-bleed, -bleed, sizePx + bleed, sizePx + bleed)
        layer.draw(canvas)
      }
    } else {
      icon.setBounds(0, 0, sizePx, sizePx)
      icon.draw(canvas)
    }
    return RoundedBitmapDrawableFactory.create(context.resources, bitmap).apply {
      cornerRadius = sizePx * ICON_CORNER_FRACTION
      setAntiAlias(true)
    }
  }

  // A calm entrance, unless the user turned animations off.
  private fun animationsEnabled(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.O || ValueAnimator.areAnimatorsEnabled()

  // A screen reader starts on the title, which says why the app is paused.
  private fun focusTitleForScreenReader(root: View) {
    val accessibility = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
    if (accessibility?.isTouchExplorationEnabled != true) return
    val title = root.findViewById<View>(R.id.roolio_pause_title)
    title.post { title.performAccessibilityAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS, null) }
  }
}

private fun TextView.showText(value: String?) {
  text = value
  visibility = if (value == null) View.GONE else View.VISIBLE
}

private fun Button.bindChoice(choice: PauseChoice?, onChoose: (KeepGoing) -> Unit) {
  if (choice == null) {
    visibility = View.GONE
    setOnClickListener(null)
    return
  }
  visibility = View.VISIBLE
  text = choice.label
  setOnClickListener { onChoose(choice.keepGoing) }
}

/** The pause screen's root: the dim behind the card. Back closes it, like "Got it". */
private class PauseRoot(context: Context, private val onBack: () -> Unit) : FrameLayout(context) {
  // Typed loosely so the class loads before Android 13.
  private var backDispatcher: Any? = null
  private var backCallback: Any? = null

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.keyCode != KeyEvent.KEYCODE_BACK) return super.dispatchKeyEvent(event)
    if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) onBack()
    return true
  }

  // Android 13+ sends Back gestures to callbacks rather than as key events.
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val dispatcher = findOnBackInvokedDispatcher() ?: return
    val callback = OnBackInvokedCallback { onBack() }
    dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_OVERLAY, callback)
    backDispatcher = dispatcher
    backCallback = callback
  }

  override fun onDetachedFromWindow() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val dispatcher = backDispatcher as? OnBackInvokedDispatcher
      val callback = backCallback as? OnBackInvokedCallback
      if (dispatcher != null && callback != null) dispatcher.unregisterOnBackInvokedCallback(callback)
    }
    backDispatcher = null
    backCallback = null
    super.onDetachedFromWindow()
  }
}
