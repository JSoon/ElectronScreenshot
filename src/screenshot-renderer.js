/**
 * 截屏渲染进程
 */
const path = require('path');
const { ipcRenderer, clipboard, nativeImage } = require('electron');
const { IPC_CHANNELS, SHAPE_TYPE } = require('./enums');
const { getScreenshot } = require('./desktop-capturer');
const { ScreenshotEditor, EDITOR_EVENTS } = require('./screenshot-editor');
const { captureEditorAdvance, setDrawingTool } = require('./screenshot-editor-advance');
const registerShortcuts = require('./screenshot-shortcuts');

// 截屏音
const audio = new Audio();
audio.src = path.join(__dirname, 'assets/audio/screenshot.mp3');
// 截屏底图
const J_Background = document.querySelector('#J_Background');
// 截屏遮罩层
const J_SelectionMask = document.querySelector('#J_SelectionMask');
// 选区画布: 初始画布
const J_SelectionCanvas = document.querySelector('#J_SelectionCanvas');
// 选区信息
const J_SelectionInfo = document.querySelector('#J_SelectionInfo');
// 选区工具条: 绘制工具
const J_SelectionToolbar = document.querySelector('#J_SelectionToolbar');
const J_ToolbarItemSettings = document.querySelectorAll('.J_ToolbarItemSettings');
const J_StrokeColor = document.querySelectorAll('.J_StrokeColor');
const J_SelectionRect = document.querySelector('#J_SelectionRect');
const J_SelectionEllipse = document.querySelector('#J_SelectionEllipse');
const J_SelectionArrow = document.querySelector('#J_SelectionArrow');
const J_SelectionBrush = document.querySelector('#J_SelectionBrush');
const J_SelectionMosaic = document.querySelector('#J_SelectionMosaic');
const J_SelectionText = document.querySelector('#J_SelectionText');
const J_FontSizeSelect = document.querySelector('#J_FontSizeSelect');
// 选区工具条: 操作工具
const J_SelectionUndo = document.querySelector('#J_SelectionUndo');
// const J_SelectionReset = document.querySelector('#J_SelectionReset');
const J_SelectionDownload = document.querySelector('#J_SelectionDownload');
const J_SelectionCancel = document.querySelector('#J_SelectionCancel');
const J_SelectionConfirm = document.querySelector('#J_SelectionConfirm');
// 鼠标处信息
const J_CursorInfo = document.querySelector('#J_CursorInfo');
const J_CursorCoords = document.querySelector('#J_CursorCoords');
const J_CursorColor = document.querySelector('#J_CursorColor');

registerShortcuts();

// 右键取消截屏
document.body.addEventListener('mousedown', e => {
  if (e.button === 2) {
    // 先隐藏
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT_HIDE_CURRENT_WINDOW);
    // 再关闭
    window.close();
  }
}, true);

