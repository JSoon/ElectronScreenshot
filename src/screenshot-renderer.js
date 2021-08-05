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

  // // 显示器像素缩放比例, 例如: 普通屏幕为1, 视网膜屏幕为2
  // const scaleFactor = currentScreen.scaleFactor
  // // 显示器宽度
  // const screenWidth = currentScreen.bounds.width
  // // 显示器高度
  // const screenHeight = currentScreen.bounds.height

  // console.log('scaleFactor', scaleFactor);

  // J_Background.style.backgroundImage = `url(${imgSrc})`
  // J_Background.style.backgroundSize = `${screenWidth}px ${screenHeight}px`


  const capture = new ScreenshotEditor(currentScreen, J_SelectionCanvas, J_Background, imgSrc)

  //#region 拖动鼠标, 显示选区信息
  const onDrag = (selectRect) => {
    J_SelectionToolbar.style.display = 'none'
    J_SelectionInfo.style.display = 'block'
    J_SelectionInfo.innerText = `${selectRect.w} * ${selectRect.h}`
    if (selectRect.y > 35) {
      J_SelectionInfo.style.top = `${selectRect.y - 30}px`
    } else {
      J_SelectionInfo.style.top = `${selectRect.y + 10}px`
    }
    J_SelectionInfo.style.left = `${selectRect.x}px`
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
      J_SelectionToolbar.style.display = 'flex'
      J_SelectionToolbar.style.top = `${b + 15}px`
      J_SelectionToolbar.style.right = `${window.screen.width - r}px`
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
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT, {
      type: IPC_CHANNELS.SCREENSHOT_CANCEL
    })
    window.close()
  })

  // 4. 复制到剪切板
  J_SelectionConfirm.addEventListener('click', e => {
    selectionCapture()
  })
  //#endregion

})
