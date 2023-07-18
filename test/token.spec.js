import {tokenize} from '../packages/core/tokenize';
import { TextModes, TagState } from '../packages/core/types';


describe("tokenize test", () => {
    test("tokenize at token", () => {
        const result = [
            {
                type: TagState.tagName,
                tagName: 'img',
                attrs: [{
                    name: 'src',
                    value: 'http://www.baidu.com/s/1.jpg'
                }, {
                    name: 'alt',
                    value: 'hello',
                }],
                unary: true,
            }
        ]
        expect(tokenize({
            source: "<img src='http://www.baidu.com/s/1.jpg' alt='hello' />",
            mode: TextModes.DATA,
        })).toMatchObject(result);
    });
});