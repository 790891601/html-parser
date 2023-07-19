// packages/core/utils/constants.ts
var CONFIG = {
  idx: BigInt(1)
  //可变配置变量
};
var resetConfigIdx = () => {
  CONFIG.idx = BigInt(1);
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

// packages/core/tokenize.ts
var elementRE = /^\s*(?:<\/\s*([^>\s\/]*)\s*>|<([^>\s\/]*)\s*([^<>]*?)(\/?)>)/;
function tokenize(context) {
  let tokens = [];
  while (context.source) {
    const { mode, source } = context;
    let token;
    if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) {
      if (source.startsWith("<![CDATA[")) {
        toggleMode(context, 3 /* CDATA */);
        continue;
      } else if (mode === 0 /* DATA */ && source[0] === "<") {
        if (source[1] === "!") {
          if (source.startsWith("<!--")) {
            token = parseComment(context);
          }
        } else if (/[a-zA-Z]/i.test(source[1])) {
          token = parseStartTag(context);
        } else if (source[1] === "/") {
          token = parseEndTag(context);
        }
      } else if (mode === 1 /* RCDATA */ || mode === 0 /* DATA */ && source[1] === "/") {
        throw new Error("\u4E0D\u662FDATA\u6A21\u5F0F");
      } else if (source.startsWith("{{")) {
        token = parseInterpolation(context);
      }
      if (!token) {
        token = parseText(context);
      }
      tokens.push(token);
    } else if (mode === 3 /* CDATA */) {
      if (source.startsWith("<![CDATA[")) {
        token = parseCDATA(context);
        revertMode(context);
      }
      tokens.push(token);
    }
  }
  return tokens;
}
function parseStartTag(context) {
  const tag = {
    id: CONFIG.idx++,
    type: 1 /* tagOpen */,
    tagName: "",
    attrs: [],
    unary: false
  };
  const elMatch = context.source.match(elementRE);
  if (elMatch) {
    const tagName = elMatch[2];
    const attributes = elMatch[3];
    const selfClose = elMatch[4];
    tag.tagName = tagName;
    tag.attrs = parseAttributes(attributes);
    if (selfClose) {
      if (!isUnary(tagName)) {
        throw new Error("\u5355\u6807\u7B7E\u4E0D\u5408\u6CD5");
      }
      tag.unary = true;
      tag.type = 2 /* tagName */;
    }
    advanceBy(context, elMatch[0].length);
  }
  return tag;
}
function parseEndTag(context) {
  const tagEnd = {
    type: 4 /* tagEnd */,
    tagName: ""
  };
  const elMatch = context.source.match(elementRE);
  if (elMatch) {
    const tagName = elMatch[1];
    tagEnd.tagName = tagName;
    advanceBy(context, elMatch[0].length);
  }
  return tagEnd;
}
function parseAttributes(input) {
  const attributes = [];
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^>\s]*))/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    const attribute = {
      name: match[1],
      value: match[2] || match[3] || match[4]
    };
    attributes.push(attribute);
  }
  return attributes;
}
function parseText(context) {
  let { source } = context;
  const match = source.match(/[^<>]*/);
  let content = "";
  if (match[0]) {
    advanceBy(context, match[0].length);
    content = match[0];
  }
  return {
    id: CONFIG.idx++,
    type: "Text" /* Text */,
    content
  };
}
function parseComment(context) {
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
    id: CONFIG.idx++,
    type: "Comment" /* Comment */,
    content: value
  };
}
function parseCDATA(context) {
  const cdataMatch = context.source.match(/^<!\[CDATA\[([\s\S]*?)\]\]/);
  advanceBy(context, cdataMatch[0].length);
  return {
    id: CONFIG.idx++,
    type: "CDATA" /* CDATA */,
    content: cdataMatch[1]
  };
}
function parseInterpolation(context) {
  const { source } = context;
  const match = source.match(/^\{\{\s*(.*?)\s*\}\}/);
  advanceBy(context, match[0].length);
  return {
    id: CONFIG.idx++,
    type: "Interpolation" /* Interpolation */,
    content: [match[0], match[1]]
  };
}

