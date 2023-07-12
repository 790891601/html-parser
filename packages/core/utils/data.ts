export function deepCopy(obj, cache = new WeakMap()) {
    // 如果是基本数据类型或者null，直接返回原对象
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // 检查缓存，避免无限递归
    if (cache.has(obj)) {
      return cache.get(obj);
    }
    
    // 创建一个新的对象或数组
    const copy = Array.isArray(obj) ? [] : {};
    
    // 将新对象添加到缓存
    cache.set(obj, copy);
    
    // 递归地复制每个属性
    for (let key in obj) {
      copy[key] = deepCopy(obj[key], cache);
    }
    
    return copy;
  }