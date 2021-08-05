// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('path')
const { useCapture } = require('./src/screenshot-main')
const { isMacOS } = require('./src/utils-main')

let mainWindow = null

function createWindow() {
  if (mainWindow) {
    mainWindow.focus()
    return
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      // Attach a preload script to the renderer, which runs before the renderer 
      // process is loaded, and has access to both renderer globals (e.g. window
      // and document) and a Node.js environment.
      preload: path.join(__dirname, 'src', 'index-preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // 引入截屏功能
  useCapture(mainWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (isMacOS) app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.





module.exports = mainWindow