import {HTMLParser, transform} from '../packages/core/index';
import {transformDiff} from '../packages/transform/transformDiff'

const htmlParser = new HTMLParser();

describe("transform test", () => {
    test("transform at transformDiff", () => {
        const oldAst = htmlParser.parser("<div><p>123123</p></div>");
        const newAst = htmlParser.parser("<div><p>456789</p></div>");

        /** 旧的ast如果删除，或者没有,那么整体diff树也会执行，任何节点都会有Root虚拟头节点  */
        const oldGenerate = transform(oldAst, {diffAst: newAst, nodeTransforms: [['all', transformDiff]]});
        const newGenerate = transform(newAst, {diffAst: oldAst, nodeTransforms: [['all', transformDiff]]});

        //第一种情况，相同节点，相同层级，不同文本
        expect(oldGenerate).toBe("<div><p><del>456789</del><ins>123123</ins></p></div>");
        expect(newGenerate).toBe("<div><p><del>123123</del><ins>456789</ins></p></div>");

        //第二种情况，相同层级，不同节点,不管子节点如何变化，统一ins和del
        const oldAst2 = htmlParser.parser("<div>123123<div>123</div></div>");
        const newAst2 = htmlParser.parser("<p>456789<div>123</div></p>");
        const oldGenerate2 = transform(oldAst2, {diffAst: newAst2, nodeTransforms: [['all', transformDiff]]});
        const newGenerate2 = transform(newAst2, {diffAst: oldAst2, nodeTransforms: [['all', transformDiff]]});

        expect(oldGenerate2).toBe("<del><p>456789<div>123</div></p></del><ins><div>123123<div>123</div></div></ins>");
        expect(newGenerate2).toBe("<del><div>123123<div>123</div></div></del><ins><p>456789<div>123</div></p></ins>");

        //第三种情况，不同层级，不管子节点如何变化，统一ins和del
        const oldAst3 = htmlParser.parser("<div><p>123</p></div>");
        const newAst3 = htmlParser.parser("<p>123</p>");
        const oldGenerate3 = transform(oldAst3, {diffAst: newAst3, nodeTransforms: [['all', transformDiff]]});
        const newGenerate3 = transform(newAst3, {diffAst: oldAst3, nodeTransforms: [['all', transformDiff]]});

        expect(oldGenerate3).toBe("<del><p>123</p></del><ins><div><p>123</p></div></ins>");
        expect(newGenerate3).toBe("<del><div><p>123</p></div></del><ins><p>123</p></ins>");

        //第四种情况，相同层级，外层标签一致，子节点数量不同，优先处理子节点,对每个子节点进行ins和del标记
        const oldAst4 = htmlParser.parser("<ul><li>1</li><li>3</li><li>2</li></ul>");
        const newAst4 = htmlParser.parser("<ul><li>1</li><li>2</li><li>3</li></ul>");
        const oldGenerate4 = transform(oldAst4, {diffAst: newAst4, nodeTransforms: [['all', transformDiff]]});
        const newGenerate4 = transform(newAst4, {diffAst: oldAst4, nodeTransforms: [['all', transformDiff]]});

        expect(oldGenerate4).toBe("<ul><li>1</li><li><del>2</del><ins>3</ins></li><li><del>3</del><ins>2</ins></li></ul>");
        expect(newGenerate4).toBe("<ul><li>1</li><li><del>3</del><ins>2</ins></li><li><del>2</del><ins>3</ins></li></ul>");
    });
});