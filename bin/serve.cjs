#!/usr/bin/env node
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2] || 8765);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("端口必须是 1024–65535 的整数");
  process.exitCode = 1;
} else {
  // Serve only public UI assets; never expose arbitrary paths or .git.
  const routes = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/index.html", ["index.html", "text/html; charset=utf-8"]],
    ["/src/core.js", ["src/core.js", "text/javascript; charset=utf-8"]],
    ["/src/app.js", ["src/app.js", "text/javascript; charset=utf-8"]],
    ["/src/style.css", ["src/style.css", "text/css; charset=utf-8"]],
    ["/examples/demo.js", ["examples/demo.js", "text/javascript; charset=utf-8"]],
    ["/examples/demo.json", ["examples/demo.json", "application/json; charset=utf-8"]],
    ["/README.md", ["README.md", "text/plain; charset=utf-8"]]
  ]);
  const server = http.createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader("X-Frame-Options", "DENY");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }
    let pathname;
    try { pathname = new URL(request.url, "http://127.0.0.1").pathname; }
    catch (_) { response.writeHead(400); response.end("Bad request"); return; }
    const route = routes.get(pathname);
    if (!route) { response.writeHead(404); response.end("Not found"); return; }
    fs.readFile(path.join(root, route[0]), (error, data) => {
      if (error) { response.writeHead(500); response.end("Cannot read public asset"); return; }
      response.writeHead(200, { "Content-Type": route[1] });
      response.end(request.method === "HEAD" ? undefined : data);
    });
  });
  server.on("error", (error) => { console.error("本地服务未启动：" + error.message); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => {
    console.log("Shotpack Lite 本地预览：http://127.0.0.1:" + port + "/\n服务只监听本机。按 Ctrl+C 停止；页面数据请先保存。");
  });
}
