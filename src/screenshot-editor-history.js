/**
 * 画布编辑操作历史
 */

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
    // debugger
    const newState = this.canvas.toObject([
      'hasBorders',
      'hasControls',
      'lockScalingX',
      'lockScalingY',
      'lockRotation',
    ])
    this.state.push(new HistoryItem(type, newState))

    console.log('history', this.state)
  }

  // 撤销操作历史: 点击撤销按钮触发, 同时移除记录, 将对象还原到上一步
  pop (callback = () => {}) {
    if (this.state.length > 1) {
      this.state.pop()
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