// 开始截屏
getScreenshot(async (imgSrc, startTime) => {
  // console.log(imgSrc);
  console.info(`截屏耗时: ${new Date().getTime() - startTime} 毫秒`);
  
  // 截屏完成后, 显示遮罩层
  J_SelectionMask.style.display = 'block';

  const currentScreen = await ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_CURRENT_SCREEN);
  const scaleFactor = currentScreen.scaleFactor;

  // 创建截屏编辑器
  const capture = new ScreenshotEditor(currentScreen, J_SelectionCanvas, J_Background, imgSrc);
  // 初始化编辑截屏
  const fabricCapture = captureEditorAdvance({ 
    capture,
    scaleFactor,
  });
  fabricCapture.initCanvas();
  
  //#region 移动鼠标, 显示鼠标处信息
  // 取色器
  const onColorPickHandler = e => {
    const { clientX, clientY } = e;
    const imageData = capture.bgCtx?.getImageData(
      clientX * scaleFactor,
      clientY * scaleFactor,
      1 * scaleFactor,
      1 * scaleFactor,
    );

    if (!imageData) {
      return;
    }

    const [r, g, b] = imageData.data;

    // 设置样式
    const offset = 20;
    let top = clientY - J_CursorInfo.clientHeight - offset;
    let left = clientX - J_CursorInfo.clientWidth - offset;
    if (top < 0) {
      top = J_CursorInfo.clientHeight;
    }
    if (left < 0) {
      left = J_CursorInfo.clientWidth;
    }
    J_CursorInfo.style.display = 'block';
    J_CursorInfo.style.top = `${top}px`;
    J_CursorInfo.style.left = `${left}px`;

    // 设置当前坐标
    J_CursorCoords.innerHTML = `坐标: (${clientX}, ${clientY})`;
    // 设置当前颜色
    J_CursorColor.innerHTML = `RGB: ${rgbToHex(r, g, b)}`;
  };

  // 放大镜
  const onManify = e => {
    const { clientX, clientY } = e;
    // 获取原始图像数据
    const imageData = capture.bgCtx?.getImageData(
      clientX * scaleFactor - J_CursorInfo.clientWidth / 2,
      clientY * scaleFactor - J_CursorInfo.clientHeight / 2,
      J_CursorInfo.clientWidth * scaleFactor,
      J_CursorInfo.clientHeight * scaleFactor,
    );
    if (!imageData) {
      return;
    }
    // 绘制到临时canvas
    let canvas = document.createElement('canvas');
    canvas.width = J_CursorInfo.clientWidth * scaleFactor;
    canvas.height = J_CursorInfo.clientHeight * scaleFactor;
    let ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    // 放大鼠标处图像
    ctx.scale(2, 2);
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    // 将临时canvas上放大的图像, 设置为背景图
    J_CursorInfo.style.background = `url(${canvas.toDataURL('image/jpeg')}) 50% 50% transparent no-repeat`;
  };

  // 鼠标处信息
  const onCursorInfoHandler = e => {
    onColorPickHandler(e);
    onManify(e);
  };

  // 事件绑定/解绑
  const bindCursorInfoHandler = () => {
    document.body.addEventListener('mousemove', onCursorInfoHandler);
  };
  const unbindCursorInfoHandler = () => {
    J_CursorInfo.style.display = 'none';
    document.body.removeEventListener('mousemove', onCursorInfoHandler);
  };
  bindCursorInfoHandler();
  //#endregion

  //#region 拖动鼠标, 显示选区信息
  const onDrag = (selectRect) => {
    unbindCursorInfoHandler();
    const offsetY = 10;
    J_SelectionToolbar.style.display = 'none';
    J_SelectionInfo.style.display = 'block';
    // 设置选区信息位置
    const { width: screenWidth } = window.screen;
    J_SelectionInfo.innerText = `${selectRect.w} * ${selectRect.h}`;
    J_SelectionInfo.style.left = `${selectRect.x}px`;
    if (screenWidth - selectRect.r < J_SelectionInfo.clientWidth) {
      if (selectRect.w < J_SelectionInfo.clientWidth) {
        J_SelectionInfo.style.left = `${screenWidth - J_SelectionInfo.clientWidth}px`;
      }
    }
    J_SelectionInfo.style.top = `${selectRect.y + offsetY}px`;
    if (selectRect.y > J_SelectionInfo.clientHeight + offsetY) {
      J_SelectionInfo.style.top = `${selectRect.y - J_SelectionInfo.clientHeight - offsetY}px`;
    }
  };

  const onDragEnd = () => {
    unbindCursorInfoHandler();
    if (!capture.selectRect) {
      return;
    }
    const {
      r, b,
    } = capture.selectRect;
    
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT, {
      type: IPC_CHANNELS.SCREENSHOT_SELECT,
      screenId: currentScreen.id,
    });

    // 调整工具条样式
    const offsetY = 10;
    J_SelectionToolbar.style.display = 'flex';
    // 设置工具条位置
    const tWidth = J_SelectionToolbar.clientWidth;
    const tHeight = J_SelectionToolbar.clientHeight;
    const { width: screenWidth, height: screenHeight } = window.screen;
    // x轴
    J_SelectionToolbar.style.right = `${screenWidth - r}px`;
    if (J_SelectionToolbar.offsetLeft < 0) {
      J_SelectionToolbar.style.right = `${screenWidth - tWidth}px`;
    }
    // y轴
    J_SelectionToolbar.style.top = `${b + offsetY}px`;
    if (screenHeight - b < tHeight + offsetY) {
      J_SelectionToolbar.style.top = `${b - tHeight - offsetY}px`;
    }
  };

  capture.on(EDITOR_EVENTS.DRAGGING_START, onDrag);
  capture.on(EDITOR_EVENTS.DRAGGING, onDrag);
  capture.on(EDITOR_EVENTS.DRAGGING_END, onDragEnd);
  //#endregion

  // 截屏选区选择, 若不是当前屏幕, 则禁止操作
  ipcRenderer.on(IPC_CHANNELS.SCREENSHOT, (e, { type, screenId }) => {
    if (type === IPC_CHANNELS.SCREENSHOT_SELECT) {
      if (screenId && screenId !== currentScreen.id) {
        capture.disable();
      }
    }
  });

  // 选区重置
  capture.on(EDITOR_EVENTS.RESET, e => {
    bindCursorInfoHandler();
    // 隐藏选区相关信息
    J_SelectionInfo.style.display = 'none';
    J_SelectionToolbar.style.display = 'none';
  });

  // 选区截屏
  const selectionCapture = async () => {
    if (!capture.selectRect) {
      return;
    }

    await fabricCapture.show();

    // 优先获取工具编辑后的图片流, 若没有则获取原始截图数据
    const dataURL = fabricCapture.getCanvasDataURL();
    const blobURL = URL.createObjectURL(await (await fetch(dataURL)).blob());

    // 1. 隐藏截屏窗口
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT_HIDE_CURRENT_WINDOW);

    // 2. 播放截屏音
    audio.play();
    audio.onended = () => {
      // 3. 截屏音播放完成后, 再关闭截屏窗口
      window.close();
    };
    // 4. 写入图片到剪切板
    clipboard.writeImage(nativeImage.createFromDataURL(dataURL));
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT, {
      type: IPC_CHANNELS.SCREENSHOT_COMPLETE,
      screenId: currentScreen.id,
      data: {
        base64: dataURL,
        blob: blobURL,
      },
    });
  };

  // 双击选区, 保存截屏到剪切板
  J_SelectionCanvas.addEventListener('dblclick', e => {
    selectionCapture();
  });

  // 点击回车, 保存截屏到剪切板
  window.addEventListener('keypress', e => {
    if (e.code === 'Enter') {
      // console.log('e.target', e.target);
      // 若回车时对象为文本输入框, 则不截屏
      if (e.target.hasAttribute('data-fabric-hiddentextarea')) {
        return;
      }
      selectionCapture();
    }
  });

  //#region 截屏工具条
  // 初始化截屏工具设置项样式
  J_StrokeColor.forEach(wrapper => {
    wrapper.querySelectorAll('span').forEach((ele) => {
      const { color = '' } = ele.dataset || {};
      ele.style.backgroundColor = color;
    });
  });
  
  // 工具样式设置
  J_ToolbarItemSettings.forEach(settings => {
    settings.addEventListener('click', e => {
      const type = e.currentTarget?.dataset?.type;
      const width = e.target?.dataset?.width;
      const color = e.target?.dataset?.color;

      if (!type) {
        return;
      }
      
      // 所有设置项
      const settingItems = e.target.parentElement.children;
      // 去掉所有设置项高亮
      for (const item of settingItems) {
        item.classList.remove('active');
      }
      // 高亮当前点击的设置项
      e.target.classList.add('active');

      // 设置描边宽度/形状尺寸
      if (width) {
        if (type === 'ARROW') {
          const size = e.target?.dataset?.size;
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            size,
          });
        } else if (type === 'BRUSH' || type === 'MOSAIC') {
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            strokeWidth: Number(width),
          });
        } else {
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            strokeWidth: Number(width),
          });
        }
      }
  
      // 设置颜色
      if (color) {
        if (type === 'ARROW') {
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            color,
          });
        } else if (type === 'BRUSH') {
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            stroke: color,
          });
        } else if (type === 'TEXT') {
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            color,
          });
        } else {
          fabricCapture.setTypeConfig(SHAPE_TYPE[type], {
            stroke: color,
          });
        }
      }
    }, false);
  });

  // 字号改变
  J_FontSizeSelect.addEventListener('change', e => {
    fabricCapture.setTypeConfig(SHAPE_TYPE.TEXT, {
      size: Number(e.target.value),
    });
  }, false);

  // 矩形工具
  J_SelectionRect.addEventListener('click', e => {
    setDrawingTool(J_SelectionRect, document.querySelector('[data-type="RECT"]'), fabricCapture, SHAPE_TYPE.RECT, true);
  });

  // 椭圆工具
  J_SelectionEllipse.addEventListener('click', e => {
    setDrawingTool(J_SelectionEllipse, document.querySelector('[data-type="ELLIPSE"]'), fabricCapture, SHAPE_TYPE.ELLIPSE, true);
  });

  // 箭头工具
  J_SelectionArrow.addEventListener('click', e => {
    setDrawingTool(J_SelectionArrow, document.querySelector('[data-type="ARROW"]'), fabricCapture, SHAPE_TYPE.ARROW, true);
  });

  // 画笔工具
  J_SelectionBrush.addEventListener('click', e => {
    setDrawingTool(J_SelectionBrush, document.querySelector('[data-type="BRUSH"]'), fabricCapture, SHAPE_TYPE.BRUSH, true);
  });

  // 马赛克工具
  J_SelectionMosaic.addEventListener('click', e => {
    setDrawingTool(J_SelectionMosaic, document.querySelector('[data-type="MOSAIC"]'), fabricCapture, SHAPE_TYPE.MOSAIC, true);
  });

  // 文字工具
  J_SelectionText.addEventListener('click', e => {
    setDrawingTool(J_SelectionText, document.querySelector('[data-type="TEXT"]'), fabricCapture, SHAPE_TYPE.TEXT, true);
  });

  // 撤销到上一步
  J_SelectionUndo.addEventListener('click', e => {
    fabricCapture.undoCanvas();
  });

  // 选区重置 (暂不使用该功能)
  // J_SelectionReset.addEventListener('click', e => {
  //   fabricCapture.clearCanvas()
  // })

  // 截屏下载
  J_SelectionDownload.addEventListener('click', async e => {
    await fabricCapture.show();
    const dataURL = fabricCapture.getCanvasDataURL();

    // 保存截屏图片
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT_SAVE_FILE, dataURL);
  });

  // 截屏退出
  J_SelectionCancel.addEventListener('click', e => {
    window.close();
  });

  // 复制到剪切板
  J_SelectionConfirm.addEventListener('click', e => {
    selectionCapture();
  });
  //#endregion

});

//#region rgb to hex
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
//#endregion