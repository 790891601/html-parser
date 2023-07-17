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
function tokenize(context) {
  const textRE = /^[<>]/;
  const elementRE = /(?:<[^>\s]+\s*((?:[^<>\/])*)\/?>|<\/[^>\s]*>)/g;
  const valuedAttributeRE = /([?]|(?!\d|-{2}|-\d)[a-zA-Z0-9\u00A0-\uFFFF-_:!%-.~<]+)=?(?:["]([^"]*)["]|[']([^']*)[']|[{]([^}]*)[}])?/gms;
  let tokens = [];
  let match;
  console.log(tokens);
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
    const tokens = tokenize(context);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vcGFja2FnZXMvY29yZS91dGlscy9jb25zdGFudHMudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS91dGlscy9hZHZhbmNlLnRzIiwgIi4uLy4uL3BhY2thZ2VzL2NvcmUvdXRpbHMvZWxlbWVudC50cyIsICIuLi8uLi9wYWNrYWdlcy9jb3JlL3V0aWxzL2RhdGEudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS9odG1sUGFyc2VyLnRzIiwgIi4uLy4uL3BhY2thZ2VzL2NvcmUvZ2VuZXJhdGUudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS90cmFuc2Zvcm0udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBjb25zdCBMRUdFTkRTID0ge1xyXG4gICAgJ0FEREVEJzogJ2FkZGVkJyxcclxuICAgICdSRU1PVkVEJzogJ3JlbW92ZWQnLFxyXG59XHJcblxyXG4vL1x1NjcwOVx1OTY1MFx1NzJCNlx1NjAwMVx1ODFFQVx1NTJBOFx1NjczQVxyXG5leHBvcnQgZW51bSBUZXh0TW9kZXMge1xyXG4gICAgLy9cdTlFRDhcdThCQTRcdTZBMjFcdTVGMEYgXHU5MDQ3XHU1MjMwXHU1QjU3XHU3QjI2IDwgXHU2NUY2XHVGRjBDXHU0RjFBXHU1MjA3XHU2MzYyXHU1MjMwXHU2ODA3XHU3QjdFXHU1RjAwXHU1OUNCXHU3MkI2XHU2MDAxIFx1OTA0N1x1NTIzMFx1NUI1N1x1N0IyNiAmIFx1NjVGNlx1RkYwQ1x1NEYxQVx1NTIwN1x1NjM2Mlx1NTIzMFx1NUI1N1x1N0IyNlx1NUYxNVx1NzUyOFx1NzJCNlx1NjAwMVx1ODBGRFx1NTkxRlx1NTkwNFx1NzQwNiBIVE1MIFx1NUI1N1x1N0IyNlx1NUI5RVx1NEY1M1xyXG4gICAgREFUQT0wLFxyXG4gICAgLy88dGl0bGU+IFx1NjgwN1x1N0I3RVx1MzAwMTx0ZXh0YXJlYT4gXHU2ODA3XHU3QjdFIFx1OTA0N1x1NTIzMFx1NUI1N1x1N0IyNiA8IFx1NjVGNlx1RkYwQ1x1NTIwN1x1NjM2Mlx1NTIzMCBSQ0RBVEEgbGVzcy10aGFuIHNpZ24gc3RhdGUgXHU3MkI2XHU2MDAxXHU5MDQ3XHU1MjMwXHU1QjU3XHU3QjI2IC9cdUZGMENcdTUyMDdcdTYzNjJcdTUyMzAgUkNEQVRBIFx1NzY4NFx1N0VEM1x1Njc1Rlx1NjgwN1x1N0I3RVx1NzJCNlx1NjAwMVx1NTcyOFx1NEUwRFx1NEY3Rlx1NzUyOFx1NUYxNVx1NzUyOFx1N0IyNlx1NTNGNyAmIFx1NzY4NFx1NjBDNVx1NTFCNVx1NEUwQlx1RkYwQ1JDREFUQSBcdTZBMjFcdTVGMEZcdTRFMERcdTRGMUFcdThCQzZcdTUyMkJcdTY4MDdcdTdCN0VcdUZGMENcdTU5ODJcdTRFMEJcdTRFRTNcdTc4MDFcdTRGMUFcdTYyOEEgPCBcdTVGNTNcdTUwNUFcdTY2NkVcdTkwMUFcdTdCMjZcdTUzRjdcdTgwMENcdTY1RTBcdTZDRDVcdThCQzZcdTUyMkJcdTUxODVcdTkwRThcdTc2ODQgZGl2IFx1NjgwN1x1N0I3RVxyXG4gICAgUkNEQVRBPTEsXHJcbiAgICAvLzxzdHlsZT5cdTMwMDE8eG1wPlx1MzAwMTxpZnJhbWU+XHUzMDAxPG5vZW1iZWQ+XHUzMDAxPG5vZnJhbWVzPlx1MzAwMTxub3NjcmlwdD4gXHU3QjQ5XHVGRjBDXHU0RTBFIFJDREFUQSBcdTZBMjFcdTVGMEZcdTdDN0JcdTRGM0NcdUZGMENcdTUzRUFcdTY2MkZcdTRFMERcdTY1MkZcdTYzMDEgSFRNTCBcdTVCOUVcdTRGNTNcclxuICAgIFJBV1RFWFQ9MixcclxuICAgIC8vPCFbQ0RBVEFbIFx1NUI1N1x1N0IyNlx1NEUzMiAgXHU0RUZCXHU0RjU1XHU1QjU3XHU3QjI2XHU5MEZEXHU0RjVDXHU0RTNBXHU2NjZFXHU5MDFBXHU1QjU3XHU3QjI2XHU1OTA0XHU3NDA2XHVGRjBDXHU3NkY0XHU1MjMwXHU5MDQ3XHU1MjMwIENEQVRBIFx1NzY4NFx1N0VEM1x1Njc1Rlx1NjgwN1x1NUZEN1x1NEUzQVx1NkI2MlxyXG4gICAgQ0RBVEE9MyxcclxuICAgIENPTU1FTlQ9NCwgLy9cdTZDRThcdTkxQ0FcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBUYWdTdGF0ZSA9IHsgLy9cdTY4MDdcdTdCN0VcdTZBMjFcdTVGMEZcclxuICAgIGluaXRpYWw6IDEsIC8vIFx1NTIxRFx1NTlDQlx1NzJCNlx1NjAwMVxyXG4gICAgdGFnT3BlbjogMiwgLy9cdTY4MDdcdTdCN0VcdTVGMDBcdTU5Q0JcdTcyQjZcdTYwMDFcclxuICAgIHRhZ05hbWU6IDMsIC8vIFx1NjgwN1x1N0I3RVx1NTQwRFx1NzlGMFx1NzJCNlx1NjAwMVxyXG4gICAgdGV4dDogNCwgLy9cdTY1ODdcdTY3MkNcdTcyQjZcdTYwMDFcclxuICAgIHRhZ0VuZDogNSwgLy9cdTdFRDNcdTY3NUZcdTY4MDdcdTdCN0VcdTcyQjZcdTYwMDFcclxuICAgIHRhZ0VuZE5hbWU6IDYgLy8gXHU3RUQzXHU2NzVGXHU2ODA3XHU3QjdFXHU1NDBEXHU3OUYwXHU3MkI2XHU2MDAxXHJcbn1cclxuXHJcbi8vXHU1MjA3XHU2MzYyXHU2NTg3XHU2NzJDXHU2QTIxXHU1RjBGXHJcbmV4cG9ydCBjb25zdCB0b2dnbGVNb2RlID0gKGNvbnRleHQsIG1vZGUpID0+IHtcclxuICAgIGNvbnRleHQub2xkTW9kZSA9IGNvbnRleHQubW9kZTtcclxuICAgIGNvbnRleHQubW9kZSA9IG1vZGU7XHJcbn1cclxuLy9cdTYwNjJcdTU5MERcdTZBMjFcdTVGMEZcclxuZXhwb3J0IGNvbnN0IHJldmVydE1vZGUgPSAoY29udGV4dCkgPT4ge1xyXG4gICAgY29udGV4dC5tb2RlID0gY29udGV4dC5vbGRNb2RlO1xyXG59XHJcbiIsICIvKlx1NjYyRlx1NTQyNlx1NEUzQVx1N0E3QSovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0V4aXN0cyhjb250ZXh0LCBhbmNlc3RvcnMpIHtcclxuICAgIHJldHVybiBjb250ZXh0LnNvdXJjZTtcclxufVxyXG4vL1x1NkQ4OFx1OEQzOVx1NjMwN1x1NUI5QVx1OERERFx1NzlCQlx1NTE4NVx1NUJCOVxyXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZUJ5KGNvbnRleHQsIGJ5KSB7XHJcbiAgICBjb250ZXh0LnNvdXJjZSA9IGNvbnRleHQuc291cmNlLnNsaWNlKGJ5KTtcclxufVxyXG4vKioqIFx1NkQ4OFx1OEQzOVx1N0E3QVx1NjgzQyovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZHZhbmNlU3BhY2VzKGNvbnRleHQpIHtcclxubGV0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIGNvbnRleHQuc291cmNlID0gc291cmNlLnJlcGxhY2UoL15bXFxyXFxmXFx0XFxuIF0rLywgJycpO1xyXG59XHJcbiAgIiwgImltcG9ydCB7VGFnU3RhdGV9IGZyb20gJy4vaW5kZXgnXHJcblxyXG5leHBvcnQgY29uc3QgdW5hcnkgPSBbXHJcbiAgXCJiclwiLFxyXG4gIFwiaHJcIixcclxuICBcImltZ1wiLFxyXG4gIFwiaW5wdXRcIixcclxuICBcIm1ldGFcIixcclxuICBcImxpbmtcIixcclxuICBcImFyZWFcIixcclxuICBcImJhc2VcIixcclxuICBcImNvbFwiLFxyXG4gIFwiY29tbWFuZFwiLFxyXG4gIFwiZW1iZWRcIixcclxuICBcImtleWdlblwiLFxyXG4gIFwicGFyYW1cIixcclxuICBcInNvdXJjZVwiLFxyXG4gIFwidHJhY2tcIixcclxuICBcIndiclwiXHJcbl07XHJcbmV4cG9ydCBmdW5jdGlvbiBpc1VuYXJ5KHRhZ05hbWUpOiBib29sZWFuIHtcclxuICByZXR1cm4gdW5hcnkuaW5jbHVkZXModGFnTmFtZSk7XHJcbn1cclxuICBcclxuLypcdTdFRDNcdTY3NUZcdTY4MDdcdTdCN0UqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VFbGVtZW50KGVsZW1lbnQpIHtcclxuICBpZihlbGVtZW50LnVuYXJ5KSB7XHJcbiAgICBlbGVtZW50LnRhZ1N0YXR1cyA9IFRhZ1N0YXRlLnRhZ0VuZDtcclxuICB9XHJcbn1cclxuLyoqXHJcbiAqIFx1NUJGOVx1NkJENFx1NTE0M1x1N0QyMFx1NjYyRlx1NTQyNlx1NzZGOFx1NTQwQ1x1N0M3Qlx1NTc4QlxyXG4gKiBAcGFyYW0gZWxlbWVudCBcclxuICogQHBhcmFtIGVsZW1lbnRUaGVuIFxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0VxdWFsRWxlbWVudFR5cGUoZWxlbWVudCwgZWxlbWVudFRoZW4pOiBib29sZWFuIHtcclxuICBpZihlbGVtZW50LnR5cGUgPT09IGVsZW1lbnRUaGVuLnR5cGUpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn0iLCAiZXhwb3J0IGZ1bmN0aW9uIGRlZXBDb3B5KG9iaiwgY2FjaGUgPSBuZXcgV2Vha01hcCgpKSB7XHJcbiAgICAvLyBcdTU5ODJcdTY3OUNcdTY2MkZcdTU3RkFcdTY3MkNcdTY1NzBcdTYzNkVcdTdDN0JcdTU3OEJcdTYyMTZcdTgwMDVudWxsXHVGRjBDXHU3NkY0XHU2M0E1XHU4RkQ0XHU1NkRFXHU1MzlGXHU1QkY5XHU4QzYxXHJcbiAgICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFx1NjhDMFx1NjdFNVx1N0YxM1x1NUI1OFx1RkYwQ1x1OTA3Rlx1NTE0RFx1NjVFMFx1OTY1MFx1OTAxMlx1NUY1MlxyXG4gICAgaWYgKGNhY2hlLmhhcyhvYmopKSB7XHJcbiAgICAgIHJldHVybiBjYWNoZS5nZXQob2JqKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gXHU1MjFCXHU1RUZBXHU0RTAwXHU0RTJBXHU2NUIwXHU3Njg0XHU1QkY5XHU4QzYxXHU2MjE2XHU2NTcwXHU3RUM0XHJcbiAgICBjb25zdCBjb3B5ID0gQXJyYXkuaXNBcnJheShvYmopID8gW10gOiB7fTtcclxuICAgIFxyXG4gICAgLy8gXHU1QzA2XHU2NUIwXHU1QkY5XHU4QzYxXHU2REZCXHU1MkEwXHU1MjMwXHU3RjEzXHU1QjU4XHJcbiAgICBjYWNoZS5zZXQob2JqLCBjb3B5KTtcclxuICAgIFxyXG4gICAgLy8gXHU5MDEyXHU1RjUyXHU1NzMwXHU1OTBEXHU1MjM2XHU2QkNGXHU0RTJBXHU1QzVFXHU2MDI3XHJcbiAgICBmb3IgKGxldCBrZXkgaW4gb2JqKSB7XHJcbiAgICAgIGNvcHlba2V5XSA9IGRlZXBDb3B5KG9ialtrZXldLCBjYWNoZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBjb3B5O1xyXG4gIH0iLCAiaW1wb3J0IHtUZXh0TW9kZXMsIFRhZ1N0YXRlLCBhZHZhbmNlQnksIGFkdmFuY2VTcGFjZXMsIGlzVW5hcnksIGNsb3NlRWxlbWVudCwgdG9nZ2xlTW9kZSwgcmV2ZXJ0TW9kZX0gZnJvbSAnLi91dGlscy9pbmRleCdcclxuaW1wb3J0IHtfcGFyc2VyT3B0aW9ucywgcGFyc2VyT3B0aW9ucywgcGFyc2VyQ29udGV4dCwgSFRNTE5vZGVUeXBlLCBFbGVtZW50Tm9kZSwgVGV4dE5vZGUsIFJvb3ROb2RlLCBDb21tZW50Tm9kZSwgTm9kZX0gZnJvbSAnLi90eXBlcydcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShjb250ZXh0OiBwYXJzZXJDb250ZXh0KSB7XHJcbiAgLyoqXHJcbiAgICogXHU4RjkzXHU1MTY1XHVGRjFBPGRpdj4xMjM8L2Rpdj5cclxuICAgKiBcdThGOTNcdTUxRkE6IFt7IHR5cGU6IHRhZ09wZW4sIHRhZ05hbWU6ICdkaXYnIH0sIHsgdHlwZTogdGV4dCwgY29udGVudDogJzEyMycgfSwgeyB0eXBlOiB0YWdFbmQsIHRhZ05hbWU6ICdkaXYnIH1dXHJcbiAgICovXHJcbiAgY29uc3QgdGV4dFJFID0gL15bPD5dLztcclxuICBjb25zdCBlbGVtZW50UkUgPSAvKD86PFtePlxcc10rXFxzKigoPzpbXjw+XFwvXSkqKVxcLz8+fDxcXC9bXj5cXHNdKj4pL2c7XHJcbiAgY29uc3QgdmFsdWVkQXR0cmlidXRlUkUgPSAvKFs/XXwoPyFcXGR8LXsyfXwtXFxkKVthLXpBLVowLTlcXHUwMEEwLVxcdUZGRkYtXzohJS0ufjxdKyk9Pyg/OltcIl0oW15cIl0qKVtcIl18WyddKFteJ10qKVsnXXxbe10oW159XSopW31dKT8vZ21zO1xyXG5cclxuICBcclxuICBsZXQgdG9rZW5zOiBhbnlbXSA9IFtdO1xyXG4gIGxldCBtYXRjaDtcclxuXHJcbiAgLy8gbGV0IHRleHRNYXRjaDtcclxuICAvLyB3aGlsZSgodGV4dE1hdGNoID0gdGV4dFJFLmV4ZWMoY29udGV4dC5zb3VyY2UpKSAhPSBudWxsKSB7XHJcbiAgLy8gICBjb25zb2xlLmxvZyh0ZXh0TWF0Y2gpXHJcbiAgLy8gfVxyXG5cclxuICAvLyB3aGlsZSAoKG1hdGNoID0gZWxlbWVudFJFLmV4ZWMoY29udGV4dC5zb3VyY2UpKSAhPT0gbnVsbCkge1xyXG4gIC8vICAgY29uc3QgdGFnID0gbWF0Y2hbMF07XHJcbiAgLy8gICBjb25zdCBjb250ZW50ID0gdGFnLm1hdGNoKHRleHRSRSk7XHJcblxyXG4gIC8vICAgaWYgKGNvbnRlbnQgJiYgY29udGVudC5sZW5ndGggPiAwKSB7XHJcbiAgLy8gICAgIHRva2Vucy5wdXNoKHsgdHlwZTogJ3RhZ09wZW4nLCB0YWdOYW1lOiB0YWcgfSk7XHJcbiAgICAgIFxyXG4gIC8vICAgICBjb25zb2xlLmxvZyhjb250ZW50KVxyXG4gIC8vICAgICBjb250ZW50LmZvckVhY2godGV4dCA9PiB7XHJcbiAgLy8gICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAndGV4dCcsIGNvbnRlbnQ6IHRleHQgfSk7XHJcbiAgLy8gICAgIH0pO1xyXG5cclxuICAvLyAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAndGFnRW5kJywgdGFnTmFtZTogdGFnIH0pO1xyXG4gIC8vICAgfSBlbHNlIHtcclxuICAvLyAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAndGFnT3BlbicsIHRhZ05hbWU6IHRhZyB9KTtcclxuICAvLyAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAndGFnRW5kJywgdGFnTmFtZTogdGFnIH0pO1xyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuICBjb25zb2xlLmxvZyh0b2tlbnMpXHJcblxyXG4gIHJldHVybiB0b2tlbnM7XHJcbiAgLy8gd2hpbGUgKGNvbnRleHQuc291cmNlLmxlbmd0aCA+IDApIHtcclxuICAvLyAgIGNvbnN0IHttb2RlLCBzb3VyY2UsIHBpZH0gPSBjb250ZXh0O1xyXG4gIC8vICAgbGV0IHRva2VuXHJcbiAgLy8gICBpZiAobW9kZSA9PT0gVGV4dE1vZGVzLkRBVEEgfHwgbW9kZSA9PT0gVGV4dE1vZGVzLlJDREFUQSkge1xyXG4gIC8vICAgICAvLyBcdTUzRUFcdTY3MDkgREFUQSBcdTZBMjFcdTVGMEZcdTYyNERcdTY1MkZcdTYzMDFcdTY4MDdcdTdCN0VcdTgyODJcdTcwQjlcdTc2ODRcdTg5RTNcdTY3OTBcclxuICAvLyAgICAgaWYgKHNvdXJjZS5zdGFydHNXaXRoKFwiPCFbQ0RBVEFbXCIpKSB7XHJcbiAgLy8gICAgICAgLy8gQ0RBVEFcclxuICAvLyAgICAgICB0b2dnbGVNb2RlKGNvbnRleHQsIFRleHRNb2Rlcy5DREFUQSk7XHJcbiAgLy8gICAgICAgY29udGludWU7XHJcbiAgLy8gICAgIH1lbHNlIGlmKG1vZGUgPT09IFRleHRNb2Rlcy5EQVRBICYmIHNvdXJjZVswXSA9PT0gXCI8XCIpIHtcclxuICAvLyAgICAgICBpZihzb3VyY2VbMV0gPT09ICchJykge1xyXG4gIC8vICAgICAgICAgaWYgKHNvdXJjZS5zdGFydHNXaXRoKFwiPCEtLVwiKSkge1xyXG4gIC8vICAgICAgICAgICAvL1x1NkNFOFx1OTFDQVxyXG4gIC8vICAgICAgICAgICB0b2tlbiA9IHRoaXMucGFyc2VDb21tZW50KGNvbnRleHQpO1xyXG4gIC8vICAgICAgICAgfVxyXG4gIC8vICAgICAgIH1lbHNlIGlmKC9bYS16XS9pLnRlc3Qoc291cmNlWzFdKSkge1xyXG4gIC8vICAgICAgICAgLy8gXHU4OUUzXHU2NzkwXHU1RjAwXHU1OUNCXHU2ODA3XHU3QjdFXHJcbiAgLy8gICAgICAgICB0b2tlbiA9IHBhcnNlU3RhcnRUYWcoY29udGV4dCk7XHJcbiAgLy8gICAgICAgfWVsc2UgaWYoc291cmNlWzFdID09PSAnLycpIHtcclxuICAvLyAgICAgICAgIC8vXHU3RUQzXHU2NzVGXHU2ODA3XHU3QjdFXHU3MkI2XHU2MDAxXHJcbiAgLy8gICAgICAgICB0b2tlbiA9IHBhcnNlRW5kVGFnKGNvbnRleHQpO1xyXG4gIC8vICAgICAgIH1cclxuICAvLyAgICAgfWVsc2UgaWYgKG1vZGUgPT09IFRleHRNb2Rlcy5SQ0RBVEEgfHwgbW9kZSA9PT0gVGV4dE1vZGVzLkRBVEEgJiYgc291cmNlWzFdID09PSBcIi9cIikge1xyXG4gIC8vICAgICAgIC8vXHU3RUQzXHU2NzVGXHU2ODA3XHU3QjdFXHVGRjBDXHU4RkQ5XHU5MUNDXHU5NzAwXHU4OTgxXHU2MjlCXHU1MUZBXHU5NTE5XHU4QkVGXHVGRjBDXHU1NDBFXHU2NTg3XHU0RjFBXHU4QkU2XHU3RUM2XHU4OUUzXHU5MUNBXHU1MzlGXHU1NkUwXHJcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKFwiXHU0RTBEXHU2NjJGREFUQVx1NkEyMVx1NUYwRlwiKTtcclxuICAvLyAgICAgfWVsc2UgaWYoc291cmNlLnN0YXJ0c1dpdGgoXCJ7e1wiKSkge1xyXG4gIC8vICAgICAgIC8vXHU2M0QyXHU1MDNDXHU4OUUzXHU2Nzg0XHJcbiAgLy8gICAgICAgdG9rZW4gPSB0aGlzLnBhcnNlSW50ZXJwb2xhdGlvbihjb250ZXh0KTtcclxuICAvLyAgICAgfVxyXG4gIC8vICAgICAvLyBub2RlIFx1NEUwRFx1NUI1OFx1NTcyOFx1RkYwQ1x1OEJGNFx1NjYwRVx1NTkwNFx1NEU4RVx1NTE3Nlx1NEVENlx1NkEyMVx1NUYwRlx1RkYwQ1x1NTM3M1x1OTc1RSBEQVRBIFx1NkEyMVx1NUYwRlx1NEUxNFx1OTc1RSBSQ0RBVEEgXHU2QTIxXHU1RjBGXHJcbiAgLy8gICAgIGlmKCF0b2tlbikge1xyXG4gIC8vICAgICAgIHRva2VuID0gdGhpcy5wYXJzZVRleHQoY29udGV4dCk7XHJcbiAgLy8gICAgIH1cclxuICAvLyAgICAgdG9rZW4ucGlkID0gcGlkXHJcbiAgLy8gICAgIHRva2Vucy5wdXNoKHRva2VuKTtcclxuICAvLyAgIH1lbHNlIGlmKG1vZGUgPT09IFRleHRNb2Rlcy5DREFUQSkge1xyXG4gIC8vICAgICBpZiAoc291cmNlLnN0YXJ0c1dpdGgoXCI8IVtDREFUQVtcIikpIHtcclxuICAvLyAgICAgICAvLyBDREFUQVxyXG4gIC8vICAgICAgIHRva2VuID0gdGhpcy5wYXJzZUNEQVRBKGNvbnRleHQpO1xyXG4gIC8vICAgICAgIHJldmVydE1vZGUoY29udGV4dCk7XHJcbiAgLy8gICAgIH1cclxuICAvLyAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxufVxyXG4vLyBmdW5jdGlvbiBwYXJzZVN0YXJ0VGFnKGNvbnRleHQ6IHBhcnNlckNvbnRleHQpIHtcclxuLy8gICBjb25zdCB0YWc6IGFueSA9IHtcclxuLy8gICAgIHR5cGU6ICdzdGFydFRhZycsXHJcbi8vICAgICB0YWdOYW1lOiAnJyxcclxuLy8gICAgIGF0dHJpYnV0ZXM6IFtdXHJcbi8vICAgfTtcclxuXHJcbi8vICAgLy8gXHU4OUUzXHU2NzkwXHU2ODA3XHU3QjdFXHU1NDBEXHJcbi8vICAgY29uc3QgdGFnTmFtZUVuZEluZGV4ID0gaW5wdXQuaW5kZXhPZignPicpO1xyXG4vLyAgIHRhZy50YWdOYW1lID0gaW5wdXQuc2xpY2UoMSwgdGFnTmFtZUVuZEluZGV4KTtcclxuXHJcbi8vICAgLy8gXHU4OUUzXHU2NzkwXHU1QzVFXHU2MDI3XHJcbi8vICAgY29uc3QgYXR0cmlidXRlc1N0cmluZyA9IGlucHV0LnNsaWNlKHRhZ05hbWVFbmRJbmRleCwgaW5wdXQuaW5kZXhPZignPicpKTtcclxuLy8gICB0YWcuYXR0cmlidXRlcyA9IHBhcnNlQXR0cmlidXRlcyhhdHRyaWJ1dGVzU3RyaW5nKTtcclxuXHJcbi8vICAgcmV0dXJuIHRhZztcclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gcGFyc2VFbmRUYWcoY29udGV4dCkge1xyXG4vLyAgIC8vXHU1M0Q2XHU1MUIzXHU0RThFXHU2NjJGXHU1NDI2XHU2NjJGXHU1MzU1XHU2ODA3XHU3QjdFXHJcbi8vICAgY29uc3QgdGFnTmFtZUVuZEluZGV4ID0gY29udGV4dC5zb3VyY2UuaW5kZXhPZignPicpO1xyXG4vLyAgIGNvbnN0IHRhZ05hbWUgPSBjb250ZXh0LnNvdXJjZS5zbGljZSgyLCB0YWdOYW1lRW5kSW5kZXgpO1xyXG4vLyAgIGFkdmFuY2VCeShjb250ZXh0LCAwLCApXHJcbiAgXHJcbi8vICAgcmV0dXJuIHtcclxuLy8gICAgIHR5cGU6ICdlbmRUYWcnLFxyXG4vLyAgICAgdGFnTmFtZTogdGFnTmFtZVxyXG4vLyAgIH07XHJcbi8vIH1cclxuXHJcbi8vIGZ1bmN0aW9uIHBhcnNlQXR0cmlidXRlcyhpbnB1dCkge1xyXG4vLyAgIGNvbnN0IGF0dHJpYnV0ZXM6IGFueVtdID0gW107XHJcblxyXG4vLyAgIC8vIFx1OTAxQVx1OEZDN1x1NkI2M1x1NTIxOVx1ODg2OFx1OEZCRVx1NUYwRlx1NjNEMFx1NTNENlx1NUM1RVx1NjAyN1x1NTQwRFx1NTQ4Q1x1NUM1RVx1NjAyN1x1NTAzQ1xyXG4vLyAgIGNvbnN0IHJlZ2V4ID0gLyhcXFMrKVxccyo9XFxzKltcIiddPygoPzouKD8hW1wiJ10/XFxzKyg/OlxcUyspPXxbPlwiJ10pKSsuKVtcIiddPy9nO1xyXG4vLyAgIGxldCBtYXRjaDtcclxuICBcclxuLy8gICB3aGlsZSAoKG1hdGNoID0gcmVnZXguZXhlYyhpbnB1dCkpICE9PSBudWxsKSB7XHJcbi8vICAgICBjb25zdCBhdHRyaWJ1dGUgPSB7XHJcbi8vICAgICAgIG5hbWU6IG1hdGNoWzFdLFxyXG4vLyAgICAgICB2YWx1ZTogbWF0Y2hbMl1cclxuLy8gICAgIH07XHJcblxyXG4vLyAgICAgYXR0cmlidXRlcy5wdXNoKGF0dHJpYnV0ZSk7XHJcbi8vICAgfVxyXG5cclxuLy8gICByZXR1cm4gYXR0cmlidXRlcztcclxuLy8gfVxyXG5cclxuLy8gZnVuY3Rpb24gcGFyc2VUZXh0KGlucHV0KSB7XHJcbi8vICAgY29uc3QgZW5kSW5kZXggPSBpbnB1dC5pbmRleE9mKCc8Jyk7XHJcbi8vICAgY29uc3QgdGV4dENvbnRlbnQgPSBpbnB1dC5zbGljZSgwLCBlbmRJbmRleCkudHJpbSgpO1xyXG5cclxuLy8gICByZXR1cm4ge1xyXG4vLyAgICAgdHlwZTogJ3RleHQnLFxyXG4vLyAgICAgY29udGVudDogdGV4dENvbnRlbnRcclxuLy8gICB9O1xyXG4vLyB9XHJcblxyXG5sZXQgaWR4ID0gQmlnSW50KDEpO1xyXG5leHBvcnQgY2xhc3MgSFRNTFBhcnNlciB7XHJcbiAgcHJpdmF0ZSBfb3B0aW9uczogX3BhcnNlck9wdGlvbnM7XHJcbiAgY29uc3RydWN0b3Iob3B0aW9uczogcGFyc2VyT3B0aW9ucyA9IHt9KSB7XHJcbiAgICB0aGlzLl9vcHRpb25zID0ge1xyXG4gICAgICAuLi5vcHRpb25zLFxyXG4gICAgICBpZDogaWR4XHJcbiAgICB9O1xyXG4gIH1cclxuICBwYXJzZXIodGVtcGxhdGUpIHtcclxuICAgIGNvbnN0IHJvb3Q6IFJvb3ROb2RlID0ge1xyXG4gICAgICBpZDogdGhpcy5fb3B0aW9ucy5pZCsrLFxyXG4gICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuUm9vdCxcclxuICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICBwaWQ6IEJpZ0ludCgwKSxcclxuICAgIH07XHJcbiAgICBjb25zdCBjb250ZXh0OiBwYXJzZXJDb250ZXh0ID0ge1xyXG4gICAgICAgIHNvdXJjZTogdGVtcGxhdGUsXHJcbiAgICAgICAgbW9kZTogVGV4dE1vZGVzLkRBVEEsXHJcbiAgICAgICAgb2xkTW9kZTogVGV4dE1vZGVzLkRBVEEsXHJcbiAgICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLlJvb3QsXHJcbiAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgIHBpZDogcm9vdC5pZCxcclxuICAgIH1cclxuICAgIGNvbnN0IHRva2VucyA9IHRva2VuaXplKGNvbnRleHQpXHJcbiAgICByb290LmNoaWxkcmVuID0gdGhpcy5wYXJzZUNoaWxkcmVuKGNvbnRleHQpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gcm9vdFxyXG4gIH1cclxuICBwYXJzZUNoaWxkcmVuKGNvbnRleHQsIGFuY2VzdG9ycyA9IFtdKTogTm9kZVtdIHtcclxuICAgICAgbGV0IG5vZGVzOiBOb2RlW10gPSBbXTtcclxuICAgICAgLy8gXHU0RUNFXHU0RTBBXHU0RTBCXHU2NTg3XHU1QkY5XHU4QzYxXHU0RTJEXHU1M0Q2XHU1Rjk3XHU1RjUzXHU1MjREXHU3MkI2XHU2MDAxXHVGRjBDXHU1MzA1XHU2MkVDXHU2QTIxXHU1RjBGIG1vZGUgXHU1NDhDXHU2QTIxXHU2NzdGXHU1MTg1XHU1QkI5XHJcbiAgICBcclxuICAgICAgd2hpbGUgKHRoaXMuaXNFbmQoY29udGV4dCwgYW5jZXN0b3JzKSkge1xyXG4gICAgICAgIGNvbnN0IHttb2RlLCBzb3VyY2UsIHBpZH0gPSBjb250ZXh0O1xyXG4gICAgICAgIGxldCBub2RlOy8vIFx1NTNFQVx1NjcwOSBEQVRBIFx1NkEyMVx1NUYwRlx1NTQ4QyBSQ0RBVEEgXHU2QTIxXHU1RjBGXHU2MjREXHU2NTJGXHU2MzAxXHU2M0QyXHU1MDNDXHU4MjgyXHU3MEI5XHU3Njg0XHU4OUUzXHU2NzkwXHJcbiAgICAgICAgaWYgKG1vZGUgPT09IFRleHRNb2Rlcy5EQVRBIHx8IG1vZGUgPT09IFRleHRNb2Rlcy5SQ0RBVEEpIHtcclxuICAgICAgICAgIC8vIFx1NTNFQVx1NjcwOSBEQVRBIFx1NkEyMVx1NUYwRlx1NjI0RFx1NjUyRlx1NjMwMVx1NjgwN1x1N0I3RVx1ODI4Mlx1NzBCOVx1NzY4NFx1ODlFM1x1Njc5MFxyXG4gICAgICAgICAgaWYgKHNvdXJjZS5zdGFydHNXaXRoKFwiPCFbQ0RBVEFbXCIpKSB7XHJcbiAgICAgICAgICAgIC8vIENEQVRBXHJcbiAgICAgICAgICAgIHRvZ2dsZU1vZGUoY29udGV4dCwgVGV4dE1vZGVzLkNEQVRBKTtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICB9ZWxzZSBpZihtb2RlID09PSBUZXh0TW9kZXMuREFUQSAmJiBzb3VyY2VbMF0gPT09IFwiPFwiKSB7XHJcbiAgICAgICAgICAgIGlmKHNvdXJjZVsxXSA9PT0gJyEnKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHNvdXJjZS5zdGFydHNXaXRoKFwiPCEtLVwiKSkge1xyXG4gICAgICAgICAgICAgICAgLy9cdTZDRThcdTkxQ0FcclxuICAgICAgICAgICAgICAgIG5vZGUgPSB0aGlzLnBhcnNlQ29tbWVudChjb250ZXh0LCBhbmNlc3RvcnMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfWVsc2UgaWYoL1thLXpdL2kudGVzdChzb3VyY2VbMV0pKSB7XHJcbiAgICAgICAgICAgICAgLy9cdTY4MDdcdTdCN0VcclxuICAgICAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZUVsZW1lbnQoY29udGV4dCwgYW5jZXN0b3JzKTtcclxuICAgICAgICAgICAgfWVsc2UgaWYoc291cmNlWzFdID09PSAnLycpIHtcclxuICAgICAgICAgICAgICAvL1x1N0VEM1x1Njc1Rlx1NjgwN1x1N0I3RVx1NzJCNlx1NjAwMVxyXG4gICAgICAgICAgICAgIHJldHVybiBub2RlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfWVsc2UgaWYgKG1vZGUgPT09IFRleHRNb2Rlcy5SQ0RBVEEgfHwgbW9kZSA9PT0gVGV4dE1vZGVzLkRBVEEgJiYgc291cmNlWzFdID09PSBcIi9cIikge1xyXG4gICAgICAgICAgICAvL1x1N0VEM1x1Njc1Rlx1NjgwN1x1N0I3RVx1RkYwQ1x1OEZEOVx1OTFDQ1x1OTcwMFx1ODk4MVx1NjI5Qlx1NTFGQVx1OTUxOVx1OEJFRlx1RkYwQ1x1NTQwRVx1NjU4N1x1NEYxQVx1OEJFNlx1N0VDNlx1ODlFM1x1OTFDQVx1NTM5Rlx1NTZFMFxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTRFMERcdTY2MkZEQVRBXHU2QTIxXHU1RjBGXCIpO1xyXG4gICAgICAgICAgfWVsc2UgaWYoc291cmNlLnN0YXJ0c1dpdGgoXCJ7e1wiKSkge1xyXG4gICAgICAgICAgICAvL1x1NjNEMlx1NTAzQ1x1ODlFM1x1Njc4NFxyXG4gICAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZUludGVycG9sYXRpb24oY29udGV4dCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBub2RlIFx1NEUwRFx1NUI1OFx1NTcyOFx1RkYwQ1x1OEJGNFx1NjYwRVx1NTkwNFx1NEU4RVx1NTE3Nlx1NEVENlx1NkEyMVx1NUYwRlx1RkYwQ1x1NTM3M1x1OTc1RSBEQVRBIFx1NkEyMVx1NUYwRlx1NEUxNFx1OTc1RSBSQ0RBVEEgXHU2QTIxXHU1RjBGXHJcbiAgICAgICAgICBpZighbm9kZSkge1xyXG4gICAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZVRleHQoY29udGV4dCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBub2RlLnBpZCA9IHBpZFxyXG4gICAgICAgICAgbm9kZXMucHVzaChub2RlKTtcclxuICAgICAgICB9ZWxzZSBpZihtb2RlID09PSBUZXh0TW9kZXMuQ0RBVEEpIHtcclxuICAgICAgICAgIGlmIChzb3VyY2Uuc3RhcnRzV2l0aChcIjwhW0NEQVRBW1wiKSkge1xyXG4gICAgICAgICAgICAvLyBDREFUQVxyXG4gICAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZUNEQVRBKGNvbnRleHQsIGFuY2VzdG9ycyk7XHJcbiAgICAgICAgICAgIHJldmVydE1vZGUoY29udGV4dCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbm9kZXM7XHJcbiAgfVxyXG4gIGlzRW5kKGNvbnRleHQsIGFuY2VzdG9ycykge1xyXG4gICAgLy9cdTUxNDNcdTdEMjBcdTY4MDgsXHU1RjUzXHU1MjREXHU1QjUwXHU1MTQzXHU3RDIwXHU2NzA5XHU1QkY5XHU1RTk0XHU2ODA4XHJcbiAgICAvLyBmb3IobGV0IGkgPSAwOyBpIDwgYW5jZXN0b3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAvLyAgIGlmKGFuY2VzdG9yc1tpXS50YWcpIHtcclxuICAgIC8vICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIC8vICAgfVxyXG4gICAgLy8gfVxyXG4gICAgaWYoY29udGV4dC5zb3VyY2UpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gICAgXHJcbiAgcGFyc2VUZXh0KGNvbnRleHQpOiBUZXh0Tm9kZSB7XHJcbiAgICBsZXQge21vZGUsIHNvdXJjZX0gPSBjb250ZXh0O1xyXG4gICAgLy9cdTUzMzlcdTkxNERcdTdFQUZcdTY1ODdcdTY3MkNcclxuICAgIGNvbnN0IG1hdGNoID0gc291cmNlLm1hdGNoKC9bXjw+XSovKTtcclxuICAgIGxldCBjb250ZW50ID0gJyc7XHJcbiAgICBpZihtYXRjaFswXSkge1xyXG4gICAgICBhZHZhbmNlQnkoY29udGV4dCwgbWF0Y2hbMF0ubGVuZ3RoKTtcclxuICAgICAgY29udGVudCA9IG1hdGNoWzBdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IHRoaXMuX29wdGlvbnMuaWQrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLlRleHQsXHJcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXHJcbiAgICAgIHBpZDogY29udGV4dC5waWRcclxuICAgIH1cclxuICB9XHJcbiAgcGFyc2VJbnRlcnBvbGF0aW9uKGNvbnRleHQpIHtcclxuICAgIGNvbnN0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIGNvbnN0IG1hdGNoID0gc291cmNlLm1hdGNoKC9eXFx7XFx7XFxzKiguKj8pXFxzKlxcfVxcfS8pO1xyXG4gICAgYWR2YW5jZUJ5KGNvbnRleHQsIG1hdGNoWzBdLmxlbmd0aCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IHRoaXMuX29wdGlvbnMuaWQrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkludGVycG9sYXRpb24sXHJcbiAgICAgIGNvbnRlbnQ6IFttYXRjaFswXSwgbWF0Y2hbMV1dLFxyXG4gICAgICBwaWQ6IGNvbnRleHQucGlkXHJcbiAgICB9XHJcbiAgfVxyXG4gIHBhcnNlRWxlbWVudChjb250ZXh0LCBhbmNlc3RvcnMpOiBFbGVtZW50Tm9kZSB7XHJcbiAgICBsZXQge3NvdXJjZX0gPSBjb250ZXh0O1xyXG4gIFxyXG4gICAgY29uc3QgbWF0Y2ggPSBzb3VyY2UubWF0Y2goL148KFthLXpdW2EtekEtWi1dKikvKTtcclxuICAgIGlmKCFtYXRjaCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTY4MDdcdTdCN0VcdTY4M0NcdTVGMEZcdTRFMERcdTZCNjNcdTc4NkVcIik7XHJcbiAgICB9XHJcbiAgICBjb25zdCB0YWdOYW1lID0gbWF0Y2hbMV07XHJcbiAgICBjb25zdCBpc1VuYXJ5VGFnID0gaXNVbmFyeSh0YWdOYW1lKTtcclxuXHJcbiAgICBjb250ZXh0LnNvdXJjZSA9IHNvdXJjZS5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xyXG4gICAgY29uc3QgZWxlbWVudCA9IHsgLy9cdThGRDlcdTRFMkFcdTcyQjZcdTYwMDFcdTY4MDhcdUZGMENcdTVCNTBcdTUxNDNcdTdEMjBcdTk3MDBcdTg5ODFcdTUzMzlcdTkxNERcdTVCODNcdTY2MkZcdTU0MjZcdTk3MDBcdTg5ODFcdTk1RURcdTU0MDgsXHU2MjE2XHU4MDA1XHU1QjgzXHU1M0VGXHU4MEZEXHU2NjJGXHU4MUVBXHU5NUVEXHU1NDA4XHU3Njg0XHU2ODA3XHU3QjdFXHJcbiAgICAgIHRhZ1N0YXR1czogVGFnU3RhdGUudGFnTmFtZSwgLy9cdTUxODVcdTVCQjlcdTcyQjZcdTYwMDFcclxuICAgICAgdGFnTmFtZTogdGFnTmFtZSwgLy9cdTY4MDdcdTdCN0VcdTU0MERcdTc5RjBcclxuICAgICAgdW5hcnk6IGlzVW5hcnlUYWcsXHJcbiAgICB9ICBcclxuICAgIC8vMS5cdTUzMzlcdTkxNERcdTUxNDNcdTdEMjBcdTVDNUVcdTYwMjdcclxuICAgIGNvbnN0IGF0dHJzID0gdGhpcy5wYXJzZUF0dHJpYnV0ZShjb250ZXh0LCBlbGVtZW50KTtcclxuICAgIGNvbnN0IEVsZW1lbnROb2RlOiBFbGVtZW50Tm9kZSA9IHtcclxuICAgICAgaWQ6IHRoaXMuX29wdGlvbnMuaWQrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkVsZW1lbnQsXHJcbiAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXHJcbiAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgYXR0cnM6IGF0dHJzLFxyXG4gICAgICBwaWQ6IGNvbnRleHQucGlkLFxyXG4gICAgfVxyXG5cclxuICAgIGlmKGlzVW5hcnlUYWcpIHtcclxuICAgICAgY2xvc2VFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgfWVsc2Uge1xyXG4gICAgICBhbmNlc3RvcnMucHVzaChlbGVtZW50KTtcclxuICAgICAgLy8yLlx1NTMzOVx1OTE0RFx1NTE0M1x1N0QyMFx1NTE4NVx1NUJCOSwgXHU2NzA5XHU1QjUwXHU1MTQzXHU3RDIwXHU1QzMxXHU1RjAwXHU1NDJGXHU3MkI2XHU2MDAxXHU2NzNBXHJcbiAgICAgIGVsZW1lbnQudGFnU3RhdHVzID0gVGFnU3RhdGUudGV4dDtcclxuICAgICAgLy9cdTUzMzlcdTkxNERcdTVDM0VcdTVERjRcdTUxODVcdTVCQjlcclxuICAgICAgY29uc3QgbWF0Y2hUYWdFbmQgPSBjb250ZXh0LnNvdXJjZS5tYXRjaChgKC4qPyk8XFxcXC8ke3RhZ05hbWV9PmApO1xyXG4gIFxyXG4gICAgICBpZihtYXRjaFRhZ0VuZCkge1xyXG4gICAgICAgIGNvbnRleHQucGlkID0gRWxlbWVudE5vZGUuaWQ7XHJcbiAgICAgICAgRWxlbWVudE5vZGUuY2hpbGRyZW4gPSB0aGlzLnBhcnNlQ2hpbGRyZW4oY29udGV4dCwgYW5jZXN0b3JzKTtcclxuICAgICAgfWVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjgwN1x1N0I3RVx1NUZDNVx1OTg3Qlx1ODk4MVx1NjcwOVx1N0VEM1x1Njc1RlwiKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBhbmNlc3RvciA9IGFuY2VzdG9ycy5wb3AoKTsgLy9cdTkwMDBcdTUxRkFcdTY4MDhcclxuICAgICAgaWYoYW5jZXN0b3IpIHtcclxuICAgICAgICBhZHZhbmNlQnkoY29udGV4dCwgYW5jZXN0b3IudGFnTmFtZS5sZW5ndGgrMik7XHJcbiAgICAgICAgYWR2YW5jZVNwYWNlcyhjb250ZXh0KTtcclxuICAgICAgICBhZHZhbmNlQnkoY29udGV4dCwgMSk7XHJcbiAgICAgIH1lbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTRFMERcdTU0MDhcdTZDRDVcdTc2ODRcdTY4MDdcdTdCN0VcIik7XHJcbiAgICAgIH1cclxuICAgICAgLy8zLlx1NTMzOVx1OTE0RDwvLi4uPlxyXG4gICAgICAvLzIuXHU2RDg4XHU4RDM5XHU2NUY2XHVGRjBDXHU2OEMwXHU2RDRCXHU2QTIxXHU2NzdGXHU2NjJGXHU1NDI2XHU1QjU4XHU1NzI4IC8+XHVGRjBDXHU1OTgyXHU2NzlDXHU2NzA5XHU1MjE5XHU4ODY4XHU3OTNBXHU1MTc2XHU0RTNBXHU4MUVBXHU5NUVEXHU1NDA4XHU2ODA3XHU3QjdFXHVGRjBDXHU5NzAwXHU4OTgxXHU1MDVBXHU1MUZBXHU2ODA3XHU2Q0U4XHJcbiAgICAgIC8vMy5cdTVCOENcdTYyMTBcdTZCNjNcdTUyMTlcdTUzMzlcdTkxNERcdTU0MEVcdUZGMENcdTk3MDBcdTg5ODFcdThDMDNcdTc1MjggYWR2YW5jZUJ5IFx1NTFGRFx1NjU3MFx1NkQ4OFx1OEQzOVx1NzUzMVx1NkI2M1x1NTIxOVx1NTMzOVx1OTE0RFx1NzY4NFx1NTE2OFx1OTBFOFx1NTE4NVx1NUJCOVxyXG4gICAgICAvLzQuXHU1OTgyXHU2NzlDXHU4MUVBXHU5NUVEXHU1NDA4XHVGRjBDXHU1MjE5IGFkdmFuY2VCeSBcdTZEODhcdThEMzkgLz5cclxuICAgIH1cclxuICAgIHJldHVybiBFbGVtZW50Tm9kZTtcclxuICB9XHJcbiAgXHJcbiAgcGFyc2VBdHRyaWJ1dGUoY29udGV4dCwgZWxlbWVudCkge1xyXG4gICAgLy9cdTg5RTNcdTY3OTBcdTVDNUVcdTYwMjdcdUZGMENcdTYzMDdcdTRFRTR2LWlmLHYtbW9kZWwsXHU0RThCXHU0RUY2QGV2ZW50LCB2LW9uOmV2ZW50TmFtZSwgdjpiaW5kOm5hbWUuc3luY1xyXG4gICAgY29uc3QgYXR0clJlZyA9IC8oOj9bYS16QS1aXVthLXpBLVotXSopXFxzKig/Oig9KVxccyooPzooW1wiJ10pKFteXCInPD5dKilcXDN8KFteXFxzXCInPD5dKikpKT8vXHJcbiAgXHJcbiAgICBjb25zdCBhdHRyaWJ1dGVzOiBzdHJpbmdbXVtdID0gW107XHJcbiAgICBhZHZhbmNlU3BhY2VzKGNvbnRleHQpO1xyXG4gICAgbGV0IGF0dHJNYXRjaDtcclxuICAgIHdoaWxlKGNvbnRleHQuc291cmNlWzBdICE9PSAnPCcgJiYgY29udGV4dC5zb3VyY2VbMF0gIT09ICc+Jykge1xyXG4gICAgICAvL1x1NkQ4OFx1OTY2NFx1N0E3QVx1NjgzQ1xyXG4gICAgICBhdHRyTWF0Y2ggPSBjb250ZXh0LnNvdXJjZS5tYXRjaChhdHRyUmVnKTtcclxuICBcclxuICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIGF0dHJNYXRjaFswXS5sZW5ndGgpOyAvL1x1NkQ4OFx1OTY2NFx1NUM1RVx1NjAyN1xyXG4gIFxyXG4gICAgICAvLyBbJ3YtaWY9XCJpc1Nob3dcIicsICd2LWlmJywgJz0nLCAnaXNTaG93J10sICAgXHJcbiAgICAgIC8vIFsnY2xhc3M9XCJoZWFkZXJcIicsICdjbGFzcycsICc9JywgJ2hlYWRlciddXHJcbiAgICAgIGF0dHJpYnV0ZXMucHVzaChbYXR0ck1hdGNoWzBdLCBhdHRyTWF0Y2hbMV0sIGF0dHJNYXRjaFsyXSwgYXR0ck1hdGNoWzRdXSk7XHJcbiAgXHJcbiAgICAgIC8vXHU2RDg4XHU5NjY0XHU3QTdBXHU2ODNDXHJcbiAgICAgIGFkdmFuY2VTcGFjZXMoY29udGV4dCk7XHJcbiAgICAgIGlmKGNvbnRleHQuc291cmNlWzBdID09PSAnLycgJiYgZWxlbWVudC51bmFyeSkge1xyXG4gICAgICAgIC8vXHU4MUVBXHU5NUVEXHU1NDA4XHU2ODA3XHU3QjdFXHJcbiAgICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIDEpO1xyXG4gICAgICB9XHJcbiAgICAgIGFkdmFuY2VTcGFjZXMoY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICBhZHZhbmNlQnkoY29udGV4dCwgMSk7IC8vXHU2RDg4XHU5NjY0PlxyXG4gIFxyXG4gICAgcmV0dXJuIGF0dHJpYnV0ZXM7XHJcbiAgfVxyXG4gIC8vXHU2Q0U4XHU5MUNBXHJcbiAgcGFyc2VDb21tZW50KGNvbnRleHQsIGFuY2VzdG9ycyk6IENvbW1lbnROb2RlIHtcclxuICAgIGxldCB7c291cmNlfSA9IGNvbnRleHQ7XHJcbiAgICBsZXQgdmFsdWUgPSAnJzsgLy9cdTZDRThcdTkxQ0FcdTUxODVcdTVCQjlcclxuICBcclxuICAgIHNvdXJjZSA9IHNvdXJjZS5zbGljZSg0KTtcclxuICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKC8oW1xcc1xcU10qPykoLS0+KS8sIGZ1bmN0aW9uKG1hdGNoLCAkMSwgJDIpIHtcclxuICAgICAgdmFsdWUgPSAkMTtcclxuICAgICAgcmV0dXJuICQyID8gJDIgOiAnJztcclxuICAgIH0pO1xyXG4gICAgaWYoc291cmNlLnN0YXJ0c1dpdGgoXCItLT5cIikpIHtcclxuICAgICAgY29udGV4dC5zb3VyY2UgPSBzb3VyY2Uuc2xpY2UoMyk7XHJcbiAgICB9ZWxzZSB7XHJcbiAgICAgIC8vXHU2MjE2XHU4MDA1XHU2MjRCXHU1MkE4XHU5NUVEXHU1NDA4XHJcbiAgICAgIHZhbHVlID0gY29udGV4dC5zb3VyY2U7XHJcbiAgICAgIGNvbnRleHQuc291cmNlID0gJyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpZDogdGhpcy5fb3B0aW9ucy5pZCsrLFxyXG4gICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuQ29tbWVudCxcclxuICAgICAgY29udGVudDogdmFsdWUsXHJcbiAgICAgIHBpZDogY29udGV4dC5waWRcclxuICAgIH1cclxuICB9XHJcbiAgcGFyc2VDREFUQShjb250ZXh0LCBhbmNlc3RvcnMpIHtcclxuICAgIGNvbnN0IGNkYXRhTWF0Y2ggPSBjb250ZXh0LnNvdXJjZS5tYXRjaCgvXjwhXFxbQ0RBVEFcXFsoW1xcc1xcU10qPylcXF1cXF0vKTtcclxuICAgIGFkdmFuY2VCeShjb250ZXh0LCBjZGF0YU1hdGNoWzBdLmxlbmd0aCk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlkOiB0aGlzLl9vcHRpb25zLmlkKyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5DREFUQSxcclxuICAgICAgY29udGVudDogY2RhdGFNYXRjaFsxXSxcclxuICAgICAgcGlkOiBjb250ZXh0LnBpZFxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUluc05vZGUobm9kZSkge1xyXG4gIC8vIFx1NTIxQlx1NUVGQWluc1x1ODI4Mlx1NzBCOVx1RkYwQ1x1NUU3Nlx1NTkwRFx1NTIzNlx1NTM5Rlx1ODI4Mlx1NzBCOVx1NzY4NFx1NUM1RVx1NjAyN1x1NTQ4Q1x1NUI1MFx1ODI4Mlx1NzBCOVxyXG4gIGNvbnN0IGluc05vZGU6IEVsZW1lbnROb2RlID0ge1xyXG4gICAgICBpZDogaWR4KyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5FbGVtZW50LFxyXG4gICAgICB0YWdOYW1lOiAnaW5zJyxcclxuICAgICAgYXR0cnM6IFtdLFxyXG4gICAgICBjaGlsZHJlbjogW25vZGVdLFxyXG4gICAgICBwaWQ6IG5vZGUucGlkLFxyXG4gIH07XHJcbiAgbm9kZS5waWQgPSBpbnNOb2RlLmlkO1xyXG4gIHJldHVybiBpbnNOb2RlO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZWxOb2RlKG5vZGUpIHtcclxuICAvLyBcdTUyMUJcdTVFRkFkZWxcdTgyODJcdTcwQjlcdUZGMENcdTVFNzZcdTU5MERcdTUyMzZcdTUzOUZcdTgyODJcdTcwQjlcdTc2ODRcdTVDNUVcdTYwMjdcdTU0OENcdTVCNTBcdTgyODJcdTcwQjlcclxuICBjb25zdCBkZWxOb2RlOiBFbGVtZW50Tm9kZSA9IHtcclxuICAgICAgaWQ6IGlkeCsrLFxyXG4gICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuRWxlbWVudCxcclxuICAgICAgdGFnTmFtZTogJ2RlbCcsXHJcbiAgICAgIGF0dHJzOiBbXSxcclxuICAgICAgY2hpbGRyZW46IFtub2RlXSxcclxuICAgICAgcGlkOiBub2RlLnBpZCxcclxuICB9O1xyXG4gIG5vZGUucGlkID0gZGVsTm9kZS5pZDtcclxuICByZXR1cm4gZGVsTm9kZTtcclxufSIsICJpbXBvcnQge0hUTUxOb2RlVHlwZX0gZnJvbSAnLi4vY29yZS90eXBlcydcclxuLy8zLlx1NzUyOFx1Njc2NVx1NjgzOVx1NjM2RUphdmFTY3JpcHQgQVNUXHU3NTFGXHU2MjEwXHU2RTMyXHU2N0QzXHU1MUZEXHU2NTcwXHU0RUUzXHU3ODAxXHU3Njg0XHU3NTFGXHU2MjEwXHU1NjY4XHVGRjA4Z2VuZXJhdG9yXHVGRjA5XHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZShub2RlLCBvcHRpb25zPXt9KSB7XHJcbiAgICBpZiAobm9kZS50eXBlID09PSBIVE1MTm9kZVR5cGUuUm9vdCkge1xyXG4gICAgICAvLyBcdTU5MDRcdTc0MDZcdTY4MzlcdTgyODJcdTcwQjlcclxuICAgICAgcmV0dXJuIGdlbmVyYXRlQ2hpbGRyZW5Db2RlKG5vZGUuY2hpbGRyZW4pO1xyXG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09IEhUTUxOb2RlVHlwZS5FbGVtZW50KSB7XHJcbiAgICAgIC8vIFx1NTkwNFx1NzQwNlx1NTE0M1x1N0QyMFx1ODI4Mlx1NzBCOVxyXG4gICAgICBjb25zdCBhdHRycyA9IGdlbmVyYXRlQXR0cmlidXRlc0NvZGUobm9kZS5hdHRycyk7XHJcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gZ2VuZXJhdGVDaGlsZHJlbkNvZGUobm9kZS5jaGlsZHJlbik7XHJcbiAgICAgIHJldHVybiBgPCR7bm9kZS50YWdOYW1lfSR7YXR0cnN9PiR7Y2hpbGRyZW59PC8ke25vZGUudGFnTmFtZX0+YDtcclxuICAgIH0gZWxzZSBpZiAobm9kZS50eXBlID09PSBIVE1MTm9kZVR5cGUuVGV4dCkge1xyXG4gICAgICAvLyBcdTU5MDRcdTc0MDZcdTY1ODdcdTY3MkNcdTgyODJcdTcwQjlcclxuICAgICAgcmV0dXJuIG5vZGUuY29udGVudDtcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gZ2VuZXJhdGVBdHRyaWJ1dGVzQ29kZShhdHRycykge1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGF0dHJzKSB8fCBhdHRycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICcgJyArIGF0dHJzLm1hcChhdHRyID0+IGAke2F0dHIubmFtZX09XCIke2F0dHIudmFsdWV9XCJgKS5qb2luKCcgJyk7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ2hpbGRyZW5Db2RlKGNoaWxkcmVuKSB7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRyZW4pIHx8IGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gJyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2hpbGRyZW4ubWFwKGNoaWxkID0+IGdlbmVyYXRlKGNoaWxkKSkuam9pbignJyk7XHJcbiAgfSIsICJcclxuaW1wb3J0IHt0cmFuc2Zvcm1UZXh0LCB0cmFuc2Zvcm1EaWZmfSBmcm9tICcuLi90cmFuc2Zvcm0vaW5kZXgnO1xyXG5pbXBvcnQge2RlZXBDb3B5fSBmcm9tICcuL3V0aWxzL2luZGV4J1xyXG5pbXBvcnQgeyBnZW5lcmF0ZSB9IGZyb20gJy4vZ2VuZXJhdGUnO1xyXG5cclxuaW50ZXJmYWNlIHRyYW5zZm9ybU9wdGlvbnMge1xyXG4gICAgbm9kZVRyYW5zZm9ybXM/OiBGdW5jdGlvbltdIHwgW3N0cmluZywgRnVuY3Rpb25dLFxyXG4gICAgZGlyZWN0aXZlVHJhbnNmb3Jtcz86IE9iamVjdCxcclxuICAgIGRpZmZBc3Q/OiBPYmplY3RcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybShhc3QsIG9wdGlvbnM6IHRyYW5zZm9ybU9wdGlvbnMgPSB7fSkge1xyXG4gICAgY29uc3QgeyBub2RlVHJhbnNmb3JtcyA9IFtdLCBkaXJlY3RpdmVUcmFuc2Zvcm1zID0ge30sIGRpZmZBc3QgPSB7fSB9ID0gb3B0aW9ucztcclxuXHJcbiAgICBjb25zdCBjb250ZXh0ID0ge1xyXG4gICAgICAgIGFzdDogZGVlcENvcHkoYXN0KSxcclxuICAgICAgICBkaWZmQXN0OiBkZWVwQ29weShkaWZmQXN0KSxcclxuICAgICAgICBub2RlVHJhbnNmb3JtczogW1xyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1JZixcclxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtRm9yLFxyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1UZXh0LFxyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1EaWZmLFxyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1FbGVtZW50LFxyXG4gICAgICAgICAgICAuLi5ub2RlVHJhbnNmb3Jtcy5maWx0ZXIoaXRlbSA9PiBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbVswXSAhPT0gJ2FsbCcgOiB0cnVlKSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGRpcmVjdGl2ZVRyYW5zZm9ybXM6IHtcclxuICAgICAgICAgICAgLy8gb246IHRyYW5zZm9ybU9uLFxyXG4gICAgICAgICAgICAvLyBiaW5kOiB0cmFuc2Zvcm1CaW5kLFxyXG4gICAgICAgICAgICAvLyBtb2RlbDogdHJhbnNmb3JtTW9kZWxcclxuICAgICAgICAgICAgLi4uZGlyZWN0aXZlVHJhbnNmb3Jtc1xyXG4gICAgICAgIH0sXHJcbiAgICB9XHJcbiAgICBjb25zdCBub2RlVHJhbnNmb3JtQWxsID0gbm9kZVRyYW5zZm9ybXMuZmlsdGVyKGl0ZW0gPT4gQXJyYXkuaXNBcnJheShpdGVtKSAmJiBpdGVtWzBdID09PSAnYWxsJykuZmxhdE1hcChmID0+IGZbMV0pO1xyXG4gICAgY2FsbE5vZGVUcmFuc2Zvcm1zKGNvbnRleHQuYXN0LCB7XHJcbiAgICAgICAgLi4uY29udGV4dCxcclxuICAgICAgICBub2RlVHJhbnNmb3Jtczogbm9kZVRyYW5zZm9ybUFsbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy9cdTkwNERcdTUzODZcdTY4MTFcdTdFRDNcdTY3ODRcdUZGMENcdTVFNzZcdThDMDNcdTc1MjhcdTYzRDJcdTRFRjZcdTUxRkRcdTY1NzBcclxuICAgIHRyYXZlcnNlTm9kZShjb250ZXh0LmFzdCwgY29udGV4dCk7XHJcbiAgICByZXR1cm4gZ2VuZXJhdGUoY29udGV4dC5hc3QsIG9wdGlvbnMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxsTm9kZVRyYW5zZm9ybXMobm9kZSwgY29udGV4dCkge1xyXG4gICAgY29uc3QgeyBub2RlVHJhbnNmb3Jtcywgb25FbnRlciwgb25FeGl0IH0gPSBjb250ZXh0O1xyXG4gICAgY29uc3QgZXhpdEZuczogRnVuY3Rpb25bXSA9IFtdOyAvL1x1OTAwMFx1NTFGQVx1NTFGRFx1NjU3MFxyXG4gICAgXHJcbiAgICB0eXBlb2Ygb25FbnRlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvbkVudGVyKG5vZGUsIGNvbnRleHQpO1xyXG4gICAgZm9yKGxldCBpID0gMDsgaSA8IG5vZGVUcmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgY29uc3Qgb25FeGl0ID0gbm9kZVRyYW5zZm9ybXNbaV0obm9kZSwgY29udGV4dCk7XHJcbiAgICAgICAgaWYob25FeGl0KSB7XHJcbiAgICAgICAgICAgIGlmKEFycmF5LmlzQXJyYXkob25FeGl0KSkge1xyXG4gICAgICAgICAgICAgICAgZXhpdEZucy5wdXNoKC4uLm9uRXhpdCk7XHJcbiAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIGV4aXRGbnMucHVzaChvbkV4aXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdHlwZW9mIG9uRXhpdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvbkV4aXQobm9kZSwgY29udGV4dCk7XHJcbiAgICBsZXQgaSA9IGV4aXRGbnMubGVuZ3RoO1xyXG5cclxuICAgIC8vXHU5MDA2XHU1NDExXHU2MjY3XHU4ODRDXHU4RjkzXHU1MUZBXHU1MUZEXHU2NTcwLFx1NTE0OFx1OEZEQlx1NTE0OFx1NTFGQVxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICAgIGV4aXRGbnNbaV0oKTtcclxuICAgIH1cclxufSBcclxuXHJcbi8vXHU5MDREXHU1Mzg2QVNUXHJcbmZ1bmN0aW9uIHRyYXZlcnNlTm9kZShub2RlLCBjb250ZXh0KSB7XHJcbiAgICBjYWxsTm9kZVRyYW5zZm9ybXMobm9kZSwge1xyXG4gICAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgICAgb25FbnRlcjogKCkgPT4ge1xyXG4gICAgICAgICAgICBjb250ZXh0LmN1cnJlbnROb2RlID0gbm9kZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRXhpdDogKCkgPT4ge1xyXG4gICAgICAgICAgICB0cmF2ZXJzZUNoaWxkcmVuKG5vZGUsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICBjb250ZXh0LmN1cnJlbnROb2RlID0gbm9kZTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5mdW5jdGlvbiB0cmF2ZXJzZUNoaWxkcmVuKG5vZGUsIGNvbnRleHQpIHtcclxuICAgIC8vIFx1OTAxMlx1NUY1Mlx1OTA0RFx1NTM4Nlx1NUI1MFx1NjU3MFx1N0VDNFxyXG4gICAgaWYobm9kZS5jaGlsZHJlbil7XHJcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdHJhdmVyc2VOb2RlKG5vZGUuY2hpbGRyZW5baV0sIGNvbnRleHQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdLAogICJtYXBwaW5ncyI6ICI7QUFrQk8sSUFBTSxXQUFXO0FBQUE7QUFBQSxFQUNwQixTQUFTO0FBQUE7QUFBQSxFQUNULFNBQVM7QUFBQTtBQUFBLEVBQ1QsU0FBUztBQUFBO0FBQUEsRUFDVCxNQUFNO0FBQUE7QUFBQSxFQUNOLFFBQVE7QUFBQTtBQUFBLEVBQ1IsWUFBWTtBQUFBO0FBQ2hCO0FBR08sSUFBTSxhQUFhLENBQUMsU0FBUyxTQUFTO0FBQ3pDLFVBQVEsVUFBVSxRQUFRO0FBQzFCLFVBQVEsT0FBTztBQUNuQjtBQUVPLElBQU0sYUFBYSxDQUFDLFlBQVk7QUFDbkMsVUFBUSxPQUFPLFFBQVE7QUFDM0I7OztBQzlCTyxTQUFTLFVBQVUsU0FBUyxJQUFJO0FBQ25DLFVBQVEsU0FBUyxRQUFRLE9BQU8sTUFBTSxFQUFFO0FBQzVDO0FBRU8sU0FBUyxjQUFjLFNBQVM7QUFDdkMsTUFBSSxFQUFDLE9BQU0sSUFBSTtBQUNYLFVBQVEsU0FBUyxPQUFPLFFBQVEsaUJBQWlCLEVBQUU7QUFDdkQ7OztBQ1ZPLElBQU0sUUFBUTtBQUFBLEVBQ25CO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFDTyxTQUFTLFFBQVEsU0FBa0I7QUFDeEMsU0FBTyxNQUFNLFNBQVMsT0FBTztBQUMvQjtBQUdPLFNBQVMsYUFBYSxTQUFTO0FBQ3BDLE1BQUcsUUFBUSxPQUFPO0FBQ2hCLFlBQVEsWUFBWSxTQUFTO0FBQUEsRUFDL0I7QUFDRjs7O0FDN0JPLFNBQVMsU0FBUyxLQUFLLFFBQVEsb0JBQUksUUFB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
