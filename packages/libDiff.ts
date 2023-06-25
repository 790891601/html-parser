
import {diffChars} from 'diff'
import {legends} from './utils/index';

export function diffPlugin(oldCode, newCode, options={state: legends.ADDED}) {
const diff = diffChars(oldCode, newCode);
const isAdded = options.state === legends.ADDED,
        isRemoved = options.state === legends.REMOVED;
diff.forEach((part) => {
    if(isAdded && part.added) {
    part.value = `<span style="background-color: #8edf97;display: inline-block;">${part.value}</span>`;
    }else if(isRemoved && part.removed) {
    part.value = `<span style="background-color: #ffb7b7;display: inline-block;">${part.value}</span>`;
    }
});
const HTML = convertChangesToXML(diff, isAdded, isRemoved);
return HTML;
}
function convertChangesToXML(changes, isAdded, isRemoved) {
let ret: string[] = [];
for (let i = 0; i < changes.length; i++) {
    let change = changes[i];
    if (change.added) {
    ret.push(`<ins style="${isRemoved
        ? 'visibility:hidden;'
        : ''}">`);
    } else if (change.removed) {
    ret.push(`<del style="${isAdded
        ? 'visibility:hidden;'
        : ''}">`);
    }

    ret.push(change.value);

    if (change.added) {
    ret.push('</ins>');
    } else if (change.removed) {
    ret.push('</del>');
    }
}
return ret.join('');
}