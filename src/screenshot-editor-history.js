/**
 * 画布编辑操作历史
 */

const fabric = require("fabric").fabric;
const Arrow = require("./components/arrow")
const _ = require('lodash')

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

// 获取最后操作对象上一步状态
function getLastObjPrevState (state = [], lastState) {
  let prevState = null
  const { type, object } = lastState

  // 若最后操作为添加, 则上一步状态为 null
  if (type === HistoryType.Add) {
    return prevState
  }

  // 若最后操作为修改, 则查询最近一步状态
  if (type === HistoryType.Modify) {
    for (let i = state.length - 2; i >= 0; i -= 1) {
      if (state[i].object.id === object.id) {
        prevState = state[i]
        break
      }
    }
    return prevState
  }

  return prevState
}

class History {
  state = []

  // 添加操作历史: 对象添加事件触发
  push (type, object) {
    if (!object) {
      return this.state
    }
    
    // 过滤背景图
    if (object.__TYPE__ === 'BACKGROUND') {
      return this.state
    }

    // 新增操作, 为对象添加id
    if (!object.id) {
      object.set('id', new Date().getTime())
    }

    // const newObj = fabric.util.object.clone(object)
    // // 设置原始对象引用
    // newObj.originObject = object
    // this.state.push(new HistoryItem(type, newObj))
    // console.log('history', this.state)
    
    object.clone((cloneObj) => {
      // 设置原始对象引用
      cloneObj.originObject = object
      this.state.push(new HistoryItem(type, cloneObj))
      console.log('history', this.state)
    })

    
    // const newObj = _.cloneDeep(object)
    // console.log('object', object);
    // console.log('newObj', newObj);
    // // 设置原始对象引用
    // newObj.originObject = object
    // this.state.push(new HistoryItem(type, newObj))
    // console.log('history', this.state)

    return this.state
  }

  // 撤销操作历史: 点击撤销按钮触发, 同时移除记录, 将对象还原到上一步
  pop (canvas) {
    if (!this.state.length) {
      return
    }

    const lastState = this.state[this.state.length - 1]
    const lastObjPrevState = getLastObjPrevState(this.state, lastState)

    // 若无上一步状态, 则移除最后状态对象
    if (!lastObjPrevState) {
      canvas.remove(lastState.object.originObject)
    }
    // 若存在上一步状态, 则还原到上一步状态
    else {
      // 遍历所有状态
      lastObjPrevState.object.stateProperties.forEach(property => {
        // 仅设置存在的属性值
        if (lastObjPrevState.object[property]) {
          lastState.object.originObject.set(property, lastObjPrevState.object[property])
        }
      })
    }
    canvas.renderAll()

    this.state.pop()
    


    // // 移除箭头组合形状
    // if (lastObj.__TYPE__ === 'ARROW') {
    //   const [arrowHead, arrowLine, arrowTail] = Arrow.getArrowGroup(lastObj);
    //   canvas.remove(arrowHead);
    //   canvas.remove(arrowLine);
    //   canvas.remove(arrowTail);
    // }
    // // 移除其他单个形状
    // else {
    //   canvas.remove(lastObj);
    // }
    console.log('history', this.state)
    return this.state
  }

  clear () {
    this.state = []
  }
}

module.exports = {
  HistoryType,
  history: new History()
}