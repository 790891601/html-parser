
import {transformText, transformDiff} from '../transform/index';
import { generate } from './generate';

export function transform(ast, options = {}) {
    const context = {
        ast: {},
        nodeTransforms: [
            // transformIf,
            // transformFor,
            // transformText,
            transformDiff,
            // transformElement,
        ],
        directiveTransforms: {
            // on: transformOn,
            // bind: transformBind,
            // model: transformModel
        },
        ...options,
    }
    //树结构转成通用语言描述语法树
    traverseNode(ast, context);

    return generate(ast, options);
}


//遍历AST
function traverseNode(node, context) {
    const ast = {};
    context.currentNode = node
    const { nodeTransforms } = context; //转换函数
    const exitFns: Function[] = []; //退出函数

    for(let i = 0; i < nodeTransforms.length; i++) {
        //执行对应转换入口函数
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

    let i = exitFns.length;

    //逆向执行输出函数,先进先出
    while (i--) {
        exitFns[i]()
    }

    return ast;
}
function traverseChildren(node, context) {
    // 递归遍历子数组
    traverseNode(node, context);
}