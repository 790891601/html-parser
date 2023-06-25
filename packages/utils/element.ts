import {TagState} from './index'
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