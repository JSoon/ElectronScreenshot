/**
 * 箭头工具
 * 
 * @see {@link http://jsfiddle.net/ug2gskj1/} 参考资料
 */
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

    this.canvas = canvas;
    this.config = config;

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
      fill: this.config.color,
    });
    this.arrowHead.on('moving', this.arrowHeadMovingHandler.bind(this));

    // 箭头中线
    this.arrowLine = new fabric.Line([left, top, left, top], {
      arrowPart: 'arrowLine',
      left,
      top,
      stroke: this.config.color,
      strokeWidth: 0,
      hasBorders: false,
      hasControls: false,
      originX: 'center',
      originY: 'center',
      lockScalingX: true,
      lockScalingY: true,
    });
    this.arrowLine.on('moving', this.arrowLineMovingHandler.bind(this));

    // 箭头尾部
    this.arrowTail = new fabric.Circle({
      arrowPart: 'arrowTail',
      left,
      top,
      radius: 0,
      fill: this.config.color,
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    this.arrowTail.on('moving', this.arrowTailMovingHandler.bind(this));
    
    // 创建关联引用
    this.arrowHead.arrowLine = this.arrowLine;
    this.arrowHead.arrowTail = this.arrowTail;
    this.arrowLine.arrowHead = this.arrowHead;
    this.arrowLine.arrowTail = this.arrowTail;
    this.arrowTail.arrowHead = this.arrowHead;
    this.arrowTail.arrowLine = this.arrowLine;

    return this;
  }

  // 移动箭头中线
  arrowLineMovingHandler (e) {
    const arrowLine = e.transform.target;
    const arrowHead = arrowLine.arrowHead;
    const arrowTail = arrowLine.arrowTail;

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
    const arrowHead = e.transform.target;
    const arrowLine = arrowHead.arrowLine;
    const arrowTail = arrowHead.arrowTail;
    const pointer = arrowHead.getCenterPoint();

    arrowLine.set({
      x2: pointer.x,
      y2: pointer.y,
    });

    const headSize = Arrow.updateHeadSize({
      arrowLine,
      size: this.config.size,
    });
    const headAngle = Arrow.updateHeadAngle(arrowLine);
    arrowHead.set({
      width: headSize,
      height: headSize,
      angle: headAngle,
    });

    const lineStrokeWidth = Arrow.updateLineStrokeWidth({
      arrowLine,
      size: this.config.size,
    });
    arrowLine.set({
      strokeWidth: lineStrokeWidth,
    });

    const tailRadius = Arrow.updateTailRadius(lineStrokeWidth, this.config.size);
    arrowTail.set({
      radius: tailRadius,
    });

    arrowLine.setCoords();
    arrowTail.setCoords();
    this.canvas.renderAll();
  }

  // 移动箭头尾部
  arrowTailMovingHandler (e) {
    const arrowTail = e.transform.target;
    const arrowLine = arrowTail.arrowLine;
    const arrowHead = arrowTail.arrowHead;
    const pointer = arrowTail.getCenterPoint();

    arrowLine.set({
      x1: pointer.x,
      y1: pointer.y,
    });

    const headSize = Arrow.updateHeadSize({
      arrowLine,
      size: this.config.size,
    });
    const headAngle = Arrow.updateHeadAngle(arrowLine);
    arrowHead.set({
      width: headSize,
      height: headSize,
      angle: headAngle,
    });

    const lineStrokeWidth = Arrow.updateLineStrokeWidth({
      arrowLine,
      size: this.config.size,
    });
    arrowLine.set({
      strokeWidth: lineStrokeWidth,
    });

    const tailRadius = Arrow.updateTailRadius(lineStrokeWidth, this.config.size);
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
  static updateHeadSize ({
    arrowLine, size = 'sm', coords
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
    arrowLine, size = 'sm', coords
  }) {
    const lineWidth = arrowLine ? arrowLine.width : coords.x1 - coords.x2;
    const lineHeight = arrowLine ? arrowLine.height : coords.y1 - coords.y2;
    const arrowLineLength = Math.abs(Math.sqrt(Math.pow((lineWidth), 2) + Math.pow((lineHeight), 2)));
    let lineStrokeWidth = arrowLineLength / 5;
    if (lineStrokeWidth > Arrow.sizePreset[size].line) {
      lineStrokeWidth = Arrow.sizePreset[size].line
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

module.exports = Arrow;