/**
 * 截屏编辑器
 * 
 * 参考文章
 * @see {@link https://juejin.cn/post/6844903687706378247} 从零开始用 electron 手撸一个截屏工具
 * @see {@link https://juejin.cn/post/6844903697705598983} Electron 截图踩坑和优化集合
 * @see {@link https://juejin.cn/post/6982124234180919327} 基于 Electron 实现屏幕取色和截屏
 * @see {@link https://zhuanlan.zhihu.com/p/121075555} 使用vue+electron实现一个桌面截图工具
 */

const Event = require('events')

const CREATE_RECT = 1
const MOVING_RECT = 2
const RESIZE = 3

const ANCHORS = [
  { row: 'x', col: 'y', cursor: 'nwse-resize' },
  { row: '', col: 'y', cursor: 'ns-resize' },
  { row: 'r', col: 'y', cursor: 'nesw-resize' },

  { row: 'x', col: '', cursor: 'ew-resize' },
  { row: 'r', col: '', cursor: 'ew-resize' },

  { row: 'x', col: 'b', cursor: 'nesw-resize' },
  { row: '', col: 'b', cursor: 'ns-resize' },
  { row: 'r', col: 'b', cursor: 'nwse-resize' },
]

const EDITOR_EVENTS = {
  // 选区拖拽开始
  DRAGGING_START: 'start-dragging',
  // 选区拖拽中
  DRAGGING: 'dragging',
  // 选区拖拽结束
  DRAGGING_END: 'end-dragging',
  // 鼠标移动中
  MOVING: 'moving',
  // 鼠标移动结束
  MOVING_END: 'end-moving',
  // 鼠标松开
  MOUSE_UP: 'mouse-up',
  // 选区重置
  RESET: 'reset'
}

class ScreenshotEditor extends Event {

  constructor(currentScreen, $canvas, $bg, imageSrc) {
    super()
    this.$canvas = $canvas
    this.imageSrc = imageSrc
    this.disabled = false
    // 显示器像素缩放比例, 例如: 普通屏幕为1, 视网膜屏幕为2
    this.scaleFactor = currentScreen.scaleFactor
    this.screenWidth = currentScreen.bounds.width
    this.screenHeight = currentScreen.bounds.height
    this.$bg = $bg
    // 截屏整图ctx
    this.bgCtx = null
    // 截屏选区ctx
    this.ctx = $canvas.getContext('2d')

    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)

