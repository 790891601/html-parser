/**
 * 编译打包构建项目
 */
import esbuild from 'esbuild';
import baseConfig from './baseConfig.mjs';

esbuild.build({
    ...baseConfig,
    entryPoints: ["./packages/index.ts"],
    outdir: 'dist', //设置打包跟目录'
    minify: true, //压缩
})
.catch(() => process.exit(1));
