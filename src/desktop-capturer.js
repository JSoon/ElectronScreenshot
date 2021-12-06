/**
 * Desktop Capturer
 * @see {@link https://www.electronjs.org/docs/latest/api/desktop-capturer/}
 */
const { desktopCapturer, ipcRenderer } = require('electron')
const { IPC_CHANNELS } = require('./enums')

// 图片转objectURL
const imageToBlob = (imageURL) => {
  const img = new Image()
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  img.crossOrigin = 'anonymous'
  img.src = imageURL
  return new Promise((resolve, reject) => {
    img.onload = function () {
      c.width = this.naturalWidth
      c.height = this.naturalHeight
      ctx.drawImage(this, 0, 0)
      c.toBlob((blob) => {
        // here the image is a blob
        resolve(blob)
      },
      // Only PNG files are supported in clipboard API
      'image/png',
      0.75)
    }
    img.onerror = function (err) {
      reject(err)
    }
  })
}

// 获取截屏
const getScreenshot = async (callback) => {
  // 获取当前屏幕
  const currentScreen = await ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_CURRENT_SCREEN)
  console.log('currentScreen', currentScreen);

  document.body.style.opacity = '0'
  const oldCursor = document.body.style.cursor
  document.body.style.cursor = 'none'

  /**
   * 截屏视频流：多屏幕
   * TODO:
   * 1. 截屏视频流, 鼠标无法隐藏: https://github.com/electron/electron/issues/7584
   * 2. 多屏幕处理
   * @param {object} stream 视频流
   */
  const handleStream = (stream) => {
    // Create hidden video tag
    const video = document.createElement('video')
    document.body.appendChild(video)
    video.srcObject = stream
    video.style.cssText = 'position:absolute; top:-10000px; left:-10000px;'

    // fix: 截屏流转图片黑屏
    // https://github.com/electron/electron/issues/21063
    video.play()

    // 处理视频流, 绘制视频流到画布, 然后转为图片格式
    video.onloadedmetadata = (e) => {

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

      canvas.toBlob((blob) => {
        console.log(blob);
        if (callback) {
          // Save screenshot to blob URL
          callback(URL.createObjectURL(blob))
        } else {
          // console.log('Need callback!')
        }
      }, 
      // 设置截屏图片格式和质量
      'image/jpeg', 0.9)
      
      // Remove hidden video tag
      video.remove()
    }
  }

  // 截屏图片流：单屏幕
  const handleDataURL = async (dataURL, startTime) => {
    const blob = await imageToBlob(dataURL)
    callback?.(URL.createObjectURL(blob), startTime)
  }

  const handleError = (e) => {
    console.log(e)
  }

  // 获取桌面数据源
  const currentScreenBounds = currentScreen.bounds;
  const currentScreenScaleFactor = currentScreen.scaleFactor;
  const startTime = new Date().getTime()
  desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { 
      width: currentScreenBounds.width * currentScreenScaleFactor, 
      height: currentScreenBounds.height * currentScreenScaleFactor,
    },
  }).then(async sources => {
    // 是否支持display_id, 若不支持, 则说明系统不支持多屏幕
    // const isDisplayIdSupported = sources.some(source => source.display_id)

    // TODO: 暂时不支持多屏幕截屏
    const isDisplayIdSupported = false
    
    try {
      // 若支持，则从视频流构建截屏
      if (isDisplayIdSupported) {
        // 获取当前显示屏幕
        const selectSource = sources.filter(source => source.display_id + '' === currentScreen.id + '')[0]
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
      // 若不支持，则从缩略图构建截屏
      else {
        const selectSource = sources[0]?.thumbnail?.toDataURL({
          scaleFactor: currentScreenScaleFactor
        })
        handleDataURL(selectSource, startTime)
      }

      // 恢复鼠标和背景图样式
      document.body.style.cursor = oldCursor
      document.body.style.opacity = '1'
    }
    catch (e) {
      handleError(e)
    }
  });
};

module.exports = {
  getScreenshot
}
