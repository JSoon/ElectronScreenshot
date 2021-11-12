/**
 * 截屏高级编辑器: 绘制形状/文字/画笔等等
 */
const fabric = require("fabric").fabric;
const Arrow = require('./components/arrow');

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
      color: 'red',
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
    // 若非箭头工具, 则设置单个激活对象配置
    if (type !== TYPE.ARROW) {
      canvas.getActiveObject()?.set(config);
    }
    // 若是箭头工具, 则分别设置头部, 中线, 尾部配置
    else if (type === TYPE.ARROW) {
      const arrowPart = canvas.getActiveObject();
      // 若存在选中箭头, 则更新箭头配置
      if (arrowPart) {
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
        
        const arrowConfig = getTypeConfig(TYPE.ARROW);
        const { 
          size = arrowConfig.size, 
          color = arrowConfig.color,
        } = config;
        const arrowHeadSize = Arrow.updateHeadSize({ 
          arrowLine,
          size,
        });
        const arrowLineSize = Arrow.updateLineStrokeWidth({
          arrowLine,
          size,
        });
        const arrowTailSize = Arrow.updateTailRadius(arrowLineSize, size);
        
        arrowHead.set({
          fill: color,
          width: arrowHeadSize,
          height: arrowHeadSize,
        });
        arrowLine.set({
          stroke: color,
          strokeWidth: arrowLineSize,
        });
        arrowTail.set({
          fill: color,
          radius: arrowTailSize,
        });
      }
    }
    
    // 更新默认配置
    Object.assign(drawingConfig[type], config);

    console.log('更新默认配置', drawingConfig[type]);
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
        canvas.add(obj);
        canvas.setActiveObject(obj, e);
      }
      // 绘制椭圆形
      else if (drawingType === TYPE.ELLIPSE) {
        objAPI = fabric.Ellipse;
        objOpts = {
          ...commonOpts,
          ...drawingConfig[TYPE.ELLIPSE],
        };
        obj = new objAPI(objOpts);
        canvas.add(obj);
        canvas.setActiveObject(obj, e);
      }
      // 绘制箭头
      else if (drawingType === TYPE.ARROW) {
        objOpts = {
          ...commonOpts,
          canvas,
          config: drawingConfig[TYPE.ARROW],
        }
        obj = new Arrow(objOpts);
        canvas.add(obj.arrowLine, obj.arrowTail, obj.arrowHead);
        canvas.setActiveObject(obj.arrowHead, e);
      }
      
      console.log('objOpts', objOpts);
      
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

      // 更新箭头中线: 根据中线长度变化
      const lineStrokeWidth = Arrow.updateLineStrokeWidth({
        coords: { x1, y1, x2, y2 }, 
        size: getTypeConfig(TYPE.ARROW).size
      });
      arrowLine.set({
        x2,
        y2,
        strokeWidth: lineStrokeWidth,
      });

      // 更新箭头头部: 根据中线长度变化
      const headSize = Arrow.updateHeadSize({
        arrowLine,
        size: getTypeConfig(TYPE.ARROW).size
      });
      const headAngle = Arrow.updateHeadAngle(arrowLine, getTypeConfig(TYPE.ARROW).size);
      arrowHead.set({
        top: y2,
        left: x2,
        width: headSize,
        height: headSize,
        angle: headAngle,
      });

      // 更新箭头尾部: 根据中线描边变化
      const tailRadius = Arrow.updateTailRadius(lineStrokeWidth, getTypeConfig(TYPE.ARROW).size);
      arrowTail.set({
        radius: tailRadius,
      });

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

    // 若当前激活对象为箭头中线, 则转而激活关联的箭头头部, 使其层级恢复至箭头头部和尾部之下, 
    // 避免头部和尾部部分被遮蔽, 影响拖动交互
    if (canvas.getActiveObject()?.arrowPart === 'arrowLine') {
      canvas.setActiveObject(canvas.getActiveObject().arrowHead);
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

module.exports = captureEditorAdvance