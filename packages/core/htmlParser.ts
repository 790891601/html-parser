import {TextModes, TagState, advanceBy, advanceSpaces, isUnary, closeElement, toggleMode, revertMode} from './utils/index'
import {_parserOptions, parserOptions, parserContext, HTMLNodeType, ElementNode, TextNode, RootNode, CommentNode, Node} from './types'

export function tokenize(input) {
  /**
   * 输入：<div>123</div>
   * 输出: [{ type: tagOpen, tagName: 'div' }, { type: text, content: '123' }, { type: tagEnd, tagName: 'div' }]
   */
  const tokens = [];

  while (input.length > 0) {
    if (input[0] === '<') {
      if (input[1] === '/') {
        // 解析结束标签
        const endTag = parseEndTag(input);
        tokens.push(endTag);
      } else {
        // 解析开始标签
        const startTag = parseStartTag(input);
        tokens.push(startTag);
      }
    } else {
      // 解析文本内容
      const text = parseText(input);
      tokens.push(text);
    }
  }
  
  return tokens;
}
function parseStartTag(input) {
  const tag = {
    type: 'startTag',
    tagName: '',
    attributes: []
  };

  // 解析标签名
  const tagNameEndIndex = input.indexOf('>');
  tag.tagName = input.slice(1, tagNameEndIndex);

  // 解析属性
  const attributesString = input.slice(tagNameEndIndex, input.indexOf('>'));
  tag.attributes = parseAttributes(attributesString);

  return tag;
}

function parseEndTag(input) {
  const tagNameEndIndex = input.indexOf('>');
  const tagName = input.slice(2, tagNameEndIndex);
  
  return {
    type: 'endTag',
    tagName: tagName
  };
}

