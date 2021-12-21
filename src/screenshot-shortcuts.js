/**
 * 全局快捷键注册
 */

 module.exports = function registerShortcuts () {
  document.addEventListener('keydown', e => {
    // ESC 键退出截屏
    if (e.code === 'Escape') {
      window.close();
    }
  });
};