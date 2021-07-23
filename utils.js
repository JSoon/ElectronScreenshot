const { remote } = require('electron')

let currentWindow = remote.getCurrentWindow()

exports.getCurrentScreen = () => {
    let { x, y } = currentWindow.getBounds()
    return remote.screen.getAllDisplays().filter(d => d.bounds.x === x && d.bounds.y === y)[0]
}

exports.isCursorInCurrentWindow = () => {
    let { x, y } = remote.screen.getCursorScreenPoint()
    let {
        x: winX, y: winY, width, height,
    } = currentWindow.getBounds()
    return x >= winX && x <= winX + width && y >= winY && y <= winY + height
}