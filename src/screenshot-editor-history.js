/**
 * 画布编辑操作历史
 */
const J_SelectionEditorWrapper = document.querySelector('#J_SelectionEditorWrapper')

class HistoryType {
  static Add = 'Add'
  static Modify = 'Modify'
  static Remove = 'Remove'
}

class HistoryItem {
  constructor (type, object) {
    return {
      type,
      object
    }
  }
}

class History {
  state = []
  bgState = []
  canvas = null

  constructor (canvas) {
    this.canvas = canvas
  }

  // 添加操作历史, 触发条件: 对象添加 & 修改
  push (type, object) {
    if (object?.type === 'image') {
      return
    }

    // const newState = JSON.stringify(this.canvas)
    // 
    /**
     * 编辑画布最新状态
     * NOTE: toObject 会导致某些属性丢失, 所以需要手动设置 propertiesToInclude 以保证从 JSON 还原时的状态
     * 
     * @see {@link https://github.com/fabricjs/fabric.js/issues/3873}
     * @see {@link https://stackoverflow.com/questions/41286547/fabric-js-extending-toobject-with-custom-properties-loses-default-ones}
     */
    const newState = this.canvas.toObject([
      'cacheKey',
      'clipPath',
      'erasable',
      'evented',
      'filters',
      'hasBorders',
      'hasControls',
      'hoverCursor',
      'lockRotation',
      'lockScalingX',
      'lockScalingY',
      'selectable',
    ])
    console.log('newState', newState);
    // this.state.push(new HistoryItem(type, newState))
    this.state.push(new HistoryItem(type, JSON.stringify(newState)))

    // 更新编辑画布容器背景图
    const newStateImg = this.canvas.toDataURL({
      enableRetinaScaling: true
    })
    this.bgState.push(newStateImg)
    J_SelectionEditorWrapper.style.backgroundImage = `url(${newStateImg})`

    console.log('history', this.state)
  }

  // 撤销操作历史: 点击撤销按钮触发, 同时移除记录, 将对象还原到上一步
  pop (callback = () => {}) {
    if (this.state.length > 1) {
      this.state.pop()

      // 更新编辑画布容器背景图
      this.bgState.pop()
      const newStateImg = this.bgState[this.bgState.length - 1]
      J_SelectionEditorWrapper.style.backgroundImage = `url(${newStateImg})`
          
      callback()
    }

    console.log('history', this.state)
  }

  clear () {
    this.state = []
  }
}

module.exports = {
  HistoryType,
  History
}