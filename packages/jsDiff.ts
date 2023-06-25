import {legends} from './utils/index';
export function diff(oldHtml, newHtml, options={state: legends.ADDED}) {
    const isAdded = options.state === legends.ADDED,
          isRemoved = options.state === legends.REMOVED;
  
    const oldArr = oldHtml.split(/(<[^<>]+>)/g).filter(Boolean);
    const newArr = newHtml.split(/(<[^<>]+>)/g).filter(Boolean);
  
    const dp = Array.from({ length: oldArr.length + 1 }, () => (
      Array.from({ length: newArr.length + 1 }, () => ({ len: -1, tag: '' }))
    ));
  
    for (let i = 0; i <= oldArr.length; i++) {
      dp[i][0] = { len: i, tag: 'delete' };
    }
  
    for (let j = 0; j <= newArr.length; j++) {
      dp[0][j] = { len: j, tag: 'insert' };
    }
  
    for (let i = 1; i <= oldArr.length; i++) {
      for (let j = 1; j <= newArr.length; j++) {
        if (oldArr[i - 1] === newArr[j - 1]) {
          dp[i][j] = { len: dp[i - 1][j - 1].len + 1, tag: 'equal' };
        } else {
          const insertLen = dp[i][j - 1].len + getTagLength(newArr[j - 1]);
          const deleteLen = dp[i - 1][j].len + getTagLength(oldArr[i - 1]);
          if (insertLen < deleteLen) {
            dp[i][j] = { len: insertLen, tag: 'insert' };
          } else {
            dp[i][j] = { len: deleteLen, tag: 'delete' };
          }
        }
      }
    }
  
    let i = oldArr.length;
    let j = newArr.length;
    const result: string[] = [];
  
    while (i > 0 || j > 0) {
      if (dp[i][j].tag === 'equal') {
        result.unshift(oldArr[i - 1]);
        i--;
        j--;
      } else if (dp[i][j].tag === 'insert') {
        if(isAdded) {
          result.unshift("<ins style='background-color: #8edf97;'>" + newArr[j - 1] + "</ins>");
        }else {
          result.unshift("<ins style='visibility: hidden;'>"+newArr[j - 1]+"</ins>")
        }
        j--;
      } else {
        if(isRemoved) {
          result.unshift(`<del style="background-color: #ffb7b7;">${oldArr[i - 1]}</del>`);
        }else {
          result.unshift(`<del style="visibility: hidden;">${oldArr[i - 1]}</del>`)
        }
        i--;
      }
    }
  
    return result.join('');
}
  
  function getTagLength(tag) {
    const match = tag.match(/^<\/?(\w+)/);
  
    if (match) {
      return match[0].length;
    }
  
    return tag.length;
  }
  