import {TextModes, TagState} from './utils/index'

  
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