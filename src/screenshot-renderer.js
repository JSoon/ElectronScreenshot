/**
 * 截屏渲染进程
 */
const path = require('path')
const { ipcRenderer, clipboard, nativeImage } = require('electron')
const { IPC_CHANNELS } = require('./enums')
const { getScreenshot } = require('./desktop-capturer')
const { ScreenshotEditor, EDITOR_EVENTS } = require('./screenshot-editor')

// 截屏音
const audio = new Audio()
audio.src = path.join(__dirname, 'assets/audio/screenshot.mp3')
// 截屏底图
const J_Background = document.querySelector('#J_Background')
// 选区画布
const J_SelectionCanvas = document.querySelector('#J_SelectionCanvas')
// 选区信息
const J_SelectionInfo = document.querySelector('#J_SelectionInfo')
// 选区工具条
const J_SelectionToolbar = document.querySelector('#J_SelectionToolbar')
const J_SelectionReset = document.querySelector('#J_SelectionReset')
const J_SelectionDownload = document.querySelector('#J_SelectionDownload')
const J_SelectionCancel = document.querySelector('#J_SelectionCancel')
const J_SelectionConfirm = document.querySelector('#J_SelectionConfirm')
// 鼠标处信息
const J_CursorInfo = document.querySelector('#J_CursorInfo')
const J_CursorCoords = document.querySelector('#J_CursorCoords')
const J_CursorColor = document.querySelector('#J_CursorColor')

// 右键取消截屏
document.body.addEventListener('mousedown', e => {
  if (e.button === 2) {
    window.close()
  }
}, true)

