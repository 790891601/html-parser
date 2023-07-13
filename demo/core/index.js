// packages/core/utils/constants.ts
var TagState = {
  //标签模式
  initial: 1,
  // 初始状态
  tagOpen: 2,
  //标签开始状态
  tagName: 3,
  // 标签名称状态
  text: 4,
  //文本状态
  tagEnd: 5,
  //结束标签状态
  tagEndName: 6
  // 结束标签名称状态
};
var toggleMode = (context, mode) => {
  context.oldMode = context.mode;
  context.mode = mode;
};
var revertMode = (context) => {
  context.mode = context.oldMode;
};

// packages/core/utils/advance.ts
function advanceBy(context, by) {
  context.source = context.source.slice(by);
}
function advanceSpaces(context) {
  let { source } = context;
  context.source = source.replace(/^[\r\f\t\n ]+/, "");
}

// packages/core/utils/element.ts
var unary = [
  "br",
  "hr",
  "img",
  "input",
  "meta",
  "link",
  "area",
  "base",
  "col",
  "command",
  "embed",
  "keygen",
  "param",
  "source",
  "track",
  "wbr"
];
function isUnary(tagName) {
  return unary.includes(tagName);
}
function closeElement(element) {
  if (element.unary) {
    element.tagStatus = TagState.tagEnd;
  }
}

// packages/core/utils/data.ts
function deepCopy(obj, cache = /* @__PURE__ */ new WeakMap()) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (cache.has(obj)) {
    return cache.get(obj);
  }
  const copy = Array.isArray(obj) ? [] : {};
  cache.set(obj, copy);
  for (let key in obj) {
    copy[key] = deepCopy(obj[key], cache);
  }
  return copy;
}

// packages/core/htmlParser.ts
function tokenize(template) {
  const tokens = [];
  return tokens;
}
var idx = BigInt(1);
var HTMLParser = class {
  _options;
  constructor(options = {}) {
    this._options = {
      ...options,
      id: idx
    };
  }
  parser(template) {
    const root = {
      id: this._options.id++,
      type: "Root" /* Root */,
      children: [],
      pid: BigInt(0)
    };
    const context = {
      source: template,
      mode: 0 /* DATA */,
      oldMode: 0 /* DATA */,
      type: "Root" /* Root */,
      children: [],
      pid: root.id
    };
    root.children = this.parseChildren(context);
    return root;
  }
  parseChildren(context, ancestors = []) {
    let nodes = [];
    while (this.isEnd(context, ancestors)) {
      const { mode, source, pid } = context;
      let node;
      if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) {
        if (source.startsWith("<![CDATA[")) {
          toggleMode(context, 3 /* CDATA */);
          continue;
        } else if (mode === 0 /* DATA */ && source[0] === "<") {
          if (source[1] === "!") {
            if (source.startsWith("<!--")) {
              node = this.parseComment(context, ancestors);
            }
          } else if (/[a-z]/i.test(source[1])) {
            node = this.parseElement(context, ancestors);
          } else if (source[1] === "/") {
            return nodes;
          }
        } else if (mode === 1 /* RCDATA */ || mode === 0 /* DATA */ && source[1] === "/") {
          throw new Error("\u4E0D\u662FDATA\u6A21\u5F0F");
        } else if (source.startsWith("{{")) {
          node = this.parseInterpolation(context);
        }
        if (!node) {
          node = this.parseText(context);
        }
        node.pid = pid;
        nodes.push(node);
      } else if (mode === 3 /* CDATA */) {
        if (source.startsWith("<![CDATA[")) {
          node = this.parseCDATA(context, ancestors);
          revertMode(context);
        }
        nodes.push(node);
      }
    }
    return nodes;
  }
  isEnd(context, ancestors) {
    if (context.source) {
      return true;
    }
  }
  parseText(context) {
    let { mode, source } = context;
    const match = source.match(/[^<>]*/);
    let content = "";
    if (match[0]) {
      advanceBy(context, match[0].length);
      content = match[0];
    }
    return {
      id: this._options.id++,
      type: "Text" /* Text */,
      content,
      pid: context.pid
    };
  }
  parseInterpolation(context) {
    const { source } = context;
    const match = source.match(/^\{\{\s*(.*?)\s*\}\}/);
    advanceBy(context, match[0].length);
    return {
      id: this._options.id++,
      type: "Interpolation" /* Interpolation */,
      content: [match[0], match[1]],
      pid: context.pid
    };
  }
  parseElement(context, ancestors) {
    let { source } = context;
    const match = source.match(/^<([a-z][a-zA-Z-]*)/);
    if (!match) {
      throw new Error("\u6807\u7B7E\u683C\u5F0F\u4E0D\u6B63\u786E");
    }
    const tagName = match[1];
    const isUnaryTag = isUnary(tagName);
    context.source = source.slice(match[0].length);
    const element = {
      //这个状态栈，子元素需要匹配它是否需要闭合,或者它可能是自闭合的标签
      tagStatus: TagState.tagName,
      //内容状态
      tagName,
      //标签名称
      unary: isUnaryTag
    };
    const attrs = this.parseAttribute(context, element);
    const ElementNode2 = {
      id: this._options.id++,
      type: "Element" /* Element */,
      tagName,
      children: [],
      attrs,
      pid: context.pid
    };
    if (isUnaryTag) {
      closeElement(element);
    } else {
      ancestors.push(element);
      element.tagStatus = TagState.text;
      const matchTagEnd = context.source.match(`(.*?)<\\/${tagName}>`);
      if (matchTagEnd) {
        context.pid = ElementNode2.id;
        ElementNode2.children = this.parseChildren(context, ancestors);
      } else {
        throw new Error("\u6807\u7B7E\u5FC5\u987B\u8981\u6709\u7ED3\u675F");
      }
      const ancestor = ancestors.pop();
      if (ancestor) {
        advanceBy(context, ancestor.tagName.length + 2);
        advanceSpaces(context);
        advanceBy(context, 1);
      } else {
        throw new Error("\u4E0D\u5408\u6CD5\u7684\u6807\u7B7E");
      }
    }
    return ElementNode2;
  }
  parseAttribute(context, element) {
    const attrReg = /(:?[a-zA-Z][a-zA-Z-]*)\s*(?:(=)\s*(?:(["'])([^"'<>]*)\3|([^\s"'<>]*)))?/;
    const attributes = [];
    advanceSpaces(context);
    let attrMatch;
    while (context.source[0] !== "<" && context.source[0] !== ">") {
      attrMatch = context.source.match(attrReg);
      advanceBy(context, attrMatch[0].length);
      attributes.push([attrMatch[0], attrMatch[1], attrMatch[2], attrMatch[4]]);
      advanceSpaces(context);
      if (context.source[0] === "/" && element.unary) {
        advanceBy(context, 1);
      }
      advanceSpaces(context);
    }
    advanceBy(context, 1);
    return attributes;
  }
  //注释
  parseComment(context, ancestors) {
    let { source } = context;
    let value = "";
    source = source.slice(4);
    source = source.replace(/([\s\S]*?)(-->)/, function(match, $1, $2) {
      value = $1;
      return $2 ? $2 : "";
    });
    if (source.startsWith("-->")) {
      context.source = source.slice(3);
    } else {
      value = context.source;
      context.source = "";
    }
    return {
      id: this._options.id++,
      type: "Comment" /* Comment */,
      content: value,
      pid: context.pid
    };
  }
  parseCDATA(context, ancestors) {
    const cdataMatch = context.source.match(/^<!\[CDATA\[([\s\S]*?)\]\]/);
    advanceBy(context, cdataMatch[0].length);
    return {
      id: this._options.id++,
      type: "CDATA" /* CDATA */,
      content: cdataMatch[1],
      pid: context.pid
    };
  }
};
function createInsNode(node) {
  const insNode = {
    id: idx++,
    type: "Element" /* Element */,
    tagName: "ins",
    attrs: [],
    children: [node],
    pid: node.pid
  };
  node.pid = insNode.id;
  return insNode;
}
function createDelNode(node) {
  const delNode = {
    id: idx++,
    type: "Element" /* Element */,
    tagName: "del",
    attrs: [],
    children: [node],
    pid: node.pid
  };
  node.pid = delNode.id;
  return delNode;
}

