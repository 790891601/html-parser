export const LEGENDS = {
    'ADDED': 'added',
    'REMOVED': 'removed',
}

//有限状态自动机
export const TextModes = {
    //默认模式 遇到字符 < 时，会切换到标签开始状态 遇到字符 & 时，会切换到字符引用状态能够处理 HTML 字符实体
    DATA: 0,
    //<title> 标签、<textarea> 标签 遇到字符 < 时，切换到 RCDATA less-than sign state 状态遇到字符 /，切换到 RCDATA 的结束标签状态在不使用引用符号 & 的情况下，RCDATA 模式不会识别标签，如下代码会把 < 当做普通符号而无法识别内部的 div 标签
    RCDATA: 1,
    //<style>、<xmp>、<iframe>、<noembed>、<noframes>、<noscript> 等，与 RCDATA 模式类似，只是不支持 HTML 实体
    RAWTEXT: 2,
    //<![CDATA[ 字符串  任何字符都作为普通字符处理，直到遇到 CDATA 的结束标志为止
    CDATA: 3,
    COMMENT: 4, //注释
}
export const TagState = { //标签模式
    initial: 1, // 初始状态
    tagOpen: 2, //标签开始状态
    tagName: 3, // 标签名称状态
    text: 4, //文本状态
    tagEnd: 5, //结束标签状态
    tagEndName: 6 // 结束标签名称状态
}