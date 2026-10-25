(function () {
  "use strict";
  const core = window.Shotpack;
  const byId = (id) => document.getElementById(id);
  const cards = byId("shot-cards");
  const output = byId("output");
  let project = core.normalizeProject(window.ShotpackDemo);
  let selectedFile = "shots.txt";
  let bundle = null;
  let revision = 0;
  let importSequence = 0;
  let dirty = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function status(message, isError) {
    byId("status").textContent = message;
    byId("status").classList.toggle("error", Boolean(isError));
  }
  function changed() {
    dirty = true;
    revision += 1;
    byId("save-state").textContent = "有未保存修改";
    renderPreview();
  }
  function namesFrom(value) {
    return [...new Set(value.split(/[,，、;；\n]/).map((name) => name.trim()).filter(Boolean))];
  }
  function field(labelText, value, onChange, options) {
    options = options || {};
    const label = element("label", options.wide ? "wide" : "", labelText);
    const control = element(options.multiline ? "textarea" : "input");
    if (!options.multiline) control.type = options.number ? "number" : "text";
    if (options.number) { control.min = "0.001"; control.max = "3600"; control.step = "any"; }
    else control.maxLength = options.multiline ? 2000 : options.names ? 6500 : 160;
    if (options.multiline) control.rows = 2;
    control.value = Number.isNaN(value) ? "" : value;
    control.autocomplete = "off";
    control.addEventListener("input", () => { onChange(options.number ? control.valueAsNumber : control.value); changed(); });
    label.append(control);
    return label;
  }

  function renderEditors() {
    byId("project-title").value = project.title;
    byId("project-ratio").value = project.aspectRatio;
    cards.replaceChildren();
    project.shots.forEach((shot, index) => {
      const card = element("article", "shot-card");
      const heading = element("div", "card-heading");
      heading.append(element("h3", "", "镜头 " + (index + 1)));
      const remove = element("button", "danger", "删除");
      remove.type = "button";
      remove.disabled = project.shots.length === 1;
      remove.setAttribute("aria-label", "删除镜头 " + (index + 1));
      remove.addEventListener("click", () => {
        if (!window.confirm("删除镜头 " + (shot.id || String(index + 1)) + "？此操作没有撤销按钮，请先保存重要内容。")) return;
        project.shots.splice(index, 1);
        changed();
        renderEditors();
      });
      heading.append(remove);
      const grid = element("div", "field-grid");
      grid.append(
        field("镜头 ID", shot.id, (value) => { shot.id = value; }),
        field("时长（秒）", shot.durationSeconds, (value) => { shot.durationSeconds = value; }, { number: true }),
        field("场景名称", shot.scene, (value) => { shot.scene = value; }),
        field("景别", shot.framing, (value) => { shot.framing = value; }),
        field("人物（逗号分隔）", shot.characters.join("、"), (value) => { shot.characters = namesFrom(value); }, { names: true }),
        field("道具（逗号分隔）", shot.props.join("、"), (value) => { shot.props = namesFrom(value); }, { names: true }),
        field("运镜", shot.camera || "", (value) => { shot.camera = value; }, { wide: true }),
        field("画面动作", shot.action, (value) => { shot.action = value; }, { multiline: true, wide: true }),
        field("备注（可留空）", shot.notes || "", (value) => { shot.notes = value; }, { multiline: true, wide: true })
      );
      card.append(heading, grid);
      cards.append(card);
    });
    byId("add-shot").disabled = project.shots.length >= core.MAX_SHOTS;
  }

  function renderPreview() {
    const issues = core.validateProject(project);
    const validation = byId("validation");
    validation.replaceChildren();
    validation.className = "validation " + (issues.length ? "invalid" : "valid");
    ["save-project", "export-bundle", "copy-output"].forEach((id) => { byId(id).disabled = issues.length > 0; });
    if (issues.length) {
      bundle = null;
      byId("summary").textContent = "当前有 " + issues.length + " 项格式问题，修正后显示可导出任务包。";
      validation.append(element("strong", "", "待修正"));
      const list = element("ul");
      issues.forEach((issue) => list.append(element("li", "", issue.path + "：" + issue.message)));
      validation.append(list);
      output.value = "";
      return;
    }
    bundle = core.buildBundle(project);
    const summary = bundle.summary;
    byId("summary").textContent = summary.shots + " 个镜头 · " + summary.durationSeconds + " 秒 · " + summary.scenes + " 个场景 · " + summary.characters + " 个人物 · " + summary.props + " 项道具";
    validation.textContent = "格式校验通过；仍需人工检查故事、镜头与素材连续性。";
    output.value = bundle.files[selectedFile];
  }

  function mayReplace() {
    return !dirty || window.confirm("当前有未保存修改。确定替换当前工程？请先保存重要内容。");
  }
  function replaceProject(nextProject, message, nextDirty) {
    importSequence += 1;
    project = nextProject;
    dirty = Boolean(nextDirty);
    revision += 1;
    byId("save-state").textContent = dirty ? "有未保存修改" : "已载入，尚未编辑";
    renderEditors();
    renderPreview();
    status(message);
  }
  function newShot(id) {
    return { id, durationSeconds: 3, scene: "", characters: [], props: [], framing: "中景", camera: "", action: "", notes: "" };
  }
  function filenamePart(value) {
    return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").slice(0, 60) || "project";
  }
  function saved(savedRevision, message) {
    if (revision === savedRevision) {
      dirty = false;
      byId("save-state").textContent = "当前版本已保存";
      status(message);
    } else status(message + "；页面还有保存后产生的新修改。");
  }
  function pickerError(error) {
    if (error.name === "AbortError") return status("已取消选择，工程仍保留在页面中。");
    status("保存未完成：" + error.message + "。请检查目标文件夹；本次可能留有部分文件。可复制预览文本手动保存。", true);
  }

  byId("project-title").addEventListener("input", (event) => { project.title = event.target.value; changed(); });
  byId("project-ratio").addEventListener("change", (event) => { project.aspectRatio = event.target.value; changed(); });
  byId("add-shot").addEventListener("click", () => {
    if (project.shots.length >= core.MAX_SHOTS) return;
    const ids = new Set(project.shots.map((shot) => shot.id.trim()));
    let number = 1;
    while (ids.has("S" + String(number).padStart(3, "0"))) number += 1;
    project.shots.push(newShot("S" + String(number).padStart(3, "0")));
    changed();
    renderEditors();
    cards.lastElementChild.scrollIntoView({ block: "nearest" });
    cards.lastElementChild.querySelector("input").focus();
  });
  byId("new-project").addEventListener("click", () => {
    if (mayReplace()) replaceProject({ schemaVersion: 1, title: "未命名工程", aspectRatio: "16:9", shots: [newShot("S001")] }, "新工程已建立，请填写场景和动作。", true);
  });
  byId("load-demo").addEventListener("click", () => {
    if (mayReplace()) replaceProject(core.normalizeProject(window.ShotpackDemo), "虚构示例已载入。", false);
  });
  byId("import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    const sequence = ++importSequence;
    event.target.value = "";
    if (!file) return;
    if (file.size > core.MAX_IMPORT_BYTES) return status("文件超过 2 MiB，请缩小后重新导入。", true);
    try {
      const next = core.parseProject(await file.text());
      if (sequence !== importSequence) return;
      if (mayReplace()) replaceProject(next, "已导入 " + file.name + "；原文件未被修改。", false);
    } catch (error) { if (sequence === importSequence) status("导入失败，当前工程保留。" + error.message, true); }
  });
  document.querySelectorAll("[data-file]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedFile = button.dataset.file;
      document.querySelectorAll("[data-file]").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
      if (bundle) output.value = bundle.files[selectedFile];
    });
  });
  byId("copy-output").addEventListener("click", async () => {
    if (!bundle) return;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(output.value);
      else { output.focus(); output.select(); if (!document.execCommand("copy")) throw new Error("Copy not available"); }
      status("已复制 " + selectedFile + "，可粘贴到你指定位置的文本文件。");
    } catch (error) { output.focus(); output.select(); status("浏览器未允许自动复制。请手动复制已选中的文本。", true); }
  });
  byId("save-project").addEventListener("click", async () => {
    if (!bundle) return;
    const snapshot = bundle;
    const savedRevision = revision;
    if (typeof window.showSaveFilePicker !== "function") {
      document.querySelector('[data-file="project.json"]').click();
      return status("此浏览器未提供保存选择器。已切到工程 JSON，可复制后手动保存到 F 盘。", true);
    }
    try {
      const file = await window.showSaveFilePicker({ suggestedName: filenamePart(snapshot.project.title) + ".json", types: [{ description: "镜头工程 JSON", accept: { "application/json": [".json"] } }] });
      const writer = await file.createWritable();
      try { await writer.write(snapshot.files["project.json"]); await writer.close(); }
      catch (error) { try { await writer.abort(); } catch (_) { /* Keep the original failure. */ } throw error; }
      saved(savedRevision, "工程 JSON 已保存到你选定的位置。");
    } catch (error) { pickerError(error); }
  });
  byId("export-bundle").addEventListener("click", async () => {
    if (!bundle) return;
    if (typeof window.showDirectoryPicker !== "function") return status("此浏览器未提供文件夹选择器。可逐项复制右侧文本保存，或使用本地命令行导出。", true);
    const snapshot = bundle;
    const savedRevision = revision;
    let folderName = "";
    try {
      const destination = await window.showDirectoryPicker({ mode: "readwrite" });
      const random = window.crypto.randomUUID();
      folderName = "shotpack-" + filenamePart(snapshot.project.title) + "-" + random;
      const directory = await destination.getDirectoryHandle(folderName, { create: true });
      for (const [name, content] of Object.entries(snapshot.files)) {
        const file = await directory.getFileHandle(name, { create: true });
        const writer = await file.createWritable();
        try { await writer.write(content); await writer.close(); }
        catch (error) { try { await writer.abort(); } catch (_) { /* Keep the original failure. */ } throw error; }
      }
      saved(savedRevision, "已导出 4 个文件到你选择的文件夹 / " + folderName);
    } catch (error) {
      if (folderName) status("导出未完成，请检查子文件夹 " + folderName + "。" + error.message, true);
      else pickerError(error);
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty) { event.preventDefault(); event.returnValue = ""; }
  });
  renderEditors();
  renderPreview();
})();
