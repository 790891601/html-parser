import {TextModes, TagState, advanceBy, advanceSpaces, isUnary, closeElement} from './utils/index'

export default class HTMLParser {
  constructor() {
    
  }
  parser(template) {
    const context = {
        source: template,
        mode: TextModes.DATA,
        type: 'Root',
        children: [],
    }
    const nodes = this.parseChildren(context);
    
    return {
        type: 'Root',
        children: nodes
    };
  }
  parseChildren(context, ancestors = []) {
      let nodes: any[] = [];
      // 从上下文对象中取得当前状态，包括模式 mode 和模板内容
    
      while (this.isExists(context)) {
        const {mode, source} = context;
        let node;// 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
        if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
          // 只有 DATA 模式才支持标签节点的解析
          if(mode === TextModes.DATA && source[0] === "<") {
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
          }else if (source.startsWith("<![CDATA[")) {
            // CDATA
            node = this.parseCDATA(context, ancestors);
          }else if (source[1] === "/") {
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
          nodes.push(node);
        }
      }
      return nodes;
  }
  isExists(context) {
      return context.source;
  }
    
   parseText(context) {
    let {mode, source} = context;
    //匹配纯文本
    const match = source.match(/[^<>]*/);
    let content = '';
    if(match[0]) {
      advanceBy(context, match[0].length);
      content = match[0];
    }
    return {
      type: 'Text',
      content: content
    }
  }
  parseInterpolation(context) {
  
  }
  parseElement(context, ancestors) {
    let {mode, source} = context;
  
    let nodes = [];
    const match = source.match(/<([a-z][a-zA-Z-]*)/);
    context.source = source.slice(match[0].length);
    const tagName = match[1];
    const element = { //这个状态栈，子元素需要匹配它是否需要闭合,或者它可能是自闭合的标签
      tagStatus: TagState.tagName, //内容状态
      tagName: tagName, //标签名称
      unary: false,
    }
    if(isUnary(tagName)) {
      element.unary = true;
      closeElement(element);
    }
  
    //1.匹配元素属性
    const attrs = this.parseAttribute(context, element);
    if(!element.unary) {
      ancestors.push(element);
      //2.匹配元素内容, 有子元素就开启状态机
      element.tagStatus = TagState.text;
      //匹配尾巴内容
      const matchTagEnd = context.source.match(`(.*?)<\\/${tagName}>`);
  
      if(matchTagEnd) {
        nodes = this.parseChildren(context, ancestors) as any;
      }else {
        throw new Error("标签必须要有结束");
      }
      const ancestor = ancestors.pop(); //退出栈
      if(ancestor) {
        //还是有缺陷
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
  
    return {
      type: 'Element',
      tagName: tagName,
      children: nodes,
      attrs: attrs,
    }
  }
  
  parseAttribute(context, element) {
    const attrReg = /(:?[a-zA-Z][a-zA-Z-]*)\s*(?:(=)\s*(?:(["'])([^"'<>]*)\3|([^\s"'<>]*)))?/
  
    const attributes: string[][] = [];
    advanceSpaces(context);
    let attrMatch;
    while(context.source[0] !== '<' && context.source[0] !== '>') {
      //消除空格
      attrMatch = context.source.match(attrReg);
  
      advanceBy(context, attrMatch[0].length); //消除属性
  
      // ['v-if="isShow"', 'v-if', '=', 'isShow', null, null],
      // ['class="header"', 'class', '=', 'header', null, null]
      //   0:"class-name=\"collection-icon\""
      //   1:"class-name"
      //   2:"\""
      //   3:"collection-icon"
      //   4:undefined
      attributes.push([attrMatch[0], attrMatch[1], attrMatch[2], attrMatch[4], attrMatch[5], attrMatch[6]]);
  
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
  parseComment(context, ancestors) {
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
      type: 'Comment',
      tagType: TextModes.COMMENT,
      children: value,
    }
  }
  parseCDATA(context, ancestors) {
    // const cdataMatch = context.source.match(/<!\[CDATA\[([\s\S]*?)\]\]/);
    // advanceBy(context, cdataMatch[0].length);
    //
    // console.log(cdataMatch);
    // return {
    //   type: 'CDATA',
    //   children: cdataMatch[1],
    // }
  }
}