// packages/core/htmlParser.ts
var HTMLParser = class {
  _options;
  constructor(options = {}) {
    this._options = options;
  }
  parser(template) {
    resetConfigIdx();
    const root = {
      id: CONFIG.idx++,
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
    const tokenContext = {
      tokens,
      pid: root.id,
      tokenIndex: 0
      //token指针,优化性能，不让数据进行操作
    };
    root.children = this.parseChildren(tokenContext);
    return root;
  }
  parseChildren(context, ancestors = []) {
    let nodes = [];
    const { tokens } = context;
    while (!this.isEnd(context, ancestors)) {
      const token = tokens[context.tokenIndex++];
      if (token == null) {
        throw new Error("\u4E0D\u5141\u8BB8token\u4E3A\u7A7A");
      }
      const { type } = token;
      let node;
      if (type === "Comment" /* Comment */) {
        node = this.parseNode(context, token);
      } else if (type === "CDATA" /* CDATA */) {
        node = this.parseNode(context, token);
      } else if (type === "Interpolation" /* Interpolation */) {
        node = this.parseNode(context, token);
      } else if (type === 1 /* tagOpen */) {
        node = this.parseStartNode(context, token, ancestors);
      } else if (type === 4 /* tagEnd */) {
        this.parseEndNode(context, token, ancestors);
        return nodes;
      } else if (type === 2 /* tagName */) {
        node = this.parseElementNode(context, token);
      } else {
        node = this.parseNode(context, token);
      }
      nodes.push(node);
    }
    return nodes;
  }
  parseStartNode(context, token, ancestors) {
    ancestors.push(token);
    token.pid = context.pid;
    context.pid = token.id;
    token.children = this.parseChildren(context, ancestors);
    token.type = "Element" /* Element */;
    return token;
  }
  parseEndNode(context, token, ancestors) {
    const startTag = ancestors[ancestors.length - 1];
    if (startTag == null) {
      throw new Error("\u6807\u7B7E\u4E0D\u5339\u914D");
    }
    if (startTag.tagName === token.tagName) {
      const startTag2 = ancestors.pop();
      context.pid = startTag2.pid;
    } else {
      throw new Error("\u6807\u7B7E\u4E0D\u5339\u914D");
    }
  }
  parseElementNode(context, token) {
    return {
      ...token,
      pid: context.pid,
      type: "Element" /* Element */
    };
  }
  parseNode(context, token) {
    return {
      ...token,
      pid: context.pid
    };
  }
  isEnd(context, ancestors) {
    if (context.tokenIndex >= context.tokens.length) {
      return true;
    }
    return false;
  }
};

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
  transform
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vcGFja2FnZXMvY29yZS91dGlscy9jb25zdGFudHMudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS91dGlscy9hZHZhbmNlLnRzIiwgIi4uLy4uL3BhY2thZ2VzL2NvcmUvdXRpbHMvZWxlbWVudC50cyIsICIuLi8uLi9wYWNrYWdlcy9jb3JlL3V0aWxzL2RhdGEudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS90b2tlbml6ZS50cyIsICIuLi8uLi9wYWNrYWdlcy9jb3JlL2h0bWxQYXJzZXIudHMiLCAiLi4vLi4vcGFja2FnZXMvY29yZS9nZW5lcmF0ZS50cyIsICIuLi8uLi9wYWNrYWdlcy9jb3JlL3RyYW5zZm9ybS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiZXhwb3J0IGNvbnN0IExFR0VORFMgPSB7XHJcbiAgICAnQURERUQnOiAnYWRkZWQnLFxyXG4gICAgJ1JFTU9WRUQnOiAncmVtb3ZlZCcsXHJcbn1cclxuZXhwb3J0IGNvbnN0IENPTkZJRyA9IHtcclxuICAgIGlkeDogQmlnSW50KDEpLCAvL1x1NTNFRlx1NTNEOFx1OTE0RFx1N0Y2RVx1NTNEOFx1OTFDRlxyXG59XHJcbi8vXHU5MUNEXHU3RjZFaWR4XHJcbmV4cG9ydCBjb25zdCByZXNldENvbmZpZ0lkeCA9ICgpID0+IHtcclxuICAgIENPTkZJRy5pZHggPSBCaWdJbnQoMSk7XHJcbn1cclxuXHJcbi8vXHU1MjA3XHU2MzYyXHU2NTg3XHU2NzJDXHU2QTIxXHU1RjBGXHJcbmV4cG9ydCBjb25zdCB0b2dnbGVNb2RlID0gKGNvbnRleHQsIG1vZGUpID0+IHtcclxuICAgIGNvbnRleHQub2xkTW9kZSA9IGNvbnRleHQubW9kZTtcclxuICAgIGNvbnRleHQubW9kZSA9IG1vZGU7XHJcbn1cclxuLy9cdTYwNjJcdTU5MERcdTZBMjFcdTVGMEZcclxuZXhwb3J0IGNvbnN0IHJldmVydE1vZGUgPSAoY29udGV4dCkgPT4ge1xyXG4gICAgY29udGV4dC5tb2RlID0gY29udGV4dC5vbGRNb2RlO1xyXG59XHJcbiIsICIvKlx1NjYyRlx1NTQyNlx1NEUzQVx1N0E3QSovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc0V4aXN0cyhjb250ZXh0LCBhbmNlc3RvcnMpIHtcclxuICAgIHJldHVybiBjb250ZXh0LnNvdXJjZTtcclxufVxyXG4vL1x1NkQ4OFx1OEQzOVx1NjMwN1x1NUI5QVx1OERERFx1NzlCQlx1NTE4NVx1NUJCOVxyXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZUJ5KGNvbnRleHQsIGJ5KSB7XHJcbiAgICBjb250ZXh0LnNvdXJjZSA9IGNvbnRleHQuc291cmNlLnNsaWNlKGJ5KTtcclxufVxyXG4vKioqIFx1NkQ4OFx1OEQzOVx1N0E3QVx1NjgzQyovXHJcbmV4cG9ydCBmdW5jdGlvbiBhZHZhbmNlU3BhY2VzKGNvbnRleHQpIHtcclxubGV0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIGNvbnRleHQuc291cmNlID0gc291cmNlLnJlcGxhY2UoL15bXFxyXFxmXFx0XFxuIF0rLywgJycpO1xyXG59XHJcbiAgIiwgImltcG9ydCB7VGFnU3RhdGV9IGZyb20gJy4uL3R5cGVzJ1xyXG5cclxuZXhwb3J0IGNvbnN0IHVuYXJ5ID0gW1xyXG4gIFwiYnJcIixcclxuICBcImhyXCIsXHJcbiAgXCJpbWdcIixcclxuICBcImlucHV0XCIsXHJcbiAgXCJtZXRhXCIsXHJcbiAgXCJsaW5rXCIsXHJcbiAgXCJhcmVhXCIsXHJcbiAgXCJiYXNlXCIsXHJcbiAgXCJjb2xcIixcclxuICBcImNvbW1hbmRcIixcclxuICBcImVtYmVkXCIsXHJcbiAgXCJrZXlnZW5cIixcclxuICBcInBhcmFtXCIsXHJcbiAgXCJzb3VyY2VcIixcclxuICBcInRyYWNrXCIsXHJcbiAgXCJ3YnJcIlxyXG5dO1xyXG5leHBvcnQgZnVuY3Rpb24gaXNVbmFyeSh0YWdOYW1lKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIHVuYXJ5LmluY2x1ZGVzKHRhZ05hbWUpO1xyXG59XHJcbiAgXHJcbi8qXHU3RUQzXHU2NzVGXHU2ODA3XHU3QjdFKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlRWxlbWVudChlbGVtZW50KSB7XHJcbiAgaWYoZWxlbWVudC51bmFyeSkge1xyXG4gICAgZWxlbWVudC50YWdTdGF0dXMgPSBUYWdTdGF0ZS50YWdFbmQ7XHJcbiAgfVxyXG59XHJcbi8qKlxyXG4gKiBcdTVCRjlcdTZCRDRcdTUxNDNcdTdEMjBcdTY2MkZcdTU0MjZcdTc2RjhcdTU0MENcdTdDN0JcdTU3OEJcclxuICogQHBhcmFtIGVsZW1lbnQgXHJcbiAqIEBwYXJhbSBlbGVtZW50VGhlbiBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNFcXVhbEVsZW1lbnRUeXBlKGVsZW1lbnQsIGVsZW1lbnRUaGVuKTogYm9vbGVhbiB7XHJcbiAgaWYoZWxlbWVudC50eXBlID09PSBlbGVtZW50VGhlbi50eXBlKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59IiwgImV4cG9ydCBmdW5jdGlvbiBkZWVwQ29weShvYmosIGNhY2hlID0gbmV3IFdlYWtNYXAoKSkge1xyXG4gICAgLy8gXHU1OTgyXHU2NzlDXHU2NjJGXHU1N0ZBXHU2NzJDXHU2NTcwXHU2MzZFXHU3QzdCXHU1NzhCXHU2MjE2XHU4MDA1bnVsbFx1RkYwQ1x1NzZGNFx1NjNBNVx1OEZENFx1NTZERVx1NTM5Rlx1NUJGOVx1OEM2MVxyXG4gICAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBcdTY4QzBcdTY3RTVcdTdGMTNcdTVCNThcdUZGMENcdTkwN0ZcdTUxNERcdTY1RTBcdTk2NTBcdTkwMTJcdTVGNTJcclxuICAgIGlmIChjYWNoZS5oYXMob2JqKSkge1xyXG4gICAgICByZXR1cm4gY2FjaGUuZ2V0KG9iaik7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFx1NTIxQlx1NUVGQVx1NEUwMFx1NEUyQVx1NjVCMFx1NzY4NFx1NUJGOVx1OEM2MVx1NjIxNlx1NjU3MFx1N0VDNFxyXG4gICAgY29uc3QgY29weSA9IEFycmF5LmlzQXJyYXkob2JqKSA/IFtdIDoge307XHJcbiAgICBcclxuICAgIC8vIFx1NUMwNlx1NjVCMFx1NUJGOVx1OEM2MVx1NkRGQlx1NTJBMFx1NTIzMFx1N0YxM1x1NUI1OFxyXG4gICAgY2FjaGUuc2V0KG9iaiwgY29weSk7XHJcbiAgICBcclxuICAgIC8vIFx1OTAxMlx1NUY1Mlx1NTczMFx1NTkwRFx1NTIzNlx1NkJDRlx1NEUyQVx1NUM1RVx1NjAyN1xyXG4gICAgZm9yIChsZXQga2V5IGluIG9iaikge1xyXG4gICAgICBjb3B5W2tleV0gPSBkZWVwQ29weShvYmpba2V5XSwgY2FjaGUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gY29weTtcclxuICB9IiwgImltcG9ydCB7YWR2YW5jZUJ5LCBhZHZhbmNlU3BhY2VzLCBpc1VuYXJ5LCB0b2dnbGVNb2RlLCByZXZlcnRNb2RlLCBDT05GSUcsIHJlc2V0Q29uZmlnSWR4IH0gZnJvbSAnLi91dGlscy9pbmRleCdcclxuaW1wb3J0IHtfcGFyc2VyT3B0aW9ucywgcGFyc2VyQ29udGV4dCwgSFRNTE5vZGVUeXBlLCBFbGVtZW50Tm9kZSwgVGV4dE5vZGUsIENvbW1lbnROb2RlLCBOb2RlLCBUYWdTdGF0ZSwgVGV4dE1vZGVzfSBmcm9tICcuL3R5cGVzJ1xyXG5cclxuY29uc3QgZWxlbWVudFJFID0gL15cXHMqKD86PFxcL1xccyooW14+XFxzXFwvXSopXFxzKj58PChbXj5cXHNcXC9dKilcXHMqKFtePD5dKj8pKFxcLz8pPikvO1xyXG4vLyBjb25zdCB2YWx1ZWRBdHRyaWJ1dGVSRSA9IC8oWz9dfCg/IVxcZHwtezJ9fC1cXGQpW2EtekEtWjAtOVxcdTAwQTAtXFx1RkZGRi1fOiElLS5+PF0rKT0/KD86W1wiXShbXlwiXSopW1wiXXxbJ10oW14nXSopWyddfFt7XShbXn1dKilbfV0pPy9nbXM7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemUoY29udGV4dDogcGFyc2VyQ29udGV4dCkge1xyXG4gIGxldCB0b2tlbnM6IGFueVtdID0gW107XHJcblxyXG4gIHdoaWxlIChjb250ZXh0LnNvdXJjZSkge1xyXG4gICAgY29uc3Qge21vZGUsIHNvdXJjZX0gPSBjb250ZXh0O1xyXG4gICAgbGV0IHRva2VuXHJcbiAgICBpZiAobW9kZSA9PT0gVGV4dE1vZGVzLkRBVEEgfHwgbW9kZSA9PT0gVGV4dE1vZGVzLlJDREFUQSkge1xyXG4gICAgICAvLyBcdTUzRUFcdTY3MDkgREFUQSBcdTZBMjFcdTVGMEZcdTYyNERcdTY1MkZcdTYzMDFcdTY4MDdcdTdCN0VcdTgyODJcdTcwQjlcdTc2ODRcdTg5RTNcdTY3OTBcclxuICAgICAgaWYgKHNvdXJjZS5zdGFydHNXaXRoKFwiPCFbQ0RBVEFbXCIpKSB7XHJcbiAgICAgICAgLy8gQ0RBVEFcclxuICAgICAgICB0b2dnbGVNb2RlKGNvbnRleHQsIFRleHRNb2Rlcy5DREFUQSk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1lbHNlIGlmKG1vZGUgPT09IFRleHRNb2Rlcy5EQVRBICYmIHNvdXJjZVswXSA9PT0gXCI8XCIpIHtcclxuICAgICAgICBpZihzb3VyY2VbMV0gPT09ICchJykge1xyXG4gICAgICAgICAgaWYgKHNvdXJjZS5zdGFydHNXaXRoKFwiPCEtLVwiKSkge1xyXG4gICAgICAgICAgICAvL1x1NkNFOFx1OTFDQVxyXG4gICAgICAgICAgICB0b2tlbiA9IHBhcnNlQ29tbWVudChjb250ZXh0KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZSBpZigvW2EtekEtWl0vaS50ZXN0KHNvdXJjZVsxXSkpIHtcclxuICAgICAgICAgIC8vIFx1ODlFM1x1Njc5MFx1NUYwMFx1NTlDQlx1NjgwN1x1N0I3RVxyXG4gICAgICAgICAgdG9rZW4gPSBwYXJzZVN0YXJ0VGFnKGNvbnRleHQpO1xyXG4gICAgICAgIH1lbHNlIGlmKHNvdXJjZVsxXSA9PT0gJy8nKSB7XHJcbiAgICAgICAgICAvL1x1N0VEM1x1Njc1Rlx1NjgwN1x1N0I3RVx1NzJCNlx1NjAwMVxyXG4gICAgICAgICAgdG9rZW4gPSBwYXJzZUVuZFRhZyhjb250ZXh0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1lbHNlIGlmIChtb2RlID09PSBUZXh0TW9kZXMuUkNEQVRBIHx8IG1vZGUgPT09IFRleHRNb2Rlcy5EQVRBICYmIHNvdXJjZVsxXSA9PT0gXCIvXCIpIHtcclxuICAgICAgICAvL1x1N0VEM1x1Njc1Rlx1NjgwN1x1N0I3RVx1RkYwQ1x1OEZEOVx1OTFDQ1x1OTcwMFx1ODk4MVx1NjI5Qlx1NTFGQVx1OTUxOVx1OEJFRlx1RkYwQ1x1NTQwRVx1NjU4N1x1NEYxQVx1OEJFNlx1N0VDNlx1ODlFM1x1OTFDQVx1NTM5Rlx1NTZFMFxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NEUwRFx1NjYyRkRBVEFcdTZBMjFcdTVGMEZcIik7XHJcbiAgICAgIH1lbHNlIGlmKHNvdXJjZS5zdGFydHNXaXRoKFwie3tcIikpIHtcclxuICAgICAgICAvL1x1NjNEMlx1NTAzQ1x1ODlFM1x1Njc4NFxyXG4gICAgICAgIHRva2VuID0gcGFyc2VJbnRlcnBvbGF0aW9uKGNvbnRleHQpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIG5vZGUgXHU0RTBEXHU1QjU4XHU1NzI4XHVGRjBDXHU4QkY0XHU2NjBFXHU1OTA0XHU0RThFXHU1MTc2XHU0RUQ2XHU2QTIxXHU1RjBGXHVGRjBDXHU1MzczXHU5NzVFIERBVEEgXHU2QTIxXHU1RjBGXHU0RTE0XHU5NzVFIFJDREFUQSBcdTZBMjFcdTVGMEZcclxuICAgICAgaWYoIXRva2VuKSB7XHJcbiAgICAgICAgdG9rZW4gPSBwYXJzZVRleHQoY29udGV4dCk7XHJcbiAgICAgIH1cclxuICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xyXG4gICAgfWVsc2UgaWYobW9kZSA9PT0gVGV4dE1vZGVzLkNEQVRBKSB7XHJcbiAgICAgIGlmIChzb3VyY2Uuc3RhcnRzV2l0aChcIjwhW0NEQVRBW1wiKSkge1xyXG4gICAgICAgIC8vIENEQVRBXHJcbiAgICAgICAgdG9rZW4gPSBwYXJzZUNEQVRBKGNvbnRleHQpO1xyXG4gICAgICAgIHJldmVydE1vZGUoY29udGV4dCk7XHJcbiAgICAgIH1cclxuICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRva2VucztcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHBhcnNlU3RhcnRUYWcoY29udGV4dDogcGFyc2VyQ29udGV4dCkge1xyXG4gICAgY29uc3QgdGFnOiBhbnkgPSB7XHJcbiAgICAgIGlkOiBDT05GSUcuaWR4KyssXHJcbiAgICAgIHR5cGU6IFRhZ1N0YXRlLnRhZ09wZW4sXHJcbiAgICAgIHRhZ05hbWU6ICcnLFxyXG4gICAgICBhdHRyczogW10sXHJcbiAgICAgIHVuYXJ5OiBmYWxzZSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgZWxNYXRjaCA9IGNvbnRleHQuc291cmNlLm1hdGNoKGVsZW1lbnRSRSk7XHJcblxyXG4gICAgaWYoZWxNYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IHRhZ05hbWUgPSBlbE1hdGNoWzJdO1xyXG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBlbE1hdGNoWzNdO1xyXG4gICAgICAgIGNvbnN0IHNlbGZDbG9zZSA9IGVsTWF0Y2hbNF07XHJcblxyXG4gICAgICAgIHRhZy50YWdOYW1lID0gdGFnTmFtZTtcclxuICAgICAgICB0YWcuYXR0cnMgPSBwYXJzZUF0dHJpYnV0ZXMoYXR0cmlidXRlcyk7XHJcbiAgICAgICAgaWYoc2VsZkNsb3NlKSB7XHJcbiAgICAgICAgICAgIGlmKCFpc1VuYXJ5KHRhZ05hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTUzNTVcdTY4MDdcdTdCN0VcdTRFMERcdTU0MDhcdTZDRDVcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0YWcudW5hcnkgPSB0cnVlO1xyXG4gICAgICAgICAgICB0YWcudHlwZSA9IFRhZ1N0YXRlLnRhZ05hbWVcclxuICAgICAgICB9XHJcbiAgICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIGVsTWF0Y2hbMF0ubGVuZ3RoKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0YWc7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIHBhcnNlRW5kVGFnKGNvbnRleHQpIHtcclxuICAgIGNvbnN0IHRhZ0VuZDogYW55ID0ge1xyXG4gICAgICAgIHR5cGU6IFRhZ1N0YXRlLnRhZ0VuZCxcclxuICAgICAgICB0YWdOYW1lOiAnJyxcclxuICAgIH07XHJcbiAgICBjb25zdCBlbE1hdGNoID0gY29udGV4dC5zb3VyY2UubWF0Y2goZWxlbWVudFJFKTtcclxuXHJcbiAgICBpZihlbE1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgdGFnTmFtZSA9IGVsTWF0Y2hbMV07XHJcbiAgICAgICAgdGFnRW5kLnRhZ05hbWUgPSB0YWdOYW1lO1xyXG4gICAgICAgIGFkdmFuY2VCeShjb250ZXh0LCBlbE1hdGNoWzBdLmxlbmd0aCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGFnRW5kXHJcbiAgfVxyXG4gIFxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGVzKGlucHV0KSB7XHJcbiAgICBjb25zdCBhdHRyaWJ1dGVzOiBhbnlbXSA9IFtdO1xyXG4gIFxyXG4gICAgLy8gXHU5MDFBXHU4RkM3XHU2QjYzXHU1MjE5XHU4ODY4XHU4RkJFXHU1RjBGXHU2M0QwXHU1M0Q2XHU1QzVFXHU2MDI3XHU1NDBEXHU1NDhDXHU1QzVFXHU2MDI3XHU1MDNDXHJcbiAgICBjb25zdCByZWdleCA9IC8oXFx3KylcXHMqPVxccyooPzpcIihbXlwiXSopXCJ8JyhbXiddKiknfChbXj5cXHNdKikpL2c7XHJcbiAgICBsZXQgbWF0Y2g7XHJcbiAgICBcclxuICAgIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKGlucHV0KSkgIT09IG51bGwpIHtcclxuICAgICAgY29uc3QgYXR0cmlidXRlID0ge1xyXG4gICAgICAgIG5hbWU6IG1hdGNoWzFdLFxyXG4gICAgICAgIHZhbHVlOiBtYXRjaFsyXSB8fCBtYXRjaFszXSB8fCBtYXRjaFs0XVxyXG4gICAgICB9O1xyXG4gIFxyXG4gICAgICBhdHRyaWJ1dGVzLnB1c2goYXR0cmlidXRlKTtcclxuICAgIH1cclxuICBcclxuICAgIHJldHVybiBhdHRyaWJ1dGVzO1xyXG59XHJcbiAgXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRleHQoY29udGV4dCkge1xyXG4gICAgbGV0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIC8vXHU1MzM5XHU5MTREXHU3RUFGXHU2NTg3XHU2NzJDXHJcbiAgICBjb25zdCBtYXRjaCA9IHNvdXJjZS5tYXRjaCgvW148Pl0qLyk7XHJcbiAgICBsZXQgY29udGVudCA9ICcnO1xyXG4gICAgaWYobWF0Y2hbMF0pIHtcclxuICAgICAgYWR2YW5jZUJ5KGNvbnRleHQsIG1hdGNoWzBdLmxlbmd0aCk7XHJcbiAgICAgIGNvbnRlbnQgPSBtYXRjaFswXTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGlkOiBDT05GSUcuaWR4KyssXHJcbiAgICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLlRleHQsXHJcbiAgICAgICAgY29udGVudDogY29udGVudCxcclxuICAgIH07XHJcbn1cclxuXHJcbi8vXHU2Q0U4XHU5MUNBXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNvbW1lbnQoY29udGV4dCkge1xyXG4gICAgbGV0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIGxldCB2YWx1ZSA9ICcnOyAvL1x1NkNFOFx1OTFDQVx1NTE4NVx1NUJCOVxyXG4gIFxyXG4gICAgc291cmNlID0gc291cmNlLnNsaWNlKDQpO1xyXG4gICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoLyhbXFxzXFxTXSo/KSgtLT4pLywgZnVuY3Rpb24obWF0Y2gsICQxLCAkMikge1xyXG4gICAgICB2YWx1ZSA9ICQxO1xyXG4gICAgICByZXR1cm4gJDIgPyAkMiA6ICcnO1xyXG4gICAgfSk7XHJcbiAgICBpZihzb3VyY2Uuc3RhcnRzV2l0aChcIi0tPlwiKSkge1xyXG4gICAgICBjb250ZXh0LnNvdXJjZSA9IHNvdXJjZS5zbGljZSgzKTtcclxuICAgIH1lbHNlIHtcclxuICAgICAgLy9cdTYyMTZcdTgwMDVcdTYyNEJcdTUyQThcdTk1RURcdTU0MDhcclxuICAgICAgdmFsdWUgPSBjb250ZXh0LnNvdXJjZTtcclxuICAgICAgY29udGV4dC5zb3VyY2UgPSAnJztcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlkOiBDT05GSUcuaWR4KyssXHJcbiAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5Db21tZW50LFxyXG4gICAgICBjb250ZW50OiB2YWx1ZSxcclxuICAgIH1cclxufVxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDREFUQShjb250ZXh0KSB7XHJcbiAgICBjb25zdCBjZGF0YU1hdGNoID0gY29udGV4dC5zb3VyY2UubWF0Y2goL148IVxcW0NEQVRBXFxbKFtcXHNcXFNdKj8pXFxdXFxdLyk7XHJcbiAgICBhZHZhbmNlQnkoY29udGV4dCwgY2RhdGFNYXRjaFswXS5sZW5ndGgpO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpZDogQ09ORklHLmlkeCsrLFxyXG4gICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuQ0RBVEEsXHJcbiAgICAgIGNvbnRlbnQ6IGNkYXRhTWF0Y2hbMV1cclxuICAgIH1cclxufVxyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VJbnRlcnBvbGF0aW9uKGNvbnRleHQpIHtcclxuICAgIGNvbnN0IHtzb3VyY2V9ID0gY29udGV4dDtcclxuICAgIGNvbnN0IG1hdGNoID0gc291cmNlLm1hdGNoKC9eXFx7XFx7XFxzKiguKj8pXFxzKlxcfVxcfS8pO1xyXG4gICAgYWR2YW5jZUJ5KGNvbnRleHQsIG1hdGNoWzBdLmxlbmd0aCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IENPTkZJRy5pZHgrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkludGVycG9sYXRpb24sXHJcbiAgICAgIGNvbnRlbnQ6IFttYXRjaFswXSwgbWF0Y2hbMV1dLFxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSW5zTm9kZShub2RlLCBvcHRpb25zKSB7XHJcbiAgICAvLyBcdTUyMUJcdTVFRkFpbnNcdTgyODJcdTcwQjlcdUZGMENcdTVFNzZcdTU5MERcdTUyMzZcdTUzOUZcdTgyODJcdTcwQjlcdTc2ODRcdTVDNUVcdTYwMjdcdTU0OENcdTVCNTBcdTgyODJcdTcwQjlcclxuICAgIGNvbnN0IGluc05vZGU6IEVsZW1lbnROb2RlID0ge1xyXG4gICAgICAgIGlkOiBDT05GSUcuaWR4KyssXHJcbiAgICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkVsZW1lbnQsXHJcbiAgICAgICAgdGFnTmFtZTogJ2lucycsXHJcbiAgICAgICAgYXR0cnM6IFsuLi5vcHRpb25zLm5ld0F0dHJzXSxcclxuICAgICAgICBjaGlsZHJlbjogW25vZGVdLFxyXG4gICAgICAgIHBpZDogbm9kZS5waWQsXHJcbiAgICB9O1xyXG4gICAgbm9kZS5waWQgPSBpbnNOb2RlLmlkO1xyXG4gICAgcmV0dXJuIGluc05vZGU7XHJcbiAgfVxyXG4gIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZWxOb2RlKG5vZGUsIG9wdGlvbnMpIHtcclxuICAgIC8vIFx1NTIxQlx1NUVGQWRlbFx1ODI4Mlx1NzBCOVx1RkYwQ1x1NUU3Nlx1NTkwRFx1NTIzNlx1NTM5Rlx1ODI4Mlx1NzBCOVx1NzY4NFx1NUM1RVx1NjAyN1x1NTQ4Q1x1NUI1MFx1ODI4Mlx1NzBCOVxyXG4gICAgY29uc3QgZGVsTm9kZTogRWxlbWVudE5vZGUgPSB7XHJcbiAgICAgICAgaWQ6IENPTkZJRy5pZHgrKyxcclxuICAgICAgICB0eXBlOiBIVE1MTm9kZVR5cGUuRWxlbWVudCxcclxuICAgICAgICB0YWdOYW1lOiAnZGVsJyxcclxuICAgICAgICBhdHRyczogWy4uLm9wdGlvbnMub2xkQXR0cnNdLFxyXG4gICAgICAgIGNoaWxkcmVuOiBbbm9kZV0sXHJcbiAgICAgICAgcGlkOiBub2RlLnBpZCxcclxuICAgIH07XHJcbiAgICBub2RlLnBpZCA9IGRlbE5vZGUuaWQ7XHJcbiAgICByZXR1cm4gZGVsTm9kZTtcclxuICB9IiwgImltcG9ydCB7dG9rZW5pemV9IGZyb20gJy4vdG9rZW5pemUnXHJcbmltcG9ydCB7IENPTkZJRywgcmVzZXRDb25maWdJZHh9IGZyb20gJy4vdXRpbHMvaW5kZXgnXHJcbmltcG9ydCB7X3BhcnNlck9wdGlvbnMsIHBhcnNlck9wdGlvbnMsIHBhcnNlckNvbnRleHQsIEhUTUxOb2RlVHlwZSwgRWxlbWVudE5vZGUsIFRleHROb2RlLCBSb290Tm9kZSwgQ29tbWVudE5vZGUsIE5vZGUsIFRhZ1N0YXRlLCBUZXh0TW9kZXMsIENEQVRBTm9kZX0gZnJvbSAnLi90eXBlcydcclxuXHJcbmV4cG9ydCBjbGFzcyBIVE1MUGFyc2VyIHtcclxuICBwcml2YXRlIF9vcHRpb25zOiBfcGFyc2VyT3B0aW9ucztcclxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBwYXJzZXJPcHRpb25zID0ge30pIHtcclxuICAgIHRoaXMuX29wdGlvbnMgPSBvcHRpb25zO1xyXG4gIH1cclxuICBwYXJzZXIodGVtcGxhdGUpIHtcclxuICAgIHJlc2V0Q29uZmlnSWR4KCk7XHJcbiAgICBjb25zdCByb290OiBSb290Tm9kZSA9IHtcclxuICAgICAgaWQ6IENPTkZJRy5pZHgrKyxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLlJvb3QsXHJcbiAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgcGlkOiBCaWdJbnQoMCksXHJcbiAgICB9O1xyXG4gICAgY29uc3QgY29udGV4dDogcGFyc2VyQ29udGV4dCA9IHtcclxuICAgICAgICBzb3VyY2U6IHRlbXBsYXRlLFxyXG4gICAgICAgIG1vZGU6IFRleHRNb2Rlcy5EQVRBLFxyXG4gICAgICAgIG9sZE1vZGU6IFRleHRNb2Rlcy5EQVRBLFxyXG4gICAgICAgIHR5cGU6IEhUTUxOb2RlVHlwZS5Sb290LFxyXG4gICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICBwaWQ6IHJvb3QuaWQsXHJcbiAgICB9XHJcbiAgICBjb25zdCB0b2tlbnMgPSB0b2tlbml6ZShjb250ZXh0KVxyXG5cclxuICAgIGNvbnN0IHRva2VuQ29udGV4dCA9IHtcclxuICAgICAgdG9rZW5zLFxyXG4gICAgICBwaWQ6IHJvb3QuaWQsXHJcbiAgICAgIHRva2VuSW5kZXg6IDAsIC8vdG9rZW5cdTYzMDdcdTk0ODgsXHU0RjE4XHU1MzE2XHU2MDI3XHU4MEZEXHVGRjBDXHU0RTBEXHU4QkE5XHU2NTcwXHU2MzZFXHU4RkRCXHU4ODRDXHU2NENEXHU0RjVDXHJcbiAgICB9XHJcbiAgICByb290LmNoaWxkcmVuID0gdGhpcy5wYXJzZUNoaWxkcmVuKHRva2VuQ29udGV4dCk7XHJcbiAgICByZXR1cm4gcm9vdFxyXG4gIH1cclxuICBwYXJzZUNoaWxkcmVuKGNvbnRleHQsIGFuY2VzdG9ycyA9IFtdKTogTm9kZVtdIHtcclxuICAgICAgbGV0IG5vZGVzOiBOb2RlW10gPSBbXTtcclxuICAgICAgY29uc3Qge3Rva2Vuc30gPSBjb250ZXh0O1xyXG5cclxuICAgICAgLy9cdTkwMUFcdThGQzd0b2tlbnNcdTY3NjVcdTY3ODRcdTVFRkFcdTY4MTFcdTgyODJcdTcwQjksXHU2Nzg0XHU1RUZBcGlkXHU1NDhDaWRcdTRFNEJcdTk1RjRcdTc2ODRcdTgwNTRcdTdDRkJcclxuICAgICAgd2hpbGUoIXRoaXMuaXNFbmQoY29udGV4dCwgYW5jZXN0b3JzKSkge1xyXG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zW2NvbnRleHQudG9rZW5JbmRleCsrXTtcclxuICAgICAgICAvL1x1NjMwN1x1OTQ4OFx1NEUzQVx1N0E3QVxyXG4gICAgICAgIGlmKHRva2VuID09IG51bGwpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NEUwRFx1NTE0MVx1OEJCOHRva2VuXHU0RTNBXHU3QTdBXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB7dHlwZX0gPSB0b2tlbjtcclxuICAgICAgICBsZXQgbm9kZTogTm9kZVxyXG5cclxuICAgICAgICBpZih0eXBlID09PSBIVE1MTm9kZVR5cGUuQ29tbWVudCkge1xyXG4gICAgICAgICAgbm9kZSA9IHRoaXMucGFyc2VOb2RlKGNvbnRleHQsIHRva2VuKTtcclxuICAgICAgICB9ZWxzZSBpZih0eXBlID09PSBIVE1MTm9kZVR5cGUuQ0RBVEEpIHtcclxuICAgICAgICAgIG5vZGUgPSB0aGlzLnBhcnNlTm9kZShjb250ZXh0LCB0b2tlbik7XHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gSFRNTE5vZGVUeXBlLkludGVycG9sYXRpb24pIHtcclxuICAgICAgICAgIG5vZGUgPSB0aGlzLnBhcnNlTm9kZShjb250ZXh0LCB0b2tlbik7XHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gVGFnU3RhdGUudGFnT3Blbikge1xyXG4gICAgICAgICAgbm9kZSA9IHRoaXMucGFyc2VTdGFydE5vZGUoY29udGV4dCwgdG9rZW4sIGFuY2VzdG9ycyk7XHJcbiAgICAgICAgfWVsc2UgaWYodHlwZSA9PT0gVGFnU3RhdGUudGFnRW5kKSB7XHJcbiAgICAgICAgICB0aGlzLnBhcnNlRW5kTm9kZShjb250ZXh0LCB0b2tlbiwgYW5jZXN0b3JzKTtcclxuICAgICAgICAgIHJldHVybiBub2RlcztcclxuICAgICAgICB9ZWxzZSBpZih0eXBlID09PSBUYWdTdGF0ZS50YWdOYW1lKSB7XHJcbiAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZUVsZW1lbnROb2RlKGNvbnRleHQsIHRva2VuKTtcclxuICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICBub2RlID0gdGhpcy5wYXJzZU5vZGUoY29udGV4dCwgdG9rZW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbm9kZXMucHVzaChub2RlKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbm9kZXM7XHJcbiAgfVxyXG4gIHBhcnNlU3RhcnROb2RlKGNvbnRleHQsIHRva2VuLCBhbmNlc3RvcnMpOiBOb2RlIHtcclxuICAgIC8vXHU1RjUzXHU1RjAwXHU1OUNCXHU2ODA3XHU3QjdFXHVGRjBDXHU1QzMxXHU1NDJGXHU3NTI4XHU2ODA3XHU3QjdFXHU2ODA4XHJcbiAgICBhbmNlc3RvcnMucHVzaCh0b2tlbik7XHJcbiAgICB0b2tlbi5waWQgPSBjb250ZXh0LnBpZDtcclxuICAgIGNvbnRleHQucGlkID0gdG9rZW4uaWQ7XHJcbiAgICB0b2tlbi5jaGlsZHJlbiA9IHRoaXMucGFyc2VDaGlsZHJlbihjb250ZXh0LCBhbmNlc3RvcnMpO1xyXG5cclxuICAgIHRva2VuLnR5cGUgPSBIVE1MTm9kZVR5cGUuRWxlbWVudFxyXG4gICAgcmV0dXJuIHRva2VuO1xyXG4gIH1cclxuICBwYXJzZUVuZE5vZGUoY29udGV4dCwgdG9rZW4sIGFuY2VzdG9ycykge1xyXG4gICAgLy9cdTVGNTNcdTVGMDBcdTU5Q0JcdTY4MDdcdTdCN0VcdUZGMENcdTVDMzFcdTUyMjBcdTk2NjRcdTY4MDdcdTdCN0VcdTY4MDgsXHU2ODA3XHU3QjdFXHU2ODA4XHU1RkM1XHU5ODdCXHU4RERGXHU4RkRCXHU1M0JCXHU2ODA3XHU3QjdFXHU2ODA4XHU3Njg0dGFnTmFtZVx1NEUwMFx1ODFGNFx1RkYwQ3R5cGVcdTY2MkZvcGVuXHJcbiAgICBjb25zdCBzdGFydFRhZyA9IGFuY2VzdG9yc1thbmNlc3RvcnMubGVuZ3RoIC0gMV07XHJcbiAgICBpZihzdGFydFRhZyA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlx1NjgwN1x1N0I3RVx1NEUwRFx1NTMzOVx1OTE0RFwiKTtcclxuICAgIH1cclxuICAgIGlmKHN0YXJ0VGFnLnRhZ05hbWUgPT09IHRva2VuLnRhZ05hbWUpIHtcclxuICAgICAgY29uc3Qgc3RhcnRUYWcgPSBhbmNlc3RvcnMucG9wKCk7XHJcbiAgICAgIGNvbnRleHQucGlkID0gc3RhcnRUYWcucGlkO1xyXG4gICAgfWVsc2Uge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcdTY4MDdcdTdCN0VcdTRFMERcdTUzMzlcdTkxNERcIik7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHBhcnNlRWxlbWVudE5vZGUoY29udGV4dCwgdG9rZW4pOiBFbGVtZW50Tm9kZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAuLi50b2tlbixcclxuICAgICAgcGlkOiBjb250ZXh0LnBpZCxcclxuICAgICAgdHlwZTogSFRNTE5vZGVUeXBlLkVsZW1lbnRcclxuICAgIH1cclxuICB9XHJcbiAgcGFyc2VOb2RlKGNvbnRleHQsIHRva2VuKTogTm9kZSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAuLi50b2tlbixcclxuICAgICAgcGlkOiBjb250ZXh0LnBpZCxcclxuICAgIH1cclxuICB9XHJcbiAgaXNFbmQoY29udGV4dCwgYW5jZXN0b3JzKSB7XHJcbiAgICAvL1x1NTE0M1x1N0QyMFx1NjgwOCxcdTVGNTNcdTUyNERcdTVCNTBcdTUxNDNcdTdEMjBcdTY3MDlcdTVCRjlcdTVFOTRcdTY4MDhcclxuICAgIC8vIGZvcihsZXQgaSA9IDA7IGkgPCBhbmNlc3RvcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIC8vICAgaWYoYW5jZXN0b3JzW2ldLnRhZykge1xyXG4gICAgLy8gICAgIHJldHVybiB0cnVlO1xyXG4gICAgLy8gICB9XHJcbiAgICAvLyB9XHJcbiAgICBpZihjb250ZXh0LnRva2VuSW5kZXggPj0gY29udGV4dC50b2tlbnMubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufSIsICJpbXBvcnQge0hUTUxOb2RlVHlwZX0gZnJvbSAnLi4vY29yZS90eXBlcydcclxuLy8zLlx1NzUyOFx1Njc2NVx1NjgzOVx1NjM2RUphdmFTY3JpcHQgQVNUXHU3NTFGXHU2MjEwXHU2RTMyXHU2N0QzXHU1MUZEXHU2NTcwXHU0RUUzXHU3ODAxXHU3Njg0XHU3NTFGXHU2MjEwXHU1NjY4XHVGRjA4Z2VuZXJhdG9yXHVGRjA5XHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZShub2RlLCBvcHRpb25zPXt9KSB7XHJcbiAgICBpZiAobm9kZS50eXBlID09PSBIVE1MTm9kZVR5cGUuUm9vdCkge1xyXG4gICAgICAvLyBcdTU5MDRcdTc0MDZcdTY4MzlcdTgyODJcdTcwQjlcclxuICAgICAgcmV0dXJuIGdlbmVyYXRlQ2hpbGRyZW5Db2RlKG5vZGUuY2hpbGRyZW4pO1xyXG4gICAgfSBlbHNlIGlmIChub2RlLnR5cGUgPT09IEhUTUxOb2RlVHlwZS5FbGVtZW50KSB7XHJcbiAgICAgIC8vIFx1NTkwNFx1NzQwNlx1NTE0M1x1N0QyMFx1ODI4Mlx1NzBCOVxyXG4gICAgICBjb25zdCBhdHRycyA9IGdlbmVyYXRlQXR0cmlidXRlc0NvZGUobm9kZS5hdHRycyk7XHJcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gZ2VuZXJhdGVDaGlsZHJlbkNvZGUobm9kZS5jaGlsZHJlbik7XHJcbiAgICAgIHJldHVybiBgPCR7bm9kZS50YWdOYW1lfSR7YXR0cnN9PiR7Y2hpbGRyZW59PC8ke25vZGUudGFnTmFtZX0+YDtcclxuICAgIH0gZWxzZSBpZiAobm9kZS50eXBlID09PSBIVE1MTm9kZVR5cGUuVGV4dCkge1xyXG4gICAgICAvLyBcdTU5MDRcdTc0MDZcdTY1ODdcdTY3MkNcdTgyODJcdTcwQjlcclxuICAgICAgcmV0dXJuIG5vZGUuY29udGVudDtcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gZ2VuZXJhdGVBdHRyaWJ1dGVzQ29kZShhdHRycykge1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGF0dHJzKSB8fCBhdHRycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICcgJyArIGF0dHJzLm1hcChhdHRyID0+IGAke2F0dHIubmFtZX09XCIke2F0dHIudmFsdWV9XCJgKS5qb2luKCcgJyk7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ2hpbGRyZW5Db2RlKGNoaWxkcmVuKSB7XHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRyZW4pIHx8IGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gJyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2hpbGRyZW4ubWFwKGNoaWxkID0+IGdlbmVyYXRlKGNoaWxkKSkuam9pbignJyk7XHJcbiAgfSIsICJcclxuaW1wb3J0IHt0cmFuc2Zvcm1UZXh0LCB0cmFuc2Zvcm1EaWZmUGx1Z2lufSBmcm9tICcuLi90cmFuc2Zvcm0vaW5kZXgnO1xyXG5pbXBvcnQge2RlZXBDb3B5fSBmcm9tICcuL3V0aWxzL2luZGV4J1xyXG5pbXBvcnQgeyBnZW5lcmF0ZSB9IGZyb20gJy4vZ2VuZXJhdGUnO1xyXG5cclxuaW50ZXJmYWNlIHRyYW5zZm9ybU9wdGlvbnMge1xyXG4gICAgbm9kZVRyYW5zZm9ybXM/OiBGdW5jdGlvbltdIHwgW3N0cmluZywgRnVuY3Rpb25dLFxyXG4gICAgZGlyZWN0aXZlVHJhbnNmb3Jtcz86IE9iamVjdCxcclxuICAgIGRpZmZBc3Q/OiBPYmplY3RcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybShhc3QsIG9wdGlvbnM6IHRyYW5zZm9ybU9wdGlvbnMgPSB7fSkge1xyXG4gICAgY29uc3QgeyBub2RlVHJhbnNmb3JtcyA9IFtdLCBkaXJlY3RpdmVUcmFuc2Zvcm1zID0ge30sIGRpZmZBc3QgPSB7fSB9ID0gb3B0aW9ucztcclxuXHJcbiAgICBjb25zdCBjb250ZXh0ID0ge1xyXG4gICAgICAgIGFzdDogZGVlcENvcHkoYXN0KSxcclxuICAgICAgICBkaWZmQXN0OiBkZWVwQ29weShkaWZmQXN0KSxcclxuICAgICAgICBub2RlVHJhbnNmb3JtczogW1xyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1JZixcclxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtRm9yLFxyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1UZXh0LFxyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1EaWZmLFxyXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1FbGVtZW50LFxyXG4gICAgICAgICAgICAuLi5ub2RlVHJhbnNmb3Jtcy5maWx0ZXIoaXRlbSA9PiBBcnJheS5pc0FycmF5KGl0ZW0pID8gaXRlbVswXSAhPT0gJ2FsbCcgOiB0cnVlKSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGRpcmVjdGl2ZVRyYW5zZm9ybXM6IHtcclxuICAgICAgICAgICAgLy8gb246IHRyYW5zZm9ybU9uLFxyXG4gICAgICAgICAgICAvLyBiaW5kOiB0cmFuc2Zvcm1CaW5kLFxyXG4gICAgICAgICAgICAvLyBtb2RlbDogdHJhbnNmb3JtTW9kZWxcclxuICAgICAgICAgICAgLi4uZGlyZWN0aXZlVHJhbnNmb3Jtc1xyXG4gICAgICAgIH0sXHJcbiAgICB9XHJcbiAgICBjb25zdCBub2RlVHJhbnNmb3JtQWxsID0gbm9kZVRyYW5zZm9ybXMuZmlsdGVyKGl0ZW0gPT4gQXJyYXkuaXNBcnJheShpdGVtKSAmJiBpdGVtWzBdID09PSAnYWxsJykuZmxhdE1hcChmID0+IGZbMV0pO1xyXG4gICAgY2FsbE5vZGVUcmFuc2Zvcm1zKGNvbnRleHQuYXN0LCB7XHJcbiAgICAgICAgLi4uY29udGV4dCxcclxuICAgICAgICBub2RlVHJhbnNmb3Jtczogbm9kZVRyYW5zZm9ybUFsbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy9cdTkwNERcdTUzODZcdTY4MTFcdTdFRDNcdTY3ODRcdUZGMENcdTVFNzZcdThDMDNcdTc1MjhcdTYzRDJcdTRFRjZcdTUxRkRcdTY1NzBcclxuICAgIHRyYXZlcnNlTm9kZShjb250ZXh0LmFzdCwgY29udGV4dCk7XHJcbiAgICByZXR1cm4gZ2VuZXJhdGUoY29udGV4dC5hc3QsIG9wdGlvbnMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxsTm9kZVRyYW5zZm9ybXMobm9kZSwgY29udGV4dCkge1xyXG4gICAgY29uc3QgeyBub2RlVHJhbnNmb3Jtcywgb25FbnRlciwgb25FeGl0IH0gPSBjb250ZXh0O1xyXG4gICAgY29uc3QgZXhpdEZuczogRnVuY3Rpb25bXSA9IFtdOyAvL1x1OTAwMFx1NTFGQVx1NTFGRFx1NjU3MFxyXG4gICAgXHJcbiAgICB0eXBlb2Ygb25FbnRlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvbkVudGVyKG5vZGUsIGNvbnRleHQpO1xyXG4gICAgZm9yKGxldCBpID0gMDsgaSA8IG5vZGVUcmFuc2Zvcm1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgY29uc3Qgb25FeGl0ID0gbm9kZVRyYW5zZm9ybXNbaV0obm9kZSwgY29udGV4dCk7XHJcbiAgICAgICAgaWYob25FeGl0KSB7XHJcbiAgICAgICAgICAgIGlmKEFycmF5LmlzQXJyYXkob25FeGl0KSkge1xyXG4gICAgICAgICAgICAgICAgZXhpdEZucy5wdXNoKC4uLm9uRXhpdCk7XHJcbiAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIGV4aXRGbnMucHVzaChvbkV4aXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdHlwZW9mIG9uRXhpdCA9PT0gJ2Z1bmN0aW9uJyAmJiBvbkV4aXQobm9kZSwgY29udGV4dCk7XHJcbiAgICBsZXQgaSA9IGV4aXRGbnMubGVuZ3RoO1xyXG5cclxuICAgIC8vXHU5MDA2XHU1NDExXHU2MjY3XHU4ODRDXHU4RjkzXHU1MUZBXHU1MUZEXHU2NTcwLFx1NTE0OFx1OEZEQlx1NTE0OFx1NTFGQVxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICAgIGV4aXRGbnNbaV0oKTtcclxuICAgIH1cclxufSBcclxuXHJcbi8vXHU5MDREXHU1Mzg2QVNUXHJcbmZ1bmN0aW9uIHRyYXZlcnNlTm9kZShub2RlLCBjb250ZXh0KSB7XHJcbiAgICBjYWxsTm9kZVRyYW5zZm9ybXMobm9kZSwge1xyXG4gICAgICAgIC4uLmNvbnRleHQsXHJcbiAgICAgICAgb25FbnRlcjogKCkgPT4ge1xyXG4gICAgICAgICAgICBjb250ZXh0LmN1cnJlbnROb2RlID0gbm9kZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uRXhpdDogKCkgPT4ge1xyXG4gICAgICAgICAgICB0cmF2ZXJzZUNoaWxkcmVuKG5vZGUsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICBjb250ZXh0LmN1cnJlbnROb2RlID0gbm9kZTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5mdW5jdGlvbiB0cmF2ZXJzZUNoaWxkcmVuKG5vZGUsIGNvbnRleHQpIHtcclxuICAgIC8vIFx1OTAxMlx1NUY1Mlx1OTA0RFx1NTM4Nlx1NUI1MFx1NjU3MFx1N0VDNFxyXG4gICAgaWYobm9kZS5jaGlsZHJlbil7XHJcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IG5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdHJhdmVyc2VOb2RlKG5vZGUuY2hpbGRyZW5baV0sIGNvbnRleHQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdLAogICJtYXBwaW5ncyI6ICI7QUFJTyxJQUFNLFNBQVM7QUFBQSxFQUNsQixLQUFLLE9BQU8sQ0FBQztBQUFBO0FBQ2pCO0FBRU8sSUFBTSxpQkFBaUIsTUFBTTtBQUNoQyxTQUFPLE1BQU0sT0FBTyxDQUFDO0FBQ3pCO0FBR08sSUFBTSxhQUFhLENBQUMsU0FBUyxTQUFTO0FBQ3pDLFVBQVEsVUFBVSxRQUFRO0FBQzFCLFVBQVEsT0FBTztBQUNuQjtBQUVPLElBQU0sYUFBYSxDQUFDLFlBQVk7QUFDbkMsVUFBUSxPQUFPLFFBQVE7QUFDM0I7OztBQ2ZPLFNBQVMsVUFBVSxTQUFTLElBQUk7QUFDbkMsVUFBUSxTQUFTLFFBQVEsT0FBTyxNQUFNLEVBQUU7QUFDNUM7OztBQ0xPLElBQU0sUUFBUTtBQUFBLEVBQ25CO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFDTyxTQUFTLFFBQVEsU0FBa0I7QUFDeEMsU0FBTyxNQUFNLFNBQVMsT0FBTztBQUMvQjs7O0FDdEJPLFNBQVMsU0FBUyxLQUFLLFFBQVEsb0JBQUksUUFBUSxHQUFHO0FBRWpELE1BQUksUUFBUSxRQUFRLE9BQU8sUUFBUSxVQUFVO0FBQzNDLFdBQU87QUFBQSxFQUNUO0FBR0EsTUFBSSxNQUFNLElBQUksR0FBRyxHQUFHO0FBQ2xCLFdBQU8sTUFBTSxJQUFJLEdBQUc7QUFBQSxFQUN0QjtBQUdBLFFBQU0sT0FBTyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBR3hDLFFBQU0sSUFBSSxLQUFLLElBQUk7QUFHbkIsV0FBUyxPQUFPLEtBQUs7QUFDbkIsU0FBSyxHQUFHLElBQUksU0FBUyxJQUFJLEdBQUcsR0FBRyxLQUFLO0FBQUEsRUFDdEM7QUFFQSxTQUFPO0FBQ1Q7OztBQ3BCRixJQUFNLFlBQVk7QUFHWCxTQUFTLFNBQVMsU0FBd0I7QUFDL0MsTUFBSSxTQUFnQixDQUFDO0FBRXJCLFNBQU8sUUFBUSxRQUFRO0FBQ3JCLFVBQU0sRUFBQyxNQUFNLE9BQU0sSUFBSTtBQUN2QixRQUFJO0FBQ0osUUFBSSx5QkFBMkIseUJBQTJCO0FBRXhELFVBQUksT0FBTyxXQUFXLFdBQVcsR0FBRztBQUVsQyxtQkFBVyxzQkFBd0I7QUFDbkM7QUFBQSxNQUNGLFdBQVMseUJBQTJCLE9BQU8sQ0FBQyxNQUFNLEtBQUs7QUFDckQsWUFBRyxPQUFPLENBQUMsTUFBTSxLQUFLO0FBQ3BCLGNBQUksT0FBTyxXQUFXLE1BQU0sR0FBRztBQUU3QixvQkFBUSxhQUFhLE9BQU87QUFBQSxVQUM5QjtBQUFBLFFBQ0YsV0FBUyxZQUFZLEtBQUssT0FBTyxDQUFDLENBQUMsR0FBRztBQUVwQyxrQkFBUSxjQUFjLE9BQU87QUFBQSxRQUMvQixXQUFTLE9BQU8sQ0FBQyxNQUFNLEtBQUs7QUFFMUIsa0JBQVEsWUFBWSxPQUFPO0FBQUEsUUFDN0I7QUFBQSxNQUNGLFdBQVUsMkJBQTZCLHlCQUEyQixPQUFPLENBQUMsTUFBTSxLQUFLO0FBRW5GLGNBQU0sSUFBSSxNQUFNLDhCQUFVO0FBQUEsTUFDNUIsV0FBUyxPQUFPLFdBQVcsSUFBSSxHQUFHO0FBRWhDLGdCQUFRLG1CQUFtQixPQUFPO0FBQUEsTUFDcEM7QUFFQSxVQUFHLENBQUMsT0FBTztBQUNULGdCQUFRLFVBQVUsT0FBTztBQUFBLE1BQzNCO0FBQ0EsYUFBTyxLQUFLLEtBQUs7QUFBQSxJQUNuQixXQUFTLHdCQUEwQjtBQUNqQyxVQUFJLE9BQU8sV0FBVyxXQUFXLEdBQUc7QUFFbEMsZ0JBQVEsV0FBVyxPQUFPO0FBQzFCLG1CQUFXLE9BQU87QUFBQSxNQUNwQjtBQUNBLGFBQU8sS0FBSyxLQUFLO0FBQUEsSUFDbkI7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNUO0FBR0EsU0FBUyxjQUFjLFNBQXdCO0FBQzNDLFFBQU0sTUFBVztBQUFBLElBQ2YsSUFBSSxPQUFPO0FBQUEsSUFDWDtBQUFBLElBQ0EsU0FBUztBQUFBLElBQ1QsT0FBTyxDQUFDO0FBQUEsSUFDUixPQUFPO0FBQUEsRUFDVDtBQUVBLFFBQU0sVUFBVSxRQUFRLE9BQU8sTUFBTSxTQUFTO0FBRTlDLE1BQUcsU0FBUztBQUNSLFVBQU0sVUFBVSxRQUFRLENBQUM7QUFDekIsVUFBTSxhQUFhLFFBQVEsQ0FBQztBQUM1QixVQUFNLFlBQVksUUFBUSxDQUFDO0FBRTNCLFFBQUksVUFBVTtBQUNkLFFBQUksUUFBUSxnQkFBZ0IsVUFBVTtBQUN0QyxRQUFHLFdBQVc7QUFDVixVQUFHLENBQUMsUUFBUSxPQUFPLEdBQUc7QUFDbEIsY0FBTSxJQUFJLE1BQU0sc0NBQVE7QUFBQSxNQUM1QjtBQUNBLFVBQUksUUFBUTtBQUNaLFVBQUk7QUFBQSxJQUNSO0FBQ0EsY0FBVSxTQUFTLFFBQVEsQ0FBQyxFQUFFLE1BQU07QUFBQSxFQUN4QztBQUNBLFNBQU87QUFDVDtBQUVBLFNBQVMsWUFBWSxTQUFTO0FBQzVCLFFBQU0sU0FBYztBQUFBLElBQ2hCO0FBQUEsSUFDQSxTQUFTO0FBQUEsRUFDYjtBQUNBLFFBQU0sVUFBVSxRQUFRLE9BQU8sTUFBTSxTQUFTO0FBRTlDLE1BQUcsU0FBUztBQUNSLFVBQU0sVUFBVSxRQUFRLENBQUM7QUFDekIsV0FBTyxVQUFVO0FBQ2pCLGNBQVUsU0FBUyxRQUFRLENBQUMsRUFBRSxNQUFNO0FBQUEsRUFDeEM7QUFDQSxTQUFPO0FBQ1Q7QUFFSyxTQUFTLGdCQUFnQixPQUFPO0FBQ25DLFFBQU0sYUFBb0IsQ0FBQztBQUczQixRQUFNLFFBQVE7QUFDZCxNQUFJO0FBRUosVUFBUSxRQUFRLE1BQU0sS0FBSyxLQUFLLE9BQU8sTUFBTTtBQUMzQyxVQUFNLFlBQVk7QUFBQSxNQUNoQixNQUFNLE1BQU0sQ0FBQztBQUFBLE1BQ2IsT0FBTyxNQUFNLENBQUMsS0FBSyxNQUFNLENBQUMsS0FBSyxNQUFNLENBQUM7QUFBQSxJQUN4QztBQUVBLGVBQVcsS0FBSyxTQUFTO0FBQUEsRUFDM0I7QUFFQSxTQUFPO0FBQ1g7QUFFTyxTQUFTLFVBQVUsU0FBUztBQUMvQixNQUFJLEVBQUMsT0FBTSxJQUFJO0FBRWYsUUFBTSxRQUFRLE9BQU8sTUFBTSxRQUFRO0FBQ25DLE1BQUksVUFBVTtBQUNkLE1BQUcsTUFBTSxDQUFDLEdBQUc7QUFDWCxjQUFVLFNBQVMsTUFBTSxDQUFDLEVBQUUsTUFBTTtBQUNsQyxjQUFVLE1BQU0sQ0FBQztBQUFBLEVBQ25CO0FBRUEsU0FBTztBQUFBLElBQ0gsSUFBSSxPQUFPO0FBQUEsSUFDWDtBQUFBLElBQ0E7QUFBQSxFQUNKO0FBQ0o7QUFHTyxTQUFTLGFBQWEsU0FBUztBQUNsQyxNQUFJLEVBQUMsT0FBTSxJQUFJO0FBQ2YsTUFBSSxRQUFRO0FBRVosV0FBUyxPQUFPLE1BQU0sQ0FBQztBQUN2QixXQUFTLE9BQU8sUUFBUSxtQkFBbUIsU0FBUyxPQUFPLElBQUksSUFBSTtBQUNqRSxZQUFRO0FBQ1IsV0FBTyxLQUFLLEtBQUs7QUFBQSxFQUNuQixDQUFDO0FBQ0QsTUFBRyxPQUFPLFdBQVcsS0FBSyxHQUFHO0FBQzNCLFlBQVEsU0FBUyxPQUFPLE1BQU0sQ0FBQztBQUFBLEVBQ2pDLE9BQU07QUFFSixZQUFRLFFBQVE7QUFDaEIsWUFBUSxTQUFTO0FBQUEsRUFDbkI7QUFDQSxTQUFPO0FBQUEsSUFDTCxJQUFJLE9BQU87QUFBQSxJQUNYO0FBQUEsSUFDQSxTQUFTO0FBQUEsRUFDWDtBQUNKO0FBQ08sU0FBUyxXQUFXLFNBQVM7QUFDaEMsUUFBTSxhQUFhLFFBQVEsT0FBTyxNQUFNLDRCQUE0QjtBQUNwRSxZQUFVLFNBQVMsV0FBVyxDQUFDLEVBQUUsTUFBTTtBQUV2QyxTQUFPO0FBQUEsSUFDTCxJQUFJLE9BQU87QUFBQSxJQUNYO0FBQUEsSUFDQSxTQUFTLFdBQVcsQ0FBQztBQUFBLEVBQ3ZCO0FBQ0o7QUFDTyxTQUFTLG1CQUFtQixTQUFTO0FBQ3hDLFFBQU0sRUFBQyxPQUFNLElBQUk7QUFDakIsUUFBTSxRQUFRLE9BQU8sTUFBTSxzQkFBc0I7QUFDakQsWUFBVSxTQUFTLE1BQU0sQ0FBQyxFQUFFLE1BQU07QUFFbEMsU0FBTztBQUFBLElBQ0wsSUFBSSxPQUFPO0FBQUEsSUFDWDtBQUFBLElBQ0EsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQUEsRUFDOUI7QUFDSjs7O0FDakxPLElBQU0sYUFBTixNQUFpQjtBQUFBLEVBQ2Q7QUFBQSxFQUNSLFlBQVksVUFBeUIsQ0FBQyxHQUFHO0FBQ3ZDLFNBQUssV0FBVztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxPQUFPLFVBQVU7QUFDZixtQkFBZTtBQUNmLFVBQU0sT0FBaUI7QUFBQSxNQUNyQixJQUFJLE9BQU87QUFBQSxNQUNYO0FBQUEsTUFDQSxVQUFVLENBQUM7QUFBQSxNQUNYLEtBQUssT0FBTyxDQUFDO0FBQUEsSUFDZjtBQUNBLFVBQU0sVUFBeUI7QUFBQSxNQUMzQixRQUFRO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQSxVQUFVLENBQUM7QUFBQSxNQUNYLEtBQUssS0FBSztBQUFBLElBQ2Q7QUFDQSxVQUFNLFNBQVMsU0FBUyxPQUFPO0FBRS9CLFVBQU0sZUFBZTtBQUFBLE1BQ25CO0FBQUEsTUFDQSxLQUFLLEtBQUs7QUFBQSxNQUNWLFlBQVk7QUFBQTtBQUFBLElBQ2Q7QUFDQSxTQUFLLFdBQVcsS0FBSyxjQUFjLFlBQVk7QUFDL0MsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLGNBQWMsU0FBUyxZQUFZLENBQUMsR0FBVztBQUMzQyxRQUFJLFFBQWdCLENBQUM7QUFDckIsVUFBTSxFQUFDLE9BQU0sSUFBSTtBQUdqQixXQUFNLENBQUMsS0FBSyxNQUFNLFNBQVMsU0FBUyxHQUFHO0FBQ3JDLFlBQU0sUUFBUSxPQUFPLFFBQVEsWUFBWTtBQUV6QyxVQUFHLFNBQVMsTUFBTTtBQUNoQixjQUFNLElBQUksTUFBTSxxQ0FBWTtBQUFBLE1BQzlCO0FBRUEsWUFBTSxFQUFDLEtBQUksSUFBSTtBQUNmLFVBQUk7QUFFSixVQUFHLGtDQUErQjtBQUNoQyxlQUFPLEtBQUssVUFBVSxTQUFTLEtBQUs7QUFBQSxNQUN0QyxXQUFTLDhCQUE2QjtBQUNwQyxlQUFPLEtBQUssVUFBVSxTQUFTLEtBQUs7QUFBQSxNQUN0QyxXQUFTLDhDQUFxQztBQUM1QyxlQUFPLEtBQUssVUFBVSxTQUFTLEtBQUs7QUFBQSxNQUN0QyxXQUFTLDBCQUEyQjtBQUNsQyxlQUFPLEtBQUssZUFBZSxTQUFTLE9BQU8sU0FBUztBQUFBLE1BQ3RELFdBQVMseUJBQTBCO0FBQ2pDLGFBQUssYUFBYSxTQUFTLE9BQU8sU0FBUztBQUMzQyxlQUFPO0FBQUEsTUFDVCxXQUFTLDBCQUEyQjtBQUNsQyxlQUFPLEtBQUssaUJBQWlCLFNBQVMsS0FBSztBQUFBLE1BQzdDLE9BQU07QUFDSixlQUFPLEtBQUssVUFBVSxTQUFTLEtBQUs7QUFBQSxNQUN0QztBQUVBLFlBQU0sS0FBSyxJQUFJO0FBQUEsSUFDakI7QUFDQSxXQUFPO0FBQUEsRUFDWDtBQUFBLEVBQ0EsZUFBZSxTQUFTLE9BQU8sV0FBaUI7QUFFOUMsY0FBVSxLQUFLLEtBQUs7QUFDcEIsVUFBTSxNQUFNLFFBQVE7QUFDcEIsWUFBUSxNQUFNLE1BQU07QUFDcEIsVUFBTSxXQUFXLEtBQUssY0FBYyxTQUFTLFNBQVM7QUFFdEQsVUFBTTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxhQUFhLFNBQVMsT0FBTyxXQUFXO0FBRXRDLFVBQU0sV0FBVyxVQUFVLFVBQVUsU0FBUyxDQUFDO0FBQy9DLFFBQUcsWUFBWSxNQUFNO0FBQ25CLFlBQU0sSUFBSSxNQUFNLGdDQUFPO0FBQUEsSUFDekI7QUFDQSxRQUFHLFNBQVMsWUFBWSxNQUFNLFNBQVM7QUFDckMsWUFBTUEsWUFBVyxVQUFVLElBQUk7QUFDL0IsY0FBUSxNQUFNQSxVQUFTO0FBQUEsSUFDekIsT0FBTTtBQUNKLFlBQU0sSUFBSSxNQUFNLGdDQUFPO0FBQUEsSUFDekI7QUFBQSxFQUNGO0FBQUEsRUFDQSxpQkFBaUIsU0FBUyxPQUFvQjtBQUM1QyxXQUFPO0FBQUEsTUFDTCxHQUFHO0FBQUEsTUFDSCxLQUFLLFFBQVE7QUFBQSxNQUNiO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFVBQVUsU0FBUyxPQUFhO0FBQzlCLFdBQU87QUFBQSxNQUNMLEdBQUc7QUFBQSxNQUNILEtBQUssUUFBUTtBQUFBLElBQ2Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNLFNBQVMsV0FBVztBQU94QixRQUFHLFFBQVEsY0FBYyxRQUFRLE9BQU8sUUFBUTtBQUM5QyxhQUFPO0FBQUEsSUFDVDtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQ0Y7OztBQ3JITyxTQUFTLFNBQVMsTUFBTSxVQUFRLENBQUMsR0FBRztBQUN2QyxNQUFJLEtBQUssNEJBQTRCO0FBRW5DLFdBQU8scUJBQXFCLEtBQUssUUFBUTtBQUFBLEVBQzNDLFdBQVcsS0FBSyxrQ0FBK0I7QUFFN0MsVUFBTSxRQUFRLHVCQUF1QixLQUFLLEtBQUs7QUFDL0MsVUFBTSxXQUFXLHFCQUFxQixLQUFLLFFBQVE7QUFDbkQsV0FBTyxJQUFJLEtBQUssT0FBTyxHQUFHLEtBQUssSUFBSSxRQUFRLEtBQUssS0FBSyxPQUFPO0FBQUEsRUFDOUQsV0FBVyxLQUFLLDRCQUE0QjtBQUUxQyxXQUFPLEtBQUs7QUFBQSxFQUNkO0FBQ0Y7QUFFQSxTQUFTLHVCQUF1QixPQUFPO0FBQ3JDLE1BQUksQ0FBQyxNQUFNLFFBQVEsS0FBSyxLQUFLLE1BQU0sV0FBVyxHQUFHO0FBQy9DLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTyxNQUFNLE1BQU0sSUFBSSxVQUFRLEdBQUcsS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLEdBQUcsRUFBRSxLQUFLLEdBQUc7QUFDekU7QUFFQSxTQUFTLHFCQUFxQixVQUFVO0FBQ3RDLE1BQUksQ0FBQyxNQUFNLFFBQVEsUUFBUSxLQUFLLFNBQVMsV0FBVyxHQUFHO0FBQ3JELFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTyxTQUFTLElBQUksV0FBUyxTQUFTLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRTtBQUN2RDs7O0FDbEJLLFNBQVMsVUFBVSxLQUFLLFVBQTRCLENBQUMsR0FBRztBQUMzRCxRQUFNLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxFQUFFLElBQUk7QUFFeEUsUUFBTSxVQUFVO0FBQUEsSUFDWixLQUFLLFNBQVMsR0FBRztBQUFBLElBQ2pCLFNBQVMsU0FBUyxPQUFPO0FBQUEsSUFDekIsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BTVosR0FBRyxlQUFlLE9BQU8sVUFBUSxNQUFNLFFBQVEsSUFBSSxJQUFJLEtBQUssQ0FBQyxNQUFNLFFBQVEsSUFBSTtBQUFBLElBQ25GO0FBQUEsSUFDQSxxQkFBcUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUlqQixHQUFHO0FBQUEsSUFDUDtBQUFBLEVBQ0o7QUFDQSxRQUFNLG1CQUFtQixlQUFlLE9BQU8sVUFBUSxNQUFNLFFBQVEsSUFBSSxLQUFLLEtBQUssQ0FBQyxNQUFNLEtBQUssRUFBRSxRQUFRLE9BQUssRUFBRSxDQUFDLENBQUM7QUFDbEgscUJBQW1CLFFBQVEsS0FBSztBQUFBLElBQzVCLEdBQUc7QUFBQSxJQUNILGdCQUFnQjtBQUFBLEVBQ3BCLENBQUM7QUFHRCxlQUFhLFFBQVEsS0FBSyxPQUFPO0FBQ2pDLFNBQU8sU0FBUyxRQUFRLEtBQUssT0FBTztBQUN4QztBQUVBLFNBQVMsbUJBQW1CLE1BQU0sU0FBUztBQUN2QyxRQUFNLEVBQUUsZ0JBQWdCLFNBQVMsT0FBTyxJQUFJO0FBQzVDLFFBQU0sVUFBc0IsQ0FBQztBQUU3QixTQUFPLFlBQVksY0FBYyxRQUFRLE1BQU0sT0FBTztBQUN0RCxXQUFRQyxLQUFJLEdBQUdBLEtBQUksZUFBZSxRQUFRQSxNQUFLO0FBQzNDLFVBQU1DLFVBQVMsZUFBZUQsRUFBQyxFQUFFLE1BQU0sT0FBTztBQUM5QyxRQUFHQyxTQUFRO0FBQ1AsVUFBRyxNQUFNLFFBQVFBLE9BQU0sR0FBRztBQUN0QixnQkFBUSxLQUFLLEdBQUdBLE9BQU07QUFBQSxNQUMxQixPQUFNO0FBQ0YsZ0JBQVEsS0FBS0EsT0FBTTtBQUFBLE1BQ3ZCO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDQSxTQUFPLFdBQVcsY0FBYyxPQUFPLE1BQU0sT0FBTztBQUNwRCxNQUFJLElBQUksUUFBUTtBQUdoQixTQUFPLEtBQUs7QUFDUixZQUFRLENBQUMsRUFBRTtBQUFBLEVBQ2Y7QUFDSjtBQUdBLFNBQVMsYUFBYSxNQUFNLFNBQVM7QUFDakMscUJBQW1CLE1BQU07QUFBQSxJQUNyQixHQUFHO0FBQUEsSUFDSCxTQUFTLE1BQU07QUFDWCxjQUFRLGNBQWM7QUFBQSxJQUMxQjtBQUFBLElBQ0EsUUFBUSxNQUFNO0FBQ1YsdUJBQWlCLE1BQU0sT0FBTztBQUM5QixjQUFRLGNBQWM7QUFBQSxJQUMxQjtBQUFBLEVBQ0osQ0FBQztBQUNMO0FBQ0EsU0FBUyxpQkFBaUIsTUFBTSxTQUFTO0FBRXJDLE1BQUcsS0FBSyxVQUFTO0FBQ2IsYUFBUSxJQUFJLEdBQUcsSUFBSSxLQUFLLFNBQVMsUUFBUSxLQUFLO0FBQzFDLG1CQUFhLEtBQUssU0FBUyxDQUFDLEdBQUcsT0FBTztBQUFBLElBQzFDO0FBQUEsRUFDSjtBQUNKOyIsCiAgIm5hbWVzIjogWyJzdGFydFRhZyIsICJpIiwgIm9uRXhpdCJdCn0K
