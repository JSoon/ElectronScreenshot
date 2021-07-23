const { BrowserWindow, ipcMain } = require('electron')
const path = require('path')

class Screenshot {

  win = null

  init() {
    this.win = new BrowserWindow({
      fullscreen: true,
      frame: false,
      movable: false,
      resizable: false,
      enableLargerThanScreen: true,
      hasShadow: false,
      transparent: true,
      opacity: 0.5,
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
  ipcMain.on('take-screenshot', (e, { type = 'start', screenId } = {}) => {
    const ss = new Screenshot()
    ss.init().show()
  })
}

module.exports = {
  useCapture
}