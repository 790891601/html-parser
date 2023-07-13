import type {TextModes} from './utils/index';

export interface _parserOptions {
  id: bigint;
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