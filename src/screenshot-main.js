/**
 * 截屏主进程
 */
const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron')
const path = require('path')
const { IPC_CHANNELS } = require('./enums')
const { getCurrentWindow, getCurrentScreen, isMacOS, hideCurrentWindow, closeCurrentWindow } = require('./utils-main')

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
  const screenShot = new Screenshot()

  //#region 注册全局快捷键
  globalShortcut.register('Esc', () => {
    if (screenshotWins?.length) {
      screenshotWins.forEach(win => win.close())
      screenshotWins = []
    }
  })

  globalShortcut.register('CmdOrCtrl+Shift+A', screenShot.init)
  //#endregion

  // 截屏
  ipcMain.on(IPC_CHANNELS.SCREENSHOT, (e, { type = 'start', screenId } = {}) => {
    // 截屏开始
    if (type === 'start') {
      screenShot.init()
    }
    // 截屏完成
    else if (type === 'complete') {
      // nothing
    }
    // 截屏选区选择
    else if (type === 'select') {
      screenshotWins.forEach(win => win.webContents.send(IPC_CHANNELS.SCREENSHOT, { type: 'select', screenId }))
    }

  })

  // 获取当前窗口
  ipcMain.handle(IPC_CHANNELS.GET_CURRENT_WINDOW, () => {
    return getCurrentWindow()
  })

  // 隐藏当前窗口
  ipcMain.on(IPC_CHANNELS.HIDE_CURRENT_WINDOW, () => {
    return hideCurrentWindow()
  })

  // 关闭当前窗口
  ipcMain.on(IPC_CHANNELS.CLOSE_CURRENT_WINDOW, () => {
    return closeCurrentWindow()
  })

  // 获取当前屏幕
  ipcMain.handle(IPC_CHANNELS.GET_CURRENT_SCREEN, () => {
    return getCurrentScreen()
  })

}



module.exports = {
  useCapture
}