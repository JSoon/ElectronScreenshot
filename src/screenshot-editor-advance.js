/**
 * 截屏高级编辑器: 绘制形状/文字/画笔等等
 */
const fabric = require("fabric").fabric

// 截屏底图
const J_Background = document.querySelector('#J_Background')
// 选区画布: 固定绘制区域, 当且仅当选择绘制工具后出现, 同时销毁初始画布
const J_SelectionEditorWrapper = document.querySelector('#J_SelectionEditorWrapper')
const J_SelectionEditor = document.querySelector('#J_SelectionEditor')

// 高级编辑器模块函数
const captureEditorAdvance = ({
  // 屏幕缩放比
  scaleFactor, 
  // 原始选区截屏实例对象
  capture 
} = {}) => {
  // 画布实例
  let canvas = null
  // 选区编辑画布变量对象
  const TYPE = {
    RECT: 1, // 矩形
    CIRCLE: 2, // 圆形
    ARROW: 3, // 箭头
    BRUSH: 4, // 画笔
    TEXT: 5, // 文本
  }
  let drawingType = null
  let drawingObj = null

  let isMouseDown = false
  let originX = 0
  let originY = 0

  // 设置/获取绘制类型
  const setType = (type) => {
    drawingType = type
  }
  const getType = (type) => drawingType

  // 显示/隐藏画布
  const show = () => {
    capture.disable()
    J_SelectionEditorWrapper.style.display = 'block'
  }
  const hide = () => {
    capture.enable()
    J_SelectionEditorWrapper.style.display = 'none'
  }

  // 创建编辑画布
  const initCanvas = () => {
    // 创建编辑画布
    const {
      w = 0, h = 0,
    } = capture.selectRect || {}
    
    // 选区编辑画布背景图
    const canvasImage = new fabric.Image(J_Background)
    // 选区编辑画布
    const fabricCanvas = new fabric.Canvas(J_SelectionEditor, {
      width: w,
      height: h,
      backgroundImage: canvasImage,
      enableRetinaScaling: true,
    });

    // 更新画布
    canvas = fabricCanvas

    // 绑定画布事件
    bindEvents()
  }

  // 更新编辑画布
  const updateCanvas = () => {
    const {
      w, h, x, y, r, b,
    } = capture.selectRect

    const canvasImage = new fabric.Image(J_Background, {
      cropX: x * scaleFactor,
      cropY: y * scaleFactor,
      width: w * scaleFactor,
      height: h * scaleFactor,
      scaleX: 1 / scaleFactor,
      scaleY: 1 / scaleFactor,
    })
    console.log('capture.selectRect', capture.selectRect);
    // 更新画布尺寸
    canvas.setWidth(w)
    canvas.setHeight(h)
    canvas.setBackgroundImage(canvasImage)

    // 更新画布位置
    J_SelectionEditorWrapper.style.left = `${x}px`
    J_SelectionEditorWrapper.style.top = `${y}px`
  }

  const destroyCanvas = () => {
    unbindEvents()
  }

  // 获取编辑画布base64图片流
  const getCanvasDataURL = () => {
    return canvas.toDataURL()
  }
  
  // 事件绑定
  function bindEvents () {
    canvas.on('selection:created', onSelectionCreated)
    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)
  }

  // 事件解绑
  function unbindEvents () {
    canvas.off('selection:created', onSelectionCreated)
    canvas.off('mouse:down', onMouseDown)
    canvas.off('mouse:move', onMouseMove)
    canvas.off('mouse:up', onMouseUp)
  }

  // 选区创建事件
  function onSelectionCreated (e) {
    // 禁用分组
    // https://stackoverflow.com/a/67278176/2630689
    if(e.target.type === 'activeSelection') {
      canvas.discardActiveObject();
    } else {
      //do nothing
    }
  }

  // 鼠标按下事件
  function onMouseDown(e) {
    console.log('onMouseDown');

    isMouseDown = true;
    
    // 若点击的是图形, 则解绑鼠标移动事件, 避免影响当前图形的默认行为
    if (e.target) {
      canvas.off('mouse:move', onMouseMove);
    }
    // 若点击在空白处, 则绘制图形
    else {
      const originPointer = canvas.getPointer(e);
      originX = originPointer.x;
      originY = originPointer.y;
      const pointer = canvas.getPointer(e);
  
      // 绘制矩形
      if (drawingType === TYPE.RECT) {
        drawingObj = new fabric.Rect({
            left: originX,
            top: originY,
            originX: 'left',
            originY: 'top',
            width: pointer.x - originX,
            height: pointer.y - originY,
            angle: 0,
            rx: 4,
            ry: 4,
            fill: 'transparent',
            stroke: 'red',
            strokeWidth: 4,
            strokeUniform: true,
            // https://stackoverflow.com/questions/49005241/maintain-strokewidth-while-scaling-in-fabric-js
            noScaleCache: false,
            transparentCorners: false,
        });
      }
      
      canvas.add(drawingObj);
      // canvas.getObjects().forEach(obj => {
      //   if (obj !== drawingObj) {
      //     console.log('旧图形禁止选中', obj);
      //     obj.set({ selectable: false });
      //     obj.setCoords();
      //   }
      // });
      canvas.renderAll();
  
      canvas.on('mouse:move', onMouseMove)
    }

  }

  // 鼠标移动事件
  function onMouseMove(e) {
    if (!isMouseDown) {
      return;
    }
    console.log('onMouseMove');

    const pointer = canvas.getPointer(e);
    
    // 设置图形位置
    // 若拖动方向为左上, 则取坐标绝对值, 避免负值
    if(originX > pointer.x) {
        drawingObj.set({ left: Math.abs(pointer.x) });
    }
    if(originY > pointer.y) {
        drawingObj.set({ top: Math.abs(pointer.y) });
    }

    // 设置图形尺寸
    drawingObj.set({ 
      width: Math.abs(originX - pointer.x),
      height: Math.abs(originY - pointer.y)
    });
    
    canvas.renderAll();
  }

  // 鼠标抬起事件
  function onMouseUp(e) {
    if (!isMouseDown) {
      return;
    }
    console.log('onMouseUp');
    canvas.off('mouse:move', onMouseMove);

    isMouseDown = false;
    canvas.isDrawingMode = false;
    // canvas.getObjects().forEach(obj => {
    //   console.log('所有图形恢复选中', obj);
    //   obj.set({ selectable: true });
    //   obj.setCoords();
    // });

    canvas.renderAll();
  }

  return {
    TYPE,
    setType,
    getType,
    show,
    hide,
    initCanvas,
    updateCanvas,
    getCanvasDataURL,
    destroyCanvas
  }
}

module.exports = captureEditorAdvance