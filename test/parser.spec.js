import HTMLParser from '../packages/index.ts';

const htmlParser = new HTMLParser();
test("parser result", () => {
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
})