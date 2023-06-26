import esbuild from "esbuild";
import BaseConfig from './baseConfig.mjs';

async function devServer() {
  let context = await esbuild.context({
    ...BaseConfig,
    sourcemap: "both",
    metafile: true,
  });

  // 使用上下文，开启监听
  await context.watch();

  // 开启一个服务
  let { host, port } = await context.serve({
    servedir: "dist",
    port: 9000,
    host: "127.0.0.1",
  });
  console.log(`Serve is listening on http://${host}:${port}`);
};

devServer();
