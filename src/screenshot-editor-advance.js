/**
 * 截屏高级编辑器: 绘制形状/文字/画笔等等
 */
const fabric = require('fabric').fabric;
const Arrow = require('./components/arrow');
const { SHAPE_TYPE, SHAPE_TYPE_KEY_NAME } = require('./enums');
const { History, HistoryType } = require('./screenshot-editor-history');
const { extendFaricObjectProperty } = require('./utils-renderer');

// 选区画布: 初始画布
const J_SelectionCanvas = document.querySelector('#J_SelectionCanvas');
// 选区工具条
const J_ToolbarItemIcons = document.querySelectorAll('.J_ToolbarItemIcon');
const J_ToolbarItemSettings = document.querySelectorAll('.J_ToolbarItemSettings');
const J_SelectionUndo = document.querySelector('#J_SelectionUndo');
// 编辑画布: 固定绘制区域, 当且仅当选择绘制工具后出现, 同时隐藏初始画布
const J_SelectionEditorWrapper = document.querySelector('#J_SelectionEditorWrapper');
const J_SelectionEditor = document.querySelector('#J_SelectionEditor');

// 马赛克滤镜
const bgPixelateFilter = new fabric.Image.filters.Pixelate({
  blocksize: 12,
});
// 马赛克背景图
let mosaicBg = null;
// 正常背景图
let normalBg = null;
// 设置默认所有图形不可被擦除
fabric.Object.prototype.erasable = false;

// 鼠标当前是否在空白处
function isOnBlank(e) {
  return !e?.target;
}

// 是否是空白画布 (实际剩余一个不可选中的背景图对象)
function isCanvasBlank(history) {
  return history.state.length <= 1;
}

// 工具设置位置调整
function updateToolbarSettingsPosition(settings) {
  // 设置默认样式
  settings.style.top = '100%';
  settings.style.left = '-10px';
  settings.style.marginTop = '20px';

  const { width: screenWidth, height: screenHeight } = window.screen;
  const { left, right, bottom } = settings.getBoundingClientRect();

  // 调整三角箭头水平位置, 指向对应的工具图标
  const icon = settings.previousElementSibling;
  const iconClientRect = icon.getBoundingClientRect();
  const triangles = settings.querySelectorAll('.triangle');
  const triangleTop = settings.querySelector('.triangle-top');
  const triangleBottom = settings.querySelector('.triangle-bottom');
  const triangleOffsetX = 5;
  triangles.forEach(t => t.style.left = `${iconClientRect.left - left + triangleOffsetX}px`);

  // 调整右侧超出视窗宽度
  if (right > screenWidth) {
    settings.style.left = `-${right - screenWidth}px`;
  }

  // 调整底部超出视窗范围
  if (bottom > screenHeight) {
    settings.style.top = 'auto';
    settings.style.bottom = '100%';
    settings.style.marginTop = '0';
    settings.style.marginBottom = '20px';

    // 气泡箭头在底部
    triangleTop.style.display = 'none';
    triangleBottom.style.display = 'block';
  } else {
    // 气泡箭头在顶部
    triangleTop.style.display = 'block';
    triangleBottom.style.display = 'none';
  }
}

// 更新撤销工具图标样式
function updateToolbarUndoStatus (history) {
  if (isCanvasBlank(history)) {
    J_SelectionUndo.classList.add('disabled');
  } else {
    J_SelectionUndo.classList.remove('disabled');
  }
}

// 设置当前绘制工具框
const setDrawingTool = (icon, settings, { setType, show, getCanvas }, type, discardActiveObject = false) => {
  const canvas = getCanvas();
  // 高亮当前工具图标
  J_ToolbarItemIcons.forEach(ele => ele.classList.remove('active'));
  icon.classList.add('active');
  // 隐藏所有工具设置, 显示当前工具设置
  J_ToolbarItemSettings.forEach(s => s.style.display = 'none');
  settings.style.display = 'flex';
  updateToolbarSettingsPosition(settings);
  // 设置当前工具类型
  setType(type);
  // 显示编辑画布
  show();
  // 是否取消当前激活对象
  if (discardActiveObject) {
    canvas?.discardActiveObject();
    canvas?.renderAll();
  }
};

