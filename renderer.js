const { ipcRenderer } = require('electron')

const shotBtn = document.querySelector('#J_TakeScreenshot')

shotBtn.addEventListener('click', e => {
  ipcRenderer.send('take-screenshot')
})