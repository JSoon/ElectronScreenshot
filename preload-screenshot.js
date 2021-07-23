const { contextBridge } = require('electron')
const { getCurrentScreen } = require('./utils')

contextBridge.exposeInMainWorld('electron', {
  curScreen: getCurrentScreen()
})