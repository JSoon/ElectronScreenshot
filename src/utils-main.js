/**
 * 主进程工具库
 */
const { BrowserWindow, screen } = require('electron')
const os = require('os')

// 是否是Windows
const isWindows = os.platform() === 'win32'

// 是否是Mac
const isMacOS = os.platform() === 'darwin'

// 获取当前窗口
const getCurrentWindow = () => {
  return BrowserWindow.getFocusedWindow()
}

// 隐藏当前窗口
const hideCurrentWindow = () => {
  BrowserWindow.getFocusedWindow().hide()
}

// 关闭当前窗口
const closeCurrentWindow = () => {
  BrowserWindow.getFocusedWindow().close()
}

// 获取当前屏幕
const getCurrentScreen = () => {
  const currentWindow = BrowserWindow.getFocusedWindow()
  let { x, y } = currentWindow.getBounds()
  return screen.getAllDisplays().filter(d => d.bounds.x === x && d.bounds.y === y)[0]
}

// 鼠标是否在当前窗口
const isCursorInCurrentWindow = () => {
  const currentWindow = BrowserWindow.getFocusedWindow()
  let { x, y } = screen.getCursorScreenPoint()
  let {
    x: winX, y: winY, width, height,
  } = currentWindow.getBounds()
  return x >= winX && x <= winX + width && y >= winY && y <= winY + height
}

module.exports = {
  isWindows,
  isMacOS,
  hideCurrentWindow,
  closeCurrentWindow,
  getCurrentWindow,
  getCurrentScreen,
  isCursorInCurrentWindow
}