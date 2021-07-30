/**
 * 截屏主进程
 */
const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')
const { IPC_CHANNELS } = require('./enums')
const { getCurrentScreen, isMacOS } = require('./utils-main')

// 所有截屏窗口
let screenshotWins = []

class Screenshot {

  init() {
    if (screenshotWins.length) {
      return
    }

    // 获取屏幕上的所有可见显示
    let displays = screen.getAllDisplays()

    screenshotWins = displays.map(display => {
      const win = new BrowserWindow({
        fullscreen: true,
        simpleFullscreen: true, // MacOS
        frame: false,
        movable: false,
        // kiosk: true,
        resizable: false,
        enableLargerThanScreen: true,
        hasShadow: false,
        transparent: true,
        opacity: 0.7,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        }
      })

      if (isMacOS) {
        app.dock.hide()
        win.setAlwaysOnTop(true, 'screen-saver')
        win.setVisibleOnAllWorkspaces(true)
        win.setFullScreenable(false)
        win.show()
        app.dock.show()
        win.setVisibleOnAllWorkspaces(false)
      }

      win.loadFile(path.join(__dirname, 'screenshot.html'))

      // 根据鼠标位置, 设置窗口焦点
      let { x, y } = screen.getCursorScreenPoint()
      if (
        x >= display.bounds.x &&
        (x <= display.bounds.x + display.bounds.width) &&
        y >= display.bounds.y &&
        (y <= display.bounds.y + display.bounds.height)
      ) {
        win.focus()
      } else {
        win.blur()
      }

      // 一个窗口关闭则关闭所有窗口
      win.on('closed', () => {
        const index = screenshotWins.indexOf(win)
        if (index !== -1) {
          screenshotWins.splice(index, 1)
        }
        screenshotWins.forEach(win => win.close())
      })

      // 调试用
      win.webContents.openDevTools()

      return win
    })
  }

}

const useCapture = () => {

  // 截屏
  ipcMain.on(IPC_CHANNELS.SCREENSHOT, (e, { type = 'start', screenId } = {}) => {
    if (type === 'start') {
      new Screenshot().init()
    } else if (type === 'complete') {
      // nothing
    } else if (type === 'select') {
      captureWins.forEach(win => win.webContents.send('capture-screen', { type: 'select', screenId }))
    }

  })

  // 获取当前屏幕
  ipcMain.handle(IPC_CHANNELS.GET_CURRENT_SCREEN, () => {
    return getCurrentScreen()
  })
}



module.exports = {
  useCapture
}