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

        //正式数据用例
        const oldAst5 = htmlParser.parser(`<p style="text-align: center; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><span style="font-size: 18.0pt; line-height: 150%; font-family: 黑体;">需求</span></p>

        <p style="text-align: justify; line-height: 20pt; border: none; margin: 0cm 0cm 0.0001pt; padding: 0cm; font-size: 9pt; font-family: 'Times New Roman';"><strong><span style="font-size: 12.0pt; font-family: 仿宋_GB2312;">乘方科技有限公司：</span></strong></p>
        <p style="text-align: justify; text-indent: 24pt; line-height: 20pt; border: none; margin: 0cm 0cm 0.0001pt; padding: 0cm; font-size: 9pt; font-family: 'Times New Roman';"><span style="font-size: 12.0pt; font-family: 仿宋_GB2312;">依据我校与贵公司签订的服务合同，现要求厂商对我校提供以下功能需求,以满足我校的实际需要。要求如下：</span></p>
        <div align="center">
        <table class="MsoNormalTable" style="border-collapse: collapse; border: none;" border="1" cellspacing="0" cellpadding="0">
        <tbody>
        <tr style="height: 22.65pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.65pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">客户名称*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border: solid windowtext 1.0pt; border-left: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.65pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">白城医专</span></p>
        </td>
        </tr>
        <tr style="height: 22.35pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">提交时间*</span></strong></p>
        </td>
        <td style="width: 215.15pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="3" width="287">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        <td style="width: 86.5pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="2" width="115">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">期望完成时间*</span></strong></p>
        </td>
        <td style="width: 140.0pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="2" width="187">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.35pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">需求概要*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><span style="font-family: 微软雅黑;">重修审核可以针对结业生进行判断</span></p>
        </td>
        </tr>
        <tr style="height: 16.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">修改类型*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><span style="font-family: 宋体;">需求</span></p>
        </td>
        </tr>
        <tr style="height: 16.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">需求提出目的*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><span style="font-family: 宋体; color: red;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 16.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">系统当前功能描述*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" colspan="7" width="589">
        <p style="text-align: left; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="line-height: 150%; font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 23.1pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 23.1pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">修改位置</span></strong></p>
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">及操作*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 23.1pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 4.65pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 4.65pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">具体需求 </span></strong></p>
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">实现要求*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 4.65pt;" colspan="7" valign="top" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        <p style="margin: 0cm 0cm 0.0001pt -21pt; text-align: left; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"> <br /><br /></p>
        <p style="margin: 0cm 0cm 0.0001pt 21pt; text-align: left; text-indent: -21pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" width="87">
        <p style="text-indent: 5.15pt; margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">业务流程图（可手画后拍照）</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" colspan="7" width="589">
        <p style="text-align: left; text-indent: 21pt; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" width="87">
        <p style="text-indent: 5.15pt; margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">原型设计（可手画后拍照）</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" colspan="7" width="589">
        <p style="text-align: left; text-indent: 21pt; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" width="87">
        <p style="text-indent: 5.15pt; margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">备注</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" colspan="7" width="589">
        <p style="text-align: left; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">学校提交人</span></strong></p>
        </td>
        <td style="width: 75.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="101">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 97.75pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="130">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">电话(手机/座机)</span></strong></p>
        </td>
        <td style="width: 107.7pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="144">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 36.15pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="48">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">Q Q</span></strong><strong><span style="font-family: 宋体;">号</span></strong></p>
        </td>
        <td style="width: 124.4pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="166">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">公司提交人</span></strong></p>
        </td>
        <td style="width: 75.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="101">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 97.75pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="130">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">电话(手机/座机)</span></strong></p>
        </td>
        <td style="width: 107.7pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="144">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 36.15pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="48">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">Q Q</span></strong><strong><span style="font-family: 宋体;">号</span></strong></p>
        </td>
        <td style="width: 124.4pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="166">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">运维意见:</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">设计意见</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">开发意见</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        </tbody>
        </table>
        </div>`);
        const newAst5 = htmlParser.parser(`<p>11<p style="text-align: center; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><span style="font-size: 18.0pt; line-height: 150%; font-family: 黑体;">需求修改文档</span></p></p>
        <p style="text-align: justify; line-height: 20pt; border: none; margin: 0cm 0cm 0.0001pt; padding: 0cm; font-size: 9pt; font-family: 'Times New Roman';"><strong><span style="font-size: 12.0pt; font-family: 仿宋_GB2312;">乘方科技有限公司：</span></strong></p>
        <p style="text-align: justify; text-indent: 24pt; line-height: 20pt; border: none; margin: 0cm 0cm 0.0001pt; padding: 0cm; font-size: 9pt; font-family: 'Times New Roman';"><span style="font-size: 12.0pt; font-family: 仿宋_GB2312;">依据我校与贵公司签订的服务合同，现要求厂商对我校提供以下功能需求,以满足我校的实际需要。要求如下：</span></p>
        <div align="center">
        <table class="MsoNormalTable" style="border-collapse: collapse; border: none;" border="1" cellspacing="0" cellpadding="0">
        <tbody>
        <tr style="height: 22.65pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.65pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">客户名称*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border: solid windowtext 1.0pt; border-left: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.65pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">白城医专</span></p>
        </td>
        </tr>
        <tr style="height: 22.35pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">提交时间*</span></strong></p>
        </td>
        <td style="width: 215.15pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="3" width="287">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        <td style="width: 86.5pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="2" width="115">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">期望完成时间*</span></strong></p>
        </td>
        <td style="width: 140.0pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="2" width="187">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.35pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">需求概要*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.35pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><span style="font-family: 微软雅黑;">重修审核可以针对结业生进行判断</span></p>
        </td>
        </tr>
        <tr style="height: 16.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">修改类型*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><span style="font-family: 宋体;">需求</span></p>
        </td>
        </tr>
        <tr style="height: 16.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">需求提出目的*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><span style="font-family: 宋体; color: red;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 16.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">系统当前功能描述*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 16.8pt;" colspan="7" width="589">
        <p style="text-align: left; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="line-height: 150%; font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 23.1pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 23.1pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">修改位置</span></strong></p>
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">及操作*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 23.1pt;" colspan="7" width="589">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 4.65pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 4.65pt;" width="87">
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">具体需求 </span></strong></p>
        <p style="text-align: center; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="center"><strong><span style="font-family: 宋体;">实现要求*</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 4.65pt;" colspan="7" valign="top" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        <p style="margin: 0cm 0cm 0.0001pt -21pt; text-align: left; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"> <br /><br /></p>
        <p style="margin: 0cm 0cm 0.0001pt 21pt; text-align: left; text-indent: -21pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" width="87">
        <p style="text-indent: 5.15pt; margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">业务流程图（可手画后拍照）</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" colspan="7" width="589">
        <p style="text-align: left; text-indent: 21pt; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" width="87">
        <p style="text-indent: 5.15pt; margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">原型设计（可手画后拍照）</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" colspan="7" width="589">
        <p style="text-align: left; text-indent: 21pt; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 22.8pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" width="87">
        <p style="text-indent: 5.15pt; margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">备注</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 22.8pt;" colspan="7" width="589">
        <p style="text-align: left; line-height: 150%; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left">&nbsp;</p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">学校提交人</span></strong></p>
        </td>
        <td style="width: 75.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="101">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 97.75pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="130">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">电话(手机/座机)</span></strong></p>
        </td>
        <td style="width: 107.7pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="144">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 36.15pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="48">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">Q Q</span></strong><strong><span style="font-family: 宋体;">号</span></strong></p>
        </td>
        <td style="width: 124.4pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="166">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">公司提交人</span></strong></p>
        </td>
        <td style="width: 75.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="101">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 97.75pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="130">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">电话(手机/座机)</span></strong></p>
        </td>
        <td style="width: 107.7pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="144">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        <td style="width: 36.15pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="2" width="48">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><strong><span style="font-family: 宋体;">Q Q</span></strong><strong><span style="font-family: 宋体;">号</span></strong></p>
        </td>
        <td style="width: 124.4pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="166">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">运维意见:</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">设计意见</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        <tr style="height: 21.7pt;">
        <td style="width: 65.1pt; border: solid windowtext 1.0pt; border-top: none; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" width="87">
        <p style="margin: 0cm 0cm 0.0001pt; text-align: justify; font-size: 10.5pt; font-family: 'Times New Roman';"><strong><span style="font-family: 宋体;">开发意见</span></strong></p>
        </td>
        <td style="width: 441.65pt; border-top: none; border-left: none; border-bottom: solid windowtext 1.0pt; border-right: solid windowtext 1.0pt; padding: 0cm 5.4pt 0cm 5.4pt; height: 21.7pt;" colspan="7" width="589">
        <p style="text-align: left; margin: 0cm 0cm 0.0001pt; font-size: 10.5pt; font-family: 'Times New Roman';" align="left"><span style="font-family: 宋体;">&nbsp;</span></p>
        </td>
        </tr>
        </tbody>
        </table>
        </div>`);
        const oldGenerate5 = transform(oldAst5, {diffAst: newAst5, nodeTransforms: [['all', transformDiff]]});
        const newGenerate5 = transform(newAst5, {diffAst: oldAst5, nodeTransforms: [['all', transformDiff]]});

        expect(oldGenerate5).toBe("<ul><li>1</li><li><del>2</del><ins>3</ins></li><li><del>3</del><ins>2</ins></li></ul>");
        expect(newGenerate5).toBe("<ul><li>1</li><li><del>3</del><ins>2</ins></li><li><del>2</del><ins>3</ins></li></ul>");
    })
});