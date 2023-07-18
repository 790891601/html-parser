import {advanceBy, advanceSpaces, isUnary, toggleMode, revertMode, CONFIG } from './utils/index'
import {_parserOptions, parserContext, HTMLNodeType, ElementNode, TextNode, CommentNode, Node, TagState, TextModes} from './types'

const elementRE = /^\s*(?:<\/\s*([^>\s\/]*)\s*>|<([^>\s\/]*)\s*([^<>]*?)(\/?)>)/;
// const valuedAttributeRE = /([?]|(?!\d|-{2}|-\d)[a-zA-Z0-9\u00A0-\uFFFF-_:!%-.~<]+)=?(?:["]([^"]*)["]|[']([^']*)[']|[{]([^}]*)[}])?/gms;

export function tokenize(context: parserContext) {
  let tokens: any[] = [];

  while (context.source) {
    const {mode, source} = context;
    let token
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      // 只有 DATA 模式才支持标签节点的解析
      if (source.startsWith("<![CDATA[")) {
        // CDATA
        toggleMode(context, TextModes.CDATA);
        continue;
      }else if(mode === TextModes.DATA && source[0] === "<") {
        if(source[1] === '!') {
          if (source.startsWith("<!--")) {
            //注释
            token = parseComment(context);
          }
        }else if(/[a-zA-Z]/i.test(source[1])) {
          // 解析开始标签
          token = parseStartTag(context);
        }else if(source[1] === '/') {
          //结束标签状态
          token = parseEndTag(context);
        }
      }else if (mode === TextModes.RCDATA || mode === TextModes.DATA && source[1] === "/") {
        //结束标签，这里需要抛出错误，后文会详细解释原因
        throw new Error("不是DATA模式");
      }else if(source.startsWith("{{")) {
        //插值解构
        token = parseInterpolation(context);
      }
      // node 不存在，说明处于其他模式，即非 DATA 模式且非 RCDATA 模式
      if(!token) {
        token = parseText(context);
      }
      tokens.push(token);
    }else if(mode === TextModes.CDATA) {
      if (source.startsWith("<![CDATA[")) {
        // CDATA
        token = parseCDATA(context);
        revertMode(context);
      }
      tokens.push(token);
    }
  }

  return tokens;
}


function parseStartTag(context: parserContext) {
    const tag: any = {
      type: TagState.tagOpen,
      tagName: '',
      attributes: [],
      unary: false,
    };

    const elMatch = context.source.match(elementRE);

    if(elMatch) {
        const tagName = elMatch[2];
        const attributes = elMatch[3];
        const selfClose = elMatch[4];

        tag.tagName = tagName;
        tag.attrs = parseAttributes(attributes);
        if(selfClose) {
            if(!isUnary(tagName)) {
                throw new Error("单标签不合法")
            }
            tag.unary = true;
            tag.type = TagState.tagName
        }
        advanceBy(context, elMatch[0].length);
    }
    return tag;
  }
  
  function parseEndTag(context) {
    const tagEnd: any = {
        type: TagState.tagEnd,
        tagName: '',
        unary: false,
    };
    const elMatch = context.source.match(elementRE);

    if(elMatch) {
        const tagName = elMatch[1];
        tagEnd.tagName = tagName;
        advanceBy(context, elMatch[0].length);
    }
    return tagEnd
  }
  
export function parseAttributes(input) {
    const attributes: any[] = [];
  
    // 通过正则表达式提取属性名和属性值
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
  
export function parseText(context) {
    let {source} = context;
    //匹配纯文本
    const match = source.match(/[^<>]*/);
    let content = '';
    if(match[0]) {
      advanceBy(context, match[0].length);
      content = match[0];
    }

    return {
        id: CONFIG.idx++,
        type: HTMLNodeType.Text,
        content: content,
    };
}

//注释
export function parseComment(context) {
    let {source} = context;
    let value = ''; //注释内容
  
    source = source.slice(4);
    source = source.replace(/([\s\S]*?)(-->)/, function(match, $1, $2) {
      value = $1;
      return $2 ? $2 : '';
    });
    if(source.startsWith("-->")) {
      context.source = source.slice(3);
    }else {
      //或者手动闭合
      value = context.source;
      context.source = '';
    }
    return {
      id: CONFIG.idx++,
      type: HTMLNodeType.Comment,
      content: value,
    }
}
export function parseCDATA(context) {
    const cdataMatch = context.source.match(/^<!\[CDATA\[([\s\S]*?)\]\]/);
    advanceBy(context, cdataMatch[0].length);
    
    return {
      id: CONFIG.idx++,
      type: HTMLNodeType.CDATA,
      content: cdataMatch[1]
    }
}
export function parseInterpolation(context) {
    const {source} = context;
    const match = source.match(/^\{\{\s*(.*?)\s*\}\}/);
    advanceBy(context, match[0].length);

    return {
      id: CONFIG.idx++,
      type: HTMLNodeType.Interpolation,
      content: [match[0], match[1]],
    }
}

export function createInsNode(node) {
    // 创建ins节点，并复制原节点的属性和子节点
    const insNode: ElementNode = {
        id: CONFIG.idx++,
        type: HTMLNodeType.Element,
        tagName: 'ins',
        attrs: [],
        children: [node],
        pid: node.pid,
    };
    node.pid = insNode.id;
    return insNode;
  }
  export function createDelNode(node) {
    // 创建del节点，并复制原节点的属性和子节点
    const delNode: ElementNode = {
        id: CONFIG.idx++,
        type: HTMLNodeType.Element,
        tagName: 'del',
        attrs: [],
        children: [node],
        pid: node.pid,
    };
    node.pid = delNode.id;
    return delNode;
  }