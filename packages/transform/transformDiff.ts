import { context } from "esbuild";
import { ElementNode, HTMLNodeType } from "../core/types";
import { isEqualElementType } from "../core/utils";
import  {createInsNode, createDelNode} from '../core/htmlParser'

enum DiffType {
    added,
    removed
}
/** all for ast */
export function transformDiff(ast, context) {
    // 检查节点是否有差异化，进行相应处理
    const diffAst = context.diffAst;
    const oldStack = [diffAst];
    const newStack = [ast];
    const parentMap = {}; //父节点id => 父节点
    const peddingMap = {}; //待操作节点
    
    while(oldStack.length || newStack.length) {
        let isPushChildren = true; //是否加入子节点,默认为true
        let oldNode = oldStack.pop();
        let newNode = newStack.pop();

        //存储父节点引用 - 减少节点内存
        const oldParentNode = oldNode && parentMap[oldNode.pid];
        const newParentNode = newNode && parentMap[newNode.pid];

        if(oldNode) {
            parentMap[oldNode.id] = oldNode;
        }
        if(newNode) {
            parentMap[newNode.id] = newNode;
        }

        if(oldNode && newNode) {
            //节点相同，代表旧节点和新节点类型一致
            if(isEqualElementType(oldNode, newNode)) {
                if(oldNode.type === HTMLNodeType.Text) {
                    if(oldNode.content !== newNode.content) {
                        insert(addDiffType(oldNode, DiffType.removed), newParentNode, null);
                        insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
                    }
                }else if(oldNode.type === HTMLNodeType.Element) {
                    if(oldNode.tagName !== newNode.tagName) {
                        //Node节点类型不相等，比如元素标签名不一致
                        isPushChildren = false;
                        insert(addDiffType(oldNode, DiffType.removed), newParentNode, null);
                        insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
                    }
                } else {
                 
                }
            }else {
                //节点不同
                insert(addDiffType(oldNode, DiffType.removed), newParentNode, null);
                insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
            }
        }else if(oldNode) {
            insert(addDiffType(oldNode, DiffType.removed), oldParentNode, oldNode);
        }else if(newNode) {
            insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
        }
        
        if(oldNode && (oldNode.type === HTMLNodeType.Element || oldNode.type === HTMLNodeType.Root) && isPushChildren) {
            oldStack.push(...oldNode.children);
        }
        if(newNode && (newNode.type === HTMLNodeType.Element || newNode.type === HTMLNodeType.Root) && isPushChildren) {
            newStack.push(...newNode.children);
        }
    }

     // 执行插入操作
    // for (const parent in parentMap) {
    //     if (parentMap.hasOwnProperty(parent)) {
    //         const parentNode = parentMap[parent];
    //         if (parentNode) {
    //             while (parentNode.firstChild) {
    //                 parentNode.removeChild(parentNode.firstChild);
    //             }
    //             parentNode.append(...parentMap[parent].children);
    //         }
    //     }
    // }

    return () => {

    }
}

function addDiffType(node, diffType) {
    node.diffType = diffType;
    // 对差异化节点进行处理，例如添加ins或del标签
    const diffNode = createDiffNode(node);
    return diffNode;
}
function createDiffNode(node) {
    // 根据差异类型创建相应的差异节点
    if (node.diffType === DiffType.added) {
        // 创建ins节点
        return createInsNode(node);
    } else if (node.diffType === DiffType.removed) {
        // 创建del节点
        return createDelNode(node);
    } else {
        // 不需要差异化处理的节点，保持原样
        return node;
    }
}


function insert(newNode, container, anchor) {
    if(anchor) {
        //如果有节点已经找到
        const findNodeIndex = container.children.findIndex((node) => node === anchor);
        container.children.splice(findNodeIndex, 1, newNode);
    }else {
        container.children.unshift(newNode);
    }
}