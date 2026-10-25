/* Shotpack Lite: original, dependency-free shot-list utilities. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Shotpack = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const MAX_SHOTS = 500;
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const RATIOS = Object.freeze(["16:9", "9:16", "21:9", "4:3", "3:4", "1:1"]);
  const PROJECT_KEYS = ["schemaVersion", "title", "aspectRatio", "shots"];
  const SHOT_KEYS = ["id", "durationSeconds", "scene", "characters", "props", "framing", "camera", "action", "notes"];

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function validateProject(project) {
    const issues = [];
    const issue = (path, message) => issues.push({ path, message });
    function text(value, path, required, maxLength) {
      if (value === undefined && !required) return;
      if (typeof value !== "string") return issue(path, "必须是文本");
      if (required && !value.trim()) issue(path, "不能为空");
      if (value.length > maxLength) issue(path, "超过 " + maxLength + " 字符");
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) issue(path, "包含不支持的控制字符");
    }
    function keys(value, allowed, path) {
      Object.keys(value).forEach((key) => {
        if (!allowed.includes(key)) issue(path + "." + key, "不是此版本支持的字段；请先备份并按格式整理");
      });
    }
    function names(value, path) {
      if (!Array.isArray(value) || value.length > 40) return issue(path, "必须是最多 40 项的文本数组");
      value.forEach((name, index) => text(name, path + "[" + index + "]", true, 160));
    }

    if (!isRecord(project)) return [{ path: "project", message: "工程必须是 JSON 对象" }];
    keys(project, PROJECT_KEYS, "project");
    if (project.schemaVersion !== SCHEMA_VERSION) issue("schemaVersion", "仅支持 schemaVersion: 1，原文件不会被自动转换");
    text(project.title, "title", true, 160);
    if (!RATIOS.includes(project.aspectRatio)) issue("aspectRatio", "请选择支持的画幅：" + RATIOS.join("、"));
    if (!Array.isArray(project.shots) || project.shots.length < 1 || project.shots.length > MAX_SHOTS) {
      issue("shots", "需要 1–" + MAX_SHOTS + " 个镜头");
      return issues;
    }
    const ids = new Set();
    project.shots.forEach((shot, index) => {
      const path = "shots[" + index + "]";
      if (!isRecord(shot)) return issue(path, "镜头必须是对象");
      keys(shot, SHOT_KEYS, path);
      text(shot.id, path + ".id", true, 40);
      if (typeof shot.id === "string") {
        const id = shot.id.trim();
        if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(id)) issue(path + ".id", "使用字母开头的 ID，只包含字母、数字、下划线和短横线");
        if (ids.has(id)) issue(path + ".id", "镜头 ID 重复：" + id);
        ids.add(id);
      }
      if (typeof shot.durationSeconds !== "number" || !Number.isFinite(shot.durationSeconds) || shot.durationSeconds <= 0 || shot.durationSeconds > 3600) {
        issue(path + ".durationSeconds", "时长必须是大于 0、至多 3600 的秒数");
      }
      text(shot.scene, path + ".scene", true, 160);
      names(shot.characters, path + ".characters");
      names(shot.props, path + ".props");
      text(shot.framing, path + ".framing", true, 160);
      text(shot.camera, path + ".camera", false, 160);
      text(shot.action, path + ".action", true, 2000);
      text(shot.notes, path + ".notes", false, 2000);
    });
    return issues;
  }

  function normalizeProject(project) {
    const issues = validateProject(project);
    if (issues.length) {
      const error = new Error(issues.map((item) => item.path + "：" + item.message).join("\n"));
      error.issues = issues;
      throw error;
    }
    const cleanNames = (items) => [...new Set(items.map((item) => item.trim()))];
    return {
      schemaVersion: SCHEMA_VERSION,
      title: project.title.trim(),
      aspectRatio: project.aspectRatio,
      shots: project.shots.map((shot) => ({
        id: shot.id.trim(), durationSeconds: shot.durationSeconds, scene: shot.scene.trim(),
        characters: cleanNames(shot.characters), props: cleanNames(shot.props),
        framing: shot.framing.trim(), camera: (shot.camera || "").trim(),
        action: shot.action.trim(), notes: (shot.notes || "").trim()
      }))
    };
  }

  function parseProject(source) {
    if (typeof source !== "string") throw new Error("输入必须是 JSON 文本");
    let project;
    try { project = JSON.parse(source.replace(/^\uFEFF/, "")); }
    catch (error) { throw new Error("JSON 格式错误：" + error.message); }
    return normalizeProject(project);
  }

  function assetsFor(project) {
    const result = { scenes: new Map(), characters: new Map(), props: new Map() };
    function add(group, name, id) {
      if (!group.has(name)) group.set(name, []);
      group.get(name).push(id);
    }
    project.shots.forEach((shot) => {
      add(result.scenes, shot.scene, shot.id);
      shot.characters.forEach((name) => add(result.characters, name, shot.id));
      shot.props.forEach((name) => add(result.props, name, shot.id));
    });
    return result;
  }

  function buildBundle(rawProject) {
    const project = normalizeProject(rawProject);
    const assets = assetsFor(project);
    const duration = project.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0);
    const intro = [project.title, "画幅：" + project.aspectRatio, "镜头：" + project.shots.length + "；计划总时长：" + Number(duration.toFixed(3)) + " 秒"];
    const shots = intro.concat(["", "镜头清单", ""]);
    project.shots.forEach((shot) => {
      shots.push(shot.id + "｜" + shot.durationSeconds + " 秒｜" + shot.framing,
        "场景：" + shot.scene, "人物：" + (shot.characters.join("、") || "无"),
        "道具：" + (shot.props.join("、") || "无"), "运镜：" + (shot.camera || "未填写"),
        "动作：" + shot.action);
      if (shot.notes) shots.push("备注：" + shot.notes);
      shots.push("");
    });
    const assetLines = intro.concat(["", "素材需求汇总", "按完全一致的名称汇总；不同名称不会自动判断为同一素材。", ""]);
    [["场景", assets.scenes], ["人物", assets.characters], ["道具", assets.props]].forEach(([label, group]) => {
      assetLines.push(label + "（" + group.size + " 项）");
      if (!group.size) assetLines.push("无");
      group.forEach((ids, name) => assetLines.push("- " + name + "；出现 " + ids.length + " 次；镜头 " + ids.join("、")));
      assetLines.push("");
    });
    const prompts = intro.concat(["", "提示词任务草稿", "以下仅拼接镜头字段，未调用 AI，也未进行导演、连续性或视觉质量审查。", ""]);
    project.shots.forEach((shot) => {
      prompts.push("【" + shot.id + "】",
        "画幅 " + project.aspectRatio + "；计划时长 " + shot.durationSeconds + " 秒；景别 " + shot.framing + "。",
        "场景：" + shot.scene + "。",
        "出场人物：" + (shot.characters.join("、") || "无") + "；道具：" + (shot.props.join("、") || "无") + "。",
        "运镜：" + (shot.camera || "待人工补充") + "。", "动作：" + shot.action,
        "补充：" + (shot.notes || "待人工审核和补充"), "");
    });
    return {
      project, summary: { shots: project.shots.length, durationSeconds: Number(duration.toFixed(3)), scenes: assets.scenes.size, characters: assets.characters.size, props: assets.props.size },
      files: {
        "project.json": JSON.stringify(project, null, 2) + "\n",
        "shots.txt": shots.join("\n").trimEnd() + "\n",
        "assets.txt": assetLines.join("\n").trimEnd() + "\n",
        "prompt-tasks.txt": prompts.join("\n").trimEnd() + "\n"
      }
    };
  }

  return Object.freeze({ SCHEMA_VERSION, MAX_SHOTS, MAX_IMPORT_BYTES, RATIOS, validateProject, normalizeProject, parseProject, buildBundle });
});
