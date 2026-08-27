package expo.modules.audio.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Binder
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.C
import androidx.core.app.NotificationCompat
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.MediaStyleNotificationHelper
import androidx.media3.session.SessionCommand
import expo.modules.audio.AudioLockScreenOptions
import expo.modules.audio.AudioPlayer
import expo.modules.audio.Metadata
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.net.URL

@OptIn(UnstableApi::class)
class AudioControlsService : MediaSessionService() {
  private val binder = AudioControlsBinder()
  private var mediaSession: MediaSession? = null
  private var currentMetadata: Metadata? = null
  private var currentPlayer: AudioPlayer? = null
  private var sessionPlayer: Player? = null
  private var currentOptions: AudioLockScreenOptions? = null
  private val scope = CoroutineScope(Dispatchers.IO)
  private var currentArtworkUrl: URL? = null
  private var currentArtwork: Bitmap? = null
  private val notificationId: Int
    get() = currentPlayer?.hashCode() ?: CHANNEL_ID.hashCode()

  private var playbackListener: Player.Listener? = null

  /**
   * The Expo player receives one source at a time, so it has no native playlist
   * and does not advertise previous/next commands. This wrapper advertises those
   * standard commands to Android and sends them to the APlayer JavaScript queue.
   */
  private inner class QueueNavigationPlayer(player: Player) : ForwardingPlayer(player) {
    override fun isCommandAvailable(command: Int): Boolean {
      return when (command) {
        Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
        Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
        Player.COMMAND_SEEK_TO_PREVIOUS,
        Player.COMMAND_SEEK_TO_NEXT -> true
        else -> super.isCommandAvailable(command)
      }
    }

    override fun getAvailableCommands(): Player.Commands {
      return super.getAvailableCommands().buildUpon()
        .add(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
        .add(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
        .add(Player.COMMAND_SEEK_TO_PREVIOUS)
        .add(Player.COMMAND_SEEK_TO_NEXT)
        .build()
    }

    override fun seekToPreviousMediaItem() {
      dispatchAction("previous")
    }

    override fun seekToNextMediaItem() {
      dispatchAction("next")
    }

    override fun seekToPrevious() {
      dispatchAction("previous")
    }

    override fun seekToNext() {
      dispatchAction("next")
    }

    // SystemUI uses these availability methods in addition to the command list
    // to decide whether transport arrows should be rendered. The Expo player has
    // a single media item, but APlayer's JavaScript queue does have neighbors.
    override fun hasPreviousMediaItem(): Boolean = currentOptions?.showPrevious == true

    override fun hasNextMediaItem(): Boolean = currentOptions?.showNext == true

    override fun getPreviousMediaItemIndex(): Int {
      return if (hasPreviousMediaItem()) 0 else C.INDEX_UNSET
    }

    override fun getNextMediaItemIndex(): Int {
      return if (hasNextMediaItem()) 0 else C.INDEX_UNSET
    }
  }

  inner class AudioControlsBinder : Binder() {
    fun getService(): AudioControlsService = this@AudioControlsService
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Handle media button actions dispatched from notification
    when (intent?.action) {
      ACTION_PLAY -> withPlayerOnAppThread { it.play() }
      ACTION_PAUSE -> withPlayerOnAppThread { it.pause() }
      ACTION_TOGGLE -> withPlayerOnAppThread { player ->
        if (player.isPlaying) player.pause() else player.play()
      }

      ACTION_SEEK_FORWARD -> withPlayerOnAppThread { player ->
        player.seekTo(player.currentPosition + SEEK_INTERVAL_MS)
      }

      ACTION_SEEK_BACKWARD -> withPlayerOnAppThread { player ->
        player.seekTo(player.currentPosition - SEEK_INTERVAL_MS)
      }

      ACTION_SKIP_PREVIOUS -> dispatchAction("previous")
      ACTION_SKIP_NEXT -> dispatchAction("next")
    }

    // Ensure channel exists and update current notification
    postOrStartForegroundNotification(startInForeground = false)
    return super.onStartCommand(intent, flags, startId)
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    createNotificationChannelIfNeeded()

    pendingPlayer?.let { player ->
      setActivePlayerInternal(player, pendingMetadata, pendingOptions)
      pendingPlayer = null
      pendingMetadata = null
    }
  }

  private fun createNotificationChannelIfNeeded() {
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (notificationManager.getNotificationChannel(CHANNEL_ID) == null) {
        notificationManager.createNotificationChannel(
          NotificationChannel(
            CHANNEL_ID,
            CHANNEL_ID,
            NotificationManager.IMPORTANCE_LOW
          )
        )
      }
    }
  }

  private fun buildContentIntent(): PendingIntent? {
    val appIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(
      this,
      0,
      appIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun buildActionIntent(action: String, requestCode: Int): PendingIntent {
    return PendingIntent.getService(
      this,
      requestCode,
      Intent(this, AudioControlsService::class.java).setAction(action),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun buildNotification(): Notification? {
    val session = mediaSession ?: return null

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(androidx.media3.session.R.drawable.media3_icon_circular_play)
      .setContentTitle(currentMetadata?.title ?: "\u200E")
      .setContentText(currentMetadata?.artist)
      .setSubText(currentMetadata?.albumTitle)
      .setLargeIcon(currentArtwork)
      .setContentIntent(buildContentIntent())
      .setAutoCancel(false)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)

    // Some Android lock screens ignore Media3 custom layouts. Explicit notification
    // actions reliably expose the full queue controls on the lock screen.
    val showPrevious = currentOptions?.showPrevious == true
    val showNext = currentOptions?.showNext == true
    if (showPrevious) {
      builder.addAction(
        android.R.drawable.ic_media_previous,
        "Faixa anterior",
        buildActionIntent(ACTION_SKIP_PREVIOUS, REQUEST_PREVIOUS)
      )
    }
    builder.addAction(
      if (currentPlayer?.ref?.isPlaying == true) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,
      if (currentPlayer?.ref?.isPlaying == true) "Pausar" else "Reproduzir",
      buildActionIntent(ACTION_TOGGLE, REQUEST_PLAY_PAUSE)
    )
    if (showNext) {
      builder.addAction(
        android.R.drawable.ic_media_next,
        "Próxima faixa",
        buildActionIntent(ACTION_SKIP_NEXT, REQUEST_NEXT)
      )
    }
    val compactActions = when {
      showPrevious && showNext -> intArrayOf(0, 1, 2)
      showPrevious || showNext -> intArrayOf(0, 1)
      else -> intArrayOf(0)
    }
    builder.setStyle(MediaStyleNotificationHelper.MediaStyle(session).setShowActionsInCompactView(*compactActions))

    return builder.build()
  }

  private fun updateSessionCustomLayout(isPlaying: Boolean) {
    val session = mediaSession ?: return
    val customLayout = mutableListOf<CommandButton>()

    // Add the queue's previous-track control when requested by the host application.
    if (currentOptions?.showPrevious == true) {
      customLayout.add(
        CommandButton.Builder(CommandButton.ICON_SKIP_BACK)
          .setDisplayName("Previous")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SKIP_PREVIOUS, Bundle.EMPTY))
          .build()
      )
    }

    // Add play/pause button (always present)
    customLayout.add(
      CommandButton.Builder(if (isPlaying) CommandButton.ICON_PAUSE else CommandButton.ICON_PLAY)
        .setDisplayName(if (isPlaying) "Pause" else "Play")
        .setEnabled(true)
        .setPlayerCommand(Player.COMMAND_PLAY_PAUSE)
        .build()
    )

    // Add the queue's next-track control when requested by the host application.
    if (currentOptions?.showNext == true) {
      customLayout.add(
        CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD)
          .setDisplayName("Next")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SKIP_NEXT, Bundle.EMPTY))
          .build()
      )
    }

