export const LEGENDS = {
    'ADDED': 'added',
    'REMOVED': 'removed',
}
export const CONFIG = {
    idx: BigInt(1), //可变配置变量
}
//重置idx
export const resetConfigIdx = () => {
    CONFIG.idx = BigInt(1);
}

//切换文本模式
export const toggleMode = (context, mode) => {
    context.oldMode = context.mode;
    context.mode = mode;
}
//恢复模式
export const revertMode = (context) => {
    context.mode = context.oldMode;
}
