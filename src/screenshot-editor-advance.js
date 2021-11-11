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
  let canvas = null;

  // 绘制类型
  const TYPE = {
    RECT: 1, // 矩形
    ELLIPSE: 2, // 椭圆形
    ARROW: 3, // 箭头
    BRUSH: 4, // 画笔
    TEXT: 5, // 文本
  };
  let drawingType = null;
  // 绘制默认配置
  let drawingConfig = {
    [TYPE.RECT]: {
      rx: 4,
      ry: 4,
      fill: 'transparent',
      stroke: 'red',
      strokeWidth: 2,
      // https://stackoverflow.com/questions/49005241/maintain-strokewidth-while-scaling-in-fabric-js
      strokeUniform: true,
      noScaleCache: false,
      transparentCorners: false,
    },
    [TYPE.ELLIPSE]: {
      fill: 'transparent',
      stroke: 'red',
      strokeWidth: 2,
      // https://stackoverflow.com/questions/49005241/maintain-strokewidth-while-scaling-in-fabric-js
      strokeUniform: true,
      noScaleCache: false,
      transparentCorners: false,
    },
    [TYPE.ARROW]: {
      fill: 'red',
      // 尺寸: sm, md, lg
      size: 'sm',
    },
    [TYPE.BRUSH]: {},
    [TYPE.TEXT]: {},
  }
  
  // 绘制事件相关变量
  let isMouseDown = false;
  let isDrawingCreated = false;
  let originX = 0;
  let originY = 0;

  // 设置/获取绘制类型
  const setType = (type) => {
    drawingType = type
  }
  const getType = () => drawingType

  // 更新绘制相关配置
  const setTypeConfig = (type, config = {}) => {
    // 非箭头, 则设置单个激活对象配置
    if (type !== TYPE.ARROW) {
      canvas.getActiveObject()?.set(config);
    }
    // 箭头, 则分别设置头部, 中线, 尾部配置
    else if (type === TYPE.ARROW) {
      const arrowPart = canvas.getActiveObject();
      if (!arrowPart) {
        return;
      }

      let arrowHead = null;
      let arrowLine = null;
      let arrowTail = null;

      if (!arrowPart.arrowHead) {
        arrowHead = arrowPart;
        arrowLine = arrowPart.arrowLine;
        arrowTail = arrowPart.arrowTail;
      }
      if (!arrowPart.arrowLine) {
        arrowLine = arrowPart;
        arrowHead = arrowPart.arrowHead;
        arrowTail = arrowPart.arrowTail;
      }
      if (!arrowPart.arrowTail) {
        arrowTail = arrowPart;
        arrowHead = arrowPart.arrowHead;
        arrowLine = arrowPart.arrowLine;
      }

      arrowHead.set({
        fill: config.fill,
      });
      arrowLine.set({
        stroke: config.fill,
      });
      arrowTail.set({
        fill: config.fill,
      });
    }
    
    Object.assign(drawingConfig[type], config);
    canvas.renderAll();
  }
  const getTypeConfig = (type) => drawingConfig[type]

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
      // 仅允许选中描边
      // https://github.com/fabricjs/fabric.js/issues/6146
      // https://stackoverflow.com/questions/60143667/fabricjs-selection-only-via-border
      perPixelTargetFind: true,
      // 允许任意比例缩放
      // https://github.com/fabricjs/fabric.js/issues/6134
      uniformScaling: false,
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
    // 更新画布尺寸
    canvas.setWidth(w)
    canvas.setHeight(h)
    canvas.setBackgroundImage(canvasImage)

    // 更新画布位置
    J_SelectionEditorWrapper.style.left = `${x}px`
    J_SelectionEditorWrapper.style.top = `${y}px`
  }

  // 销毁画布
  const destroyCanvas = () => {
    unbindEvents()
  }

  // 清空画布
  const clearCanvas = () => {
    canvas.clear()
    updateCanvas()
  }

  // 获取编辑画布base64图片流
  const getCanvasDataURL = () => {
    return canvas.toDataURL({
      enableRetinaScaling: true
    })
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
      canvas.discardActiveObject(e);
    } else {
      //do nothing
    }
  }

  // 鼠标按下事件
  function onMouseDown(e) {
    console.log('onMouseDown');

    isMouseDown = true;
    
    // 若点击在图形上, 则解绑鼠标移动事件, 避免影响当前图形的默认行为
    if (e.target) {
      canvas.off('mouse:move', onMouseMove);
    }
    // 若点击在空白处, 则绑定鼠标移动事件
    else {
      canvas.on('mouse:move', onMouseMove)
    }

  }

  // 鼠标移动事件
  function onMouseMove(e) {
    console.log('onMouseMove');

    if (!isMouseDown) {
      return;
    }
    
    // 鼠标移动时, 创建绘制对象
    if (!isDrawingCreated) {
      // 初始绘制坐标
      const originPointer = canvas.getPointer(e);
      originX = originPointer.x;
      originY = originPointer.y;
      // 绘制对象
      let obj = null;
      let objAPI = null;
      let objOpts = {};
      // 公共配置
      const commonOpts = {
        originX: 'left',
        originY: 'top',
        left: originX,
        top: originY,
      };
  
      // 绘制矩形
      if (drawingType === TYPE.RECT) {
        objAPI = fabric.Rect;
        objOpts = {
          ...commonOpts,
          ...drawingConfig[TYPE.RECT],
        };
        obj = new objAPI(objOpts);
      }
      // 绘制椭圆形
      else if (drawingType === TYPE.ELLIPSE) {
        objAPI = fabric.Ellipse;
        objOpts = {
          ...commonOpts,
          ...drawingConfig[TYPE.ELLIPSE],
        };
        obj = new objAPI(objOpts);
      }
      // 绘制箭头
      else if (drawingType === TYPE.ARROW) {
        objOpts = {
          ...commonOpts,
          canvas
        }
        obj = new Arrow(objOpts);
        
      }
      
      console.log('objOpts', objOpts);
      // 添加多个形状到画布
      if (Array.isArray(obj)) {
        canvas.add(...obj);
        canvas.setActiveObject(obj[0], e);
      }
      // 添加单个形状到画布
      else {
        canvas.add(obj);
        canvas.setActiveObject(obj, e);
      }
      
      canvas.renderAll();
      isDrawingCreated = true;
    }

    // 获取最新坐标
    const pointer = canvas.getPointer(e);
    // 获取当前激活图形
    const obj = canvas.getActiveObject();
    
    // 更新矩形
    if (drawingType === TYPE.RECT) {
      // 设置矩形左上角坐标
      // 若拖动方向为左上, 则取坐标绝对值, 避免负值
      if (originX > pointer.x) {
        obj.set({ left: Math.abs(pointer.x) });
      }
      if (originY > pointer.y) {
        obj.set({ top: Math.abs(pointer.y) });
      }
      // 设置矩形尺寸
      obj.set({
        width: Math.abs(originX - pointer.x),
        height: Math.abs(originY - pointer.y),
      });
    }
    // 更新椭圆形
    else if (drawingType === TYPE.ELLIPSE) {
      // 设置椭圆形左上角坐标
      // 若拖动方向为左上, 则取坐标绝对值, 避免负值
      if (originX > pointer.x) {
        obj.set({ left: Math.abs(pointer.x) });
      }
      if (originY > pointer.y) {
        obj.set({ top: Math.abs(pointer.y) });
      }
      // 设置椭圆形尺寸
      obj.set({
        rx: Math.abs(originX - pointer.x) / 2,
        ry: Math.abs(originY - pointer.y) / 2,
      });
    }
    // 更新箭头
    else if (drawingType === TYPE.ARROW) {
      const arrowHead = obj;
      const arrowLine = obj.arrowLine;
      const arrowTail = obj.arrowTail;
      
      // 中线端点坐标
      const x1 = originX;
      const y1 = originY;
      const x2 = Math.abs(pointer.x);
      const y2 = Math.abs(pointer.y);

      // 更新箭头头部: 根据中线长度变化
      const headSize = Arrow.updateHeadSize(x1, y1, x2, y2);
      const headAngle = Arrow.updateHeadAngle(x1, y1, x2, y2);
      arrowHead.set({
        top: y2,
        left: x2,
        width: headSize,
        height: headSize,
        angle: headAngle,
      });

      // 更新箭头中线: 根据中线长度变化
      const lineStrokeWidth = Arrow.updateLineStrokeWidth(x1, y1, x2, y2);
      arrowLine.set({
        x2,
        y2,
        strokeWidth: lineStrokeWidth,
      });

      // 更新箭头尾部: 根据中线描边变化
      const tailRadius = Arrow.updateTailRadius(lineStrokeWidth);
      arrowTail.set({
        radius: tailRadius,
      });

      Arrow.fixLayerIndex(arrowHead, arrowLine, arrowTail);
      arrowHead.setCoords();
      arrowLine.setCoords();
      arrowTail.setCoords();
    }
    
    obj.setCoords();
    canvas.renderAll();
  }

  // 鼠标抬起事件
  function onMouseUp(e) {
    console.log('onMouseUp');

    if (!isMouseDown) {
      return;
    }

    // 若为绘制结束阶段, 则释放绘制对象选中状态
    if (isDrawingCreated) {
      canvas.discardActiveObject(e);
    }
    
    isMouseDown = false;
    isDrawingCreated = false;
    
    canvas.isDrawingMode = false;
    canvas.renderAll();
    canvas.off('mouse:move', onMouseMove);
  }

  return {
    TYPE,
    setType,
    getType,
    setTypeConfig,
    getTypeConfig,
    show,
    hide,
    initCanvas,
    updateCanvas,
    destroyCanvas,
    clearCanvas,
    getCanvasDataURL,
  }
}

