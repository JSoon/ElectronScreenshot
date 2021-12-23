/**
 * 公共工具库
 */
const fabric = require('fabric').fabric;

// 扩展 fabric 对象属性, 使其能够被序列化, 否则 obj.toObject() 中不会存在自定义属性
const extendFaricObjectProperty = (obj, properties = []) => {
  obj.toObject = (function(toObject) {
    return function(propertiesToInclude) {
      return fabric.util.object.extend(toObject.apply(this, [propertiesToInclude]), {
        ...properties.reduce((acc, property) => ({ ...acc, [property]: this[property]}), {}), 
      });
    };
  })(obj.toObject);
};

module.exports = {
  extendFaricObjectProperty,
};