// 高级编辑器模块函数
const captureEditorAdvance = ({
  // 屏幕缩放比
  scaleFactor, 
  // 原始选区截屏实例对象
  capture, 
} = {}) => {
  // 画布实例
  let canvas = null;
  // 历史操作对象
  let history = null;
  // 编辑器是否已显示
  let isShown = false;

  // 绘制类型
  let drawingType = null;
  // 绘制默认配置
  let drawingConfig = {
    [SHAPE_TYPE.RECT]: {
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
    [SHAPE_TYPE.ELLIPSE]: {
      fill: 'transparent',
      stroke: 'red',
      strokeWidth: 2,
      // https://stackoverflow.com/questions/49005241/maintain-strokewidth-while-scaling-in-fabric-js
      strokeUniform: true,
      noScaleCache: false,
      transparentCorners: false,
    },
    [SHAPE_TYPE.ARROW]: {
      color: 'red',
      // 尺寸: sm, md, lg
      size: 'sm',
    },
    [SHAPE_TYPE.BRUSH]: {
      stroke: 'red',
      strokeWidth: 2,
    },
    [SHAPE_TYPE.MOSAIC]: {
      strokeWidth: 8,
    },
    [SHAPE_TYPE.TEXT]: {
      color: 'red',
      // 尺寸: 24, 30, 36
      size: 30,
    },
  };
  
  // 绘制事件相关变量
  let isMouseDown = false;
  let isDrawingCreated = false;
  let originX = 0;
  let originY = 0;
  // 当前文本对象编辑状态
  let textInEditing = false;
  // 对象总层级
  let zIndex = 0;

  // 设置/获取绘制类型
  const setType = (type) => {
    drawingType = type;
  };
  const getType = () => drawingType;

  // 更新绘制相关配置
  const getTypeConfig = (type) => drawingConfig[type];
  const setTypeConfig = (type, config = {}) => {
    // console.log('更新配置', type, config);

    // 更新默认配置
    const newConfig = Object.assign(drawingConfig[type], config);
    // 更新画笔默认配置
    if (type === SHAPE_TYPE.BRUSH) {
      fabric.PencilBrush.prototype.color = newConfig.stroke;
      fabric.PencilBrush.prototype.width = newConfig.strokeWidth;
    }
    // 更新马赛克默认配置
    if (type === SHAPE_TYPE.MOSAIC) {
      fabric.EraserBrush.prototype.width = newConfig.strokeWidth;
    }

    console.log('最新默认配置', type, drawingConfig[type]);

    // 若是箭头工具, 则分别设置头部, 中线, 尾部配置
    if (type === SHAPE_TYPE.ARROW) {
      const arrowPart = canvas.getActiveObject();
      // 若存在选中箭头, 则更新箭头配置
      if (arrowPart) {
        const [arrowHead, arrowLine, arrowTail] = Arrow.getArrowGroup(arrowPart, canvas);

        const arrowConfig = getTypeConfig(SHAPE_TYPE.ARROW);
        const { 
          size = arrowConfig.size, 
          color = arrowConfig.color,
        } = newConfig;
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
    // 文本工具
    else if (type === SHAPE_TYPE.TEXT) {
      canvas.getActiveObject()?.set({
        fill: newConfig.color,
        fontSize: newConfig.size,
      });
    }
    // 若是其他工具
    else {
      canvas.getActiveObject()?.set(newConfig);
    }
    
    canvas.renderAll();
  };

  // 创建编辑画布
  const initCanvas = () => {
    // 创建编辑画布
    const {
      w = 0, h = 0,
    } = capture.selectRect || {};
    
    // 选区编辑画布
    const fabricCanvas = new fabric.Canvas(J_SelectionEditor, {
      width: w,
      height: h,
      enableRetinaScaling: true,
      // 仅允许选中描边
      // https://github.com/fabricjs/fabric.js/issues/6146
      // https://stackoverflow.com/questions/60143667/fabricjs-selection-only-via-border
      perPixelTargetFind: true,
      // 允许任意比例缩放
      // https://github.com/fabricjs/fabric.js/issues/6134
      uniformScaling: false,
      // 禁用鼠标框选
      selection: false,
      includeDefaultValues: true,
    });

    // 初始化画布
    canvas = fabricCanvas;
    // 初始化历史
    history = new History(canvas);

    // 初始化画笔模式配置
    fabric.PencilBrush.prototype.color = drawingConfig[SHAPE_TYPE.BRUSH].stroke;
    fabric.PencilBrush.prototype.width = drawingConfig[SHAPE_TYPE.BRUSH].strokeWidth;
    // 初始化马赛克模式配置
    fabric.EraserBrush.prototype.width = drawingConfig[SHAPE_TYPE.MOSAIC].strokeWidth;

    // 绑定画布事件
    bindEvents();
  };

  // 获取编辑画布
  const getCanvas = () => canvas;

  // 更新编辑画布
  const updateCanvas = () => {
    const {
      w, h, x, y,
    } = capture.selectRect;
    const captureImage = capture.getImageUrl();

    // 更新画布位置
    J_SelectionEditorWrapper.style.left = `${x}px`;
    J_SelectionEditorWrapper.style.top = `${y}px`;
    // 更新画布背景图, 防止撤销操作时由于重新绘制编辑画布, 而产生的背景图闪烁
    J_SelectionEditorWrapper.style.backgroundImage = `url(${captureImage})`;

    return new Promise((resolve) => {
      // 创建背景图
      new fabric.Image.fromURL(
        captureImage,
        (imgObj) => {
          mosaicBg = fabric.util.object.clone(imgObj);
          
          // 为马赛克背景图添加马赛克滤镜
          mosaicBg.filters.push(bgPixelateFilter);
          mosaicBg.applyFilters();
  
          // 设置马赛克背景图
          canvas.setWidth(w);
          canvas.setHeight(h);
          canvas.setBackgroundImage(mosaicBg);

          // // 避免重复添加正常背景图
          // if (normalBg) {
          //   canvas.remove(normalBg)
          // }
          normalBg = fabric.util.object.clone(imgObj);
          extendFaricObjectProperty(normalBg, ['__TYPE__']);
          normalBg.__TYPE__ = SHAPE_TYPE_KEY_NAME.BACKGROUND_NORMAL;
          // HACK: 若不应用空过滤器, 会导致正常背景也会被应用马赛克滤镜
          normalBg.filters = [];
          normalBg.applyFilters();
          normalBg.set({
            evented: false,
            selectable: false,
            hoverCursor: 'default',
          });
  
          // 设置正常背景图
          canvas.add(normalBg);

          resolve();
        },
        {
          scaleX: 1 / scaleFactor,
          scaleY: 1 / scaleFactor,
        },
      );

    });
    
  };

  // 销毁画布
  const destroyCanvas = () => {
    unbindEvents();
  };

  // 撤销到上一步
  const undoCanvas = () => {
    history.pop(() => {
      updateToolbarUndoStatus(history);
      // 上一步状态
      const prevState = history.state[history.state.length - 1];

      canvas.loadFromJSON(
        prevState.object,
        () => {
          // 恢复成功回调
        },
        /**
         * NOTE: 从 JSON 恢复的对象, 需要重新为其绑定事件
         * @see {@link https://stackoverflow.com/questions/49697408/fabricjs-preserve-events-on-saving-getting-canvas-from-json}
         * 
         * @param {object} json   json 配置
         * @param {object} object 形状实例对象
         */
        (json, object) => {
          // 重新赋值正常背景图
          if (object.__TYPE__ === SHAPE_TYPE_KEY_NAME.BACKGROUND_NORMAL) {
            normalBg = object;
          }
          // 重新绑定箭头形状事件
          else if (object.__TYPE__ === SHAPE_TYPE_KEY_NAME.ARROW) {
            Arrow.bindEvents(object, canvas);
          }

        },
      );
      
    });

  };

  // 清空画布
  const clearCanvas = () => {
    canvas.clear();
    canvas.renderAll();
    updateCanvas();
  };

  // 获取编辑画布base64图片流
  const getCanvasDataURL = () => {
    return canvas.toDataURL({
      enableRetinaScaling: true,
    });
  };

  // 显示/隐藏画布
  const show = async () => {
    // 若已显示, 则不进行重复操作
    if (isShown) {
      return;
    }

    // 更新编辑截屏
    await updateCanvas();

    // 禁用初始画布操作, 显示编辑画布
    isShown = true;
    capture.disable();
    // 隐藏原始截屏选区 (编辑截屏生成后再隐藏原始截屏, 防止画面闪烁)
    J_SelectionCanvas.style.display = 'none';
    // 显示编辑画布
    J_SelectionEditorWrapper.style.display = 'block';

    // 添加编辑画布初始化历史记录
    history.push(HistoryType.Add);
  };
  const hide = () => {
    capture.enable();
    J_SelectionEditorWrapper.style.display = 'none';
  };
  
  // 事件绑定
  function bindEvents () {
    canvas.on('selection:created', onSelectionCreated);
    canvas.on('object:added', onObjectAdded);
    canvas.on('object:modified', onObjectModified);
    canvas.on('object:removed', onObjectRemoved);
    canvas.on('path:created', onPathCreated);
    canvas.on('mouse:down:before', onMouseDownBefore);
    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
    registerCanvasEvents();
  }

  // 事件解绑
  function unbindEvents () {
    canvas.off('selection:created', onSelectionCreated);
    canvas.off('object:added', onObjectAdded);
    canvas.off('object:modified', onObjectModified);
    canvas.off('object:removed', onObjectRemoved);
    canvas.off('path:created', onPathCreated);
    canvas.off('mouse:down:before', onMouseDownBefore);
    canvas.off('mouse:down', onMouseDown);
    canvas.off('mouse:move', onMouseMove);
    canvas.off('mouse:up', onMouseUp);
  }

  // 注册画布快捷键
  function registerCanvasEvents() {
    document.addEventListener('keydown', e => {
      // ctrl+Z/command+Z 撤销操作
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        undoCanvas();
      }
  
      // 删除选中对象
      if (e.code === 'Delete') {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
          return;
        }
        
        // 删除箭头组对象
        if (activeObj.__TYPE__ === SHAPE_TYPE_KEY_NAME.ARROW) {
          const [arrowHead, arrowLine, arrowTail] = Arrow.getArrowGroup(activeObj, canvas);
          canvas.remove(arrowHead);
          canvas.remove(arrowLine);
          canvas.remove(arrowTail);
        }
        // 删除单个对象
        else {
          canvas.remove(activeObj);
        }
      }
    });
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

  // 对象添加事件
  function onObjectAdded (e) {
    console.log('onObjectAdded', e.target);
  }

  // 对象修改事件
  function onObjectModified (e) {
    console.log('onObjectModified', e.target);
    history.push(HistoryType.Modify, e.target);
    e.target.moveTo(++zIndex);
  }

  // 对象移除事件
  function onObjectRemoved (e) {
    console.log('onObjectRemoved', e.target);
  }

  // 路径创建事件
  function onPathCreated (e) {
    console.log('onPathCreated', e.path);
  }

  // 鼠标按下前事件: 用于处理形状创建前逻辑
  function onMouseDownBefore(e) {
    // console.log('onMouseDownBefore');

    // 画笔工具
    if (drawingType === SHAPE_TYPE.BRUSH) {
      // 若点击在图形上, 则关闭画笔
      if (!isOnBlank(e)) {
        canvas.isDrawingMode = false;
      }
      // 否则, 则开启画笔
      else {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.isDrawingMode = true;
      }
    }

    // 马赛克工具
    if (drawingType === SHAPE_TYPE.MOSAIC) {
      // 若点击在图形上, 则关闭马赛克
      if (!isOnBlank(e)) {
        normalBg.set('erasable', false);
        canvas.isDrawingMode = false;
      }
      // 否则, 则开启马赛克
      else {
        canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
        normalBg.set('erasable', true);
        canvas.isDrawingMode = true;
      }
    }

    // 文本工具
    if (drawingType === SHAPE_TYPE.TEXT) {
      // 创建文本前, 判断当前是否有文本对象处于编辑状态, 从而决定是否新创建文本
      if (isOnBlank(e)) {
        canvas.getObjects('i-text').some(itext => {
          // console.log('itext.isEditing', itext.isEditing);
          if (itext.isEditing) {
            textInEditing = true;
            return true;
          }
          return false;
        });
      }
    }
  }

  // 鼠标按下事件
  function onMouseDown(e) {
    // console.log('onMouseDown');

    isMouseDown = true;
    
    // 若点击在图形上, 则解绑鼠标移动事件, 避免影响当前图形的默认行为
    if (!isOnBlank(e)) {
      canvas.off('mouse:move', onMouseMove);
    }
    // 若点击在空白处, 则绑定鼠标移动事件
    else {
      // 若是创建文本, 则不监听move事件
      if (drawingType === SHAPE_TYPE.TEXT) {
        if (!textInEditing) {
          createText(e);
        }
        textInEditing = false;
        return;
      }
      canvas.on('mouse:move', onMouseMove);
    }

  }

  // 创建文本
  function createText(e) {
    // 文本工具: 点击鼠标立即创建
    const pointer = canvas.getPointer(e);
    // 公共配置
    const commonOpts = {
      originX: 'left',
      originY: 'top',
      left: pointer.x,
      top: pointer.y,
    };
    const { color, size } = drawingConfig[SHAPE_TYPE.TEXT];
    const objOpts = {
      ...commonOpts,
      fill: color,
      fontSize: size,
      lockScalingX: true,
      lockScalingY: true,
      textBackgroundColor: 'rgba(255, 255, 255, 0.01)',
      padding: 8,
    };
    const textObj = new fabric.IText('', objOpts);
    extendFaricObjectProperty(textObj, ['__TYPE__']);
    textObj.__TYPE__ = SHAPE_TYPE_KEY_NAME.TEXT;
    // 退出编辑模式时, 若文本为空, 则移除该文本
    textObj.on('editing:exited', () => {
      if (!textObj.text.trim()) {
        canvas.remove(textObj);
      }
    });
    canvas.add(textObj);
    // NOTE: 必须在添加到画布后再进入编辑模式, 否则会导致输入事件失效
    textObj.enterEditing();
    canvas.setActiveObject(textObj, e);
  }

  // 鼠标移动事件
  function onMouseMove(e) {
    // console.log('onMouseMove');

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
      if (drawingType === SHAPE_TYPE.RECT) {
        objAPI = fabric.Rect;
        objOpts = {
          ...commonOpts,
          ...drawingConfig[SHAPE_TYPE.RECT],
        };
        obj = new objAPI(objOpts);
        extendFaricObjectProperty(obj, ['__TYPE__']);
        obj.__TYPE__ = SHAPE_TYPE_KEY_NAME.RECT;
        canvas.add(obj);
        canvas.setActiveObject(obj, e);
      }
      // 绘制椭圆形
      else if (drawingType === SHAPE_TYPE.ELLIPSE) {
        objAPI = fabric.Ellipse;
        objOpts = {
          ...commonOpts,
          ...drawingConfig[SHAPE_TYPE.ELLIPSE],
        };
        obj = new objAPI(objOpts);
        extendFaricObjectProperty(obj, ['__TYPE__']);
        obj.__TYPE__ = SHAPE_TYPE_KEY_NAME.ELLIPSE;
        canvas.add(obj);
        canvas.setActiveObject(obj, e);
      }
      // 绘制箭头
      else if (drawingType === SHAPE_TYPE.ARROW) {
        objOpts = {
          ...commonOpts,
          canvas,
          config: drawingConfig[SHAPE_TYPE.ARROW],
        };
        obj = new Arrow(objOpts);
        canvas.add(obj.arrowLine, obj.arrowTail, obj.arrowHead);
        canvas.setActiveObject(obj.arrowHead, e);
      }
      
      // console.log('objOpts', objOpts);
      
      canvas.renderAll();
      isDrawingCreated = true;
    }

    // 获取最新坐标
    const pointer = canvas.getPointer(e);
    // 获取当前激活图形
    const obj = canvas.getActiveObject();
    
    // 更新矩形
    if (drawingType === SHAPE_TYPE.RECT) {
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
    else if (drawingType === SHAPE_TYPE.ELLIPSE) {
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
    else if (drawingType === SHAPE_TYPE.ARROW) {
      const [arrowHead, arrowLine, arrowTail] = Arrow.getArrowGroup(obj, canvas);
      
      // 中线端点坐标
      const x1 = originX;
      const y1 = originY;
      const x2 = Math.abs(pointer.x);
      const y2 = Math.abs(pointer.y);

      // 更新箭头中线: 根据中线长度变化
      const lineStrokeWidth = Arrow.updateLineStrokeWidth({
        coords: { x1, y1, x2, y2 }, 
        size: getTypeConfig(SHAPE_TYPE.ARROW).size,
      });
      arrowLine.set({
        x2,
        y2,
        strokeWidth: lineStrokeWidth,
      });

      // 更新箭头头部: 根据中线长度变化
      const headSize = Arrow.updateHeadSize({
        arrowLine,
        size: getTypeConfig(SHAPE_TYPE.ARROW).size,
      });
      const headAngle = Arrow.updateHeadAngle(arrowLine, getTypeConfig(SHAPE_TYPE.ARROW).size);
      arrowHead.set({
        top: y2,
        left: x2,
        width: headSize,
        height: headSize,
        angle: headAngle,
      });

      // 更新箭头尾部: 根据中线描边变化
      const tailRadius = Arrow.updateTailRadius(lineStrokeWidth, getTypeConfig(SHAPE_TYPE.ARROW).size);
      arrowTail.set({
        radius: tailRadius,
      });

      arrowHead.setCoords();
      arrowLine.setCoords();
      arrowTail.setCoords();
    }
    
    obj?.setCoords();
    canvas.renderAll();
  }

  // 鼠标抬起事件
  function onMouseUp(e) {
    // console.log('onMouseUp');
    const activeObj = canvas.getActiveObject();

    if (!isMouseDown) {
      return;
    }

    // 若为绘制结束阶段, 则释放绘制对象选中状态
    if (isDrawingCreated) {
      canvas.discardActiveObject(e);
      // 更新历史状态 (拖拽绘制的图形需要在该阶段更新, 否则获取不到最新属性, 如宽高等)
      history.push(HistoryType.Add, e.target);
    }

    // 若当前激活对象为箭头中线, 则转而激活关联的箭头头部, 使其层级恢复至箭头头部和尾部之下, 
    // 避免头部和尾部部分被遮蔽, 影响拖动交互
    if (activeObj?.arrowPart === 'arrowLine') {
      const [arrowHead] = Arrow.getArrowGroup(activeObj, canvas);
      canvas.setActiveObject(arrowHead);
    }

    // 根据当前绘制对象, 显示对应的配置工具框
    // 若是画笔
    if (activeObj?.type === 'path') {
      setDrawingTool(
        document.querySelector(`[data-icon="${SHAPE_TYPE_KEY_NAME.BRUSH}"]`),
        document.querySelector(`[data-type="${SHAPE_TYPE_KEY_NAME.BRUSH}"]`),
        { setType, show, getCanvas },
        SHAPE_TYPE.BRUSH,
      );
    }
    // 若是其他形状
    else if (activeObj?.__TYPE__) {
      setDrawingTool(
        document.querySelector(`[data-icon="${activeObj.__TYPE__}"]`),
        document.querySelector(`[data-type="${activeObj.__TYPE__}"]`),
        { setType, show, getCanvas },
        SHAPE_TYPE[activeObj.__TYPE__],
      );
    }

    // 当前选中对象层级递增
    if (!isOnBlank(e)) {
      e.target?.moveTo(++zIndex);
    }
    
    isMouseDown = false;
    isDrawingCreated = false;

    updateToolbarUndoStatus(history);
    
    canvas.isDrawingMode = false;
    canvas.renderAll();
    canvas.off('mouse:move', onMouseMove);
  }

  return {
    getCanvas,
    setType,
    getType,
    setTypeConfig,
    getTypeConfig,
    show,
    hide,
    initCanvas,
    updateCanvas,
    destroyCanvas,
    undoCanvas,
    clearCanvas,
    getCanvasDataURL,
  };
};

module.exports = {
  captureEditorAdvance,
  setDrawingTool,
};