#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const core = require("../src/core.js");
const args = process.argv.slice(2);

if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
  console.log("Shotpack Lite\n用法：node bin/shotpack.cjs <输入JSON> <新的输出目录>\n输出目录必须尚不存在。不会覆盖既有文件，也不调用任何网络服务。");
} else if (args.length !== 2) {
  console.error("用法：node bin/shotpack.cjs <输入JSON> <新的输出目录>");
  process.exitCode = 1;
} else {
  let createdDirectory = false;
  let destination;
  try {
    const input = path.resolve(args[0]);
    destination = path.resolve(args[1]);
    const stat = fs.statSync(input);
    if (!stat.isFile()) throw new Error("输入不是普通文件");
    if (stat.size > core.MAX_IMPORT_BYTES) throw new Error("输入文件超过 2 MiB");
    const bundle = core.buildBundle(core.parseProject(fs.readFileSync(input, "utf8")));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.mkdirSync(destination);
    createdDirectory = true;
    for (const [filename, content] of Object.entries(bundle.files)) {
      fs.writeFileSync(path.join(destination, filename), content, { encoding: "utf8", flag: "wx" });
    }
    console.log("已导出 " + bundle.summary.shots + " 个镜头，计划 " + bundle.summary.durationSeconds + " 秒。\n输出：" + destination);
  } catch (error) {
    console.error("导出未完成：" + error.message);
    if (createdDirectory) console.error("可能已写入部分文件，请检查新建目录：" + destination);
    process.exitCode = 1;
  }
}
