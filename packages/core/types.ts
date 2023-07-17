//有限状态自动机
export enum TextModes {
  //默认模式 遇到字符 < 时，会切换到标签开始状态 遇到字符 & 时，会切换到字符引用状态能够处理 HTML 字符实体
  DATA,
  //<title> 标签、<textarea> 标签 遇到字符 < 时，切换到 RCDATA less-than sign state 状态遇到字符 /，切换到 RCDATA 的结束标签状态在不使用引用符号 & 的情况下，RCDATA 模式不会识别标签，如下代码会把 < 当做普通符号而无法识别内部的 div 标签
  RCDATA,
  //<style>、<xmp>、<iframe>、<noembed>、<noframes>、<noscript> 等，与 RCDATA 模式类似，只是不支持 HTML 实体
  RAWTEXT,
  //<![CDATA[ 字符串  任何字符都作为普通字符处理，直到遇到 CDATA 的结束标志为止
  CDATA,
  COMMENT, //注释
};

export enum TagState { //标签模式
  initial, // 初始状态
  tagOpen, //标签开始状态
  tagName, // 标签名称状态
  text, //文本状态
  tagEnd, //结束标签状态
  tagEndName // 结束标签名称状态
}

export interface _parserOptions {
}
export interface parserOptions {
}

export enum HTMLNodeType {
  Element = 'Element',
  Text = 'Text',
  Root = 'Root',
  Interpolation='Interpolation',
  Comment='Comment',
  CDATA='CDATA',
}
export interface ElementNode {
  id: bigint,
  type: HTMLNodeType.Element,
  tagName: string,
  children: Node[],
  attrs: any[],
  pid: bigint,
}
export interface TextNode {
  id: bigint,
  type: HTMLNodeType.Text,
  content: string,
  pid: bigint,
}
export interface RootNode {
  id: bigint,
  type: HTMLNodeType.Root,
  children: Node[],
  pid: bigint,
}
export interface InterpolationNode {
  id: bigint,
  type: HTMLNodeType.Interpolation,
  content: any[],
  pid: bigint,
}
export interface CDATANode {
  id: bigint,
  type: HTMLNodeType.CDATA,
  content: string,
  pid: bigint,
}
export interface CommentNode {
  id: bigint,
  type: HTMLNodeType.Comment,
  content: string,
  pid: bigint,
}
export type Node = ElementNode | TextNode | RootNode | InterpolationNode | CDATANode;

export interface parserContext {
  source: string;
  mode: TextModes;
  oldMode: TextModes;
  type: HTMLNodeType,
  children: Node[],
  pid: bigint,
}