/**
 * 首页渲染进程
 */
const { ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('./enums');

const shotBtn = document.querySelector('#J_TakeScreenshot');

shotBtn.addEventListener('click', e => {
  ipcRenderer.send(IPC_CHANNELS.SCREENSHOT);
});