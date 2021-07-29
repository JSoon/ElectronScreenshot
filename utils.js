const electron = require('electron')

// 当前屏幕
exports.getCurrentScreen = (currentWindow) => {
    let { x, y } = currentWindow.getBounds()
    return electron.screen.getAllDisplays().filter(d => d.bounds.x === x && d.bounds.y === y)[0]
}

// 鼠标是否在当前窗口
exports.isCursorInCurrentWindow = (currentWindow) => {
    let { x, y } = electron.screen.getCursorScreenPoint()
    let {
        x: winX, y: winY, width, height,
    } = currentWindow.getBounds()
    return x >= winX && x <= winX + width && y >= winY && y <= winY + height
}