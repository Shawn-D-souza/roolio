package expo.modules.installedapps

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.telecom.TelecomManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

private const val ICON_SIZE_PX = 96
private const val ICON_CACHE_DIR = "app-icons"

internal class AppNotFoundException(packageName: String, cause: Throwable?) :
  CodedException("No installed app found for package \"$packageName\"", cause)

internal class IconWriteException(packageName: String) :
  CodedException("Could not cache the icon for package \"$packageName\"")

private data class InstalledAppInfo(
  val packageName: String,
  val appName: String,
  val updatedAt: Long,
)

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
      return@AsyncFunction loadIconFileUri(packageName)
    }

    // The packages in `packageNames` that are no longer installed.
    AsyncFunction("getUninstalledAsync") { packageNames: List<String> ->
      val packageManager = context.packageManager
      return@AsyncFunction packageNames.filter { packageName ->
        try {
          getPackageInfo(packageManager, packageName)
          false
        } catch (ignored: PackageManager.NameNotFoundException) {
          true
        }
      }
    }
  }

  private fun listLaunchableApps(): List<Map<String, Any>> {
    val packageManager = context.packageManager
    val exempt = exemptPackages(packageManager)
    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

    val apps =
      queryActivities(packageManager, launcherIntent)
        .mapNotNull { it.activityInfo?.applicationInfo }
        .distinctBy { it.packageName }
        .filterNot { it.packageName in exempt }
        .mapNotNull { info ->
          // The app may be uninstalled between the query and this lookup; skip it if so.
          val updatedAt =
            try {
              getPackageInfo(packageManager, info.packageName).lastUpdateTime
            } catch (ignored: PackageManager.NameNotFoundException) {
              return@mapNotNull null
            }
          InstalledAppInfo(
            packageName = info.packageName,
            appName = packageManager.getApplicationLabel(info).toString(),
            updatedAt = updatedAt,
          )
        }
        .sortedBy { it.appName.lowercase() }

    pruneIconCache(apps.mapTo(mutableSetOf()) { it.packageName })

    return apps.map {
      mapOf(
        "packageName" to it.packageName,
        "appName" to it.appName,
        "updatedAt" to it.updatedAt.toDouble(),
      )
    }
  }

  // Removes cached icons for apps that are no longer installed or listed.
  private fun pruneIconCache(installed: Set<String>) {
    File(context.cacheDir, ICON_CACHE_DIR)
      .listFiles()
      ?.filterNot { iconFilePackage(it) in installed }
      ?.forEach(File::delete)
  }

  // Icon files are named "<package>_<lastUpdateTime>.png"; package names may contain "_".
  private fun iconFilePackage(file: File): String = file.name.substringBeforeLast('_')

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
    // A launcher can't be paused: the pause screen sends the user to it.
    exempt +=
      queryActivities(packageManager, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
        .packageNames()

    return exempt
  }

  private fun List<ResolveInfo>.packageNames(): Set<String> =
    mapNotNullTo(mutableSetOf()) { it.activityInfo?.packageName }

  // Renders the icon to a PNG in the cache dir once per app version and returns its file URI,
  // so the image pipeline can cache decoded bitmaps instead of re-parsing base64 strings.
  private fun loadIconFileUri(packageName: String): String {
    val packageManager = context.packageManager
    val packageInfo =
      try {
        getPackageInfo(packageManager, packageName)
      } catch (cause: PackageManager.NameNotFoundException) {
        throw AppNotFoundException(packageName, cause)
      }

    val iconDir = File(context.cacheDir, ICON_CACHE_DIR).apply { mkdirs() }
    val iconFile = File(iconDir, "${packageName}_${packageInfo.lastUpdateTime}.png")

    if (!iconFile.exists()) {
      // Drop icons from older versions of this app.
      iconDir.listFiles { file -> iconFilePackage(file) == packageName }
        ?.forEach(File::delete)

      val drawable =
        try {
          packageManager.getApplicationIcon(packageName)
        } catch (cause: PackageManager.NameNotFoundException) {
          throw AppNotFoundException(packageName, cause)
        }

      val tempFile = File(iconDir, "${iconFile.name}.tmp")
      FileOutputStream(tempFile).use { stream ->
        drawable.toSizedBitmap().compress(Bitmap.CompressFormat.PNG, 100, stream)
      }
      if (!tempFile.renameTo(iconFile) && !iconFile.exists()) {
        tempFile.delete()
        throw IconWriteException(packageName)
      }
    }

    return Uri.fromFile(iconFile).toString()
  }

  private fun getPackageInfo(packageManager: PackageManager, packageName: String): PackageInfo =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      packageManager.getPackageInfo(packageName, 0)
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
