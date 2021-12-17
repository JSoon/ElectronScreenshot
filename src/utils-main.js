/**
 * 主进程工具库
 */
const { BrowserWindow, screen, dialog } = require('electron')
const os = require('os')

// 是否是Windows
const isWindows = os.platform() === 'win32'

// 是否是Mac
const isMacOS = os.platform() === 'darwin'

// 获取当前窗口
const getCurrentWindow = () => {
  // 若当前应用窗口不在焦点, 则直接获取主窗口
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
}

// 隐藏当前窗口
const hideCurrentWindow = () => {
  getCurrentWindow().hide()
}

// 关闭当前窗口
const closeCurrentWindow = () => {
  getCurrentWindow().close()
}

// 获取当前屏幕
const getCurrentScreen = () => {
  const currentWindow = getCurrentWindow()
  let { x, y } = currentWindow.getBounds()
  // FIXME: Windows系统下, 若系统任务栏自动隐藏, 则获取到的边界左上角坐标为负, 导致不匹配显示屏的边界坐标
  x = x < 0 ? 0 : x
  y = y < 0 ? 0 : y

  // dialog.showMessageBox({
  //   title: 'screen.getAllDisplays()',
  //   message: `${screen.getAllDisplays().length}个屏幕, ${JSON.stringify(screen.getAllDisplays())}`
  // })
  return screen.getAllDisplays()?.filter(d => d.bounds.x === x && d.bounds.y === y)?.[0]
}

// 鼠标是否在当前窗口
const isCursorInCurrentWindow = () => {
  const currentWindow = getCurrentWindow()
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