import type {TextModes} from './utils/index';

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
  type: HTMLNodeType.Element,
  tagName: string,
  children: Node[],
  attrs: any[],
  parentNode: Node,
}
export interface TextNode {
  type: HTMLNodeType.Text,
  content: string,
  parentNode: Node,
}
export interface RootNode {
  type: HTMLNodeType.Root,
  children: Node[],
}
export interface InterpolationNode {
  type: HTMLNodeType.Interpolation,
  content: any[],
  parentNode: Node,
}
export interface CDATANode {
  type: HTMLNodeType.CDATA,
  content: string,
  parentNode: Node,
}
export interface CommentNode {
  type: HTMLNodeType.Comment,
  content: string,
  parentNode: Node,
}
export type Node = ElementNode | TextNode | RootNode | InterpolationNode | CDATANode;

export interface parserContext {
  source: string;
  mode: TextModes;
  oldMode: TextModes;
  type: HTMLNodeType,
  children: Node[],
  parentNode: Node
}