// 截屏
getScreenshot(async (imgSrc) => {
  // console.log(imgSrc);
  const currentScreen = await ipcRenderer.invoke(IPC_CHANNELS.GET_CURRENT_SCREEN)
  const scaleFactor = currentScreen.scaleFactor

  // 创建截屏编辑器
  const capture = new ScreenshotEditor(currentScreen, J_SelectionCanvas, J_Background, imgSrc)
  
  //#region 移动鼠标, 显示鼠标处信息
  // 取色器
  const onColorPickHandler = e => {
    const { clientX, clientY } = e
    const imageData = capture.bgCtx?.getImageData(
      clientX * scaleFactor, 
      clientY * scaleFactor, 
      1 * scaleFactor , 
      1 * scaleFactor
    )

    if (!imageData) {
      return
    }

    const [r, g, b, a] = imageData.data

    // 设置样式
    const offset = 20
    let top = clientY - J_CursorInfo.clientHeight - offset
    let left = clientX - J_CursorInfo.clientWidth - offset
    if (top < 0) {
      top = J_CursorInfo.clientHeight
    }
    if (left < 0) {
      left = J_CursorInfo.clientWidth
    }
    J_CursorInfo.style.display = 'block'
    J_CursorInfo.style.top = `${top}px`
    J_CursorInfo.style.left = `${left}px`
    
    // 设置当前坐标
    J_CursorCoords.innerHTML = `坐标: (${clientX}, ${clientY})`
    // 设置当前颜色
    J_CursorColor.innerHTML = `RGB: ${rgbToHex(r, g, b)}`
  }

  // 放大镜
  const onManify = e => {
    const { clientX, clientY } = e
    const imageData = capture.bgCtx?.getImageData(
      clientX * scaleFactor - J_CursorInfo.clientWidth / 2,
      clientY * scaleFactor - J_CursorInfo.clientHeight / 2,
      J_CursorInfo.clientWidth * scaleFactor,
      J_CursorInfo.clientHeight * scaleFactor
    )
    if (!imageData) {
      return
    }
    let canvas = document.createElement('canvas')
    canvas.width = J_CursorInfo.clientWidth * scaleFactor
    canvas.height = J_CursorInfo.clientHeight * scaleFactor
    let ctx = canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)
    J_CursorInfo.style.background = `url(${canvas.toDataURL()}) 0 0 transparent no-repeat`
  }

  // 鼠标处信息
  const onCursorInfoHandler = e => {
    onColorPickHandler(e)
    onManify(e)
  }

  // 事件绑定/解绑
  const bindCursorInfoHandler = () => {
    document.body.addEventListener('mousemove', onCursorInfoHandler)
  }
  const unbindCursorInfoHandler = () => {
    J_CursorInfo.style.display = 'none'
    document.body.removeEventListener('mousemove', onCursorInfoHandler)
  }
  bindCursorInfoHandler()
  //#endregion

  //#region 拖动鼠标, 显示选区信息
  const onDrag = (selectRect) => {
    unbindCursorInfoHandler()
    const offsetY = 10
    J_SelectionToolbar.style.display = 'none'
    J_SelectionInfo.style.display = 'block'
    // 设置选区信息位置
    const { width: screenWidth } = window.screen
    J_SelectionInfo.innerText = `${selectRect.w} * ${selectRect.h}`
    J_SelectionInfo.style.left = `${selectRect.x}px`
    if (screenWidth - selectRect.r < J_SelectionInfo.clientWidth) {
      J_SelectionInfo.style.left = `${screenWidth - J_SelectionInfo.clientWidth}px`
    }
    J_SelectionInfo.style.top = `${selectRect.y + offsetY}px`
    if (selectRect.y > J_SelectionInfo.clientHeight + offsetY) {
      J_SelectionInfo.style.top = `${selectRect.y - J_SelectionInfo.clientHeight - offsetY}px`
    }
  }

  const onDragEnd = () => {
    if (capture.selectRect) {
      ipcRenderer.send(IPC_CHANNELS.SCREENSHOT, {
        type: IPC_CHANNELS.SCREENSHOT_SELECT,
        screenId: currentScreen.id,
      })
      const {
        r, b,
      } = capture.selectRect
      const offsetY = 10
      J_SelectionToolbar.style.display = 'flex'
      // 设置工具条位置
      const tWidth = J_SelectionToolbar.clientWidth
      const tHeight = J_SelectionToolbar.clientHeight
      const { width: screenWidth, height: screenHeight } = window.screen
      // x轴
      J_SelectionToolbar.style.right = `${screenWidth - r}px`
      if (J_SelectionToolbar.offsetLeft < 0) {
        J_SelectionToolbar.style.right = `${screenWidth - tWidth}px`
      }
      // y轴
      J_SelectionToolbar.style.top = `${b + offsetY}px`
      if (screenHeight - b < tHeight + offsetY) {
        J_SelectionToolbar.style.top = `${b - tHeight - offsetY}px`
      }
    }
  }

  capture.on(EDITOR_EVENTS.DRAGGING_START, onDrag)
  capture.on(EDITOR_EVENTS.DRAGGING, onDrag)
  capture.on(EDITOR_EVENTS.DRAGGING_END, onDragEnd)
  //#endregion

  // 截屏选区选择, 若不是当前屏幕, 则禁止操作
  ipcRenderer.on(IPC_CHANNELS.SCREENSHOT, (e, { type, screenId }) => {
    if (type === IPC_CHANNELS.SCREENSHOT_SELECT) {
      if (screenId && screenId !== currentScreen.id) {
        capture.disable()
      }
    }
  })

  // 选区重置
  capture.on(EDITOR_EVENTS.RESET, e => {
    bindCursorInfoHandler()
    // 隐藏选区相关信息
    J_SelectionInfo.style.display = 'none'
    J_SelectionToolbar.style.display = 'none'
  })

  // 选区截屏
  const selectionCapture = () => {
    if (!capture.selectRect) {
      return
    }
    let url = capture.getImageUrl()
    // 1. 隐藏截屏窗口
    ipcRenderer.send(IPC_CHANNELS.HIDE_CURRENT_WINDOW)

    // 2. 播放截屏音
    audio.play()
    audio.onended = () => {
      // 3. 截屏音播放完成后, 再关闭截屏窗口
      window.close()
    }
    // 4. 写入图片到剪切板
    clipboard.writeImage(nativeImage.createFromDataURL(url))
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT, {
      type: IPC_CHANNELS.SCREENSHOT_COMPLETE,
      screenId: currentScreen.id,
      data,
    })
  }

  // 双击选区, 保存截屏到剪切板
  J_SelectionCanvas.addEventListener('dblclick', e => {
    selectionCapture()
  })

  // 点击回车, 保存截屏到剪切板
  window.addEventListener('keypress', e => {
    if (e.code === 'Enter') {
      selectionCapture()
    }
  })

  //#region 截屏工具条
  // 1. 选区重置
  J_SelectionReset.addEventListener('click', e => {
    capture.reset()
  })

  // 2. 截屏下载
  J_SelectionDownload.addEventListener('click', async e => {
    let dataURL = capture.getImageUrl() // base64 image

    // 保存截屏图片
    ipcRenderer.send(IPC_CHANNELS.SAVE_SCREENSHOT_FILE, dataURL)
  })

  // 3. 截屏取消
  J_SelectionCancel.addEventListener('click', e => {
    window.close()
  })

  // 4. 复制到剪切板
  J_SelectionConfirm.addEventListener('click', e => {
    selectionCapture()
  })
  //#endregion

})

//#region rgb to hex
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
//#endregion