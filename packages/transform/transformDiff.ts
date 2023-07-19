import { context } from "esbuild";
import { ElementNode, HTMLNodeType } from "../core/types";
import { isEqualElementType } from "../core/utils";
import  {createInsNode, createDelNode} from '../core/tokenize'

enum DiffType {
    added,
    removed
}

let parentMap = {}; //父节点id => 父节点
/** all for ast */
export function transformDiffPlugin(options) {
    parentMap = {};
    const _options = Object.assign({
        oldAttrs: [], //外部属性
        newAttrs: [],
    }, options);

    return function transformDiff(ast, context) {
        // 检查节点是否有差异化，进行相应处理
        const diffAst = context.diffAst;
        const oldStack = [diffAst];
        const newStack = [ast];

        while(oldStack.length || newStack.length) { //自顶向下
            let oldNode = oldStack.shift();
            let newNode = newStack.shift();

            if(newNode) {
                parentMap[newNode.id] = newNode;
            }
            const newParentNode = newNode && parentMap[newNode.pid];
            const oldParentNode = oldNode && parentMap[oldNode.pid];
            const oldToNewNode = oldNode && parentMap[oldNode.id];

            if(oldNode && newNode) {
                //节点相同，代表旧节点和新节点类型一致
                if(isEqualElementType(oldNode, newNode)) {
                    if(oldNode.type === HTMLNodeType.Text) {
                        if(oldNode.content !== newNode.content) {
                            //应该去找到旧节点的位置,然后新节点就可以放到原来的位置
                            insert(addDiffType(oldNode, DiffType.removed, _options), oldParentNode, oldToNewNode);
                            insert(addDiffType(newNode, DiffType.added, _options), newParentNode, newNode);
                        }
                    }else if(oldNode.type === HTMLNodeType.Element) {
                        if(oldNode.tagName !== newNode.tagName) {
                            //Node节点类型不相等，比如元素标签名不一致
                            insert(addDiffType(oldNode, DiffType.removed, _options), oldParentNode, oldToNewNode);
                            insert(addDiffType(newNode, DiffType.added, _options), newParentNode, newNode);
                        }else {
                            diffAttributes(oldNode, newNode)
                        }
                    } else {
                        //节点相同,不修改
                    }
                }else {
                    //节点不同
                    insert(addDiffType(oldNode, DiffType.removed, _options), oldParentNode, oldToNewNode);
                    insert(addDiffType(newNode, DiffType.added, _options), newParentNode, newNode);
                }
                
            }else if(oldNode) {
                //只有旧节点
                insert(addDiffType(oldNode, DiffType.removed, _options), oldParentNode, oldToNewNode);
            }else if(newNode) {
                insert(addDiffType(newNode, DiffType.added, _options), newParentNode, newNode);
            }

            if(oldNode && ((oldNode.type === HTMLNodeType.Element && !oldNode.unary) || oldNode.type === HTMLNodeType.Root)) {
                oldStack.push(...oldNode.children);
            }
            if(newNode && ((newNode.type === HTMLNodeType.Element && !newNode.unary) || newNode.type === HTMLNodeType.Root) ) {
                newStack.push(...newNode.children);
            }
        }

        return () => {
            
        }
    }
}

function diffAttributes(oldNode, newNode) {
    const oldAttributes = oldNode.attrs;
    const newAttributes = newNode.attrs;

    const addedAttributes: any[] = [];
    const removedAttributes: any[] = [];
    const updatedAttributes: any[] = [];

    // 查找新增的和已删除的属性
    for (const attribute of oldAttributes) {
        if (!newAttributes.some(attr => attr.name === attribute.name)) {
            removedAttributes.push(attribute);
        }
    }
    for (const attribute of newAttributes) {
        if (!oldAttributes.some(attr => attr.name === attribute.name)) {
            addedAttributes.push(attribute);
        }
    }

    // 查找更新的属性（属性名相同但值不同）
    for (const oldAttr of oldAttributes) {
        const newAttr = newAttributes.find(attr => attr.name === oldAttr.name);
        if (newAttr && newAttr.value !== oldAttr.value) {
            updatedAttributes.push(newAttr);
        }
    }

    // 标记节点的属性差异
    if (addedAttributes.length > 0 || removedAttributes.length > 0 || updatedAttributes.length > 0) {
        oldNode.diffAttributes = {
            added: addedAttributes,
            removed: removedAttributes,
            updated: updatedAttributes
        };
        newNode.diffAttributes = {
            added: addedAttributes,
            removed: removedAttributes,
            updated: updatedAttributes
        };
    }
}

function addDiffType(node, diffType, options) {
    node.diffType = diffType;
    // 对差异化节点进行处理，例如添加ins或del标签
    const diffNode = createDiffNode(node, options);
    if(parentMap[diffNode.id]) {
        parentMap[diffNode.id] = diffNode;
    }
    return diffNode;
}

function createDiffNode(node, options={}) {
    // 根据差异类型创建相应的差异节点
    if (node.diffType === DiffType.added) {
        // 创建ins节点
        const insNode: ElementNode = createInsNode(node, options)
        return insNode
    } else if (node.diffType === DiffType.removed) {
        // 创建del节点
        const delNode: ElementNode = createDelNode(node, options)
        return delNode;
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
        if(container) {
            if(container.children) {
                container.children.push(newNode);
            }else {
                const containerParent = parentMap[container.pid];
                if(containerParent && containerParent.children) {
                    containerParent.children.push(newNode);
                }
            }
        }
    }
}