function parseAttributes(input) {
  const attributes = [];

  // 通过正则表达式提取属性名和属性值
  const regex = /(\S+)\s*=\s*["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/g;
  let match;
  
  while ((match = regex.exec(input)) !== null) {
    const attribute = {
      name: match[1],
      value: match[2]
    };

    attributes.push(attribute);
  }

  return attributes;
}

function parseText(input) {
  const endIndex = input.indexOf('<');
  const textContent = input.slice(0, endIndex).trim();

  return {
    type: 'text',
    content: textContent
  };
}

let idx = BigInt(1);
export class HTMLParser {
  private _options: _parserOptions;
  constructor(options: parserOptions = {}) {
    this._options = {
      ...options,
      id: idx
    };
  }
  parser(template) {
    const root: RootNode = {
      id: this._options.id++,
      type: HTMLNodeType.Root,
      children: [],
      pid: BigInt(0),
    };
    const context: parserContext = {
        source: template,
        mode: TextModes.DATA,
        oldMode: TextModes.DATA,
        type: HTMLNodeType.Root,
        children: [],
        pid: root.id,
    }
    root.children = this.parseChildren(context);
    
    return root
  }
  parseChildren(context, ancestors = []): Node[] {
      let nodes: Node[] = [];
      // 从上下文对象中取得当前状态，包括模式 mode 和模板内容
    
      while (this.isEnd(context, ancestors)) {
        const {mode, source, pid} = context;
        let node;// 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
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
                node = this.parseComment(context, ancestors);
              }
            }else if(/[a-z]/i.test(source[1])) {
              //标签
              node = this.parseElement(context, ancestors);
            }else if(source[1] === '/') {
              //结束标签状态
              return nodes;
            }
          }else if (mode === TextModes.RCDATA || mode === TextModes.DATA && source[1] === "/") {
            //结束标签，这里需要抛出错误，后文会详细解释原因
            throw new Error("不是DATA模式");
          }else if(source.startsWith("{{")) {
            //插值解构
            node = this.parseInterpolation(context);
          }
          // node 不存在，说明处于其他模式，即非 DATA 模式且非 RCDATA 模式
          if(!node) {
            node = this.parseText(context);
          }
          node.pid = pid
          nodes.push(node);
        }else if(mode === TextModes.CDATA) {
          if (source.startsWith("<![CDATA[")) {
            // CDATA
            node = this.parseCDATA(context, ancestors);
            revertMode(context);
          }
          nodes.push(node);
        }
      }
      return nodes;
  }
  isEnd(context, ancestors) {
    //元素栈,当前子元素有对应栈
    // for(let i = 0; i < ancestors.length; i++) {
    //   if(ancestors[i].tag) {
    //     return true;
    //   }
    // }
    if(context.source) {
      return true;
    }
  }
    
  parseText(context): TextNode {
    let {mode, source} = context;
    //匹配纯文本
    const match = source.match(/[^<>]*/);
    let content = '';
    if(match[0]) {
      advanceBy(context, match[0].length);
      content = match[0];
    }
    return {
      id: this._options.id++,
      type: HTMLNodeType.Text,
      content: content,
      pid: context.pid
    }
  }
  parseInterpolation(context) {
    const {source} = context;
    const match = source.match(/^\{\{\s*(.*?)\s*\}\}/);
    advanceBy(context, match[0].length);

    return {
      id: this._options.id++,
      type: HTMLNodeType.Interpolation,
      content: [match[0], match[1]],
      pid: context.pid
    }
  }
  parseElement(context, ancestors): ElementNode {
    let {source} = context;
  
    const match = source.match(/^<([a-z][a-zA-Z-]*)/);
    if(!match) {
      throw new Error("标签格式不正确");
    }
    const tagName = match[1];
    const isUnaryTag = isUnary(tagName);

    context.source = source.slice(match[0].length);
    const element = { //这个状态栈，子元素需要匹配它是否需要闭合,或者它可能是自闭合的标签
      tagStatus: TagState.tagName, //内容状态
      tagName: tagName, //标签名称
      unary: isUnaryTag,
    }  
    //1.匹配元素属性
    const attrs = this.parseAttribute(context, element);
    const ElementNode: ElementNode = {
      id: this._options.id++,
      type: HTMLNodeType.Element,
      tagName: tagName,
      children: [],
      attrs: attrs,
      pid: context.pid,
    }

    if(isUnaryTag) {
      closeElement(element);
    }else {
      ancestors.push(element);
      //2.匹配元素内容, 有子元素就开启状态机
      element.tagStatus = TagState.text;
      //匹配尾巴内容
      const matchTagEnd = context.source.match(`(.*?)<\\/${tagName}>`);
  
      if(matchTagEnd) {
        context.pid = ElementNode.id;
        ElementNode.children = this.parseChildren(context, ancestors);
      }else {
        throw new Error("标签必须要有结束");
      }
      const ancestor = ancestors.pop(); //退出栈
      if(ancestor) {
        advanceBy(context, ancestor.tagName.length+2);
        advanceSpaces(context);
        advanceBy(context, 1);
      }else {
        throw new Error("不合法的标签");
      }
      //3.匹配</...>
      //2.消费时，检测模板是否存在 />，如果有则表示其为自闭合标签，需要做出标注
      //3.完成正则匹配后，需要调用 advanceBy 函数消费由正则匹配的全部内容
      //4.如果自闭合，则 advanceBy 消费 />
    }
    return ElementNode;
  }
  
  parseAttribute(context, element) {
    //解析属性，指令v-if,v-model,事件@event, v-on:eventName, v:bind:name.sync
    const attrReg = /(:?[a-zA-Z][a-zA-Z-]*)\s*(?:(=)\s*(?:(["'])([^"'<>]*)\3|([^\s"'<>]*)))?/
  
    const attributes: string[][] = [];
    advanceSpaces(context);
    let attrMatch;
    while(context.source[0] !== '<' && context.source[0] !== '>') {
      //消除空格
      attrMatch = context.source.match(attrReg);
  
      advanceBy(context, attrMatch[0].length); //消除属性
  
      // ['v-if="isShow"', 'v-if', '=', 'isShow'],   
      // ['class="header"', 'class', '=', 'header']
      attributes.push([attrMatch[0], attrMatch[1], attrMatch[2], attrMatch[4]]);
  
      //消除空格
      advanceSpaces(context);
      if(context.source[0] === '/' && element.unary) {
        //自闭合标签
        advanceBy(context, 1);
      }
      advanceSpaces(context);
    }
    advanceBy(context, 1); //消除>
  
    return attributes;
  }
  //注释
  parseComment(context, ancestors): CommentNode {
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
      id: this._options.id++,
      type: HTMLNodeType.Comment,
      content: value,
      pid: context.pid
    }
  }
  parseCDATA(context, ancestors) {
    const cdataMatch = context.source.match(/^<!\[CDATA\[([\s\S]*?)\]\]/);
    advanceBy(context, cdataMatch[0].length);
    
    return {
      id: this._options.id++,
      type: HTMLNodeType.CDATA,
      content: cdataMatch[1],
      pid: context.pid
    }
  }
}

export function createInsNode(node) {
  // 创建ins节点，并复制原节点的属性和子节点
  const insNode: ElementNode = {
      id: idx++,
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
      id: idx++,
      type: HTMLNodeType.Element,
      tagName: 'del',
      attrs: [],
      children: [node],
      pid: node.pid,
  };
  node.pid = delNode.id;
  return delNode;
}