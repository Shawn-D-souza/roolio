package expo.modules.roolio.core.tracking

import android.os.Build
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

// UsageEvents.Event types. These are the raw values because the newer names
// (ACTIVITY_RESUMED, ACTIVITY_PAUSED) share them with the API 24 names
// (MOVE_TO_FOREGROUND, MOVE_TO_BACKGROUND).
internal const val EVENT_RESUMED = 1
internal const val EVENT_PAUSED = 2
internal const val EVENT_SCREEN_NON_INTERACTIVE = 16 // API 28
internal const val EVENT_KEYGUARD_SHOWN = 17 // API 28
internal const val EVENT_STOPPED = 23 // API 29
internal const val EVENT_DESTROYED = 24 // API 29
internal const val EVENT_DEVICE_SHUTDOWN = 26 // API 29

// Before Android 10 there is no "stopped" event, so pausing is the last signal.
private val PAUSE_ENDS_VISIBILITY = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q

/**
 * Which apps are on screen, rebuilt event by event. This is the same idea as
 * Android's own "visible time", which Digital Wellbeing reports.
 *
 * An app is visible from when one of its activities resumes until all of them
 * have stopped, not merely paused. Paused-but-visible covers picture-in-picture,
 * the other half of split-screen, and an app under a dialog or share sheet
 * from another app. Several apps can be visible at once, and each counts.
 * Activities are followed one by one, because inside an app Android resumes the
 * next screen before it stops the previous one.
 *
 * `onEnded` receives each visible stretch when it closes.
 */
internal class Visibility(private val onEnded: (packageName: String, from: Long, to: Long) -> Unit) {
  private class App(var since: Long) {
    // Activity class name -> whether it is resumed (else paused but visible).
    val activities = HashMap<String, Boolean>(4)
  }

  private val apps = HashMap<String, App>()

  /** The app the user is interacting with: the last one resumed and still resumed. */
  var focused: String? = null
    private set

  val packages: Set<String>
    get() = apps.keys

  /** Start of `packageName`'s uncounted visible time, or null if it isn't visible. */
  fun since(packageName: String): Long? = apps[packageName]?.since

  fun markCounted(packageName: String, until: Long) {
    apps[packageName]?.since = until
  }

  fun apply(type: Int, packageName: String?, className: String?, time: Long) {
    when (type) {
      EVENT_SCREEN_NON_INTERACTIVE, EVENT_KEYGUARD_SHOWN, EVENT_DEVICE_SHUTDOWN -> {
        endAll(time)
        return
      }
    }
    if (packageName == null) return
    val activity = className ?: ""
    when (type) {
      EVENT_RESUMED -> {
        apps.getOrPut(packageName) { App(time) }.activities[activity] = true
        focused = packageName
      }
      EVENT_PAUSED ->
        if (PAUSE_ENDS_VISIBILITY) {
          remove(packageName, activity, time)
        } else {
          val app = apps[packageName] ?: return
          if (activity in app.activities) app.activities[activity] = false
          if (focused == packageName && true !in app.activities.values) focused = null
        }
      EVENT_STOPPED, EVENT_DESTROYED -> remove(packageName, activity, time)
    }
  }

  fun endAll(time: Long) {
    for ((packageName, app) in apps) {
      if (time > app.since) onEnded(packageName, app.since, time)
    }
    apps.clear()
    focused = null
  }

  /** Copies `other`'s apps, counting their time from `since` on. */
  fun copyFrom(other: Visibility, since: Long) {
    apps.clear()
    for ((packageName, app) in other.apps) {
      apps[packageName] = App(since).also { it.activities.putAll(app.activities) }
    }
    focused = other.focused
  }

  /** Moves every uncounted start back to `time` at most (after the clock moved back). */
  fun clampSince(time: Long) {
    for (app in apps.values) app.since = minOf(app.since, time)
  }

  fun toJson(): String? {
    if (apps.isEmpty()) return null
    val array = JSONArray()
    for ((packageName, app) in apps) {
      val activities = JSONObject()
      for ((activity, resumed) in app.activities) activities.put(activity, resumed)
      array.put(
        JSONObject()
          .put("p", packageName)
          .put("s", app.since)
          .put("a", activities)
          .put("f", packageName == focused)
      )
    }
    return array.toString()
  }

  fun restore(json: String?) {
    apps.clear()
    focused = null
    if (json == null) return
    try {
      val array = JSONArray(json)
      for (index in 0 until array.length()) {
        val item = array.getJSONObject(index)
        val packageName = item.getString("p")
        val app = App(item.getLong("s"))
        val activities = item.getJSONObject("a")
        for (activity in activities.keys()) app.activities[activity] = activities.getBoolean(activity)
        apps[packageName] = app
        if (item.optBoolean("f")) focused = packageName
      }
    } catch (ignored: JSONException) {
      // A damaged state only loses the sessions open at the checkpoint.
      apps.clear()
      focused = null
    }
  }

  private fun remove(packageName: String, activity: String, time: Long) {
    val app = apps[packageName] ?: return
    if (app.activities.remove(activity) == null) return
    if (focused == packageName && true !in app.activities.values) focused = null
    if (app.activities.isNotEmpty()) return
    apps.remove(packageName)
    if (time > app.since) onEnded(packageName, app.since, time)
  }
}
