/**
 * 截屏主进程
 */
const path = require('path')
const fs = require('fs')
const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  dialog
} = require('electron')
const { IPC_CHANNELS } = require('./enums')
const { getCurrentWindow, getCurrentScreen, isMacOS, hideCurrentWindow, closeCurrentWindow, getFilename } = require('./utils-main')

// 所有截屏窗口
let screenshotWins = []

class Screenshot {

  init() {
    // 若已经处于截屏状态, 则退出
    if (screenshotWins.length) {
      return
    }

    // 获取屏幕上的所有可见显示
    let displays = screen.getAllDisplays()

    screenshotWins = displays.map(display => {
      console.log('截屏开始', display.id);

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
        // opacity: 0.7,
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
      } 
      else {
        win.blur()
      }

      // 截屏结束前, 退出simpleFullscreen模式
      win.on('close', () => {
        win.setSimpleFullScreen(false)
      })

      // 一个窗口关闭则关闭所有窗口
      win.on('closed', () => {
        const index = screenshotWins.indexOf(win)
        if (index !== -1) {
          screenshotWins.splice(index, 1)
        }
        screenshotWins.forEach(win => win.close())
        console.log('截屏退出', display.id);
      })

      // 调试
      // win.webContents.openDevTools()

      return win
    })
  }

}

/**
 * 使用截屏
 * @param {BrowserWindow} mainWindow 程序主窗口
 */
const useCapture = (mainWindow) => {
  if (!mainWindow) {
    return
  }

  const screenShot = new Screenshot()

  //#region 注册全局快捷键
  // 退出截屏 (暂时屏蔽ESC, 因为会导致其他应用ESC失效)
  // globalShortcut.register('Esc', () => {
  //   if (screenshotWins?.length) {
  //     screenshotWins.forEach(win => win.close())
  //     screenshotWins = []
  //   }
  // })
  //#endregion

  //#region 全局快捷键管理
  // 注册默认截屏快捷键
  const SCREENSHOT_DEFAULT_SHORTCUT = 'CommandOrControl+Shift+A'
  globalShortcut.register(SCREENSHOT_DEFAULT_SHORTCUT, screenShot.init)
  // 全局截屏快捷键注册
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_REGISTER_SHORTCUTS, (e, shortcut) => {
    return globalShortcut.register(shortcut, screenShot.init)
  })
  // 全局截屏快捷键移除
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_UNREGISTER_SHORTCUTS, (e, shortcut) => {
    return globalShortcut.unregister(shortcut, screenShot.init)
  })
  //#endregion

  // 截屏事件
  ipcMain.on(IPC_CHANNELS.SCREENSHOT, (e, {
    type = IPC_CHANNELS.SCREENSHOT_START,
    screenId,
    // { base64, blob }
    data
  } = {}) => {

    // 截屏开始
    if (type === IPC_CHANNELS.SCREENSHOT_START) {
      screenShot.init()
    }
    // 截屏完成
    else if (type === IPC_CHANNELS.SCREENSHOT_COMPLETE) {
      console.log('截屏完成', screenId);
      // TODO: 导入主窗口, 向主窗口发送截屏完成事件
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.SCREENSHOT_COMPLETE, {
          screenId,
          data
        })
      }
    }
    // 截屏选区选择
    else if (type === IPC_CHANNELS.SCREENSHOT_SELECT) {
      screenshotWins.forEach(win => {
        win.webContents.send(IPC_CHANNELS.SCREENSHOT, {
          type: IPC_CHANNELS.SCREENSHOT_SELECT,
          screenId
        })
      })
      console.log('截屏选区选择', screenId);
    }
    // 截屏退出
    else if (type === IPC_CHANNELS.SCREENSHOT_CANCEL) {
      // nothing
    }

  })

  // 保存截屏图片文件
  ipcMain.on(IPC_CHANNELS.SCREENSHOT_SAVE_FILE, async (e, dataURL) => {
    const win = getCurrentWindow()
    // 隐藏截屏窗口
    win.hide()
    
    try {
      const { filePath, canceled } = await dialog.showSaveDialog(
        mainWindow,
        {
          filters: [{
            name: 'Images',
            extensions: ['png', 'jpg', 'gif'],
          }],
          defaultPath: getFilename()
        }
      )

      // 取消保存操作
      if (canceled) {
        win.close()
        return
      }

      // 若文件保存路径存在, 则进行写入
      if (filePath) {
        fs.writeFile(
          filePath,
          Buffer.from(dataURL.replace('data:image/png;base64,', ''), 'base64'),
          () => {
            win.close()
          }
        )
      }
    } catch (error) {
      dialog.showErrorBox('图片保存出错', error.message)
    }
  })

  // 获取当前窗口
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_GET_CURRENT_WINDOW, () => {
    return getCurrentWindow()
  })

  // 隐藏当前窗口
  ipcMain.on(IPC_CHANNELS.SCREENSHOT_HIDE_CURRENT_WINDOW, () => {
    return hideCurrentWindow()
  })

  // 关闭当前窗口
  ipcMain.on(IPC_CHANNELS.SCREENSHOT_CLOSE_CURRENT_WINDOW, () => {
    return closeCurrentWindow()
  })

  // 获取当前屏幕
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_GET_CURRENT_SCREEN, () => {
    return getCurrentScreen()
  })

}

module.exports = {
  useCapture
}