    session.setCustomLayout(customLayout)
  }

  private fun postOrStartForegroundNotification(startInForeground: Boolean) {
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val notification = buildNotification() ?: return

    if (startInForeground) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        startForeground(
          notificationId,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        )
      } else {
        startForeground(notificationId, notification)
      }
    } else {
      notificationManager.notify(notificationId, notification)
    }
  }

  override fun onUpdateNotification(session: MediaSession, startInForegroundRequired: Boolean) {
    // Called by Media3 when the session's notification should be updated.
    postOrStartForegroundNotification(startInForegroundRequired)
  }

  private fun setActivePlayerInternal(
    player: AudioPlayer?,
    metadata: Metadata? = null,
    options: AudioLockScreenOptions? = null
  ) {
    // Detach listener from previous player, clear active flag and hide
    playbackListener?.let { listener ->
      currentPlayer?.ref?.removeListener(listener)
    }
    playbackListener = null
    currentPlayer?.isActiveForLockScreen = false
    hideNotification()

    currentPlayer = player
    currentMetadata = metadata
    currentOptions = options

    metadata?.artworkUrl?.let {
      loadArtworkFromUrl(it) { bitmap ->
        currentArtwork = bitmap
        postOrStartForegroundNotification(startInForeground = false)
      }
    }
    player?.isActiveForLockScreen = true

    if (player != null) {
      mediaSession?.release()
      sessionPlayer = QueueNavigationPlayer(player.ref)

      val session = MediaSession.Builder(this, sessionPlayer!!)
        .setCallback(AudioMediaSessionCallback())
        .build()

      addSession(session)
      mediaSession = session

      // Set initial custom layout
      updateSessionCustomLayout(player.ref.isPlaying)

      postOrStartForegroundNotification(startInForeground = true)

      // Listen for playback state changes to refresh notification and update custom layout
      val listener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
          updateSessionCustomLayout(isPlaying)
          postOrStartForegroundNotification(startInForeground = false)
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
          postOrStartForegroundNotification(startInForeground = false)
        }
      }
      playbackListener = listener
      player.ref.addListener(listener)
      // Initial update now that session exists
      postOrStartForegroundNotification(startInForeground = false)
    } else {
      clearSessionInternal()
    }
  }

  private fun updateMetadataInternal(player: AudioPlayer, metadata: Metadata?) {
    if (player != currentPlayer || metadata == currentMetadata) {
      return
    }
    currentMetadata = metadata
    currentMetadata?.artworkUrl?.let {
      loadArtworkFromUrl(it) { bitmap ->
        currentArtwork = bitmap
        postOrStartForegroundNotification(startInForeground = false)
      }
    } ?: postOrStartForegroundNotification(startInForeground = false)
  }

  private fun clearSessionInternal() {
    currentPlayer?.isActiveForLockScreen = false
    playbackListener?.let { listener ->
      currentPlayer?.ref?.removeListener(listener)
    }
    playbackListener = null
    currentPlayer = null
    currentMetadata = null
    mediaSession?.release()
    mediaSession = null
    sessionPlayer = null
    stopForeground(STOP_FOREGROUND_REMOVE)
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
    return mediaSession
  }

  private fun withPlayerOnAppThread(block: (Player) -> Unit) {
    val player = currentPlayer?.ref ?: return
    val looper: Looper = player.applicationLooper
    if (Looper.myLooper() == looper) {
      block(player)
    } else {
      Handler(looper).post { block(player) }
    }
  }

  override fun onBind(intent: Intent?): IBinder {
    return super.onBind(intent) ?: binder
  }

  private fun loadArtworkFromUrl(url: URL, callback: (Bitmap?) -> Unit) {
    if (url != currentArtworkUrl) {
      currentArtworkUrl = url
      scope.launch {
        try {
          val inputStream = url.openConnection().getInputStream()
          val bitmap = BitmapFactory.decodeStream(inputStream)
          callback(bitmap)
        } catch (e: Exception) {
          callback(null)
        }
      }
    }
  }

  private fun hideNotification() {
    val notificationManager: NotificationManager =
      getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.cancel(notificationId)
  }

  override fun onDestroy() {
    super.onDestroy()
    instance = null
    try {
      scope.cancel()
    } catch (e: Exception) {
      //
    }
    mediaSession?.release()
    sessionPlayer = null
    currentPlayer = null
  }

  companion object {
    private const val CHANNEL_ID = "expo_audio_channel"
    private const val ACTION_PLAY = "expo.modules.audio.action.PLAY"
    private const val ACTION_PAUSE = "expo.modules.audio.action.PAUSE"
    private const val ACTION_TOGGLE = "expo.modules.audio.action.TOGGLE"

    private const val REQUEST_PREVIOUS = 1001
    private const val REQUEST_PLAY_PAUSE = 1002
    private const val REQUEST_NEXT = 1003

    const val ACTION_SEEK_FORWARD = "expo.modules.audio.action.SEEK_FORWARD"
    const val ACTION_SEEK_BACKWARD = "expo.modules.audio.action.SEEK_REWIND"
    const val ACTION_SKIP_NEXT = "expo.modules.audio.action.SKIP_NEXT"
    const val ACTION_SKIP_PREVIOUS = "expo.modules.audio.action.SKIP_PREVIOUS"

    const val SEEK_INTERVAL_MS = 10000L

    private var pendingPlayer: AudioPlayer? = null
    private var pendingMetadata: Metadata? = null
    private var pendingOptions: AudioLockScreenOptions? = null

    @Volatile
    private var instance: AudioControlsService? = null

    @Volatile
    private var actionListener: ((String) -> Unit)? = null

    fun setActionListener(listener: ((String) -> Unit)?) {
      actionListener = listener
    }

    fun dispatchAction(action: String) {
      actionListener?.invoke(action)
    }

    fun getInstance(): AudioControlsService? = instance

    fun setActivePlayer(
      context: Context,
      player: AudioPlayer?,
      metadata: Metadata? = null,
      options: AudioLockScreenOptions? = null
    ) {
      val service = getInstance()
      if (service != null) {
        service.setActivePlayerInternal(player, metadata, options)
      } else {
        val intent = Intent(context, AudioControlsService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }

        pendingPlayer = player
        pendingMetadata = metadata
        pendingOptions = options
      }
    }

    fun updateMetadata(player: AudioPlayer, metadata: Metadata?) {
      getInstance()?.updateMetadataInternal(player, metadata)
    }

    fun clearSession() {
      getInstance()?.clearSessionInternal()
    }
  }
}