// 箭头工具
class Arrow {
  // 画布
  canvas = null;

  // 实例
  arrowHead = null;
  arrowLine = null;
  arrowTail = null;

  // 层级
  static arrowHeadIndex = 3;
  static arrowLineIndex = 1;
  static arrowTailIndex = 2;

  // 箭头各部位尺寸最大变化阈值: 中线超出该长度, 则各部位尺寸不再变化
  static resizeThreshold = 100;
  // 箭头头部最大尺寸
  static headMaxSize = 30;
  // 箭头中线最大描边宽度
  static lineMaxStrokeWidth = 10;
  // 箭头尾部圆点最大半径
  static tailMaxRadius = 8;

  constructor(options) {
    const { left, top, canvas } = options;

    this.canvas = canvas;

    // 箭头头部
    this.arrowHead = new fabric.Triangle({
      arrowPart: 'arrowHead',
      left,
      top,
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      angle: 0,
      width: 0,
      height: 0,
      fill: 'green',
    });
    this.arrowHead.on('moving', this.arrowHeadMovingHandler);

    // 箭头中线
    this.arrowLine = new fabric.Line([left, top, left, top], {
      arrowPart: 'arrowLine',
      left,
      top,
      stroke: 'blue',
      strokeWidth: 2,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      lockScalingX: true,
      lockScalingY: true,
    });
    this.arrowLine.on('moving', this.arrowLineMovingHandler);
    this.arrowLine.on('moved', function (e) {
      // 中线移动结束后, 取消激活状态, 使其层级恢复至箭头头部和尾部之下, 避免头部和尾部部分被遮蔽, 影响拖动交互
      canvas.discardActiveObject(e);
      canvas.setActiveObject(this.arrowHead);
    });

    // 箭头尾部
    this.arrowTail = new fabric.Circle({
      arrowPart: 'arrowTail',
      left,
      top,
      radius: 2,
      fill: 'red',
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    this.arrowTail.on('moving', this.arrowTailMovingHandler);
    
    // 创建关联引用
    this.arrowHead.arrowLine = this.arrowLine;
    this.arrowHead.arrowTail = this.arrowTail;
    this.arrowLine.arrowHead = this.arrowHead;
    this.arrowLine.arrowTail = this.arrowTail;
    this.arrowTail.arrowHead = this.arrowHead;
    this.arrowTail.arrowLine = this.arrowLine;

    return [this.arrowHead, this.arrowLine, this.arrowTail];
  }

  // 移动箭头中线
  arrowLineMovingHandler (e) {
    const arrowLine = this;
    const arrowHead = this.arrowHead;
    const arrowTail = this.arrowTail;

    const oldCenterX = (arrowLine.x1 + arrowLine.x2) / 2;
    const oldCenterY = (arrowLine.y1 + arrowLine.y2) / 2;
    const deltaX = arrowLine.left - oldCenterX;
    const deltaY = arrowLine.top - oldCenterY;

    // 更新箭头头部位置
    arrowHead.set({
      left: arrowLine.x2 + deltaX,
      top: arrowLine.y2 + deltaY,
    });

    // 更新箭头尾部位置
    arrowTail.set({
      left: arrowLine.x1 + deltaX,
      top: arrowLine.y1 + deltaY,
    });

    // 更新箭头中线端点坐标
    arrowLine.set({
      x1: arrowLine.x1 + deltaX,
      y1: arrowLine.y1 + deltaY,
      x2: arrowLine.x2 + deltaX,
      y2: arrowLine.y2 + deltaY,
    });
    
    // 更新箭头中点坐标
    const newCenterX = (arrowLine.x1 + arrowLine.x2) / 2;
    const newCenterY = (arrowLine.y1 + arrowLine.y2) / 2;
    arrowLine.set({
      left: newCenterX,
      top: newCenterY,
    });

    Arrow.fixLayerIndex(arrowHead, arrowLine, arrowTail);
    arrowHead.setCoords();
    arrowTail.setCoords();
    this.canvas.renderAll();
  }

  // 移动箭头头部
  arrowHeadMovingHandler (e) {
    const pointer = this.getCenterPoint();
    const arrowHead = this;
    const arrowLine = this.arrowLine;
    const arrowTail = this.arrowTail;

    arrowLine.set({
      x2: pointer.x,
      y2: pointer.y,
    });

    const x1 = arrowLine.get('x1');
    const y1 = arrowLine.get('y1');
    const x2 = arrowLine.get('x2');
    const y2 = arrowLine.get('y2');

    const headSize = Arrow.updateHeadSize(x1, y1, x2, y2);
    const headAngle = Arrow.updateHeadAngle(x1, y1, x2, y2);
    arrowHead.set({
      width: headSize,
      height: headSize,
      angle: headAngle,
    });

    const lineStrokeWidth = Arrow.updateLineStrokeWidth(x1, y1, x2, y2);
    arrowLine.set({
      strokeWidth: lineStrokeWidth,
    });

    const tailRadius = Arrow.updateTailRadius(lineStrokeWidth);
    arrowTail.set({
      radius: tailRadius,
    });

    arrowLine.setCoords();
    arrowTail.setCoords();
    this.canvas.renderAll();
  }

  // 移动箭头尾部
  arrowTailMovingHandler (e) {
    const pointer = this.getCenterPoint();
    const arrowTail = this;
    const arrowLine = this.arrowLine;
    const arrowHead = this.arrowHead;

    arrowLine.set({
      x1: pointer.x,
      y1: pointer.y,
    });

    const x1 = arrowLine.get('x1');
    const y1 = arrowLine.get('y1');
    const x2 = arrowLine.get('x2');
    const y2 = arrowLine.get('y2');

    const headSize = Arrow.updateHeadSize(x1, y1, x2, y2);
    const headAngle = Arrow.updateHeadAngle(x1, y1, x2, y2);
    arrowHead.set({
      width: headSize,
      height: headSize,
      angle: headAngle,
    });

    const lineStrokeWidth = Arrow.updateLineStrokeWidth(x1, y1, x2, y2);
    arrowLine.set({
      strokeWidth: lineStrokeWidth,
    });

    const tailRadius = Arrow.updateTailRadius(lineStrokeWidth);
    arrowTail.set({
      top: pointer.y,
      left: pointer.x,
      radius: tailRadius,
    });

    arrowHead.setCoords();
    arrowLine.setCoords();
    this.canvas.renderAll();
  }

  // 更新箭头头部尺寸
  static updateHeadSize (x1, y1, x2, y2) {
    const arrowLineLength = Math.abs(Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)));
    let headSize = arrowLineLength / 3;
    if (headSize > Arrow.headMaxSize) {
      headSize = Arrow.headMaxSize;
    }
    return headSize;
  }

