import {TagState} from '../types'

export const unary = [
  "br",
  "hr",
  "img",
  "input",
  "meta",
  "link",
  "area",
  "base",
  "col",
  "command",
  "embed",
  "keygen",
  "param",
  "source",
  "track",
  "wbr"
];
export function isUnary(tagName): boolean {
  return unary.includes(tagName);
}
  
/*结束标签*/
export function closeElement(element) {
  if(element.unary) {
    element.tagStatus = TagState.tagEnd;
  }
}
/**
 * 对比元素是否相同类型
 * @param element 
 * @param elementThen 
 * @returns 
 */
export function isEqualElementType(element, elementThen): boolean {
  if(element.type === elementThen.type) {
    return true;
  }
  return false;
}