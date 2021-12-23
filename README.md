# Electron Screenshot

基于 [Electron](https://www.electronjs.org/) 开发的截屏软件.

![demo](./src/assets/image/demo.png)

# Usage

```bash
# 1. 安装依赖
npm i

# 2. fabric 自定义构建: 新增 erasing 模块 (执行命令前需全局安装 uglify-js), 排除非必要的模块
cd node_modules/fabric
# 排除非必要模块构建: 手势操作, 支持 Node 下运行 canvas
node build.js modules=ALL exclude=gestures,node

# 3. 运行
npm run start
```

# Build

```bash
# 打包 mac
npm run dist:mac

# 打包 win
npm run dist:win
```

构建前请先看[这里](https://zhuanlan.zhihu.com/p/110448415), 解决构建源下载超时的问题.

# Windows 下可能遇到的问题

> ⚠️注: 若 canvas 不需要在 Node 环境下运行 (即 Electron 应用主线程), 则无需考虑构建 node-canvas 原生模块构建. 本项目 canvas 运行在渲染进程, 故无需进行原生模块构建.

Windows 下进行 node-canvas 原生模块构建时, 由于 Node, Electron 版本的不同, 可能会导致很多棘手的问题, 这些问题多是涉及到 c++ 和 v8, 因而对于前端开发者而言, 很难定位和解决.

若还不知道如何搭建 node-canvas 原生模块构建环境, 请参考[这里](http://jsoon.fun/front-end/views/blog-electron-node-canvas/index.html).

## ['toupper': is not a member of 'std'](https://github.com/Automattic/node-canvas/issues/1848)

解决方案如下, 修改 `node_modules/canvas/src/util.h` 代码:

```h
// Line 31
return c1 == c2 || std::toupper(c1) == std::toupper(c2);
```

修改为:

```h
// std:: -> ::
return c1 == c2 || ::toupper(c1) == ::toupper(c2);
```

## [Canvas.obj : error LNK2001: unresolved external symbol "__declspec\(dllimport\) public: class std::shared_ptr\<class v8::BackingStore\> __cdecl v8::ArrayBuffer::GetBackingStore\(void\)](https://github.com/nodejs/nan/issues/892)

解决方案如下, 修改 `node_modules/nan/nan_typedarray_contents.h` 代码:

```h
// Line 36 - 40
#if (V8_MAJOR_VERSION >= 8)
  data = static_cast<char*>(buffer->GetBackingStore()->Data()) + byte_offset;
#else
  data = static_cast<char*>(buffer->GetContents().Data()) + byte_offset;
#endif
```

修改为:

```h
// 去掉判断
data = static_cast<char*>(buffer->GetContents().Data()) + byte_offset;
```

## 其他相关问题链接

[Electron-rebuild canvas 2.6.1 fails on Windows 10: Canvas.obj : error LNK2001: unresolved external symbol](https://github.com/Automattic/node-canvas/issues/1589)

[[Bug]: Link error for native c++ modules](https://github.com/electron/electron/issues/29893)

# Features

- [x] 截屏图片复制到剪切板
- [x] 截屏选区重置
- [x] 截屏图片下载
- [x] 截屏退出
- [x] 鼠标跟随信息 (当前坐标, 当前屏幕取色) 
- [x] 矩形框工具
- [x] 椭圆形框工具
- [x] 箭头工具
- [x] 画笔工具
- [x] 马赛克工具 🤩
- [x] 文字工具
- [x] 撤销工具 🤩

# Issues

- [ ] [截图图片鼠标无法隐藏](https://github.com/electron/electron/issues/7584)
- [x] ~~[Mac-10.13.6] 截屏窗口打开后, 由于是simpleFullscreen状态, 系统菜单栏会被隐藏, 退出截屏后仍然处于隐藏状态~~ (已使用非全屏方式规避)
- [x] [Mac 下构建 Windows 报错: exited with code ERR_ELECTRON_BUILDER_CANNOT_EXECUTE](https://github.com/electron-userland/electron-builder/issues/4629#issuecomment-591312152)
- 其他兼容性问题待测试