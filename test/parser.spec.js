import HTMLParser from '../packages/index.ts';

const htmlParser = new HTMLParser();

describe("parser test", () => {
    test("parser at parseElement", () => {
        const result = {
            "children": [
                {
                    "attrs": [], 
                    "children": [
                        {
                            "attrs": [], 
                            "children": [{"content": "123123", "type": "Text"}], 
                            "tagName": "p", "type": "Element"
                        }
                    ], 
                    "tagName": "div", 
                    "type": "Element"
                }
            ], 
            "type": "Root"
        }
        expect(htmlParser.parser("<div><p>123123</p></div>")).toMatchObject(result);
    });

    test("parser at parseInterpolation", () => {
        const result = {
            "children": [
                {
                    "attrs": [], 
                    "children": [
                        {
                            type: 'Interpolation',
                            "content": ["{{ obj.a }}", "obj.a"], 
                        }
                    ], 
                    "tagName": "div", 
                    "type": "Element"
                }
            ], 
            "type": "Root"
        }
        expect(htmlParser.parser("<div>{{ obj.a }}</div>")).toMatchObject(result);
    });

    test("parser at parseCDATA", () => {
        const result = {
            "children": [
                {
                    "attrs": [], 
                    "children": [
                        {
                            type: 'CDATA',
                            "content": "<HelloWorld!>哈哈$#@!合法符号亲唇纹嗯", 
                        }
                    ], 
                    "tagName": "div", 
                    "type": "Element"
                },
                {
                    "attrs": [], 
                    "children": [
                        {
                            type: 'Text',
                            "content": "xxx", 
                        }
                    ], 
                    "tagName": "b", 
                    "type": "Element"
                }
            ], 
            "type": "Root"
        }
        expect(htmlParser.parser("<div><![CDATA[<HelloWorld!>哈哈$#@!合法符号亲唇纹嗯]]</div><b>xxx</b>")).toMatchObject(result);
    });

    //非合法标签
    test("parser at tag end", async () => {
        const mError = new Error("标签必须要有结束");
        await expect(() => {
            htmlParser.parser("<div>{{ obj.a }}")
        }).rejects.toThrowError(mError);
    });
});