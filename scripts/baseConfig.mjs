export default {
    // 编译入口
    entryPoints: ["./packages/core/index.ts", './packages/transform/index.ts'],
    bundle: true,
    // 编译输出的文件名
    // outfile: "index.js",
    // 编译文件输出的文件夹
    // 模块格式，包括`esm`、`commonjs`和`iife`
    format: "esm",
    outdir: "dist",
}