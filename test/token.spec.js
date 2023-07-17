import {tokenize} from '../packages/core/tokenize';
import { TextModes } from '../packages/core/types';


describe("parser test", () => {
    test("parser at parseElement", () => {
        const result = {}
        expect(tokenize({
            source: "<img src='http://www.baidu.com/s/1.jpg' alt='hello' />",
            mode: TextModes.DATA,
        })).toMatchObject(result);
    });
});