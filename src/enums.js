// 事件频道
const IPC_CHANNELS = {
  // 截屏
  SCREENSHOT: 'screenshot',
  SCREENSHOT_START: 'screenshot-start',
  SCREENSHOT_SELECT: 'screenshot-select',
  SCREENSHOT_COMPLETE: 'screenshot-complete',
  SCREENSHOT_CANCEL: 'screenshot-cancel',
  // 保存截屏图片文件
  SCREENSHOT_SAVE_FILE: 'save-screenshot-file',
  // 获取当前窗口
  SCREENSHOT_GET_CURRENT_WINDOW: 'get-current-window',
  // 获取当前屏幕
  SCREENSHOT_GET_CURRENT_SCREEN: 'get-current-screen',
  // 隐藏当前窗口
  SCREENSHOT_HIDE_CURRENT_WINDOW: 'hide-current-window',
  // 关闭当前窗口
  SCREENSHOT_CLOSE_CURRENT_WINDOW: 'close-current-window',
  // 快捷键注册
  SCREENSHOT_REGISTER_SHORTCUTS: 'register-shortcuts',
  // 快捷键移除
  SCREENSHOT_UNREGISTER_SHORTCUTS: 'unregister-shortcuts',
}

module.exports = {
  IPC_CHANNELS,
}