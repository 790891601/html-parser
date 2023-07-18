import {tokenize} from './tokenize'
import {advanceBy, advanceSpaces, isUnary, closeElement, toggleMode, revertMode, CONFIG} from './utils/index'
import {_parserOptions, parserOptions, parserContext, HTMLNodeType, ElementNode, TextNode, RootNode, CommentNode, Node, TagState, TextModes, CDATANode} from './types'

export class HTMLParser {
  private _options: _parserOptions;
  constructor(options: parserOptions = {}) {
    this._options = options;
  }
  parser(template) {
    const root: RootNode = {
      id: CONFIG.idx++,
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
    const tokens = tokenize(context)

    const tokenContext = {
      tokens,
      pid: root.id,
      tokenIndex: 0, //token指针,优化性能，不让数据进行操作
    }
    root.children = this.parseChildren(tokenContext);
    return root
  }
  parseChildren(context, ancestors = []): Node[] {
      let nodes: Node[] = [];
      const {tokens} = context;

      //通过tokens来构建树节点,构建pid和id之间的联系
      while(!this.isEnd(context, ancestors)) {
        const token = tokens[context.tokenIndex++];
        //指针为空
        if(token == null) {
          throw new Error("不允许token为空");
        }
        
        const {type} = token;
        let node: Node

        if(type === HTMLNodeType.Comment) {
          node = this.parseNode(context, token);
        }else if(type === HTMLNodeType.CDATA) {
          node = this.parseNode(context, token);
        }else if(type === HTMLNodeType.Interpolation) {
          node = this.parseNode(context, token);
        }else if(type === TagState.tagOpen) {
          node = this.parseStartNode(context, token, ancestors);
        }else if(type === TagState.tagEnd) {
          this.parseEndNode(context, token, ancestors);
          return nodes;
        }else if(type === TagState.tagName) {
          node = this.parseElementNode(context, token);
        }else {
          node = this.parseNode(context, token);
        }

        nodes.push(node);
      }
      return nodes;
  }
  parseStartNode(context, token, ancestors): Node {
    //当开始标签，就启用标签栈
    ancestors.push(token);
    token.pid = context.pid;
    context.pid = token.id;
    token.children = this.parseChildren(context, ancestors);

    token.type = HTMLNodeType.Element
    return token;
  }
  parseEndNode(context, token, ancestors) {
    //当开始标签，就删除标签栈,标签栈必须跟进去标签栈的tagName一致，type是open
    const startTag = ancestors[ancestors.length - 1];
    if(startTag == null) {
      throw new Error("标签不匹配");
    }
    if(startTag.tagName === token.tagName) {
      const startTag = ancestors.pop();
      context.pid = startTag.pid;
    }else {
      throw new Error("标签不匹配");
    }
  }
  parseElementNode(context, token): ElementNode {
    return {
      ...token,
      pid: context.id,
      type: HTMLNodeType.Element
    }
  }
  parseNode(context, token): Node {
    return {
      ...token,
      pid: context.id,
    }
  }
  isEnd(context, ancestors) {
    //元素栈,当前子元素有对应栈
    // for(let i = 0; i < ancestors.length; i++) {
    //   if(ancestors[i].tag) {
    //     return true;
    //   }
    // }
    if(context.tokenIndex >= context.tokens.length) {
      return true;
    }
    return false;
  }
}