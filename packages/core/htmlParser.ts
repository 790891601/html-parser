import {tokenize} from './tokenize'
import {advanceBy, advanceSpaces, isUnary, closeElement, toggleMode, revertMode, CONFIG} from './utils/index'
import {_parserOptions, parserOptions, parserContext, HTMLNodeType, ElementNode, TextNode, RootNode, CommentNode, Node, TagState, TextModes} from './types'

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
    console.log(tokens)
    // root.children = this.parseChildren(tokens);
    
    return root
  }
  parseChildren(tokens, ancestors = []): Node[] {
      let nodes: Node[] = [];

      while (this.isEnd(tokens, ancestors)) {
          //通过tokens来构建树节点,构建pid和id之间的联系

      //   const {mode, source, pid} = context;
      //   let node;// 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
      //   if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      //     // 只有 DATA 模式才支持标签节点的解析
      //     if (source.startsWith("<![CDATA[")) {
      //       // CDATA
      //       toggleMode(context, TextModes.CDATA);
      //       continue;
      //     }else if(mode === TextModes.DATA && source[0] === "<") {
      //       if(source[1] === '!') {
      //         if (source.startsWith("<!--")) {
      //           //注释
      //           node = this.parseComment(context, ancestors);
      //         }
      //       }else if(/[a-z]/i.test(source[1])) {
      //         //标签
      //         node = this.parseElement(context, ancestors);
      //       }else if(source[1] === '/') {
      //         //结束标签状态
      //         return nodes;
      //       }
      //     }else if (mode === TextModes.RCDATA || mode === TextModes.DATA && source[1] === "/") {
      //       //结束标签，这里需要抛出错误，后文会详细解释原因
      //       throw new Error("不是DATA模式");
      //     }else if(source.startsWith("{{")) {
      //       //插值解构
      //       node = this.parseInterpolation(context);
      //     }
      //     // node 不存在，说明处于其他模式，即非 DATA 模式且非 RCDATA 模式
      //     if(!node) {
      //       node = this.parseText(context);
      //     }
      //     node.pid = pid
      //     nodes.push(node);
      //   }else if(mode === TextModes.CDATA) {
      //     if (source.startsWith("<![CDATA[")) {
      //       // CDATA
      //       node = this.parseCDATA(context, ancestors);
      //       revertMode(context);
      //     }
      //     nodes.push(node);
      //   }
      }
      return nodes;
  }
  isEnd(tokens, ancestors) {
    //元素栈,当前子元素有对应栈
    // for(let i = 0; i < ancestors.length; i++) {
    //   if(ancestors[i].tag) {
    //     return true;
    //   }
    // }
    if(tokens.length) {
      return true;
    }
  }
}