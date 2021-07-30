/**
 * 截屏渲染进程
 */
const { ipcRenderer } = require('electron')
const { getScreenshot } = require('./desktop-capturer')
const { IPC_CHANNELS } = require('./enums')

const J_Background = document.querySelector('#J_Background')

// 右键取消截屏
document.body.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    window.close()
  }
}, true)

// 截屏
getScreenshot(async (imgSrc) => {
  const currentScreen = await ipcRenderer.invoke(IPC_CHANNELS.GET_CURRENT_SCREEN)

  const scaleFactor = currentScreen.scaleFactor
  const screenWidth = currentScreen.bounds.width
  const screenHeight = currentScreen.bounds.height

  J_Background.style.backgroundImage = imgSrc
  J_Background.style.backgroundSize = `${screenWidth}px ${screenHeight}px`

})
