
export function transform(ast, options = {}) {
    // 优化 ast，标记静态节点
    const context = {
        
        nodeTransforms: [
            // transformIf,
            // transformFor,
            transformText,
            // transformElement,
        ],
        directiveTransforms: {
            // on: transformOn,
            // bind: transformBind,
            // model: transformModel
        }
    }
    const dmlAst = traverseNode(ast, context);

    return dmlAst;
}
function transformText(node, context) {
    return function postformText() {
        const { tag, props } = node;
        
    }
}

//遍历AST
function traverseNode(node, context) {
    context.currentNode = node
    const { nodeTransforms } = context; //转换函数
    const exitFns: Function[] = []; //退出函数

    for(let i = 0; i < nodeTransforms.length; i++) {
        const onExit = nodeTransforms[i](node, context);
        if(onExit) {
            if(Array.isArray(onExit)) {
                exitFns.push(...onExit);
            }else {
                exitFns.push(onExit);
            }
        }
    }
    traverseChildren(node, context);
    context.currentNode = node;

    let i = exitFns.length
    while (i--) {
        exitFns[i]()
    }
}
function traverseChildren(node, context) {

}