// packages/core/generate.ts
function generate(node, options = {}) {
  if (node.type === "Root" /* Root */) {
    return generateChildrenCode(node.children);
  } else if (node.type === "Element" /* Element */) {
    const attrs = generateAttributesCode(node.attrs);
    const children = generateChildrenCode(node.children);
    return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
  } else if (node.type === "Text" /* Text */) {
    return node.content;
  }
}
function generateAttributesCode(attrs) {
  if (!Array.isArray(attrs) || attrs.length === 0) {
    return "";
  }
  return " " + attrs.map((attr) => `${attr.name}="${attr.value}"`).join(" ");
}
function generateChildrenCode(children) {
  if (!Array.isArray(children) || children.length === 0) {
    return "";
  }
  return children.map((child) => generate(child)).join("");
}

// packages/core/transform.ts
function transform(ast, options = {}) {
  const { nodeTransforms = [], directiveTransforms = {}, diffAst = {} } = options;
  const context = {
    ast: deepCopy(ast),
    diffAst: deepCopy(diffAst),
    nodeTransforms: [
      // transformIf,
      // transformFor,
      // transformText,
      // transformDiff,
      // transformElement,
      ...nodeTransforms.filter((item) => Array.isArray(item) ? item[0] !== "all" : true)
    ],
    directiveTransforms: {
      // on: transformOn,
      // bind: transformBind,
      // model: transformModel
      ...directiveTransforms
    }
  };
  const nodeTransformAll = nodeTransforms.filter((item) => Array.isArray(item) && item[0] === "all").flatMap((f) => f[1]);
  callNodeTransforms(context.ast, {
    ...context,
    nodeTransforms: nodeTransformAll
  });
  traverseNode(context.ast, context);
  return generate(context.ast, options);
}
function callNodeTransforms(node, context) {
  const { nodeTransforms, onEnter, onExit } = context;
  const exitFns = [];
  typeof onEnter === "function" && onEnter(node, context);
  for (let i2 = 0; i2 < nodeTransforms.length; i2++) {
    const onExit2 = nodeTransforms[i2](node, context);
    if (onExit2) {
      if (Array.isArray(onExit2)) {
        exitFns.push(...onExit2);
      } else {
        exitFns.push(onExit2);
      }
    }
  }
  typeof onExit === "function" && onExit(node, context);
  let i = exitFns.length;
  while (i--) {
    exitFns[i]();
  }
}
function traverseNode(node, context) {
  callNodeTransforms(node, {
    ...context,
    onEnter: () => {
      context.currentNode = node;
    },
    onExit: () => {
      traverseChildren(node, context);
      context.currentNode = node;
    }
  });
}
function traverseChildren(node, context) {
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      traverseNode(node.children[i], context);
    }
  }
}
export {
  HTMLParser,
  createDelNode,
  createInsNode,
  tokenize,
  transform
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vcGFja2FnZXMvY29yZS91dGlscy9jb25zdGFudHMudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS91dGlscy9hZHZhbmNlLnRzIiwgIi4uLy4uL3BhY2thZ2VzL2NvcmUvdXRpbHMvZWxlbWVudC50cyIsICIuLi8uLi9wYWNrYWdlcy9jb3JlL3V0aWxzL2RhdGEudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS9odG1sUGFyc2VyLnRzIiwgIi4uLy4uL3BhY2thZ2VzL2NvcmUvZ2VuZXJhdGUudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS90cmFuc2Zvcm0udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBjb25zdCBMRUdFTkRTID0ge1xyXG4gICAgJ0FEREVEJzogJ2FkZGVkJyxcclxuICAgICdSRU1PVkVEJzogJ3JlbW92ZWQnLFxyXG59XHJcblxyXG4vL1x1NjcwOVx1OTY1MFx1NzJCNlx1NjAwMVx1ODFFQVx1NTJBOFx1NjczQVxyXG5leHBvcnQgZW51bSBUZXh0TW9kZXMge1xyXG4gICAgLy9cdTlFRDhcdThCQTRcdTZBMjFcdTVGMEYgXHU5MDQ3XHU1MjMwXHU1QjU3XHU3QjI2IDwgXHU2NUY2XHVGRjBDXHU0RjFBXHU1MjA3XHU2MzYyXHU1MjMwXHU2ODA3XHU3QjdFXHU1RjAwXHU1OUNCXHU3MkI2XHU2MDAxIFx1OTA0N1x1NTIzMFx1NUI1N1x1N0IyNiAmIFx1NjVGNlx1RkYwQ1x1NEYxQVx1NTIwN1x1NjM2Mlx1NTIzMFx1NUI1N1x1N0IyNlx1NUYxNVx1NzUyOFx1NzJCNlx1NjAwMVx1ODBGRFx1NTkxRlx1NTkwNFx1NzQwNiBIVE1MIFx1NUI1N1x1N0IyNlx1NUI5RVx1NEY1M1xyXG4gICAgREFUQT0wLFxyXG4gICAgLy88dGl0bGU+IFx1NjgwN1x1N0I3RVx1MzAwMTx0ZXh0YXJlYT4gXHU2ODA3XHU3QjdFIFx1OTA0N1x1NTIzMFx1NUI1N1x1N0IyNiA8IFx1NjVGNlx1RkYwQ1x1NTIwN1x1NjM2Mlx1NTIzMCBSQ0RBVEEgbGVzcy10aGFuIHNpZ24gc3RhdGUgXHU3MkI2XHU2MDAxXHU5MDQ3XHU1MjMwXHU1QjU3XHU3QjI2IC9cdUZGMENcdTUyMDdcdTYzNjJcdTUyMzAgUkNEQVRBIFx1NzY4NFx1N0VEM1x1Njc1Rlx1NjgwN1x1N0I3RVx1NzJCNlx1NjAwMVx1NTcyOFx1NEUwRFx1NEY3Rlx1NzUyOFx1NUYxNVx1NzUyOFx1N0IyNlx1NTNGNyAmIFx1NzY4NFx1NjBDNVx1NTFCNVx1NEUwQlx1RkYwQ1JDREFUQSBcdTZBMjFcdTVGMEZcdTRFMERcdTRGMUFcdThCQzZcdTUyMkJcdTY4MDdcdTdCN0VcdUZGMENcdTU5ODJcdTRFMEJcdTRFRTNcdTc4MDFcdTRGMUFcdTYyOEEgPCBcdTVGNTNcdTUwNUFcdTY2NkVcdTkwMUFcdTdCMjZcdTUzRjdcdTgwMENcdTY1RTBcdTZDRDVcdThCQzZcdTUyMkJcdTUxODVcdTkwRThcdTc2ODQgZGl2IFx1NjgwN1x1N0I3RVxyXG4gICAgUkNEQVRBPTEsXHJcbiAgICAvLzxzdHlsZT5cdTMwMDE8eG1wPlx1MzAwMTxpZnJhbWU+XHUzMDAxPG5vZW1iZWQ+XHUzMDAxPG5vZnJhbWVzPlx1MzAwMTxub3NjcmlwdD4gXHU3QjQ5XHVGRjBDXHU0RTBFIFJDREFUQSBcdTZBMjFcdTVGMEZcdTdDN0JcdTRGM0NcdUZGMENcdTUzRUFcdTY2MkZcdTRFMERcdTY1MkZcdTYzMDEgSFRNTCBcdTVCOUVcdTRGNTNcclxuICAgIFJBV1RFWFQ9MixcclxuICAgIC8vPCFbQ0RBVEFbIFx1NUI1N1x1N0IyNlx1NEUzMiAgXHU0RUZCXHU0RjU1XHU1QjU3XHU3QjI2XHU5MEZEXHU0RjVDXHU0RTNBXHU2NjZFXHU5MDFBXHU1QjU3XHU3QjI2XHU1OTA0XHU3NDA2XHVGRjBDXHU3NkY0XHU1MjMwXHU5MDQ3XHU1MjMwIENEQVRBIFx1NzY4NFx1N0VEM1x1Njc1Rlx1NjgwN1x1NUZEN1x1NEUzQVx1NkI2MlxyXG4gICAgQ0RBVEE9MyxcclxuICAgIENPTU1FTlQ9NCwgLy9cdTZDRThcdTkxQ0FcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBUYWdTdGF0ZSA9IHsgLy9cdTY4MDdcdTdCN0VcdTZBMjFcdTVGMEZcclxuICAgIGluaXRpYWw6IDEsIC8vIFx1NTIxRFx1NTlDQlx1NzJCNlx1NjAwMVxyXG4gICAgdGFnT3BlbjogMiwgLy9cdTY4MDdcdTdCN0VcdTVGMDBcdTU5Q0JcdTcyQjZcdTYwMDFcclxuICAgIHRhZ05hbWU6IDMsIC8vIFx1NjgwN1x1N0I3RVx1NTQwRFx1NzlGMFx1NzJCNlx1NjAwMVxyXG4gICAgdGV4dDogNCwgLy9cdTY1ODdcdTY3MkNcdTcyQjZcdTYwMDFcclxuICAgIHRhZ0VuZDogNSwgLy9cdTdFRDNcdTY3NUZcdTY4MDdcdTdCN0VcdTcyQjZcdTYwMDFcclxuICAgIHRhZ0VuZE5hbWU6IDYgLy8gXHU3RUQzXHU2NzVGXHU2ODA3XHU3QjdFXHU1NDBEXHU3OUYwXHU3MkI2XHU2MDAxXHJcbn1cclxuXHJcbi8vXHU1MjA3XHU2MzYyXHU2NTg3XHU2NzJDXHU2QTIxXHU1RjBGXHJcbmV4cG9ydCBjb25zdCB0b2dnbGVNb2RlID0gKGNvbnRleHQsIG1vZGUpID0+IHtcclxuICAgIGNvbnRleHQub2xkTW9kZSA9IGNvbnRleHQubW9kZTtcclxuICAgIGNvbnRleHQubW9kZSA9IG1vZGU7XHJcbn1cclxuLy9cdTYwNjJcdTU5MERcdTZBMjFcdTVGMEZcclxuZXhwb3J0IGNvbnN0IHJldmVydE1vZGUgPSAoY29udGV4dCkgPT4ge1xyXG4gICAgY29udGV4dC5tb2RlID0gY29udGV4dC5vbGRNb2RlO1xyXG59XHJcbiIsICIvKlx1NjYyRlx1NTQyNlx1NEUzQVx1N0E3QSovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0V4aXN0cyhjb250ZXh0LCBhbmNlc3RvcnMpIHtcclxuICAgIHJldHVybiBjb250ZXh0LnNvdXJjZTtcclxufVxyXG4vL1x1NkQ4OFx1OEQzOVx1NjMwN1x1NUI5QVx1OERERFx1NzlCQlx1NTE4NVx1NUJCOVxyXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZUJ5KGNvbnRleHQsIGJ5KSB7XHJcbiAgICBjb250ZXh0LnNvdXJjZSA9IGNvbnRleHQuc291cmNlLnNsaWNlKGJ5KTtcclxufVxyXG4vKioqIFx1NkQ4OFx1OEQzOVx1N0E3QVx1NjgzQyovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZHZhbmNlU3BhY2VzKGNvbnRleHQpIHtcclxubGV0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIGNvbnRleHQuc291cmNlID0gc291cmNlLnJlcGxhY2UoL15bXFxyXFxmXFx0XFxuIF0rLywgJycpO1xyXG59XHJcbiAgIiwgImltcG9ydCB7VGFnU3RhdGV9IGZyb20gJy4vaW5kZXgnXHJcblxyXG5leHBvcnQgY29uc3QgdW5hcnkgPSBbXHJcbiAgXCJiclwiLFxyXG4gIFwiaHJcIixcclxuICBcImltZ1wiLFxyXG4gIFwiaW5wdXRcIixcclxuICBcIm1ldGFcIixcclxuICBcImxpbmtcIixcclxuICBcImFyZWFcIixcclxuICBcImJhc2VcIixcclxuICBcImNvbFwiLFxyXG4gIFwiY29tbWFuZFwiLFxyXG4gIFwiZW1iZWRcIixcclxuICBcImtleWdlblwiLFxyXG4gIFwicGFyYW1cIixcclxuICBcInNvdXJjZVwiLFxyXG4gIFwidHJhY2tcIixcclxuICBcIndiclwiXHJcbl07XHJcbmV4cG9ydCBmdW5jdGlvbiBpc1VuYXJ5KHRhZ05hbWUpOiBib29sZWFuIHtcclxuICByZXR1cm4gdW5hcnkuaW5jbHVkZXModGFnTmFtZSk7XHJcbn1cclxuICBcclxuLypcdTdFRDNcdTY3NUZcdTY4MDdcdTdCN0UqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VFbGVtZW50KGVsZW1lbnQpIHtcclxuICBpZihlbGVtZW50LnVuYXJ5KSB7XHJcbiAgICBlbGVtZW50LnRhZ1N0YXR1cyA9IFRhZ1N0YXRlLnRhZ0VuZDtcclxuICB9XHJcbn1cclxuLyoqXHJcbiAqIFx1NUJGOVx1NkJENFx1NTE0M1x1N0QyMFx1NjYyRlx1NTQyNlx1NzZGOFx1NTQwQ1x1N0M3Qlx1NTc4QlxyXG4gKiBAcGFyYW0gZWxlbWVudCBcclxuICogQHBhcmFtIGVsZW1lbnRUaGVuIFxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWFsRWxlbWVudFR5cGUoZWxlbWVudCwgZWxlbWVudFRoZW4pOiBib29sZWFuIHtcclxuICBpZihlbGVtZW50LnR5cGUgPT09IGVsZW1lbnRUaGVuLnR5cGUpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn0iLCAiZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5KG9iaiwgY2FjaGUgPSBuZXcgV2Vha01hcCgpKSB7XHJcbiAgICAvLyBcdTU5ODJcdTY3OUNcdTY2MkZcdTU3RkFcdTY3MkNcdTY1NzBcdTYzNkVcdTdDN0JcdTU3OEJcdTYyMTZcdTgwMDVudWxsXHVGRjBDXHU3NkY0XHU2M0E1XHU4RkQ0XHU1NkRFXHU1MzlGXHU1QkY5XHU4QzYxXHJcbiAgICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFx1NjhDMFx1NjdFNVx1N0YxM1x1NUI1OFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NjVFMFx1OTY1MFx1OTAxMlx1NUY1MlxyXG4gICAgaWYgKGNhY2hlLmhhcyhvYmopKSB7XHJcbiAgICAgIHJldHVybiBjYWNoZS5nZXQob2JqKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gXHU1MjFCXHU1RUZBXHU0RTAwXHU0RTJBXHU2NUIwXHU3Njg0XHU1QkY5XHU4QzYxXHU2MjE2XHU2NTcwXHU3RUM0XHJcbiAgICBjb25zdCBjb3B5ID0gQXJyYXkuaXNBcnJheShvYmopID8gW10gOiB7fTtcclxuICAgIFxyXG4gICAgLy8gXHU1QzA2XHU2NUIwXHU1QkY5XHU4QzYxXHU2REZCXHU1MkEwXHU1MjMwXHU3RjEzXHU1QjU4XHJcbiAgICBjYWNoZS5zZXQob2JqLCBjb3B5KTtcclxuICAgIFxyXG4gICAgLy8gXHU5MDEyXHU1RjUyXHU1NzMwXHU1OTBEXHU1MjM2XHU2QkNGXHU0RTJBXHU1QzVFXHU2MDI3XHJcbiAgICBmb3IgKGxldCBrZXkgaW4gb2JqKSB7XHJcbiAgICAgIGNvcHlba2V5XSA9IGRlZXBDb3B5KG9ialtrZXldLCBjYWNoZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBjb3B5O1xyXG4gIH0iLCAiaW1wb3J0IHtUZXh0TW9kZXMsIFRhZ1N0YXRlLCBhZHZhbmNlQnksIGFkdmFuY2VTcGFjZXMsIGlzVW5hcnksIGNsb3NlRWxlbWVudCwgdG9nZ2xlTW9kZSwgcmV2ZXJ0TW9kZX0gZnJvbSAnLi91dGlscy9pbmRleCdcclxuaW1wb3J0IHtfcGFyc2VyT3B0aW9ucywgcGFyc2VyT3B0aW9ucywgcGFyc2VyQ29udGV4dCwgSFRNTE5vZGVUeXBlLCBFbGVtZW50Tm9kZSwgVGV4dE5vZGUsIFJvb3ROb2RlLCBDb21tZW50Tm9kZSwgTm9kZX0gZnJvbSAnLi90eXBlcydcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZSh0ZW1wbGF0ZSkge1xyXG4gIC8qKlxyXG4gICAqIFx1OEY5M1x1NTE2NVx1RkYxQTxkaXY+MTIzPC9kaXY+XHJcbiAgICogXHU4RjkzXHU1MUZBOiBbeyB0eXBlOiB0YWdPcGVuLCB0YWdOYW1lOiAnZGl2JyB9LCB7IHR5cGU6IHRleHQsIGNvbnRlbnQ6ICcxMjMnIH0sIHsgdHlwZTogdGFnRW5kLCB0YWdOYW1lOiAnZGl2JyB9XVxyXG4gICAqL1xyXG4gIGNvbnN0IHRva2VucyA9IFtdO1xyXG4gIFxyXG4gIHJldHVybiB0b2tlbnM7XHJcbn1cclxuXHJcbmxldCBpZHggPSBCaWdJbnQoMSk7XHJcbmV4cG9ydCBjbGFzcyBIVE1MUGFyc2VyIHtcclxuICBwcml2YXRlIF9vcHRpb25zOiBfcGFyc2VyT3B0aW9ucztcclxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBwYXJzZXJPcHRpb25zID0ge30pIHtcclxuICAgIHRoaXMuX29wdGlvbnMgPSB7XHJcbiAgICAgIC4uLm9wdGlvbnMsXHJcbiAgICAgIGlkOiBpZHhcclxuICAgIH07XHJcbiAgfVxyXG4gIHBhcnNlcih0ZW1wbGF0ZSkge1xyXG4gICAgY29uc3Qgcm9vdDogUm9vdE5vZGUgPSB7XHJcbiAgICAgIGlkOiB0aGlzLl9vcHRpb25zLmlkKyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5Sb290LFxyXG4gICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgIHBpZDogQmlnSW50KDApLFxyXG4gICAgfTtcclxuICAgIGNvbnN0IGNvbnRleHQ6IHBhcnNlckNvbnRleHQgPSB7XHJcbiAgICAgICAgc291cmNlOiB0ZW1wbGF0ZSxcclxuICAgICAgICBtb2RlOiBUZXh0TW9kZXMuREFUQSxcclxuICAgICAgICBvbGRNb2RlOiBUZXh0TW9kZXMuREFUQSxcclxuICAgICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuUm9vdCxcclxuICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgcGlkOiByb290LmlkLFxyXG4gICAgfVxyXG4gICAgcm9vdC5jaGlsZHJlbiA9IHRoaXMucGFyc2VDaGlsZHJlbihjb250ZXh0KTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHJvb3RcclxuICB9XHJcbiAgcGFyc2VDaGlsZHJlbihjb250ZXh0LCBhbmNlc3RvcnMgPSBbXSk6IE5vZGVbXSB7XHJcbiAgICAgIGxldCBub2RlczogTm9kZVtdID0gW107XHJcbiAgICAgIC8vIFx1NEVDRVx1NEUwQVx1NEUwQlx1NjU4N1x1NUJGOVx1OEM2MVx1NEUyRFx1NTNENlx1NUY5N1x1NUY1M1x1NTI0RFx1NzJCNlx1NjAwMVx1RkYwQ1x1NTMwNVx1NjJFQ1x1NkEyMVx1NUYwRiBtb2RlIFx1NTQ4Q1x1NkEyMVx1Njc3Rlx1NTE4NVx1NUJCOVxyXG4gICAgXHJcbiAgICAgIHdoaWxlICh0aGlzLmlzRW5kKGNvbnRleHQsIGFuY2VzdG9ycykpIHtcclxuICAgICAgICBjb25zdCB7bW9kZSwgc291cmNlLCBwaWR9ID0gY29udGV4dDtcclxuICAgICAgICBsZXQgbm9kZTsvLyBcdTUzRUFcdTY3MDkgREFUQSBcdTZBMjFcdTVGMEZcdTU0OEMgUkNEQVRBIFx1NkEyMVx1NUYwRlx1NjI0RFx1NjUyRlx1NjMwMVx1NjNEMlx1NTAzQ1x1ODI4Mlx1NzBCOVx1NzY4NFx1ODlFM1x1Njc5MFxyXG4gICAgICAgIGlmIChtb2RlID09PSBUZXh0TW9kZXMuREFUQSB8fCBtb2RlID09PSBUZXh0TW9kZXMuUkNEQVRBKSB7XHJcbiAgICAgICAgICAvLyBcdTUzRUFcdTY3MDkgREFUQSBcdTZBMjFcdTVGMEZcdTYyNERcdTY1MkZcdTYzMDFcdTY4MDdcdTdCN0VcdTgyODJcdTcwQjlcdTc2ODRcdTg5RTNcdTY3OTBcclxuICAgICAgICAgIGlmIChzb3VyY2Uuc3RhcnRzV2l0aChcIjwhW0NEQVRBW1wiKSkge1xyXG4gICAgICAgICAgICAvLyBDREFUQVxyXG4gICAgICAgICAgICB0b2dnbGVNb2RlKGNvbnRleHQsIFRleHRNb2Rlcy5DREFUQSk7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgfWVsc2UgaWYobW9kZSA9PT0gVGV4dE1vZGVzLkRBVEEgJiYgc291cmNlWzBdID09PSBcIjxcIikge1xyXG4gICAgICAgICAgICBpZihzb3VyY2VbMV0gPT09ICchJykge1xyXG4gICAgICAgICAgICAgIGlmIChzb3VyY2Uuc3RhcnRzV2l0aChcIjwhLS1cIikpIHtcclxuICAgICAgICAgICAgICAgIC8vXHU2Q0U4XHU5MUNBXHJcbiAgICAgICAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZUNvbW1lbnQoY29udGV4dCwgYW5jZXN0b3JzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKC9bYS16XS9pLnRlc3Qoc291cmNlWzFdKSkge1xyXG4gICAgICAgICAgICAgIC8vXHU2ODA3XHU3QjdFXHJcbiAgICAgICAgICAgICAgbm9kZSA9IHRoaXMucGFyc2VFbGVtZW50KGNvbnRleHQsIGFuY2VzdG9ycyk7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKHNvdXJjZVsxXSA9PT0gJy8nKSB7XHJcbiAgICAgICAgICAgICAgLy9cdTdFRDNcdTY3NUZcdTY4MDdcdTdCN0VcdTcyQjZcdTYwMDFcclxuICAgICAgICAgICAgICByZXR1cm4gbm9kZXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1lbHNlIGlmIChtb2RlID09PSBUZXh0TW9kZXMuUkNEQVRBIHx8IG1vZGUgPT09IFRleHRNb2Rlcy5EQVRBICYmIHNvdXJjZVsxXSA9PT0gXCIvXCIpIHtcclxuICAgICAgICAgICAgLy9cdTdFRDNcdTY3NUZcdTY4MDdcdTdCN0VcdUZGMENcdThGRDlcdTkxQ0NcdTk3MDBcdTg5ODFcdTYyOUJcdTUxRkFcdTk1MTlcdThCRUZcdUZGMENcdTU0MEVcdTY1ODdcdTRGMUFcdThCRTZcdTdFQzZcdTg5RTNcdTkxQ0FcdTUzOUZcdTU2RTBcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU0RTBEXHU2NjJGREFUQVx1NkEyMVx1NUYwRlwiKTtcclxuICAgICAgICAgIH1lbHNlIGlmKHNvdXJjZS5zdGFydHNXaXRoKFwie3tcIikpIHtcclxuICAgICAgICAgICAgLy9cdTYzRDJcdTUwM0NcdTg5RTNcdTY3ODRcclxuICAgICAgICAgICAgbm9kZSA9IHRoaXMucGFyc2VJbnRlcnBvbGF0aW9uKGNvbnRleHQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gbm9kZSBcdTRFMERcdTVCNThcdTU3MjhcdUZGMENcdThCRjRcdTY2MEVcdTU5MDRcdTRFOEVcdTUxNzZcdTRFRDZcdTZBMjFcdTVGMEZcdUZGMENcdTUzNzNcdTk3NUUgREFUQSBcdTZBMjFcdTVGMEZcdTRFMTRcdTk3NUUgUkNEQVRBIFx1NkEyMVx1NUYwRlxyXG4gICAgICAgICAgaWYoIW5vZGUpIHtcclxuICAgICAgICAgICAgbm9kZSA9IHRoaXMucGFyc2VUZXh0KGNvbnRleHQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbm9kZS5waWQgPSBwaWRcclxuICAgICAgICAgIG5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgfWVsc2UgaWYobW9kZSA9PT0gVGV4dE1vZGVzLkNEQVRBKSB7XHJcbiAgICAgICAgICBpZiAoc291cmNlLnN0YXJ0c1dpdGgoXCI8IVtDREFUQVtcIikpIHtcclxuICAgICAgICAgICAgLy8gQ0RBVEFcclxuICAgICAgICAgICAgbm9kZSA9IHRoaXMucGFyc2VDREFUQShjb250ZXh0LCBhbmNlc3RvcnMpO1xyXG4gICAgICAgICAgICByZXZlcnRNb2RlKGNvbnRleHQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG5vZGVzO1xyXG4gIH1cclxuICBpc0VuZChjb250ZXh0LCBhbmNlc3RvcnMpIHtcclxuICAgIC8vXHU1MTQzXHU3RDIwXHU2ODA4LFx1NUY1M1x1NTI0RFx1NUI1MFx1NTE0M1x1N0QyMFx1NjcwOVx1NUJGOVx1NUU5NFx1NjgwOFxyXG4gICAgLy8gZm9yKGxldCBpID0gMDsgaSA8IGFuY2VzdG9ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgLy8gICBpZihhbmNlc3RvcnNbaV0udGFnKSB7XHJcbiAgICAvLyAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAvLyAgIH1cclxuICAgIC8vIH1cclxuICAgIGlmKGNvbnRleHQuc291cmNlKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICAgIFxyXG4gIHBhcnNlVGV4dChjb250ZXh0KTogVGV4dE5vZGUge1xyXG4gICAgbGV0IHttb2RlLCBzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIC8vXHU1MzM5XHU5MTREXHU3RUFGXHU2NTg3XHU2NzJDXHJcbiAgICBjb25zdCBtYXRjaCA9IHNvdXJjZS5tYXRjaCgvW148Pl0qLyk7XHJcbiAgICBsZXQgY29udGVudCA9ICcnO1xyXG4gICAgaWYobWF0Y2hbMF0pIHtcclxuICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIG1hdGNoWzBdLmxlbmd0aCk7XHJcbiAgICAgIGNvbnRlbnQgPSBtYXRjaFswXTtcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlkOiB0aGlzLl9vcHRpb25zLmlkKyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5UZXh0LFxyXG4gICAgICBjb250ZW50OiBjb250ZW50LFxyXG4gICAgICBwaWQ6IGNvbnRleHQucGlkXHJcbiAgICB9XHJcbiAgfVxyXG4gIHBhcnNlSW50ZXJwb2xhdGlvbihjb250ZXh0KSB7XHJcbiAgICBjb25zdCB7c291cmNlfSA9IGNvbnRleHQ7XHJcbiAgICBjb25zdCBtYXRjaCA9IHNvdXJjZS5tYXRjaCgvXlxce1xce1xccyooLio/KVxccypcXH1cXH0vKTtcclxuICAgIGFkdmFuY2VCeShjb250ZXh0LCBtYXRjaFswXS5sZW5ndGgpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlkOiB0aGlzLl9vcHRpb25zLmlkKyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5JbnRlcnBvbGF0aW9uLFxyXG4gICAgICBjb250ZW50OiBbbWF0Y2hbMF0sIG1hdGNoWzFdXSxcclxuICAgICAgcGlkOiBjb250ZXh0LnBpZFxyXG4gICAgfVxyXG4gIH1cclxuICBwYXJzZUVsZW1lbnQoY29udGV4dCwgYW5jZXN0b3JzKTogRWxlbWVudE5vZGUge1xyXG4gICAgbGV0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICBcclxuICAgIGNvbnN0IG1hdGNoID0gc291cmNlLm1hdGNoKC9ePChbYS16XVthLXpBLVotXSopLyk7XHJcbiAgICBpZighbWF0Y2gpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU2ODA3XHU3QjdFXHU2ODNDXHU1RjBGXHU0RTBEXHU2QjYzXHU3ODZFXCIpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgdGFnTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgY29uc3QgaXNVbmFyeVRhZyA9IGlzVW5hcnkodGFnTmFtZSk7XHJcblxyXG4gICAgY29udGV4dC5zb3VyY2UgPSBzb3VyY2Uuc2xpY2UobWF0Y2hbMF0ubGVuZ3RoKTtcclxuICAgIGNvbnN0IGVsZW1lbnQgPSB7IC8vXHU4RkQ5XHU0RTJBXHU3MkI2XHU2MDAxXHU2ODA4XHVGRjBDXHU1QjUwXHU1MTQzXHU3RDIwXHU5NzAwXHU4OTgxXHU1MzM5XHU5MTREXHU1QjgzXHU2NjJGXHU1NDI2XHU5NzAwXHU4OTgxXHU5NUVEXHU1NDA4LFx1NjIxNlx1ODAwNVx1NUI4M1x1NTNFRlx1ODBGRFx1NjYyRlx1ODFFQVx1OTVFRFx1NTQwOFx1NzY4NFx1NjgwN1x1N0I3RVxyXG4gICAgICB0YWdTdGF0dXM6IFRhZ1N0YXRlLnRhZ05hbWUsIC8vXHU1MTg1XHU1QkI5XHU3MkI2XHU2MDAxXHJcbiAgICAgIHRhZ05hbWU6IHRhZ05hbWUsIC8vXHU2ODA3XHU3QjdFXHU1NDBEXHU3OUYwXHJcbiAgICAgIHVuYXJ5OiBpc1VuYXJ5VGFnLFxyXG4gICAgfSAgXHJcbiAgICAvLzEuXHU1MzM5XHU5MTREXHU1MTQzXHU3RDIwXHU1QzVFXHU2MDI3XHJcbiAgICBjb25zdCBhdHRycyA9IHRoaXMucGFyc2VBdHRyaWJ1dGUoY29udGV4dCwgZWxlbWVudCk7XHJcbiAgICBjb25zdCBFbGVtZW50Tm9kZTogRWxlbWVudE5vZGUgPSB7XHJcbiAgICAgIGlkOiB0aGlzLl9vcHRpb25zLmlkKyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5FbGVtZW50LFxyXG4gICAgICB0YWdOYW1lOiB0YWdOYW1lLFxyXG4gICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgIGF0dHJzOiBhdHRycyxcclxuICAgICAgcGlkOiBjb250ZXh0LnBpZCxcclxuICAgIH1cclxuXHJcbiAgICBpZihpc1VuYXJ5VGFnKSB7XHJcbiAgICAgIGNsb3NlRWxlbWVudChlbGVtZW50KTtcclxuICAgIH1lbHNlIHtcclxuICAgICAgYW5jZXN0b3JzLnB1c2goZWxlbWVudCk7XHJcbiAgICAgIC8vMi5cdTUzMzlcdTkxNERcdTUxNDNcdTdEMjBcdTUxODVcdTVCQjksIFx1NjcwOVx1NUI1MFx1NTE0M1x1N0QyMFx1NUMzMVx1NUYwMFx1NTQyRlx1NzJCNlx1NjAwMVx1NjczQVxyXG4gICAgICBlbGVtZW50LnRhZ1N0YXR1cyA9IFRhZ1N0YXRlLnRleHQ7XHJcbiAgICAgIC8vXHU1MzM5XHU5MTREXHU1QzNFXHU1REY0XHU1MTg1XHU1QkI5XHJcbiAgICAgIGNvbnN0IG1hdGNoVGFnRW5kID0gY29udGV4dC5zb3VyY2UubWF0Y2goYCguKj8pPFxcXFwvJHt0YWdOYW1lfT5gKTtcclxuICBcclxuICAgICAgaWYobWF0Y2hUYWdFbmQpIHtcclxuICAgICAgICBjb250ZXh0LnBpZCA9IEVsZW1lbnROb2RlLmlkO1xyXG4gICAgICAgIEVsZW1lbnROb2RlLmNoaWxkcmVuID0gdGhpcy5wYXJzZUNoaWxkcmVuKGNvbnRleHQsIGFuY2VzdG9ycyk7XHJcbiAgICAgIH1lbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTY4MDdcdTdCN0VcdTVGQzVcdTk4N0JcdTg5ODFcdTY3MDlcdTdFRDNcdTY3NUZcIik7XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgYW5jZXN0b3IgPSBhbmNlc3RvcnMucG9wKCk7IC8vXHU5MDAwXHU1MUZBXHU2ODA4XHJcbiAgICAgIGlmKGFuY2VzdG9yKSB7XHJcbiAgICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIGFuY2VzdG9yLnRhZ05hbWUubGVuZ3RoKzIpO1xyXG4gICAgICAgIGFkdmFuY2VTcGFjZXMoY29udGV4dCk7XHJcbiAgICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIDEpO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU0RTBEXHU1NDA4XHU2Q0Q1XHU3Njg0XHU2ODA3XHU3QjdFXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vMy5cdTUzMzlcdTkxNEQ8Ly4uLj5cclxuICAgICAgLy8yLlx1NkQ4OFx1OEQzOVx1NjVGNlx1RkYwQ1x1NjhDMFx1NkQ0Qlx1NkEyMVx1Njc3Rlx1NjYyRlx1NTQyNlx1NUI1OFx1NTcyOCAvPlx1RkYwQ1x1NTk4Mlx1Njc5Q1x1NjcwOVx1NTIxOVx1ODg2OFx1NzkzQVx1NTE3Nlx1NEUzQVx1ODFFQVx1OTVFRFx1NTQwOFx1NjgwN1x1N0I3RVx1RkYwQ1x1OTcwMFx1ODk4MVx1NTA1QVx1NTFGQVx1NjgwN1x1NkNFOFxyXG4gICAgICAvLzMuXHU1QjhDXHU2MjEwXHU2QjYzXHU1MjE5XHU1MzM5XHU5MTREXHU1NDBFXHVGRjBDXHU5NzAwXHU4OTgxXHU4QzAzXHU3NTI4IGFkdmFuY2VCeSBcdTUxRkRcdTY1NzBcdTZEODhcdThEMzlcdTc1MzFcdTZCNjNcdTUyMTlcdTUzMzlcdTkxNERcdTc2ODRcdTUxNjhcdTkwRThcdTUxODVcdTVCQjlcclxuICAgICAgLy80Llx1NTk4Mlx1Njc5Q1x1ODFFQVx1OTVFRFx1NTQwOFx1RkYwQ1x1NTIxOSBhZHZhbmNlQnkgXHU2RDg4XHU4RDM5IC8+XHJcbiAgICB9XHJcbiAgICByZXR1cm4gRWxlbWVudE5vZGU7XHJcbiAgfVxyXG4gIFxyXG4gIHBhcnNlQXR0cmlidXRlKGNvbnRleHQsIGVsZW1lbnQpIHtcclxuICAgIC8vXHU4OUUzXHU2NzkwXHU1QzVFXHU2MDI3XHVGRjBDXHU2MzA3XHU0RUU0di1pZix2LW1vZGVsLFx1NEU4Qlx1NEVGNkBldmVudCwgdi1vbjpldmVudE5hbWUsIHY6YmluZDpuYW1lLnN5bmNcclxuICAgIGNvbnN0IGF0dHJSZWcgPSAvKDo/W2EtekEtWl1bYS16QS1aLV0qKVxccyooPzooPSlcXHMqKD86KFtcIiddKShbXlwiJzw+XSopXFwzfChbXlxcc1wiJzw+XSopKSk/L1xyXG4gIFxyXG4gICAgY29uc3QgYXR0cmlidXRlczogc3RyaW5nW11bXSA9IFtdO1xyXG4gICAgYWR2YW5jZVNwYWNlcyhjb250ZXh0KTtcclxuICAgIGxldCBhdHRyTWF0Y2g7XHJcbiAgICB3aGlsZShjb250ZXh0LnNvdXJjZVswXSAhPT0gJzwnICYmIGNvbnRleHQuc291cmNlWzBdICE9PSAnPicpIHtcclxuICAgICAgLy9cdTZEODhcdTk2NjRcdTdBN0FcdTY4M0NcclxuICAgICAgYXR0ck1hdGNoID0gY29udGV4dC5zb3VyY2UubWF0Y2goYXR0clJlZyk7XHJcbiAgXHJcbiAgICAgIGFkdmFuY2VCeShjb250ZXh0LCBhdHRyTWF0Y2hbMF0ubGVuZ3RoKTsgLy9cdTZEODhcdTk2NjRcdTVDNUVcdTYwMjdcclxuICBcclxuICAgICAgLy8gWyd2LWlmPVwiaXNTaG93XCInLCAndi1pZicsICc9JywgJ2lzU2hvdyddLCAgIFxyXG4gICAgICAvLyBbJ2NsYXNzPVwiaGVhZGVyXCInLCAnY2xhc3MnLCAnPScsICdoZWFkZXInXVxyXG4gICAgICBhdHRyaWJ1dGVzLnB1c2goW2F0dHJNYXRjaFswXSwgYXR0ck1hdGNoWzFdLCBhdHRyTWF0Y2hbMl0sIGF0dHJNYXRjaFs0XV0pO1xyXG4gIFxyXG4gICAgICAvL1x1NkQ4OFx1OTY2NFx1N0E3QVx1NjgzQ1xyXG4gICAgICBhZHZhbmNlU3BhY2VzKGNvbnRleHQpO1xyXG4gICAgICBpZihjb250ZXh0LnNvdXJjZVswXSA9PT0gJy8nICYmIGVsZW1lbnQudW5hcnkpIHtcclxuICAgICAgICAvL1x1ODFFQVx1OTVFRFx1NTQwOFx1NjgwN1x1N0I3RVxyXG4gICAgICAgIGFkdmFuY2VCeShjb250ZXh0LCAxKTtcclxuICAgICAgfVxyXG4gICAgICBhZHZhbmNlU3BhY2VzKGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgYWR2YW5jZUJ5KGNvbnRleHQsIDEpOyAvL1x1NkQ4OFx1OTY2ND5cclxuICBcclxuICAgIHJldHVybiBhdHRyaWJ1dGVzO1xyXG4gIH1cclxuICAvL1x1NkNFOFx1OTFDQVxyXG4gIHBhcnNlQ29tbWVudChjb250ZXh0LCBhbmNlc3RvcnMpOiBDb21tZW50Tm9kZSB7XHJcbiAgICBsZXQge3NvdXJjZX0gPSBjb250ZXh0O1xyXG4gICAgbGV0IHZhbHVlID0gJyc7IC8vXHU2Q0U4XHU5MUNBXHU1MTg1XHU1QkI5XHJcbiAgXHJcbiAgICBzb3VyY2UgPSBzb3VyY2Uuc2xpY2UoNCk7XHJcbiAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgvKFtcXHNcXFNdKj8pKC0tPikvLCBmdW5jdGlvbihtYXRjaCwgJDEsICQyKSB7XHJcbiAgICAgIHZhbHVlID0gJDE7XHJcbiAgICAgIHJldHVybiAkMiA/ICQyIDogJyc7XHJcbiAgICB9KTtcclxuICAgIGlmKHNvdXJjZS5zdGFydHNXaXRoKFwiLS0+XCIpKSB7XHJcbiAgICAgIGNvbnRleHQuc291cmNlID0gc291cmNlLnNsaWNlKDMpO1xyXG4gICAgfWVsc2Uge1xyXG4gICAgICAvL1x1NjIxNlx1ODAwNVx1NjI0Qlx1NTJBOFx1OTVFRFx1NTQwOFxyXG4gICAgICB2YWx1ZSA9IGNvbnRleHQuc291cmNlO1xyXG4gICAgICBjb250ZXh0LnNvdXJjZSA9ICcnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IHRoaXMuX29wdGlvbnMuaWQrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkNvbW1lbnQsXHJcbiAgICAgIGNvbnRlbnQ6IHZhbHVlLFxyXG4gICAgICBwaWQ6IGNvbnRleHQucGlkXHJcbiAgICB9XHJcbiAgfVxyXG4gIHBhcnNlQ0RBVEEoY29udGV4dCwgYW5jZXN0b3JzKSB7XHJcbiAgICBjb25zdCBjZGF0YU1hdGNoID0gY29udGV4dC5zb3VyY2UubWF0Y2goL148IVxcW0NEQVRBXFxbKFtcXHNcXFNdKj8pXFxdXFxdLyk7XHJcbiAgICBhZHZhbmNlQnkoY29udGV4dCwgY2RhdGFNYXRjaFswXS5sZW5ndGgpO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpZDogdGhpcy5fb3B0aW9ucy5pZCsrLFxyXG4gICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuQ0RBVEEsXHJcbiAgICAgIGNvbnRlbnQ6IGNkYXRhTWF0Y2hbMV0sXHJcbiAgICAgIHBpZDogY29udGV4dC5waWRcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVJbnNOb2RlKG5vZGUpIHtcclxuICAvLyBcdTUyMUJcdTVFRkFpbnNcdTgyODJcdTcwQjlcdUZGMENcdTVFNzZcdTU5MERcdTUyMzZcdTUzOUZcdTgyODJcdTcwQjlcdTc2ODRcdTVDNUVcdTYwMjdcdTU0OENcdTVCNTBcdTgyODJcdTcwQjlcclxuICBjb25zdCBpbnNOb2RlOiBFbGVtZW50Tm9kZSA9IHtcclxuICAgICAgaWQ6IGlkeCsrLFxyXG4gICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuRWxlbWVudCxcclxuICAgICAgdGFnTmFtZTogJ2lucycsXHJcbiAgICAgIGF0dHJzOiBbXSxcclxuICAgICAgY2hpbGRyZW46IFtub2RlXSxcclxuICAgICAgcGlkOiBub2RlLnBpZCxcclxuICB9O1xyXG4gIG5vZGUucGlkID0gaW5zTm9kZS5pZDtcclxuICByZXR1cm4gaW5zTm9kZTtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVsTm9kZShub2RlKSB7XHJcbiAgLy8gXHU1MjFCXHU1RUZBZGVsXHU4MjgyXHU3MEI5XHVGRjBDXHU1RTc2XHU1OTBEXHU1MjM2XHU1MzlGXHU4MjgyXHU3MEI5XHU3Njg0XHU1QzVFXHU2MDI3XHU1NDhDXHU1QjUwXHU4MjgyXHU3MEI5XHJcbiAgY29uc3QgZGVsTm9kZTogRWxlbWVudE5vZGUgPSB7XHJcbiAgICAgIGlkOiBpZHgrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkVsZW1lbnQsXHJcbiAgICAgIHRhZ05hbWU6ICdkZWwnLFxyXG4gICAgICBhdHRyczogW10sXHJcbiAgICAgIGNoaWxkcmVuOiBbbm9kZV0sXHJcbiAgICAgIHBpZDogbm9kZS5waWQsXHJcbiAgfTtcclxuICBub2RlLnBpZCA9IGRlbE5vZGUuaWQ7XHJcbiAgcmV0dXJuIGRlbE5vZGU7XHJcbn0iLCAiaW1wb3J0IHtIVE1MTm9kZVR5cGV9IGZyb20gJy4uL2NvcmUvdHlwZXMnXHJcbi8vMy5cdTc1MjhcdTY3NjVcdTY4MzlcdTYzNkVKYXZhU2NyaXB0IEFTVFx1NzUxRlx1NjIxMFx1NkUzMlx1NjdEM1x1NTFGRFx1NjU3MFx1NEVFM1x1NzgwMVx1NzY4NFx1NzUxRlx1NjIxMFx1NTY2OFx1RkYwOGdlbmVyYXRvclx1RkYwOVxyXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGUobm9kZSwgb3B0aW9ucz17fSkge1xyXG4gICAgaWYgKG5vZGUudHlwZSA9PT0gSFRNTE5vZGVUeXBlLlJvb3QpIHtcclxuICAgICAgLy8gXHU1OTA0XHU3NDA2XHU2ODM5XHU4MjgyXHU3MEI5XHJcbiAgICAgIHJldHVybiBnZW5lcmF0ZUNoaWxkcmVuQ29kZShub2RlLmNoaWxkcmVuKTtcclxuICAgIH0gZWxzZSBpZiAobm9kZS50eXBlID09PSBIVE1MTm9kZVR5cGUuRWxlbWVudCkge1xyXG4gICAgICAvLyBcdTU5MDRcdTc0MDZcdTUxNDNcdTdEMjBcdTgyODJcdTcwQjlcclxuICAgICAgY29uc3QgYXR0cnMgPSBnZW5lcmF0ZUF0dHJpYnV0ZXNDb2RlKG5vZGUuYXR0cnMpO1xyXG4gICAgICBjb25zdCBjaGlsZHJlbiA9IGdlbmVyYXRlQ2hpbGRyZW5Db2RlKG5vZGUuY2hpbGRyZW4pO1xyXG4gICAgICByZXR1cm4gYDwke25vZGUudGFnTmFtZX0ke2F0dHJzfT4ke2NoaWxkcmVufTwvJHtub2RlLnRhZ05hbWV9PmA7XHJcbiAgICB9IGVsc2UgaWYgKG5vZGUudHlwZSA9PT0gSFRNTE5vZGVUeXBlLlRleHQpIHtcclxuICAgICAgLy8gXHU1OTA0XHU3NDA2XHU2NTg3XHU2NzJDXHU4MjgyXHU3MEI5XHJcbiAgICAgIHJldHVybiBub2RlLmNvbnRlbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQXR0cmlidXRlc0NvZGUoYXR0cnMpIHtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShhdHRycykgfHwgYXR0cnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAnJztcclxuICAgIH1cclxuICAgIHJldHVybiAnICcgKyBhdHRycy5tYXAoYXR0ciA9PiBgJHthdHRyLm5hbWV9PVwiJHthdHRyLnZhbHVlfVwiYCkuam9pbignICcpO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiBnZW5lcmF0ZUNoaWxkcmVuQ29kZShjaGlsZHJlbikge1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGNoaWxkcmVuKSB8fCBjaGlsZHJlbi5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNoaWxkcmVuLm1hcChjaGlsZCA9PiBnZW5lcmF0ZShjaGlsZCkpLmpvaW4oJycpO1xyXG4gIH0iLCAiXHJcbmltcG9ydCB7dHJhbnNmb3JtVGV4dCwgdHJhbnNmb3JtRGlmZn0gZnJvbSAnLi4vdHJhbnNmb3JtL2luZGV4JztcclxuaW1wb3J0IHtkZWVwQ29weX0gZnJvbSAnLi91dGlscy9pbmRleCdcclxuaW1wb3J0IHsgZ2VuZXJhdGUgfSBmcm9tICcuL2dlbmVyYXRlJztcclxuXHJcbmludGVyZmFjZSB0cmFuc2Zvcm1PcHRpb25zIHtcclxuICAgIG5vZGVUcmFuc2Zvcm1zPzogRnVuY3Rpb25bXSB8IFtzdHJpbmcsIEZ1bmN0aW9uXSxcclxuICAgIGRpcmVjdGl2ZVRyYW5zZm9ybXM/OiBPYmplY3QsXHJcbiAgICBkaWZmQXN0PzogT2JqZWN0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2Zvcm0oYXN0LCBvcHRpb25zOiB0cmFuc2Zvcm1PcHRpb25zID0ge30pIHtcclxuICAgIGNvbnN0IHsgbm9kZVRyYW5zZm9ybXMgPSBbXSwgZGlyZWN0aXZlVHJhbnNmb3JtcyA9IHt9LCBkaWZmQXN0ID0ge30gfSA9IG9wdGlvbnM7XHJcblxyXG4gICAgY29uc3QgY29udGV4dCA9IHtcclxuICAgICAgICBhc3Q6IGRlZXBDb3B5KGFzdCksXHJcbiAgICAgICAgZGlmZkFzdDogZGVlcENvcHkoZGlmZkFzdCksXHJcbiAgICAgICAgbm9kZVRyYW5zZm9ybXM6IFtcclxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtSWYsXHJcbiAgICAgICAgICAgIC8vIHRyYW5zZm9ybUZvcixcclxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtVGV4dCxcclxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtRGlmZixcclxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtRWxlbWVudCxcclxuICAgICAgICAgICAgLi4ubm9kZVRyYW5zZm9ybXMuZmlsdGVyKGl0ZW0gPT4gQXJyYXkuaXNBcnJheShpdGVtKSA/IGl0ZW1bMF0gIT09ICdhbGwnIDogdHJ1ZSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICBkaXJlY3RpdmVUcmFuc2Zvcm1zOiB7XHJcbiAgICAgICAgICAgIC8vIG9uOiB0cmFuc2Zvcm1PbixcclxuICAgICAgICAgICAgLy8gYmluZDogdHJhbnNmb3JtQmluZCxcclxuICAgICAgICAgICAgLy8gbW9kZWw6IHRyYW5zZm9ybU1vZGVsXHJcbiAgICAgICAgICAgIC4uLmRpcmVjdGl2ZVRyYW5zZm9ybXNcclxuICAgICAgICB9LFxyXG4gICAgfVxyXG4gICAgY29uc3Qgbm9kZVRyYW5zZm9ybUFsbCA9IG5vZGVUcmFuc2Zvcm1zLmZpbHRlcihpdGVtID0+IEFycmF5LmlzQXJyYXkoaXRlbSkgJiYgaXRlbVswXSA9PT0gJ2FsbCcpLmZsYXRNYXAoZiA9PiBmWzFdKTtcclxuICAgIGNhbGxOb2RlVHJhbnNmb3Jtcyhjb250ZXh0LmFzdCwge1xyXG4gICAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgICAgbm9kZVRyYW5zZm9ybXM6IG5vZGVUcmFuc2Zvcm1BbGxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vXHU5MDREXHU1Mzg2XHU2ODExXHU3RUQzXHU2Nzg0XHVGRjBDXHU1RTc2XHU4QzAzXHU3NTI4XHU2M0QyXHU0RUY2XHU1MUZEXHU2NTcwXHJcbiAgICB0cmF2ZXJzZU5vZGUoY29udGV4dC5hc3QsIGNvbnRleHQpO1xyXG4gICAgcmV0dXJuIGdlbmVyYXRlKGNvbnRleHQuYXN0LCBvcHRpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsbE5vZGVUcmFuc2Zvcm1zKG5vZGUsIGNvbnRleHQpIHtcclxuICAgIGNvbnN0IHsgbm9kZVRyYW5zZm9ybXMsIG9uRW50ZXIsIG9uRXhpdCB9ID0gY29udGV4dDtcclxuICAgIGNvbnN0IGV4aXRGbnM6IEZ1bmN0aW9uW10gPSBbXTsgLy9cdTkwMDBcdTUxRkFcdTUxRkRcdTY1NzBcclxuICAgIFxyXG4gICAgdHlwZW9mIG9uRW50ZXIgPT09ICdmdW5jdGlvbicgJiYgb25FbnRlcihub2RlLCBjb250ZXh0KTtcclxuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBub2RlVHJhbnNmb3Jtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IG9uRXhpdCA9IG5vZGVUcmFuc2Zvcm1zW2ldKG5vZGUsIGNvbnRleHQpO1xyXG4gICAgICAgIGlmKG9uRXhpdCkge1xyXG4gICAgICAgICAgICBpZihBcnJheS5pc0FycmF5KG9uRXhpdCkpIHtcclxuICAgICAgICAgICAgICAgIGV4aXRGbnMucHVzaCguLi5vbkV4aXQpO1xyXG4gICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBleGl0Rm5zLnB1c2gob25FeGl0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHR5cGVvZiBvbkV4aXQgPT09ICdmdW5jdGlvbicgJiYgb25FeGl0KG5vZGUsIGNvbnRleHQpO1xyXG4gICAgbGV0IGkgPSBleGl0Rm5zLmxlbmd0aDtcclxuXHJcbiAgICAvL1x1OTAwNlx1NTQxMVx1NjI2N1x1ODg0Q1x1OEY5M1x1NTFGQVx1NTFGRFx1NjU3MCxcdTUxNDhcdThGREJcdTUxNDhcdTUxRkFcclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgICBleGl0Rm5zW2ldKCk7XHJcbiAgICB9XHJcbn0gXHJcblxyXG4vL1x1OTA0RFx1NTM4NkFTVFxyXG5mdW5jdGlvbiB0cmF2ZXJzZU5vZGUobm9kZSwgY29udGV4dCkge1xyXG4gICAgY2FsbE5vZGVUcmFuc2Zvcm1zKG5vZGUsIHtcclxuICAgICAgICAuLi5jb250ZXh0LFxyXG4gICAgICAgIG9uRW50ZXI6ICgpID0+IHtcclxuICAgICAgICAgICAgY29udGV4dC5jdXJyZW50Tm9kZSA9IG5vZGU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBvbkV4aXQ6ICgpID0+IHtcclxuICAgICAgICAgICAgdHJhdmVyc2VDaGlsZHJlbihub2RlLCBjb250ZXh0KTtcclxuICAgICAgICAgICAgY29udGV4dC5jdXJyZW50Tm9kZSA9IG5vZGU7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuZnVuY3Rpb24gdHJhdmVyc2VDaGlsZHJlbihub2RlLCBjb250ZXh0KSB7XHJcbiAgICAvLyBcdTkwMTJcdTVGNTJcdTkwNERcdTUzODZcdTVCNTBcdTY1NzBcdTdFQzRcclxuICAgIGlmKG5vZGUuY2hpbGRyZW4pe1xyXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHRyYXZlcnNlTm9kZShub2RlLmNoaWxkcmVuW2ldLCBjb250ZXh0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iXSwKICAibWFwcGluZ3MiOiAiO0FBa0JPLElBQU0sV0FBVztBQUFBO0FBQUEsRUFDcEIsU0FBUztBQUFBO0FBQUEsRUFDVCxTQUFTO0FBQUE7QUFBQSxFQUNULFNBQVM7QUFBQTtBQUFBLEVBQ1QsTUFBTTtBQUFBO0FBQUEsRUFDTixRQUFRO0FBQUE7QUFBQSxFQUNSLFlBQVk7QUFBQTtBQUNoQjtBQUdPLElBQU0sYUFBYSxDQUFDLFNBQVMsU0FBUztBQUN6QyxVQUFRLFVBQVUsUUFBUTtBQUMxQixVQUFRLE9BQU87QUFDbkI7QUFFTyxJQUFNLGFBQWEsQ0FBQyxZQUFZO0FBQ25DLFVBQVEsT0FBTyxRQUFRO0FBQzNCOzs7QUM5Qk8sU0FBUyxVQUFVLFNBQVMsSUFB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TyxVQUFRLE1BQU0sUUFBUSxJQUFJLEtBQUssS0FBSyxDQUFDLE1BQU0sS0FBSyxFQUFFLFFBQVEsT0FBSyxFQUFFLENBQUMsQ0FBQztBQUNsSCxxQkFBbUIsUUFBUSxLQUFLO0FBQUEsSUFDNUIsR0FBRztBQUFBLElBQ0gsZ0JBQWdCO0FBQUEsRUFDcEIsQ0FBQztBQUdELGVBQWEsUUFBUSxLQUFLLE9BQU87QUFDakMsU0FBTyxTQUFTLFFBQVEsS0FBSyxPQUFPO0FBQ3hDO0FBRUEsU0FBUyxtQkFBbUIsTUFBTSxTQUFTO0FBQ3ZDLFFBQU0sRUFBRSxnQkFBZ0IsU0FBUyxPQUFPLElBQUk7QUFDNUMsUUFBTSxVQUFzQixDQUFDO0FBRTdCLFNBQU8sWUFBWSxjQUFjLFFBQVEsTUFBTSxPQUFPO0FBQ3RELFdBQVFDLEtBQUksR0FBR0EsS0FBSSxlQUFlLFFBQVFBLE1BQUs7QUFDM0MsVUFBTUMsVUFBUyxlQUFlRCxFQUFDLEVBQUUsTUFBTSxPQUFPO0FBQzlDLFFBQUdDLFNBQVE7QUFDUCxVQUFHLE1BQU0sUUFBUUEsT0FBTSxHQUFHO0FBQ3RCLGdCQUFRLEtBQUssR0FBR0EsT0FBTTtBQUFBLE1BQzFCLE9BQU07QUFDRixnQkFBUSxLQUFLQSxPQUFNO0FBQUEsTUFDdkI7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNBLFNBQU8sV0FBVyxjQUFjLE9BQU8sTUFBTSxPQUFPO0FBQ3BELE1BQUksSUFBSSxRQUFRO0FBR2hCLFNBQU8sS0FBSztBQUNSLFlBQVEsQ0FBQyxFQUFFO0FBQUEsRUFDZjtBQUNKO0FBR0EsU0FBUyxhQUFhLE1BQU0sU0FBUztBQUNqQyxxQkFBbUIsTUFBTTtBQUFBLElBQ3JCLEdBQUc7QUFBQSxJQUNILFNBQVMsTUFBTTtBQUNYLGNBQVEsY0FBYztBQUFBLElBQzFCO0FBQUEsSUFDQSxRQUFRLE1BQU07QUFDVix1QkFBaUIsTUFBTSxPQUFPO0FBQzlCLGNBQVEsY0FBYztBQUFBLElBQzFCO0FBQUEsRUFDSixDQUFDO0FBQ0w7QUFDQSxTQUFTLGlCQUFpQixNQUFNLFNBQVM7QUFFckMsTUFBRyxLQUFLLFVBQVM7QUFDYixhQUFRLElBQUksR0FBRyxJQUFJLEtBQUssU0FBUyxRQUFRLEtBQUs7QUFDMUMsbUJBQWEsS0FBSyxTQUFTLENBQUMsR0FBRyxPQUFPO0FBQUEsSUFDMUM7QUFBQSxFQUNKO0FBQ0o7IiwKICAibmFtZXMiOiBbIkVsZW1lbnROb2RlIiwgImkiLCAib25FeGl0Il0KfQo=
