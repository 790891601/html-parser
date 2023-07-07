
export function transformDiff(node, context) {
    // 检查节点是否有差异化，进行相应处理
    if (node.diff) {
        // 对差异化节点进行处理，例如添加ins或del标签
        const diffNode = createDiffNode(node);
        // 替换原节点
        context.currentNode = diffNode;
        // 更新上下文的AST
        context.ast = diffNode;
    }
}
function createDiffNode(node) {
    // 根据差异类型创建相应的差异节点
    if (node.diff === 'added') {
        // 创建ins节点
        return createInsNode(node);
    } else if (node.diff === 'removed') {
        // 创建del节点
        return createDelNode(node);
    } else {
        // 不需要差异化处理的节点，保持原样
        return node;
    }
}
function createInsNode(node) {
    // 创建ins节点，并复制原节点的属性和子节点
    const insNode = {
        type: 'Element',
        tagName: 'ins',
        attrs: node.attrs,
        children: node.children.map(child => createDiffNode(child))
    };
    return insNode;
}
function createDelNode(node) {
    // 创建del节点，并复制原节点的属性和子节点
    const delNode = {
        type: 'Element',
        tagName: 'del',
        attrs: node.attrs,
        children: node.children.map(child => createDiffNode(child))
    };
    return delNode;
}