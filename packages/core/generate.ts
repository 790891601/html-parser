//3.用来根据JavaScript AST生成渲染函数代码的生成器（generator）
export function generate(node, options={}) {
    if (node.type === 'Root') {
      // 处理根节点
      return generateChildrenCode(node.children);
    } else if (node.type === 'Element') {
      // 处理元素节点
      const attrs = generateAttributesCode(node.attrs);
      const children = generateChildrenCode(node.children);
      return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
    } else if (node.type === 'Text') {
      // 处理文本节点
      return node.content;
    }
  }
  
  function generateAttributesCode(attrs) {
    if (!Array.isArray(attrs) || attrs.length === 0) {
      return '';
    }
    return ' ' + attrs.map(attr => `${attr.name}="${attr.value}"`).join(' ');
  }
  
  function generateChildrenCode(children) {
    if (!Array.isArray(children) || children.length === 0) {
      return '';
    }
    return children.map(child => generate(child)).join('');
  }