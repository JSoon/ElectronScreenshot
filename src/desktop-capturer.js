/**
 * Desktop Capturer
 * @see {@link https://www.electronjs.org/docs/latest/api/desktop-capturer/}
 */
const { desktopCapturer, ipcRenderer } = require('electron')
const { IPC_CHANNELS } = require('./enums')

// 获取截屏
const getScreenshot = async (callback) => {
  // 获取当前屏幕
  const currentScreen = await ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_CURRENT_SCREEN)

  document.body.style.opacity = '0'
  let oldCursor = document.body.style.cursor
  document.body.style.cursor = 'none'

  // TODO: 截图视频流, 鼠标无法隐藏
  // https://github.com/electron/electron/issues/7584
  const handleStream = (stream) => {
    document.body.style.cursor = oldCursor
    document.body.style.opacity = '1'
    // Create hidden video tag
    let video = document.createElement('video')
    video.style.cssText = 'position:absolute; top:-10000px; left:-10000px;'

    let loaded = false
    // 处理视频流, 绘制视频流到画布, 然后转为图片格式
    video.onloadedmetadata = () => {
      if (loaded) {
        return
      }
      loaded = true
      video.pause()

      // Set video ORIGINAL height (screenshot)
      video.style.height = video.videoHeight + 'px' // videoHeight
      video.style.width = video.videoWidth + 'px' // videoWidth

      // Create canvas
      let canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      let ctx = canvas.getContext('2d')
      // Draw video on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      if (callback) {
        // Save screenshot to png - base64
        callback(canvas.toDataURL('image/png'))
      } else {
        // console.log('Need callback!')
      }

      // Remove hidden video tag
      video.remove()
      try {
        stream.getTracks()[0].stop()
      } catch (e) {
        // nothing
      }
    }
    video.srcObject = stream
    // fix: 截屏流转图片黑屏
    // https://github.com/electron/electron/issues/21063
    video.play()
    document.body.appendChild(video)
  }

  const handleError = (e) => {
    console.log(e)
  }

  // 获取桌面数据源
  desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1, height: 1 },
  }).then(async sources => {
    // 获取当前显示屏幕
    let selectSource = sources.filter(source => source.display_id + '' === currentScreen.id + '')[0]

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectSource.id,
            minWidth: 1280,
            maxWidth: 8000,
            minHeight: 720,
            maxHeight: 8000
          }
        }
      })
      handleStream(stream)
    }
    catch (e) {
      handleError(e)
    }
    // // Windows
    // if (require('os').platform() === 'win32') {
    //   navigator.mediaDevices.getUserMedia({
    //       audio: false,
    //       video: {
    //           mandatory: {
    //               chromeMediaSource: 'desktop',
    //               chromeMediaSourceId: selectSource.id + '',
    //               minWidth: 1280,
    //               minHeight: 720,
    //               maxWidth: 8000,
    //               maxHeight: 8000,
    //           },
    //       },
    //   }, (e) => {
    //     handleStream(e)
    //   }, handleError)
    // }
    // // Mac OS X
    // else {
    //   navigator.mediaDevices.getUserMedia({
    //       audio: false,
    //       video: {
    //           mandatory: {
    //               chromeMediaSource: 'desktop',
    //               chromeMediaSourceId: `screen:${screen.id}`,
    //               minWidth: 1280,
    //               minHeight: 720,
    //               maxWidth: 8000,
    //               maxHeight: 8000,
    //           },
    //       },
    //   }, (e) => {
    //     handleStream(e)
    //   }, handleError)
    // }
  })
}

module.exports = {
  getScreenshot
}
