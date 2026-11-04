const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  publicPath: process.env.NODE_ENV === "production" ? "/windowssim/" : "/",
  transpileDependencies: true,
  css: {
    extract: false,
  },
  chainWebpack: (config) => {
    config.module
      .rule("css")
      .oneOf("vue")
      .use("css-loader")
      .tap((options) => ({
        ...options,
        esModule: false,
      }));
  },
  configureWebpack: {
    ignoreWarnings: [/export 'default'.*App\.vue/],
  },
  devServer: {
    proxy: {
      "/wine-helper": {
        target: "http://127.0.0.1:4173",
        changeOrigin: true,
        pathRewrite: { "^/wine-helper": "" },
      },
      "/wine-gui": {
        target: "http://127.0.0.1:6080",
        changeOrigin: true,
        ws: true,
        pathRewrite: { "^/wine-gui": "" },
      },
    },
  },
});
