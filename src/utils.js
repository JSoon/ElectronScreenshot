/**
 * 公共工具库
 */
const fabric = require('fabric').fabric;

// 生成截图文件名称
const getFilename = () => {
  const d = new Date();
  const year = d.getFullYear().toString();
  let month = d.getMonth() + 1;
  month = month < 10 ? `0${month}` : month.toString();
  let day = d.getDate();
  day = day < 10 ? `0${day}` : day.toString();
  let hour = d.getHours();
  hour = hour < 10 ? `0${hour}` : hour.toString();
  let minute = d.getMinutes();
  minute = minute < 10 ? `0${minute}` : minute.toString();
  let second = d.getSeconds();
  second = second < 10 ? `0${second}` : second.toString();
  
  return `海螺截图_${year}${month}${day}_${hour}${minute}${second}`;
};

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
  getFilename,
  extendFaricObjectProperty,
};