# Electron Screenshot

基于 [Electron](https://www.electronjs.org/) 开发的截屏软件

# Usage

```bash
1. 设置npm国内镜像地址
npm set registry https://registry.npm.taobao.org/
npm set electron_mirror https://npm.taobao.org/mirrors/electron/

2. 安装
npm i

3. 运行
npm run start
```

# Todos

- [x] 截屏图片复制到剪切板
- [x] 截屏选区重置
- [x] 截屏图片下载
- [x] 截屏取消
- [ ] 鼠标跟随信息 (当前坐标, 当前屏幕取色🤔) 
- [ ] 矩形框工具
- [ ] 圆形框工具
- [ ] 箭头工具
- [ ] 画笔工具
- [ ] 马赛克工具🤔
- [ ] 文字工具
- [ ] 撤销工具 (操作缓存)
- [ ] 工具栏图标

# Issues

- [截图图片鼠标无法隐藏](https://github.com/electron/electron/issues/7584)
- 其他兼容性问题待测试