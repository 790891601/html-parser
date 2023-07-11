import {TagState} from './index'
import {HTMLNodeType} from '../types';
/*是否自闭合标签*/
export const unary = ['meta', 'base', 'br', 'hr', 'img', 'input', 'link'];
export function isUnary(tagName) {
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