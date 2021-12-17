/**
 * 箭头工具
 * 
 * @see {@link http://jsfiddle.net/ug2gskj1/} 参考资料
 */

const fabric = require('fabric').fabric;
const { SHAPE_TYPE_KEY_NAME } = require('../enums');
const { extendFaricObjectProperty } = require('../utils');

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
  
  // 默认配置
  config = {
    color: 'red',
    size: 'sm',
  };
  // 箭头各部位尺寸最大变化阈值: 中线超出该长度, 则各部位尺寸不再变化
  static resizeThreshold = 100;
  // 箭头尺寸预设值
  static sizePreset = {
    sm: {
      head: 5 * 2, // 头部宽度
      line: 3, // 中线描边宽度
      tail: 5 * 1.4, // 尾部圆点半径
    },
    md: {
      head: 10 * 2, // 头部宽度
      line: 8, // 中线描边宽度
      tail: 10 * 1.4, // 尾部圆点半径
    },
    lg: {
      head: 20 * 2, // 头部宽度
      line: 12, // 中线描边宽度
      tail: 20 * 1.4, // 尾部圆点半径
    },
  };

  constructor (options) {
    const { left, top, canvas, config } = options;

    // 箭头头部
    this.arrowHead = new fabric.Triangle({
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
      fill: config.color,
    });
    extendFaricObjectProperty(this.arrowHead, ['id', '__TYPE__', 'arrowPart', 'arrowLine', 'arrowTail']);

    // 箭头中线
    this.arrowLine = new fabric.Line([left, top, left, top], {
      left,
      top,
      stroke: config.color,
      strokeWidth: 0,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      lockScalingX: true,
      lockScalingY: true,
    });
    extendFaricObjectProperty(this.arrowLine, ['id', '__TYPE__', 'arrowPart', 'arrowHead', 'arrowTail']);

    // 箭头尾部
    this.arrowTail = new fabric.Circle({
      left,
      top,
      radius: 0,
      fill: config.color,
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    extendFaricObjectProperty(this.arrowTail, ['id', '__TYPE__', 'arrowPart', 'arrowHead', 'arrowLine']);
    
    // 创建关联引用, 设置自定义属性
    this.arrowHead.id = `arrowHead_${new Date().getTime()}`;
    this.arrowLine.id = `arrowLine_${new Date().getTime()}`;
    this.arrowTail.id = `arrowTail_${new Date().getTime()}`;

    this.arrowHead.__TYPE__ = SHAPE_TYPE_KEY_NAME.ARROW;
    this.arrowHead.arrowPart = 'arrowHead';
    this.arrowHead.arrowLine = this.arrowLine.id;
    this.arrowHead.arrowTail = this.arrowTail.id;

    this.arrowLine.__TYPE__ = SHAPE_TYPE_KEY_NAME.ARROW;
    this.arrowLine.arrowPart = 'arrowLine';
    this.arrowLine.arrowHead = this.arrowHead.id;
    this.arrowLine.arrowTail = this.arrowTail.id;
    
    this.arrowTail.__TYPE__ = SHAPE_TYPE_KEY_NAME.ARROW;
    this.arrowTail.arrowPart = 'arrowTail';
    this.arrowTail.arrowHead = this.arrowHead.id;
    this.arrowTail.arrowLine = this.arrowLine.id;

    // 事件绑定
    Arrow.bindEvents(this.arrowHead, canvas, config);
    Arrow.bindEvents(this.arrowLine, canvas, config);
    Arrow.bindEvents(this.arrowTail, canvas, config);

    return this;
  }

  // 事件绑定
  static bindEvents(obj, canvas, config = 'sm') {
    if (obj.arrowPart === 'arrowHead') {
      obj.on('moving', function (e) {
        Arrow.arrowHeadMovingHandler(e, canvas, config);
      });
    } else if (obj.arrowPart === 'arrowLine') {
      obj.on('moving', function (e) {
        Arrow.arrowLineMovingHandler(e, canvas, config);
      });
    } else if (obj.arrowPart === 'arrowTail') {
      obj.on('moving', function (e) {
        Arrow.arrowTailMovingHandler(e, canvas, config);
      });
    }
  }

  // 移动箭头中线
  static arrowLineMovingHandler (e, canvas, config) {
    const arrowLine = e.transform.target;
    const allObjects = canvas.getObjects();
    const arrowHead = allObjects.find(o => o.id === arrowLine.arrowHead);
    const arrowTail = allObjects.find(o => o.id === arrowLine.arrowTail);

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
    canvas.renderAll();
  }

  // 移动箭头头部
  static arrowHeadMovingHandler (e, canvas, config) {
    const arrowHead = e.transform.target;
    const allObjects = canvas.getObjects();
    const arrowLine = allObjects.find(o => o.id === arrowHead.arrowLine);
    const arrowTail = allObjects.find(o => o.id === arrowHead.arrowTail);
    const pointer = arrowHead.getCenterPoint();

    // debugger

    arrowLine.set({
      x1: arrowTail.left,
      y1: arrowTail.top,
      x2: pointer.x,
      y2: pointer.y,
    });

    const headSize = Arrow.updateHeadSize({
      arrowLine,
      size: config.size,
    });
    const headAngle = Arrow.updateHeadAngle(arrowLine);
    arrowHead.set({
      width: headSize,
      height: headSize,
      angle: headAngle,
    });

    const lineStrokeWidth = Arrow.updateLineStrokeWidth({
      arrowLine,
      size: config.size,
    });
    arrowLine.set({
      strokeWidth: lineStrokeWidth,
    });

    const tailRadius = Arrow.updateTailRadius(lineStrokeWidth, config.size);
    arrowTail.set({
      radius: tailRadius,
    });

    arrowLine.setCoords();
    arrowTail.setCoords();
    canvas.renderAll();
  }

  // 移动箭头尾部
  static arrowTailMovingHandler (e, canvas, config) {
    const arrowTail = e.transform.target;
    const allObjects = canvas.getObjects();
    const arrowLine = allObjects.find(o => o.id === arrowTail.arrowLine);
    const arrowHead = allObjects.find(o => o.id === arrowTail.arrowHead);
    const pointer = arrowTail.getCenterPoint();

    arrowLine.set({
      x1: pointer.x,
      y1: pointer.y,
      x2: arrowHead.left,
      y2: arrowHead.top,
    });

    const headSize = Arrow.updateHeadSize({
      arrowLine,
      size: config.size,
    });
    const headAngle = Arrow.updateHeadAngle(arrowLine);
    arrowHead.set({
      width: headSize,
      height: headSize,
      angle: headAngle,
    });

    const lineStrokeWidth = Arrow.updateLineStrokeWidth({
      arrowLine,
      size: config.size,
    });
    arrowLine.set({
      strokeWidth: lineStrokeWidth,
    });

    const tailRadius = Arrow.updateTailRadius(lineStrokeWidth, config.size);
    arrowTail.set({
      top: pointer.y,
      left: pointer.x,
      radius: tailRadius,
    });

    arrowHead.setCoords();
    arrowLine.setCoords();
    canvas.renderAll();
  }

  // 更新箭头头部尺寸
  static updateHeadSize ({
    arrowLine, size = 'sm', coords,
  }) {
    const lineWidth = arrowLine ? arrowLine.width : coords.x1 - coords.x2;
    const lineHeight = arrowLine ? arrowLine.height : coords.y1 - coords.y2;
    const arrowLineLength = Math.abs(Math.sqrt(Math.pow((lineWidth), 2) + Math.pow((lineHeight), 2)));
    let headSize = arrowLineLength / 3;
    if (headSize > Arrow.sizePreset[size].head) {
      headSize = Arrow.sizePreset[size].head;
    }
    return headSize;
  }

  // 更新箭头头部角度
  static updateHeadAngle (arrowLine) {
    const x1 = arrowLine.get('x1');
    const y1 = arrowLine.get('y1');
    const x2 = arrowLine.get('x2');
    const y2 = arrowLine.get('y2');
    return Arrow.calcArrowAngle(x1, y1, x2, y2);
  }

  // 更新箭头中线描边宽度
  static updateLineStrokeWidth ({
    arrowLine, size = 'sm', coords,
  }) {
    const lineWidth = arrowLine ? arrowLine.width : coords.x1 - coords.x2;
    const lineHeight = arrowLine ? arrowLine.height : coords.y1 - coords.y2;
    const arrowLineLength = Math.abs(Math.sqrt(Math.pow((lineWidth), 2) + Math.pow((lineHeight), 2)));
    let lineStrokeWidth = arrowLineLength / 5;
    if (lineStrokeWidth > Arrow.sizePreset[size].line) {
      lineStrokeWidth = Arrow.sizePreset[size].line;
    }
    return lineStrokeWidth;
  }

  // 更新箭头尾部圆点半径
  static updateTailRadius (lineStrokeWidth, size = 'sm') {
    let tailRadius = lineStrokeWidth;
    if (tailRadius > Arrow.sizePreset[size].tail) {
      tailRadius = Arrow.sizePreset[size].tail;
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
    } else if (y === 0) {
      angle = (x > 0) ? 0 : Math.PI;
    } else {
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

  // 根据当前箭头部位, 获取所有箭头部位组合
  static getArrowGroup (arrowPart, canvas) {
    if (!arrowPart) {
      return [];
    }
    const allObjects = canvas.getObjects();

    let arrowHead = null;
    let arrowLine = null;
    let arrowTail = null;
    
    // 若当前是头部
    if (!arrowPart.arrowHead) {
      arrowHead = arrowPart;
      arrowLine = allObjects.find(o => o.id === arrowPart.arrowLine);
      arrowTail = allObjects.find(o => o.id === arrowPart.arrowTail);
    }
    // 若当前是中线
    else if (!arrowPart.arrowLine) {
      arrowLine = arrowPart;
      arrowHead = allObjects.find(o => o.id === arrowPart.arrowHead);
      arrowTail = allObjects.find(o => o.id === arrowPart.arrowTail);
    }
    // 若当前是尾部
    else if (!arrowPart.arrowTail) {
      arrowTail = arrowPart;
      arrowHead = allObjects.find(o => o.id === arrowPart.arrowHead);
      arrowLine = allObjects.find(o => o.id === arrowPart.arrowLine);
    } else {
      return [];
    }

    return [arrowHead, arrowLine, arrowTail];
  }
}

module.exports = Arrow;