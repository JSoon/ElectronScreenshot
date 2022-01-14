const { exec } = require('child_process');

/**
 * fabric 自定义构建: 排除非必要模块构建 (手势操作, 支持 Node 下运行 canvas)
 * 
 * @see {@link https://github.com/fabricjs/fabric.js#optional-modules}
 */
exec('node build.js modules=ALL exclude=gestures,node', {
  cwd: './node_modules/fabric',
}, (error, stdout, stderr) => {
  if (error) {
    console.error(`error: ${error.message}`);
    return;
  }
  if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
  }
  console.info(`stdout: ${stdout}`);
});