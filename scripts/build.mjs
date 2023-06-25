/**
 * 编译打包构建项目
 */
import esbuild from 'esbuild';
import baseConfig from './baseConfig.mjs';

esbuild.build({
    ...baseConfig,
    minify: true, //压缩
})
.catch(() => process.exit(1));