    this.init().then(() => {
      console.log('init')
    })
  }

  async init() {
    this.$bg.setAttribute('src', this.imageSrc)
    this.$bg.setAttribute('width', this.screenWidth)
    this.$bg.setAttribute('height', this.screenHeight)
    let canvas = document.createElement('canvas')
    let ctx = canvas.getContext('2d')
    let img = await new Promise((resolve) => {
      let img = new Image()
      img.src = this.imageSrc
      if (img.complete) {
        resolve(img)
      } else {
        img.onload = () => resolve(img)
      }
    })

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    this.bgCtx = ctx

    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  onMouseDown(e) {
    if (this.disabled) {
      return
    }
    this.mouseDown = true
    const { pageX, pageY } = e
    // 若选区存在
    if (this.selectRect) {
      const {
        w, h, x, y, r, b,
      } = this.selectRect
      // 若点击的是选区锚点, 则为选区大小调整操作
      if (this.selectAnchorIndex !== -1) {
        this.startPoint = {
          x: pageX,
          y: pageY,
          moved: false,
          selectRect: {
            w, h, x, y, r, b,
          },
          rawRect: {
            w, h, x, y, r, b,
          },
        }
        this.action = RESIZE
        return
      }
      this.startPoint = {
        x: e.pageX,
        y: e.pageY,
        moved: false,
      }
      // 若点击的是选区内部, 则为选区移动操作
      if (pageX > x && pageX < r && pageY > y && pageY < b) {
        this.action = MOVING_RECT
        this.startDragRect = {
          x: pageX,
          y: pageY,
          selectRect: {
            x, y, w, h, r, b,
          },
        }
      } 
      // 否则, 为选区创建操作
      else {
        this.action = CREATE_RECT
      }
    } 
    // 若选区不存在, 则为选区创建操作
    else {
      this.action = CREATE_RECT
      this.startPoint = {
        x: e.pageX,
        y: e.pageY,
        moved: false,
      }
      e.stopPropagation()
      e.preventDefault()
    }
  }

  onMouseDrag(e) {
    if (this.disabled) {
      return
    }
    e.stopPropagation()
    e.preventDefault()

    const { pageX, pageY } = e
    let startDragging
    let selectRect = this.selectRect
    // 初始化选区拖拽开始标识
    if (!this.startPoint.moved) {
      if (Math.abs(this.startPoint.x - pageX) > 10 || Math.abs(this.startPoint.y - pageY) > 10) {
        this.startPoint.moved = true
        startDragging = true
      }
    }
    if (!this.startPoint.moved) {
      return
    }

    // 选区移动
    if (this.action === MOVING_RECT) {
      if (startDragging) {
        this.emit(EDITOR_EVENTS.DRAGGING_START, selectRect)
      }
      this.emit(EDITOR_EVENTS.DRAGGING, selectRect)
      const { w, h } = selectRect
      const { x: startX, y: startY } = this.startPoint
      let newX = this.startDragRect.selectRect.x + pageX - startX
      let newY = this.startDragRect.selectRect.y + pageY - startY
      let newR = newX + w
      let newB = newY + h
      if (newX < 0) {
        newX = 0
        newR = w
      } else if (newR > this.screenWidth) {
        newR = this.screenWidth
        newX = newR - w
      }
      if (newY < 0) {
        newY = 0
        newB = h
      } else if (newB > this.screenHeight) {
        newB = this.screenHeight
        newY = newB - h
      }
      this.selectRect = {
        w,
        h,
        x: newX,
        y: newY,
        r: newR,
        b: newB,
      }
      this.drawRect()
    } 
    // 选区大小调整
    else if (this.action === RESIZE) {
      this.emit(EDITOR_EVENTS.DRAGGING, selectRect)
      
      let { row, col } = ANCHORS[this.selectAnchorIndex]
      if (row) {
        this.startPoint.rawRect[row] = this.startPoint.selectRect[row] + pageX - this.startPoint.x
        selectRect.x = this.startPoint.rawRect.x
        selectRect.r = this.startPoint.rawRect.r
        if (selectRect.x > selectRect.r) {
          let x = selectRect.r
          selectRect.r = selectRect.x
          selectRect.x = x
        }
        selectRect.w = selectRect.r - selectRect.x
        this.startPoint.rawRect.w = selectRect.w
      }
      if (col) {
        this.startPoint.rawRect[col] = this.startPoint.selectRect[col] + pageY - this.startPoint.y
        selectRect.y = this.startPoint.rawRect.y
        selectRect.b = this.startPoint.rawRect.b

        if (selectRect.y > selectRect.b) {
          let y = selectRect.b
          selectRect.b = selectRect.y
          selectRect.y = y
        }
        selectRect.h = selectRect.b - selectRect.y
        this.startPoint.rawRect.h = selectRect.h
      }
      this.drawRect()
    } 
    // 选区创建
    else {
      const { pageX, pageY } = e
      let x // 选区相对于整个文档的X坐标
      let y // 选区相对于整个文档的Y坐标
      let w // 选区宽度
      let h // 选区高度
      let r // 选区右边距离整个文档左边的偏移
      let b // 选区底部距离整个文档顶部的偏移

      // 始终将选区固定在开始坐标所在的屏幕范围
      if (this.startPoint.x > pageX) {
        x = pageX
        r = this.startPoint.x
      } 
      else {
        r = pageX
        x = this.startPoint.x
      }
      if (this.startPoint.y > pageY) {
        y = pageY
        b = this.startPoint.y
      } 
      else {
        b = pageY
        y = this.startPoint.y
      }

      w = r - x
      h = b - y

      this.selectRect = {
        x, y, w, h, r, b,
      }
      selectRect = this.selectRect
      if (startDragging) {
        this.emit(EDITOR_EVENTS.DRAGGING_START, selectRect)
      }
      this.emit(EDITOR_EVENTS.DRAGGING, selectRect)
      this.drawRect(x, y, w, h)
    }


  }

  drawRect() {
    if (this.disabled) {
      return
    }
    if (!this.selectRect) {
      this.$canvas.style.display = 'none'
      return
    }
    const {
      x, y, w, h,
    } = this.selectRect

    const scaleFactor = this.scaleFactor
    // 选区锚点半径
    let radius = 3
    let lineWidth = 1
    // 选区距锚点边距, 以保证锚点显示完全
    let margin = radius + lineWidth
    this.$canvas.style.left = `${x - margin}px`
    this.$canvas.style.top = `${y - margin}px`
    this.$canvas.style.width = `${w + margin * 2}px`
    this.$canvas.style.height = `${h + margin * 2}px`
    this.$canvas.style.display = 'block'
    this.$canvas.width = (w + margin * 2) * scaleFactor
    this.$canvas.height = (h + margin * 2) * scaleFactor

    if (w && h) {
      let imageData = this.bgCtx.getImageData(x * scaleFactor, y * scaleFactor, w * scaleFactor, h * scaleFactor)
      this.ctx.putImageData(imageData, margin * scaleFactor, margin * scaleFactor)
    }
    this.ctx.fillStyle = '#ffffff'
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = lineWidth * this.scaleFactor

    this.ctx.strokeRect(margin * scaleFactor, margin * scaleFactor, w * scaleFactor, h * scaleFactor)
    this.drawAnchors(w, h, margin, scaleFactor, radius)
  }

  drawAnchors(w, h, margin, scaleFactor, radius) {
    if (this.disabled) {
      return
    }
    if (this.mouseDown && this.action === CREATE_RECT) {
      this.anchors = null
      return
    }
    this.ctx.beginPath()
    let anchors = [
      [0, 0],
      [w * this.scaleFactor / 2, 0],
      [w * this.scaleFactor, 0],

      [0, h * this.scaleFactor / 2],
      [w * this.scaleFactor, h * this.scaleFactor / 2],

      [0, h * this.scaleFactor],
      [w * this.scaleFactor / 2, h * this.scaleFactor],
      [w * this.scaleFactor, h * this.scaleFactor],
    ]
    this.anchors = anchors.map(([x, y]) => [this.selectRect.x + x / scaleFactor, this.selectRect.y + y / scaleFactor])
    anchors.forEach(([x, y], i) => {
      this.ctx.arc(x + margin * scaleFactor, y + margin * scaleFactor, radius * scaleFactor, 0, 2 * Math.PI)
      let next = anchors[(i + 1) % anchors.length]
      this.ctx.moveTo(next[0] + margin * scaleFactor + radius * scaleFactor, next[1] + margin * scaleFactor)
    })
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()
  }

  onMouseMove(e) {
    if (this.disabled) {
      return
    }
    if (this.mouseDown) {
      this.onMouseDrag(e)
      return
    }
    this.selectAnchorIndex = -1
    if (this.selectRect) {
      const { pageX, pageY } = e
      const {
        x, y, r, b,
      } = this.selectRect
      let selectAnchor, selectIndex = -1
      if (this.anchors) {
        this.anchors.forEach(([x, y], i) => {
          if (Math.abs(pageX - x) <= 10 && Math.abs(pageY - y) <= 10) {
            selectAnchor = [x, y]
            selectIndex = i
          }
        })
      }
      if (selectAnchor) {
        this.selectAnchorIndex = selectIndex
        document.body.style.cursor = ANCHORS[selectIndex].cursor
        this.emit(EDITOR_EVENTS.MOVING)
        return
      }
      if (pageX > x && pageX < r && pageY > y && pageY < b) {
        document.body.style.cursor = 'move'
      } else {
        document.body.style.cursor = 'auto'
      }
      this.emit(EDITOR_EVENTS.MOVING)
    }
  }

  onMouseUp(e) {
    if (this.disabled) {
      return
    }
    if (!this.mouseDown) {
      return
    }
    this.mouseDown = false
    e.stopPropagation()
    e.preventDefault()

    this.emit(EDITOR_EVENTS.MOUSE_UP)
    
    // 若鼠标没移动, 则说明未拖动创建选区, 则绘制全屏选区
    if (!this.startPoint.moved) {
      // this.emit(EDITOR_EVENTS.MOVING_END)
      // 设置全屏选区
      if (!this.selectRect) {
        this.selectRect = {
          w: this.screenWidth,
          h: this.screenHeight,
          x: 0,
          y: 0,
          r: this.screenWidth,
          b: this.screenHeight
        }
      }
    }

    this.emit(EDITOR_EVENTS.DRAGGING_END)
    this.drawRect()
    this.startPoint = null
  }

  getImageUrl() {
    const scaleFactor = this.scaleFactor
    const {
      x, y, w, h,
    } = this.selectRect
    
    if (w && h) {
      let imageData = this.bgCtx.getImageData(x * scaleFactor, y * scaleFactor, w * scaleFactor, h * scaleFactor)
      let canvas = document.createElement('canvas')
      canvas.width = w * scaleFactor
      canvas.height = h * scaleFactor
      let ctx = canvas.getContext('2d')
      ctx.putImageData(imageData, 0, 0)
      return canvas.toDataURL()
    }
    return ''
  }

  disable() {
    this.disabled = true
  }

  enable() {
    this.disabled = false
  }

  reset() {
    this.disabled = false
    this.anchors = null
    this.startPoint = null
    this.selectRect = null
    this.startDragRect = null
    this.selectAnchorIndex = -1
    this.drawRect()
    this.emit(EDITOR_EVENTS.RESET)
  }
}

module.exports = {
  ScreenshotEditor,
  EDITOR_EVENTS,
  CREATE_RECT,
  MOVING_RECT,
  RESIZE
}
