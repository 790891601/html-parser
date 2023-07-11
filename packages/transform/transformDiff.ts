import { ElementNode, HTMLNodeType } from "../core/types";
import { isEqualElementType } from "../core/utils";

enum DiffType {
    added,
    removed
}
/** all for ast */
export function transformDiff(ast, context) {
    // 检查节点是否有差异化，进行相应处理
    const diffAst = context.diffAst;
    const oldStack = [...diffAst.children];
    const newStack = [...ast.children];    
    
    while(oldStack.length || newStack.length) {
        let oldNode = oldStack.pop();
        let newNode = newStack.pop();

        //保存原本的父节点,addDiffType会改变当前父节点,插入ins标签呢
        const oldParentNode = oldNode && oldNode.parentNode;
        const newParentNode = newNode && newNode.parentNode;

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
                        insert(addDiffType(oldNode, DiffType.removed), newParentNode, null);
                        insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
                    }
                } else {
                 
                }
            }else {
                insert(addDiffType(oldNode, DiffType.removed), newParentNode, null);
                insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
            }
        }else if(oldNode) {
            insert(addDiffType(oldNode, DiffType.removed), oldParentNode, oldNode);
        }else if(newNode) {
            insert(addDiffType(newNode, DiffType.added), newParentNode, newNode);
        }

        if(oldNode && oldNode.type === HTMLNodeType.Element) {
            oldStack.push(...oldNode.children);
        }
        if(newNode && newNode.type === HTMLNodeType.Element) {
            newStack.push(...newNode.children);
        }
    }

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
function createInsNode(node) {
    // 创建ins节点，并复制原节点的属性和子节点
    const insNode: ElementNode = {
        type: HTMLNodeType.Element,
        tagName: 'ins',
        attrs: [],
        children: [node],
        parentNode: node.parentNode,
    };
    node.parentNode = insNode;
    return insNode;
}
function createDelNode(node) {
    // 创建del节点，并复制原节点的属性和子节点
    const delNode: ElementNode = {
        type: HTMLNodeType.Element,
        tagName: 'del',
        attrs: [],
        children: [node],
        parentNode: node.parentNode,
    };
    node.parentNode = delNode;
    return delNode;
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