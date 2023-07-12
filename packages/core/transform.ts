
import {transformText, transformDiff} from '../transform/index';
import {deepCopy} from './utils/index'
import { generate } from './generate';

interface transformOptions {
    nodeTransforms?: Function[] | [string, Function],
    directiveTransforms?: Object,
    diffAst?: Object
}

export function transform(ast, options: transformOptions = {}) {
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
            ...nodeTransforms.filter(item => Array.isArray(item) ? item[0] !== 'all' : true),
        ],
        directiveTransforms: {
            // on: transformOn,
            // bind: transformBind,
            // model: transformModel
            ...directiveTransforms
        },
    }
    const nodeTransformAll = nodeTransforms.filter(item => Array.isArray(item) && item[0] === 'all').flatMap(f => f[1]);
    callNodeTransforms(context.ast, {
        ...context,
        nodeTransforms: nodeTransformAll
    });

    //遍历树结构，并调用插件函数
    traverseNode(context.ast, context);
    return generate(context.ast, options);
}

function callNodeTransforms(node, context) {
    const { nodeTransforms, onEnter, onExit } = context;
    const exitFns: Function[] = []; //退出函数
    
    typeof onEnter === 'function' && onEnter(node, context);
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
    typeof onExit === 'function' && onExit(node, context);
    let i = exitFns.length;

    //逆向执行输出函数,先进先出
    while (i--) {
        exitFns[i]();
    }
} 

//遍历AST
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
    // 递归遍历子数组
    if(node.children){
        for(let i = 0; i < node.children.length; i++) {
            traverseNode(node.children[i], context);
        }
    }
}