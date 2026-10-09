package expo.modules.installedapps

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import android.telecom.TelecomManager
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

private const val ICON_SIZE_PX = 96

internal class AppNotFoundException(packageName: String, cause: Throwable?) :
  CodedException("No installed app found for package \"$packageName\"", cause)

// Reads the installed-app list for the app picker.
class InstalledAppsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is unavailable" }

  override fun definition() = ModuleDefinition {
    Name("InstalledApps")

    AsyncFunction("getInstalledAppsAsync") {
      return@AsyncFunction listLaunchableApps()
    }

    AsyncFunction("getAppIconAsync") { packageName: String ->
      return@AsyncFunction loadIconDataUri(packageName)
    }
  }

  private fun listLaunchableApps(): List<Map<String, String>> {
    val packageManager = context.packageManager
    val exempt = exemptPackages(packageManager)
    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

    return queryActivities(packageManager, launcherIntent)
      .mapNotNull { it.activityInfo?.applicationInfo }
      .distinctBy { it.packageName }
      .filterNot { it.packageName in exempt }
      .map { info ->
        mapOf(
          "packageName" to info.packageName,
          "appName" to packageManager.getApplicationLabel(info).toString(),
        )
      }
      .sortedBy { it.getValue("appName").lowercase() }
  }

  private fun queryActivities(
    packageManager: PackageManager,
    intent: Intent,
  ): List<ResolveInfo> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }

  private fun exemptPackages(packageManager: PackageManager): Set<String> {
    val exempt = mutableSetOf(context.packageName)

    (context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)
      ?.defaultDialerPackage
      ?.let(exempt::add)

    exempt += queryActivities(packageManager, Intent(Intent.ACTION_DIAL)).packageNames()
    exempt += queryActivities(packageManager, Intent(Settings.ACTION_SETTINGS)).packageNames()

    return exempt
  }

  private fun List<ResolveInfo>.packageNames(): Set<String> =
    mapNotNullTo(mutableSetOf()) { it.activityInfo?.packageName }

  private fun loadIconDataUri(packageName: String): String {
    val drawable =
      try {
        context.packageManager.getApplicationIcon(packageName)
      } catch (cause: PackageManager.NameNotFoundException) {
        throw AppNotFoundException(packageName, cause)
      }

    val bitmap = drawable.toSizedBitmap()
    val encoded =
      ByteArrayOutputStream().use { stream ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
      }

    return "data:image/png;base64,$encoded"
  }

  private fun Drawable.toSizedBitmap(): Bitmap {
    val source = (this as? BitmapDrawable)?.bitmap
    if (source != null) {
      return Bitmap.createScaledBitmap(source, ICON_SIZE_PX, ICON_SIZE_PX, true)
    }

    return Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888).also {
      val canvas = Canvas(it)
      setBounds(0, 0, canvas.width, canvas.height)
      draw(canvas)
    }
  }
}
