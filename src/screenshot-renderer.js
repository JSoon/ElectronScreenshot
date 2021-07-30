/**
 * 截屏渲染进程
 */
const path = require('path')
const { ipcRenderer, clipboard, nativeImage } = require('electron')
const { IPC_CHANNELS } = require('./enums')
const { getScreenshot } = require('./desktop-capturer')
const { CaptureEditor } = require('./screenshot-editor')

// 截屏音
const audio = new Audio()
audio.src = path.join(__dirname, 'assets/audio/capture.mp3')
// 截屏底图
const J_Background = document.querySelector('#J_Background')
// 选区画布
const J_SelectionCanvas = document.querySelector('#J_SelectionCanvas')

// 右键取消截屏
document.body.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    window.close()
  }
}, true)

// 截屏
getScreenshot(async (imgSrc) => {
  // console.log(imgSrc);
  const currentScreen = await ipcRenderer.invoke(IPC_CHANNELS.GET_CURRENT_SCREEN)

  // // 显示器像素缩放比例, 例如: 普通屏幕为1, 视网膜屏幕为2
  // const scaleFactor = currentScreen.scaleFactor
  // // 显示器宽度
  // const screenWidth = currentScreen.bounds.width
  // // 显示器高度
  // const screenHeight = currentScreen.bounds.height

  // console.log('scaleFactor', scaleFactor);

  // J_Background.style.backgroundImage = `url(${imgSrc})`
  // J_Background.style.backgroundSize = `${screenWidth}px ${screenHeight}px`


  const capture = new CaptureEditor(currentScreen, J_SelectionCanvas, J_Background, imgSrc)

  // 选区截图
  const selectCapture = () => {
    if (!capture.selectRect) {
      return
    }
    let url = capture.getImageUrl()
    ipcRenderer.send(IPC_CHANNELS.HIDE_CURRENT_WINDOW)

    audio.play()
    audio.onended = () => {
      window.close()
    }
    clipboard.writeImage(nativeImage.createFromDataURL(url))
    ipcRenderer.send('capture-screen', {
      type: 'complete',
      url,
    })
  }

  // 双击选区
  J_SelectionCanvas.addEventListener('dblclick', e => {
    selectCapture()
  }, false)

})
