// 事件频道
const IPC_CHANNELS = {
  // 截屏
  SCREENSHOT: 'screenshot',
  SCREENSHOT_START: 'screenshot-start',
  SCREENSHOT_SELECT: 'screenshot-select',
  SCREENSHOT_COMPLETE: 'screenshot-complete',
  SCREENSHOT_CANCEL: 'screenshot-cancel',
  // 保存截屏图片文件
  SAVE_SCREENSHOT_FILE: 'save-screenshot-file',
  // 获取当前窗口
  GET_CURRENT_WINDOW: 'get-current-window',
  // 获取当前屏幕
  GET_CURRENT_SCREEN: 'get-current-screen',
  // 隐藏当前窗口
  HIDE_CURRENT_WINDOW: 'hide-current-window',
  // 关闭当前窗口
  CLOSE_CURRENT_WINDOW: 'close-current-window',
}

module.exports = {
  IPC_CHANNELS
}