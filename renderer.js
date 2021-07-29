const { ipcRenderer } = require('electron')
const { IPC_CHANNELS } = require('./ipcEnums')

const shotBtn = document.querySelector('#J_TakeScreenshot')

shotBtn.addEventListener('click', e => {
  ipcRenderer.send(IPC_CHANNELS.TAKE_SCREENSHOT)
})