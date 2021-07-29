const os = require('os')
const { BrowserWindow, ipcMain } = require('electron')
const { getCurrentScreen } = require('./utils')
const { IPC_CHANNELS } = require('./ipcEnums')

class Screenshot {

  win = null

  init() {
    this.win = new BrowserWindow({
      fullscreen: true,
      simpleFullscreen: true,
      frame: false,
      movable: false,
      resizable: false,
      enableLargerThanScreen: true,
      hasShadow: false,
      transparent: true,
      // opacity: 0,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        // preload: path.join(__dirname, 'preload-screenshot')
      }
    })
    this.win.loadFile('screenshot.html')
    this.win.webContents.openDevTools()
    return this.win
  }

}

const useCapture = () => {
  let ss = null

  ipcMain.on(IPC_CHANNELS.TAKE_SCREENSHOT, (e, { type = 'start', screenId } = {}) => {
    ss = new Screenshot()
    ss.init().show()
  })
  
  ipcMain.on(IPC_CHANNELS.GET_CURRENT_SCREEN, () => {
    const currentScreen = getCurrentScreen(ss.win)
    ss.win.webContents.send(IPC_CHANNELS.GET_CURRENT_SCREEN, currentScreen)
  })
}



module.exports = {
  useCapture
}