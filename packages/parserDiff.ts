import {LEGENDS} from './utils/index';
//1.用来将模板字符串解析为模板AST的解析器（parser）
function parser(template) {
    const context = {
      source: template,
      mode: TextModes.DATA,
      type: 'Root',
      children: [],
    }
    const nodes = parseChildren(context);
  
    return {
      type: 'Root',
      children: nodes
    };
  }
  //有限状态自动机
  const TextModes = {
    //默认模式 遇到字符 < 时，会切换到标签开始状态 遇到字符 & 时，会切换到字符引用状态能够处理 HTML 字符实体
    DATA: 0,
    //<title> 标签、<textarea> 标签 遇到字符 < 时，切换到 RCDATA less-than sign state 状态遇到字符 /，切换到 RCDATA 的结束标签状态在不使用引用符号 & 的情况下，RCDATA 模式不会识别标签，如下代码会把 < 当做普通符号而无法识别内部的 div 标签
    RCDATA: 1,
    //<style>、<xmp>、<iframe>、<noembed>、<noframes>、<noscript> 等，与 RCDATA 模式类似，只是不支持 HTML 实体
    RAWTEXT: 2,
    //<![CDATA[ 字符串  任何字符都作为普通字符处理，直到遇到 CDATA 的结束标志为止
    CDATA: 3,
    COMMENT: 4, //注释
  }
  const TagState = { //标签模式
    initial: 1, // 初始状态
    tagOpen: 2, //标签开始状态
    tagName: 3, // 标签名称状态
    text: 4, //文本状态
    tagEnd: 5, //结束标签状态
    tagEndName: 6 // 结束标签名称状态
  }
  function parseChildren(context, ancestors = []): any[] {
    let nodes: any[] = [];
    // 从上下文对象中取得当前状态，包括模式 mode 和模板内容
  
    while (isExists(context, ancestors)) {
      const {mode, source} = context;
      let node;// 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
      if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
        // 只有 DATA 模式才支持标签节点的解析
        if(mode === TextModes.DATA && source[0] === "<") {
          if(source[1] === '!') {
            if (source.startsWith("<!--")) {
              //注释
              node = parseComment(context, ancestors);
            }
          }else if(/[a-z]/i.test(source[1])) {
            //标签
            node = parseElement(context, ancestors);
          }else if(source[1] === '/') {
            //结束标签状态
            return nodes;
          }
        }else if (source.startsWith("<![CDATA[")) {
          // CDATA
          node = parseCDATA(context, ancestors);
        }else if (source[1] === "/") {
          //结束标签，这里需要抛出错误，后文会详细解释原因
          throw new Error("不是DATA模式");
        }else if(source.startsWith("{{")) {
          //插值解构
          node = parseInterpolation(context);
        }
        // node 不存在，说明处于其他模式，即非 DATA 模式且非 RCDATA 模式
        if(!node) {
          node = parseText(context);
        }
        nodes.push(node);
      }
    }
    return nodes;
  }
  function parseText(context) {
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
  function parseInterpolation(context) {
  
  }
  function parseElement(context, ancestors) {
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
    const attrs = parseAttribute(context, element);
    if(!element.unary) {
      ancestors.push(element);
      //2.匹配元素内容, 有子元素就开启状态机
      element.tagStatus = TagState.text;
      //匹配尾巴内容
      const matchTagEnd = context.source.match(`(.*?)<\\/${tagName}>`);
  
      if(matchTagEnd) {
        nodes = parseChildren(context, ancestors) as any;
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
  function parseAttribute(context, element) {
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
  function parseComment(context, ancestors) {
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
  function parseCDATA(context, ancestors) {
    // const cdataMatch = context.source.match(/<!\[CDATA\[([\s\S]*?)\]\]/);
    // advanceBy(context, cdataMatch[0].length);
    //
    // console.log(cdataMatch);
    // return {
    //   type: 'CDATA',
    //   children: cdataMatch[1],
    // }
  }
  
  /*是否自闭合标签*/
  const unary = ['meta', 'base', 'br', 'hr', 'img', 'input', 'link'];
  function isUnary(tagName) {
    return unary.includes(tagName);
  }
  
  /*结束标签*/
  function closeElement(element) {
    if(element.unary) {
      element.tagStatus = TagState.tagEnd;
    }
  }
  /*是否为空*/
  function isExists(context, ancestors) {
    return context.source;
  }
  //消费指定距离内容
  function advanceBy(context, by) {
    context.source = context.source.slice(by);
  }
  /**
   * 消费空格
   */
  function advanceSpaces(context) {
    let {source} = context;
    context.source = source.replace(/^[\r\f\t\n ]+/, '');
  }
  
  //2.用来将模板AST解析成JavaScript AST的转换器（transformer）
  function transform(tokens) {
    //将对应模板字符串转成Javascript版本的AST语言描述
    const ast = {};
  
  
    return ast;
  }
  
  //3.用来根据JavaScript AST生成渲染函数代码的生成器（generator）
  function generate(ast) {
    const code = "";
  
    return code;
  }
  
  //diff html标签和内容
  const diffAST = (oldHtml: string, newHtml?: string) => {
    //比较两个html
    const token = parser(oldHtml);
    const ast = transform(token);
    console.log(token, ast);
    const code = generate(ast);
  }
  diffAST("<div class-name=\"collection-icon\" :icon-class='tuichu' v-if=\"sfkhd\"><p>Hello<img src='./src/1.jpg' alt='这是图片' /></p></div>");