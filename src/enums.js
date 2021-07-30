// 事件频道
const IPC_CHANNELS = {
  // 截屏
  SCREENSHOT: 'screenshot',
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