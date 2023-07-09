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
  // tagName: tagName,
  // children: ,
  // attrs: attrs,
}
export interface parserContext {
  source: string;
  mode: TextModes;
  oldMode: TextModes;
  type: HTMLNodeType,
  children: any[]
}