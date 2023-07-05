/*是否为空*/
export function isExists(context, ancestors) {
    return context.source;
}
//消费指定距离内容
export function advanceBy(context, by) {
    context.source = context.source.slice(by);
}
/*** 消费空格*/
export function advanceSpaces(context) {
let {source} = context;
    context.source = source.replace(/^[\r\f\t\n ]+/, '');
}
  