  // 更新箭头头部角度
  static updateHeadAngle (x1, y1, x2, y2) {
    return Arrow.calcArrowAngle(x1, y1, x2, y2);
  }

  // 更新箭头中线描边宽度
  static updateLineStrokeWidth (x1, y1, x2, y2) {
    const arrowLineLength = Math.abs(Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)));
    let lineStrokeWidth = arrowLineLength / 5;
    if (lineStrokeWidth > Arrow.lineMaxStrokeWidth) {
      lineStrokeWidth = Arrow.lineMaxStrokeWidth
    }
    return lineStrokeWidth;
  }

  // 更新箭头尾部圆点半径
  static updateTailRadius (lineStrokeWidth = 0) {
    let tailRadius = lineStrokeWidth / 1.2
    if (tailRadius > Arrow.tailMaxRadius) {
      tailRadius = Arrow.tailMaxRadius
    }
    return tailRadius;
  }

  // 计算箭头头部与线段角度
  static calcArrowAngle(x1, y1, x2, y2) {
    let angle = 0;
    let x, y;
  
    x = (x2 - x1);
    y = (y2 - y1);
  
    if (x === 0) {
      angle = (y === 0) ? 0 : (y > 0) ? Math.PI / 2 : Math.PI * 3 / 2;
    } 
    else if (y === 0) {
      angle = (x > 0) ? 0 : Math.PI;
    } 
    else {
      angle = (x < 0) ? Math.atan(y / x) + Math.PI : (y < 0) ? Math.atan(y / x) + (2 * Math.PI) : Math.atan(y / x);
    }
  
    return (angle * 180 / Math.PI) + 90;
  }

  // 固定形状层级
  static fixLayerIndex (arrowHead, arrowLine, arrowTail) {
    arrowHead.moveTo(Arrow.arrowHeadIndex);
    arrowLine.moveTo(Arrow.arrowLineIndex);
    arrowTail.moveTo(Arrow.arrowTailIndex);
  }
}

module.exports = captureEditorAdvance