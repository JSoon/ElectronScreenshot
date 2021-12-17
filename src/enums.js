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
};

// 形状对象类型
const SHAPE_TYPE = {
  BACKGROUND_MOSAIC: 0, // 马赛克背景图
  BACKGROUND_NORMAL: 1, // 正常背景图
  RECT: 2, // 矩形
  ELLIPSE: 3, // 椭圆形
  ARROW: 4, // 箭头
  BRUSH: 5, // 画笔
  MOSAIC: 6, // 马赛克
  TEXT: 7, // 文本
};

// 形状对象类型键名称: { RECT: 'RECT', ... }
const SHAPE_TYPE_KEY_NAME = {};
Object.keys(SHAPE_TYPE).forEach(k => SHAPE_TYPE_KEY_NAME[k] = k);


module.exports = {
  IPC_CHANNELS,
  SHAPE_TYPE,
  SHAPE_TYPE_KEY_NAME,
};