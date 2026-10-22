// GENERATED FILE — do not edit. Source lives in src/client/**, rebuild with: npm run build
// version: 0.4.3
// src: 2566161969bf2109
window.__ModuleLoader__.load({
  id: 'dsh-bot-board',
  factory: (require) => {
var __bbEntry = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client/index.js
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject
  });

  // src/client/panel.js
  var import_react9 = __require("react");

  // src/client/const.js
  var POLL_MS = 1500;
  var BOARD_MS = 5e3;
  var SLOW_POLL_MS = 3e4;
  var STALL_MS = 5 * 60 * 1e3;
  var IDLE_POLL_MS = 6e3;
  var ACTIVE_TAIL_MS = 90 * 1e3;
  var ERROR_LAMP_MS = 3 * 60 * 1e3;
  var ATTENTION_ROW_H = 44;
  var ATTENTION_GAP = 3;
  var IDLE_ROW_H = 24;
  var PANEL_BORDER = 2;
  var SCENE_VB = { w: 170, h: 132 };
  var cellHeight = (width = RUNNING_CELL_W) => width * SCENE_VB.h / SCENE_VB.w + 20;
  var RUNNING_CELL_W = 138;
  var RUNNING_CELL_H = Math.ceil(cellHeight());
  var RUN_GRID_GAP = 8;
  var RUN_PAD_B = 4;
  var LAYER_STABLE_MS = 1200;
  var COLLAPSE_KEY = "dsh-bot-board:collapsed:v5";
  var POS_KEY = "dsh-bot-board:pos:v5";
  var SIZE_KEY = "dsh-bot-board:size:v5";
  var SIZE_DEFAULT = { w: 560, h: 480 };
  var SIZE_MIN = { w: 420, h: 320 };
  var SIZE_MAX = { w: 980, h: 700 };
  var LAMP = {
    busy: "#22C55E",
    alert: "#EAB308",
    waiting: "#3B82F6",
    error: "#EF4444",
    idle: "#D3D1C7",
    done: "#0F766E"
  };
  var LAMP_STROKE = "#5B5648";
  var LAMP_STROKE_W = 1.2;
  var LAMP_R = 2.9;
  var LAMP_BASE = "#FFFDF8";
  var LAMP_BASE_R = 3.8;
  var LEGEND = [
    ["busy", "legend.busy"],
    ["alert", "legend.alert"],
    ["waiting", "legend.waiting"],
    ["error", "legend.error"],
    ["idle", "legend.idle"],
    ["done", "legend.done"]
  ];
  var NAME_INK = { error: "#B91C1C", done: "#0F766E", waiting: "#1D4ED8" };
  var STATUS_KEY = {
    working: "status.working",
    thinking: "status.thinking",
    searching: "status.searching",
    sending: "status.sending",
    orbit: "status.orbit",
    alert: "status.alert",
    error: "status.error",
    waiting: "status.waiting",
    idle: "status.idle"
  };
  var statusLabel = (status, t) => t(STATUS_KEY[status] ?? "status.working");
  var ROSTER = [
    { name: "Chief", color: "#378ADD", face: "#7FB4E8", head: "crown", prop: "flag" },
    { name: "Researcher", color: "#EC4899", face: "#F5A3CD", head: "glasses", prop: "magnifier" },
    { name: "\u73ED\u4E3B\u4EFB", color: "#F59E0B", face: "#FBCB74", head: "bowRed", prop: "pointer" },
    { name: "\u6570\u5B66", color: "#8B5CF6", face: "#BCA5F8", head: "glasses", prop: "abacus" },
    { name: "\u7269\u7406", color: "#14B8A6", face: "#7FD8CE", head: "headphones", prop: "bolt" },
    { name: "\u5316\u5B66", color: "#22C55E", face: "#86E5A3", head: "hat", prop: "flask" },
    { name: "\u751F\u7269", color: "#84CC16", face: "#BDE873", head: "sprout", prop: "leaf" },
    { name: "\u8BED\u6587", color: "#EF4444", face: "#F59C9C", head: "bowCream", prop: "books" },
    { name: "\u82F1\u8BED", color: "#F97316", face: "#FBB277", head: "headphones", prop: "mic" }
  ];
  var PALETTE = [
    "#378ADD",
    "#EC4899",
    "#F59E0B",
    "#8B5CF6",
    "#14B8A6",
    "#22C55E",
    "#84CC16",
    "#EF4444",
    "#F97316",
    "#0EA5E9",
    "#A855F7",
    "#D97706"
  ];
  var HEADS = ["crown", "glasses", "bowRed", "bowCream", "hat", "sprout", "headphones", null];
  var PROPS = ["flag", "magnifier", "pointer", "abacus", "bolt", "flask", "leaf", "books", "mic", null];
  function faceOf(color) {
    const n = parseInt(color.slice(1), 16);
    const mix = (channel) => Math.round(channel + (255 - channel) * 0.42);
    const r = mix(n >> 16 & 255);
    const g = mix(n >> 8 & 255);
    const b = mix(n & 255);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
  }
  function seatOf(bot, taken) {
    const name = typeof bot?.name === "string" ? bot.name : "";
    const fixed = ROSTER.find((item) => item.name === name);
    if (fixed && !taken?.has(fixed.name)) {
      taken?.add(fixed.name);
      return fixed;
    }
    const id = String(bot?.id ?? name);
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = hash * 31 + id.charCodeAt(i) >>> 0;
    const color = PALETTE[hash % PALETTE.length];
    return {
      name,
      color,
      face: faceOf(color),
      head: HEADS[Math.floor(hash / PALETTE.length) % HEADS.length],
      prop: PROPS[Math.floor(hash / (PALETTE.length * HEADS.length)) % PROPS.length]
    };
  }

  // src/client/locale.js
  var NS = "plugin.dsh-bot-board";
  var zh = {
    "panel.title": "Bot \u770B\u677F",
    "panel.expand": "\u5C55\u5F00 Bot \u6559\u5BA4",
    "panel.collapse": "\u6536\u8D77",
    "panel.drag": "\u62D6\u52A8\u6807\u9898\u680F\u53EF\u79FB\u52A8",
    "panel.resize": "\u62D6\u52A8\u53F3\u4E0B\u89D2\u8C03\u6574\u5927\u5C0F",
    "panel.empty": "\u8FD8\u6CA1\u6709 Bot",
    "panel.loading": "\u8F7D\u5165\u4E2D\u2026",
    "panel.stale": "\u6570\u636E\u8BFB\u53D6\u5EF6\u8FDF\uFF0C\u663E\u793A\u7684\u662F\u4E0A\u4E00\u6B21\u5FEB\u7167",
    "panel.boardError": "\u672C\u5730\u6570\u636E\u8BFB\u53D6\u5931\u8D25",
    "panel.offline": "\u6CA1\u8FDE\u4E0A DS Bot",
    "panel.noState": "\u6CA1\u627E\u5230 DS Bot \u7684\u72B6\u6001\u6587\u4EF6",
    "panel.unreadable": "\u72B6\u6001\u6587\u4EF6\u8BFB\u4E0D\u4E86",
    "panel.sumHandoff": "{n} \u9879\u5728\u4EA4\u63A5",
    "legend.busy": "\u5E72\u6D3B",
    "legend.alert": "\u7B49\u4F60",
    "legend.waiting": "\u7B49\u4EA4\u6D3B",
    "legend.error": "\u5361\u4F4F",
    "legend.idle": "\u95F2\u7740",
    "legend.done": "\u5E72\u5B8C",
    "legend.help": "\u516D\u6001\u8BF4\u660E",
    "legend.hint.busy": "\u6B63\u5728\u8DD1\u4E00\u8F6E\uFF0C\u4E0D\u7528\u4F60\u7BA1",
    "legend.hint.alert": "\u7B49\u4F60\u6279\u6216\u7B49\u4F60\u7B54",
    "legend.hint.waiting": "\u5728\u7B49\u53E6\u4E00\u4E2A Bot \u4EA4\u6D3B",
    "legend.hint.error": "\u51FA\u9519\u4E86\uFF0C\u8DD1\u4E0D\u52A8",
    "legend.hint.idle": "\u95F2\u7740\uFF0C\u6CA1\u6709\u6D3B",
    "legend.hint.done": "\u521A\u4EA4\u5B8C\u6D3B\uFF087 \u79D2\u540E\u56DE\u843D\u5230\u95F2\u7740\uFF09",
    "attention.empty": "\u6CA1\u6709\u9700\u8981\u4F60\u7684\u4E8B",
    "attention.overflow": "\u8FD8\u6709 {n} \u4E2A",
    "attention.collapse": "\u6536\u8D77\u591A\u51FA\u6765\u7684",
    "layer.idle": "\u95F2\u7740",
    "ho.groupTotal": "\u5171 {n} \u9879",
    "ho.blocked": "\u88AB\u5835",
    "ho.notStarted": "\u672A\u5F00\u5DE5",
    "ho.mutual": "\u4E92\u76F8\u7B49",
    "ho.morePeople": "\u8FD8\u6709 {n} \u4EBA",
    "ho.moreItems": "\u8FD8\u6709 {n} \u9879",
    "ho.collapse": "\u6536\u8D77",
    "status.working": "\u5E72\u6D3B\u4E2D",
    "status.thinking": "\u601D\u8003\u4E2D",
    "status.searching": "\u67E5\u8D44\u6599",
    "status.sending": "\u53D1\u6D88\u606F",
    "status.orbit": "\u8F6C\u4EA4\u4E2D",
    "status.alert": "\u7B49\u4F60\u5904\u7406",
    "status.error": "\u51FA\u9519\u4E86",
    "status.waiting": "\u7B49\u4EA4\u6D3B",
    "status.idle": "\u95F2\u7740",
    "status.done": "\u5E72\u5B8C",
    "meta.approval": "\u7B49\u4F60\u6279",
    "meta.question": "\u7B49\u4F60\u7B54",
    "meta.error": "\u62A5\u9519",
    "meta.waiting": "\u7B49",
    "meta.tool": "\u8C03\u7528",
    "meta.stalled": "\u53EF\u80FD\u5361\u4F4F\u4E86",
    "meta.room": "\u7FA4",
    "meta.for": "\u66FF",
    "meta.kickoff": "\u7B49\u4F60\u9009\u6A21\u578B",
    "handoff.title": "\u6B63\u5728\u4EA4\u63A5",
    "handoff.open": "\u9879\u5F85\u4EA4",
    "drawer.role": "\u89D2\u8272",
    "drawer.model": "\u6A21\u578B",
    "drawer.elapsed": "\u5DF2\u8DD1",
    "drawer.now": "\u5F53\u524D",
    "drawer.place": "\u5728\u54EA",
    "drawer.approval": "\u7B49\u4F60\u5BA1\u6279",
    "drawer.question": "\u7B49\u4F60\u56DE\u7B54",
    "drawer.options": "\u53EF\u9009\u9879",
    "drawer.optionsMulti": "\u53EF\u9009\u9879\uFF08\u53EF\u591A\u9009\uFF09",
    "drawer.allowCustom": "\u4E5F\u53EF\u4EE5\u81EA\u5DF1\u8BF4",
    "drawer.failure": "\u6700\u8FD1\u7684\u62A5\u9519",
    "drawer.lastResult": "\u6700\u8FD1\u4E00\u6B21\u4EA4\u6D3B\u7ED3\u679C",
    "drawer.detail": "\u5177\u4F53\u5185\u5BB9",
    "drawer.openChat": "\u6253\u5F00\u804A\u5929",
    "drawer.close": "\u5173\u95ED",
    "drawer.none": "\u6682\u65E0",
    "drawer.unknown": "\u672A\u77E5",
    "drawer.noOpener": "\u6682\u65F6\u6253\u4E0D\u5F00\u4F1A\u8BDD\uFF08\u5BBF\u4E3B\u8FD8\u6CA1\u5C31\u7EEA\uFF09",
    "notice.approval": "\u7B49\u4F60\u5904\u7406",
    "notice.approvalBody": "\u60F3\u8FD0\u884C",
    "notice.approvalFallback": "\u6709\u4E2A\u5BA1\u6279\u5728\u7B49\u4F60",
    "notice.error": "\u51FA\u9519\u4E86",
    "ago.just": "\u521A\u521A",
    "ago.seconds": "{n} \u79D2\u524D",
    "ago.minutes": "{n} \u5206\u949F\u524D",
    "ago.hours": "{n} \u5C0F\u65F6\u524D",
    "ago.days": "{n} \u5929\u524D"
  };
  var en = {
    "panel.title": "Bot board",
    "panel.expand": "Open the Bot classroom",
    "panel.collapse": "Collapse",
    "panel.drag": "Drag the title bar to move",
    "panel.resize": "Drag the corner to resize",
    "panel.empty": "No Bots yet",
    "panel.loading": "Loading\u2026",
    "panel.stale": "Data is delayed \u2014 showing the last snapshot",
    "panel.boardError": "Could not read local data",
    "panel.offline": "Not connected to DS Bot",
    "panel.noState": "DS Bot has no state file yet",
    "panel.unreadable": "The state file cannot be read",
    "panel.sumHandoff": "{n} open hand-offs",
    "legend.busy": "Working",
    "legend.alert": "Needs you",
    "legend.waiting": "Waiting",
    "legend.error": "Stuck",
    "legend.idle": "Idle",
    "legend.done": "Done",
    "legend.help": "What the six states mean",
    "legend.hint.busy": "Running a turn \u2014 nothing for you",
    "legend.hint.alert": "Waiting for your approval or answer",
    "legend.hint.waiting": "Waiting for another Bot to hand back",
    "legend.hint.error": "Failed \u2014 it cannot continue",
    "legend.hint.idle": "Idle, nothing running",
    "legend.hint.done": "Just handed back (idle after 7s)",
    "attention.empty": "Nothing needs you",
    "attention.overflow": "{n} more",
    "attention.collapse": "Collapse the extras",
    "layer.idle": "Idle",
    "ho.groupTotal": "{n} open",
    "ho.blocked": "blocked",
    "ho.notStarted": "not started",
    "ho.mutual": "waiting on each other",
    "ho.morePeople": "{n} more",
    "ho.moreItems": "{n} more",
    "ho.collapse": "Show less",
    "status.working": "Working",
    "status.thinking": "Thinking",
    "status.searching": "Searching",
    "status.sending": "Sending",
    "status.orbit": "Handing off",
    "status.alert": "Needs you",
    "status.error": "Failed",
    "status.waiting": "Waiting",
    "status.idle": "Idle",
    "status.done": "Done",
    "meta.approval": "Approve",
    "meta.question": "Answer",
    "meta.error": "Failed",
    "meta.waiting": "Waiting for",
    "meta.tool": "Running",
    "meta.stalled": "Possibly stuck",
    "meta.room": "group",
    "meta.for": "for",
    "meta.kickoff": "Pick a model",
    "handoff.title": "In flight",
    "handoff.open": "open",
    "drawer.role": "Role",
    "drawer.model": "Model",
    "drawer.elapsed": "Running",
    "drawer.now": "Now",
    "drawer.place": "Where",
    "drawer.approval": "Waiting for your approval",
    "drawer.question": "Waiting for your answer",
    "drawer.options": "Options",
    "drawer.optionsMulti": "Options (pick any)",
    "drawer.allowCustom": "Or answer in your own words",
    "drawer.failure": "Last failure",
    "drawer.lastResult": "Last hand-off result",
    "drawer.detail": "Details",
    "drawer.openChat": "Open chat",
    "drawer.close": "Close",
    "drawer.none": "Nothing yet",
    "drawer.unknown": "unknown",
    "drawer.noOpener": "Chat is not available yet",
    "notice.approval": "Needs you",
    "notice.approvalBody": "Wants to run",
    "notice.approvalFallback": "An approval is waiting",
    "notice.error": "Failed",
    "ago.just": "just now",
    "ago.seconds": "{n}s ago",
    "ago.minutes": "{n}m ago",
    "ago.hours": "{n}h ago",
    "ago.days": "{n}d ago"
  };
  var DICTS = { zh, en };
  function fallbackT(locale) {
    const dict = DICTS[locale] ?? zh;
    return (key) => dict[key] ?? zh[key] ?? key;
  }
  var defaultT = fallbackT("zh");
  function installLocale(ctx) {
    const fallback = defaultT;
    try {
      if (typeof ctx?.locale?.register === "function") {
        ctx.effect?.(() => ctx.locale.register(NS, { zh, en }), "bot-board: dictionaries");
        if (typeof ctx.locale.bind === "function") {
          const bound = ctx.locale.bind(NS);
          if (typeof bound === "function") {
            return (key) => {
              try {
                const value = bound(key);
                return typeof value === "string" && value && value !== key ? value : fallback(key);
              } catch {
                return fallback(key);
              }
            };
          }
        }
      }
    } catch {
    }
    return fallback;
  }

  // src/client/format.js
  var pad = (value) => String(value).padStart(2, "0");
  function ago(ms, now = Date.now(), t = defaultT) {
    if (!Number.isFinite(ms) || !ms) return "";
    const s = Math.max(0, Math.round((now - ms) / 1e3));
    if (s < 10) return t("ago.just");
    if (s < 60) return t("ago.seconds").replace("{n}", String(s));
    if (s < 3600) return t("ago.minutes").replace("{n}", String(Math.round(s / 60)));
    if (s < 86400) return t("ago.hours").replace("{n}", String(Math.round(s / 3600)));
    return t("ago.days").replace("{n}", String(Math.round(s / 86400)));
  }
  function elapsed(ms, now = Date.now()) {
    if (!Number.isFinite(ms) || !ms) return "";
    const s = Math.max(0, Math.round((now - ms) / 1e3));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m${pad(s % 60)}s`;
    return `${Math.floor(m / 60)}h${pad(m % 60)}m`;
  }
  function clip(value, max) {
    const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
    return text.length > max ? `${text.slice(0, max)}\u2026` : text;
  }

  // src/client/scene.js
  var LIVE = /* @__PURE__ */ new Set(["working", "thinking", "searching", "sending", "orbit"]);
  function isLive(status) {
    return LIVE.has(status);
  }
  function statusOf({ activity, waiting, failed, alerting }) {
    if (alerting) return "alert";
    if (typeof activity === "string" && activity) {
      if (activity === "alert") return "alert";
      if (activity === "waiting") return "waiting";
      if (activity !== "idle") return activity;
    }
    if (waiting) return "waiting";
    if (failed) return "error";
    return "idle";
  }
  function sceneOf(status, done) {
    if (status === "alert") return "alert";
    if (status === "waiting") return "waiting";
    if (status === "error") return "error";
    if (done && status === "idle") return "done";
    if (status === "idle") return "idle";
    return "busy";
  }
  function stalledOf(since, scene, now = Date.now()) {
    return scene === "busy" && Number(since) > 0 && now - Number(since) > STALL_MS;
  }
  function badgeOf(scene, failed) {
    return Boolean(failed) && scene !== "error";
  }

  // src/client/rows.js
  var seatOrder = (bot) => {
    const index = ROSTER.findIndex((item) => item.name === bot?.name);
    return index < 0 ? 100 : index;
  };
  var PHRASE = 16;
  var RECOVERED_MS = 60 * 1e3;
  function questionOf(bot, questions) {
    const keys = [bot.sessionId, bot.id, ...bot.parts ?? []];
    for (const key of keys) {
      if (key && questions[key]) return questions[key];
    }
    return void 0;
  }
  function describe({ approval, question, failure, wait, kickoff, t, nameOf, rooms }) {
    if (approval) {
      return {
        kind: "approval",
        action: `${t("meta.approval")} ${approval.tool || ""}`.trim(),
        tool: approval.tool,
        reason: approval.reason,
        // ds-bot fills `detail.code` from command|cmd|file_path|path|url|query, so
        // it is "what this call acts on", not necessarily a shell command.
        code: approval.detail?.code ?? "",
        text: approval.detail?.text ?? ""
      };
    }
    if (question) {
      return {
        kind: "question",
        action: `${t("meta.question")} ${clip(question.question, 20)}`.trim(),
        text: question.question,
        // The one-line context ds-bot shows under the question. Without it a
        // question like "这段用哪个语气？" has no way to be answered confidently.
        hint: question.detail ?? "",
        options: Array.isArray(question.options) ? question.options : [],
        // Both change what the numbered list means: several picks are allowed, and
        // there is a free-text field the card cannot show.
        multiSelect: question.multiSelect === true,
        allowCustom: question.allowCustom === true
      };
    }
    if (failure) {
      return {
        kind: "error",
        action: `${t("meta.error")} ${clip(failure.message, 22)}`.trim(),
        message: failure.message
      };
    }
    if (wait) {
      const names = [
        ...(wait.bots ?? []).map(nameOf),
        ...(wait.rooms ?? []).map((id) => rooms[id] ? `${t("meta.room")} ${rooms[id]}` : id)
      ];
      const patrons = (wait.for ?? []).map(nameOf).filter((name) => name && !names.includes(name));
      const parts = [];
      if (names.length) parts.push(`${t("meta.waiting")} ${names.join("\u3001")}`);
      if (patrons.length) parts.push(`${t("meta.for")} ${patrons.join("\u3001")}`);
      return {
        kind: "waiting",
        action: parts.length ? parts.join(" \xB7 ") : t("meta.waiting"),
        names,
        patrons
      };
    }
    if (kickoff) {
      return { kind: "kickoff", action: t("meta.kickoff") };
    }
    return { kind: null, action: "" };
  }
  function buildRows({
    bots = [],
    activity = {},
    workBots = {},
    waiting = {},
    approvals = [],
    questions = {},
    errors = [],
    works = [],
    rooms = {},
    waveMap = {},
    noteMap = {},
    t,
    nameOf,
    now = Date.now()
  }) {
    const approvalsList = Array.isArray(approvals) ? approvals : [];
    const errorList = Array.isArray(errors) ? errors : [];
    const failureOf = (bot) => errorList.filter((item) => item.botId === bot.id).sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
    const takenSeats = /* @__PURE__ */ new Set();
    return bots.map((bot) => {
      const approval = approvalsList.find((item) => item?.botId === bot.id);
      const approvalAt = Number(approval?.at) || 0;
      const seat = seatOf(bot, takenSeats);
      const question = questionOf(bot, questions);
      const wait = waiting[bot.id];
      const work = workBots[bot.id];
      const since = Number(work?.since) || 0;
      const kickoff = bot.waiting === true;
      const recorded = failureOf(bot);
      const isWorking = isLive(activity[bot.id]);
      const recovered = recorded && (since > 0 && recorded.at < since || isWorking && now - recorded.at > RECOVERED_MS);
      const failure = recovered ? null : recorded;
      const quietLong = Boolean(failure) && !isWorking && now - failure.at > ERROR_LAMP_MS;
      const status = statusOf({
        activity: activity[bot.id],
        waiting: Boolean(wait),
        failed: Boolean(failure) && !quietLong,
        alerting: Boolean(approval || question || kickoff)
      });
      const scene = sceneOf(status, Boolean(waveMap[bot.id]));
      const detail = describe({ approval, question, failure, wait, kickoff, t, nameOf, rooms });
      const live = work?.tool ? `${t("meta.tool")} ${work.tool}` : clip(work?.said || work?.note || work?.target || "", PHRASE);
      const action = detail.kind === "approval" || detail.kind === "question" ? detail.action : scene === "error" || scene === "waiting" ? detail.action : live || detail.action;
      const handed = works.find((item) => item.toId === bot.id);
      const own = (handed?.results ?? []).filter((item) => item?.name && item.name === bot.name).at(-1);
      const roomId = work?.roomId;
      return {
        bot,
        status,
        scene,
        action,
        since,
        stalled: stalledOf(since, scene, now),
        badge: badgeOf(scene, Boolean(failure)),
        failure: failure?.message ?? "",
        // When the failure was recorded. The 「需要你」 list sorts by `since ||
        // failureAt` — a Bot that broke without ever starting a turn has no
        // `since`, and its own timestamp is the honest "how long has it been
        // broken". Not used for ordering rows (that stays roster order).
        failureAt: failure?.at ?? 0,
        // 「需要你」 has to answer "how long has this been waiting". `since` is when
        // the turn started, not when the approval arrived, so a request that landed
        // three seconds ago on a twelve-minute turn read as 12m34s — and with no
        // turn running the key was 0 for everyone, which collapsed the "longest
        // wait first" rule into roster order (v0.4.2 audit, finding #3).
        approvalAt,
        waitSince: approvalAt || since || (failure?.at ?? 0),
        seat,
        detail,
        work: work ?? null,
        // A turn running in a group, not in the Bot's own chat. Worth saying: the
        // Bot appears to be talking to nobody in particular otherwise.
        place: roomId ? rooms[roomId] ? `${t("meta.room")} ${rooms[roomId]}` : t("meta.room") : "",
        lastResult: own?.text ?? handed?.last ?? null,
        note: Boolean(noteMap[bot.id])
      };
    }).sort((a, b) => seatOrder(a.bot) - seatOrder(b.bot) || String(a.bot.id).localeCompare(String(b.bot.id)));
  }

  // src/client/station.js
  var import_react3 = __require("react");

  // src/client/elapsed.js
  var import_react2 = __require("react");

  // src/client/clock.js
  var import_react = __require("react");
  var listeners = /* @__PURE__ */ new Set();
  var timer = 0;
  function start() {
    if (timer) return;
    timer = setInterval(() => {
      for (const fn of listeners) fn();
    }, 1e3);
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
  }
  function useNow(active) {
    const [, force] = (0, import_react.useState)(0);
    (0, import_react.useEffect)(() => {
      if (!active) return void 0;
      const tick = () => force((n) => (n + 1) % 1e6);
      listeners.add(tick);
      start();
      return () => {
        listeners.delete(tick);
        if (listeners.size === 0) stop();
      };
    }, [active]);
  }

  // src/client/elapsed.js
  function Elapsed({ since, className }) {
    useNow(Boolean(since));
    if (!since) return null;
    return (0, import_react2.createElement)("span", { className }, elapsed(since));
  }

  // src/client/station.js
  var DARK = "#2C2C2A";
  var FACE_X = 86;
  var FACE_Y = 62;
  var BODY_R = 26;
  function headGear(kind) {
    const cx = FACE_X;
    const top = FACE_Y - BODY_R;
    if (kind === "crown") {
      return (0, import_react3.createElement)("path", {
        d: `M ${cx - 13} ${top + 2} L ${cx - 9} ${top - 8} L ${cx - 4} ${top - 1} L ${cx} ${top - 10} L ${cx + 4} ${top - 1} L ${cx + 9} ${top - 8} L ${cx + 13} ${top + 2} Z`,
        fill: "#FBBF24",
        stroke: "#D97706",
        strokeWidth: 1.5,
        strokeLinejoin: "round"
      });
    }
    if (kind === "bowRed" || kind === "bowCream") {
      const fill = kind === "bowRed" ? "#DC2626" : "#FDE68A";
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("path", { d: `M ${cx + 14} ${top + 4} l -9 -6 v 12 z`, fill }),
        (0, import_react3.createElement)("path", { d: `M ${cx + 14} ${top + 4} l 9 -6 v 12 z`, fill }),
        (0, import_react3.createElement)("circle", { cx: cx + 14, cy: top + 4, r: 3, fill })
      );
    }
    if (kind === "hat") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("path", { d: `M ${cx - 15} ${top + 1} a 15 13 0 0 1 30 0 z`, fill: "#15803D" }),
        (0, import_react3.createElement)("rect", { x: cx - 19, y: top, width: 38, height: 5, rx: 2.5, fill: "#166534" })
      );
    }
    if (kind === "sprout") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("line", { x1: cx, y1: top + 2, x2: cx, y2: top - 8, stroke: "#15803D", strokeWidth: 2, strokeLinecap: "round" }),
        (0, import_react3.createElement)("ellipse", { cx: cx - 6, cy: top - 10, rx: 6, ry: 3.5, fill: "#16A34A", transform: `rotate(-24 ${cx - 6} ${top - 10})` }),
        (0, import_react3.createElement)("ellipse", { cx: cx + 6, cy: top - 10, rx: 6, ry: 3.5, fill: "#22C55E", transform: `rotate(24 ${cx + 6} ${top - 10})` })
      );
    }
    return null;
  }
  function faceGear(kind) {
    if (kind === "glasses") {
      return (0, import_react3.createElement)(
        "g",
        { fill: "none", stroke: DARK, strokeWidth: 2 },
        (0, import_react3.createElement)("circle", { cx: FACE_X - 9, cy: FACE_Y - 4, r: 6.5 }),
        (0, import_react3.createElement)("circle", { cx: FACE_X + 9, cy: FACE_Y - 4, r: 6.5 }),
        (0, import_react3.createElement)("line", { x1: FACE_X - 2.5, y1: FACE_Y - 4, x2: FACE_X + 2.5, y2: FACE_Y - 4 })
      );
    }
    if (kind === "headphones") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("path", {
          d: `M ${FACE_X - 20} ${FACE_Y - 2} a 20 20 0 0 1 40 0`,
          fill: "none",
          stroke: DARK,
          strokeWidth: 4,
          strokeLinecap: "round"
        }),
        (0, import_react3.createElement)("rect", { x: FACE_X - 23, y: FACE_Y - 5, width: 8, height: 13, rx: 4, fill: DARK }),
        (0, import_react3.createElement)("rect", { x: FACE_X + 15, y: FACE_Y - 5, width: 8, height: 13, rx: 4, fill: DARK })
      );
    }
    return null;
  }
  function deskProp(kind) {
    if (kind === "flag") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("line", { x1: 60, y1: 70, x2: 60, y2: 88, stroke: "#A16207", strokeWidth: 2.5, strokeLinecap: "round" }),
        (0, import_react3.createElement)("path", { d: "M 60 70 h 16 l -4 5 4 5 h -16 z", fill: "#378ADD" })
      );
    }
    if (kind === "magnifier") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("circle", { cx: 63, cy: 80, r: 6, fill: "none", stroke: DARK, strokeWidth: 2 }),
        (0, import_react3.createElement)("line", { x1: 67.5, y1: 84.5, x2: 73, y2: 89, stroke: DARK, strokeWidth: 3, strokeLinecap: "round" })
      );
    }
    if (kind === "pointer") {
      return (0, import_react3.createElement)("line", { x1: 56, y1: 88, x2: 76, y2: 71, stroke: "#A16207", strokeWidth: 2.5, strokeLinecap: "round" });
    }
    if (kind === "abacus") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 54, y: 75, width: 22, height: 13, rx: 2, fill: "#F1E3C6", stroke: "#A16207", strokeWidth: 1.5 }),
        (0, import_react3.createElement)("circle", { cx: 59, cy: 81.5, r: 2, fill: "#B45309" }),
        (0, import_react3.createElement)("circle", { cx: 65, cy: 81.5, r: 2, fill: "#B45309" }),
        (0, import_react3.createElement)("circle", { cx: 71, cy: 81.5, r: 2, fill: "#B45309" })
      );
    }
    if (kind === "bolt") {
      return (0, import_react3.createElement)("path", { d: "M 66 71 l -8 12 h 6 l -3 8 9 -12 h -6 z", fill: "#FBBF24", stroke: "#D97706", strokeWidth: 1, strokeLinejoin: "round" });
    }
    if (kind === "flask") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("path", { d: "M 60 71 v 6 l -7 11 h 16 l -7 -11 v -6 z", fill: "#BBF7D0", stroke: "#166534", strokeWidth: 1.5, strokeLinejoin: "round" }),
        (0, import_react3.createElement)("rect", { x: 58, y: 70, width: 6, height: 2.5, rx: 1, fill: "#166534" })
      );
    }
    if (kind === "leaf") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("ellipse", { cx: 63, cy: 83, rx: 8, ry: 4.5, fill: "#22C55E", transform: "rotate(-18 63 83)" }),
        (0, import_react3.createElement)("line", { x1: 57, y1: 86, x2: 69, y2: 80, stroke: "#15803D", strokeWidth: 1.2 })
      );
    }
    if (kind === "books") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 54, y: 83, width: 24, height: 5, rx: 1, fill: "#EF4444" }),
        (0, import_react3.createElement)("rect", { x: 56, y: 78, width: 22, height: 5, rx: 1, fill: "#3B82F6" }),
        (0, import_react3.createElement)("rect", { x: 55, y: 73, width: 21, height: 5, rx: 1, fill: "#FBBF24" })
      );
    }
    if (kind === "mic") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 59, y: 72, width: 9, height: 13, rx: 4.5, fill: DARK }),
        (0, import_react3.createElement)("line", { x1: 63.5, y1: 85, x2: 63.5, y2: 88, stroke: DARK, strokeWidth: 2 })
      );
    }
    return null;
  }
  function lampShape(scene) {
    const fill = LAMP[scene] ?? LAMP.idle;
    const common = { fill, stroke: LAMP_STROKE, strokeWidth: LAMP_STROKE_W };
    const base = (0, import_react3.createElement)("circle", { cx: 151, cy: 85, r: LAMP_BASE_R, fill: LAMP_BASE });
    if (scene === "error") {
      return (0, import_react3.createElement)(
        "g",
        null,
        base,
        (0, import_react3.createElement)("rect", { x: 148.4, y: 82.4, width: 5.2, height: 5.2, transform: "rotate(45 151 85)", ...common })
      );
    }
    if (scene === "alert") {
      return (0, import_react3.createElement)(
        "g",
        null,
        base,
        (0, import_react3.createElement)("rect", { x: 148.4, y: 82.4, width: 5.2, height: 5.2, rx: 1, ...common })
      );
    }
    return (0, import_react3.createElement)(
      "g",
      null,
      base,
      (0, import_react3.createElement)("circle", { cx: 151, cy: 85, r: LAMP_R, ...common })
    );
  }
  var LAMP_SHAPE = {
    circle: { tag: "circle", props: { cx: 6, cy: 6, r: 4.5 } },
    square: { tag: "rect", props: { x: 1.7, y: 1.7, width: 8.6, height: 8.6, rx: 1.3 } },
    // 7.2 × 1.414 + 1.5 = 11.68 units of diagonal, so the diamond stays inside 12.
    diamond: {
      tag: "rect",
      props: { x: 2.4, y: 2.4, width: 7.2, height: 7.2, rx: 0.8, transform: "rotate(45 6 6)" }
    }
  };
  function Lamp({ scene, size = 12 }) {
    const kind = scene === "error" ? "diamond" : scene === "alert" ? "square" : "circle";
    const shape = LAMP_SHAPE[kind];
    return (0, import_react3.createElement)("svg", {
      className: "bb-lamp",
      width: size,
      height: size,
      viewBox: "0 0 12 12",
      // Decorative: every call site prints the state as a word next to it, and a
      // second announcement of the same fact is noise in a screen reader.
      "aria-hidden": "true",
      focusable: "false"
    }, (0, import_react3.createElement)(shape.tag, {
      ...shape.props,
      fill: LAMP[scene] ?? LAMP.idle,
      stroke: "#5B5648",
      strokeWidth: 1.5
    }));
  }
  function screenContent(scene) {
    if (scene === "error") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: "#E7E5E1" }),
        (0, import_react3.createElement)("rect", { x: 113, y: 67, width: 34, height: 4, rx: 2, fill: "#EF4444" })
      );
    }
    if (scene === "idle") {
      return (0, import_react3.createElement)("rect", { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: "#EDEBE7" });
    }
    if (scene === "done") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: "#CDEFD9" }),
        (0, import_react3.createElement)("path", {
          d: "M 120 69 l 5 5 9 -11",
          fill: "none",
          stroke: "#0F766E",
          strokeWidth: 3,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    if (scene === "alert") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: "#FDF0C8" }),
        (0, import_react3.createElement)("path", { d: "M 130 61 v 9", stroke: "#B45309", strokeWidth: 2.6, strokeLinecap: "round" }),
        (0, import_react3.createElement)("circle", { cx: 130, cy: 75, r: 1.8, fill: "#B45309" })
      );
    }
    if (scene === "waiting") {
      return (0, import_react3.createElement)(
        "g",
        null,
        (0, import_react3.createElement)("rect", { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: "#D6E4F8" }),
        (0, import_react3.createElement)("path", { d: "M 118 69 h 16 m -5 -5 l 5 5 l -5 5", fill: "none", stroke: "#1D4ED8", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }
    return (0, import_react3.createElement)(
      "g",
      null,
      (0, import_react3.createElement)("rect", { x: 108, y: 56, width: 44, height: 26, rx: 2, fill: "#B9D8F2" }),
      (0, import_react3.createElement)("rect", { x: 113, y: 61, width: 30, height: 3, rx: 1.5, fill: "#7FB4E8" }),
      (0, import_react3.createElement)("rect", { x: 113, y: 67, width: 34, height: 3, rx: 1.5, fill: "#7FB4E8" }),
      (0, import_react3.createElement)("rect", { x: 113, y: 73, width: 22, height: 3, rx: 1.5, fill: "#7FB4E8" })
    );
  }
  function blobSeat(scene, seat) {
    const cx = FACE_X;
    const cy = FACE_Y + 2;
    const moon = scene === "done";
    const squint = scene === "error";
    const oMouth = scene === "alert" || scene === "waiting";
    const eyes = squint ? (0, import_react3.createElement)(
      "g",
      null,
      (0, import_react3.createElement)("rect", { x: FACE_X - 12, y: FACE_Y - 5.5, width: 6, height: 2.5, rx: 1.25, fill: DARK }),
      (0, import_react3.createElement)("rect", { x: FACE_X + 6, y: FACE_Y - 5.5, width: 6, height: 2.5, rx: 1.25, fill: DARK })
    ) : moon ? (0, import_react3.createElement)(
      "g",
      { fill: "none", stroke: DARK, strokeWidth: 2.5, strokeLinecap: "round" },
      (0, import_react3.createElement)("path", { d: `M ${FACE_X - 13} ${FACE_Y - 1} q 4 -6 8 0` }),
      (0, import_react3.createElement)("path", { d: `M ${FACE_X + 5} ${FACE_Y - 1} q 4 -6 8 0` })
    ) : (0, import_react3.createElement)(
      "g",
      {
        className: scene === "busy" ? "bb-eyes" : scene === "idle" ? "bb-eyes bb-eyes-slow" : void 0,
        fill: DARK
      },
      (0, import_react3.createElement)("rect", { x: FACE_X - 11.5, y: FACE_Y - 8.5, width: 5, height: 9, rx: 2.5 }),
      (0, import_react3.createElement)("rect", { x: FACE_X + 6.5, y: FACE_Y - 8.5, width: 5, height: 9, rx: 2.5 })
    );
    const mouth = oMouth ? (0, import_react3.createElement)("circle", { cx: FACE_X, cy: FACE_Y + 9, r: 3, fill: DARK }) : squint ? (0, import_react3.createElement)("path", {
      d: `M ${FACE_X - 4} ${FACE_Y + 10} q 4 -3 8 0`,
      fill: "none",
      stroke: DARK,
      strokeWidth: 2,
      strokeLinecap: "round"
    }) : (0, import_react3.createElement)("path", {
      d: `M ${FACE_X - 4} ${FACE_Y + 6} q 4 5 8 0`,
      fill: "none",
      stroke: DARK,
      strokeWidth: 2,
      strokeLinecap: "round"
    });
    const wavingNow = scene === "done" || scene === "alert";
    const handL = (0, import_react3.createElement)("circle", {
      cx: cx - 23,
      cy: cy + 16,
      r: 4,
      fill: seat.color,
      className: scene === "busy" ? "bb-hand bb-tap" : "bb-hand"
    });
    const handR = (0, import_react3.createElement)("circle", {
      cx: cx + 23,
      cy: cy + 16,
      r: 4,
      fill: seat.color,
      className: wavingNow ? "bb-hand bb-wave" : scene === "busy" ? "bb-hand bb-tap" : "bb-hand"
    });
    return (0, import_react3.createElement)(
      "g",
      { className: "bb-blob" },
      (0, import_react3.createElement)("circle", { cx, cy, r: BODY_R, fill: seat.color }),
      (0, import_react3.createElement)("circle", { cx: FACE_X, cy: FACE_Y, r: 18, fill: seat.face }),
      (0, import_react3.createElement)("ellipse", { cx: FACE_X - 14, cy: FACE_Y + 7, rx: 4.5, ry: 2.8, fill: seat.color, opacity: 0.3 }),
      (0, import_react3.createElement)("ellipse", { cx: FACE_X + 14, cy: FACE_Y + 7, rx: 4.5, ry: 2.8, fill: seat.color, opacity: 0.3 }),
      eyes,
      mouth,
      handL,
      handR,
      faceGear(seat.head),
      headGear(seat.head)
    );
  }
  function StationView({ row, onOpen, note, t, compact = false }) {
    const { bot, status, scene, action, since, stalled, badge } = row;
    const seat = row.seat ?? seatOf(bot);
    const label = scene === "done" ? t("status.done") : statusLabel(status, t);
    const title = `${bot.name} \xB7 ${label}${action ? ` \xB7 ${action}` : ""}${stalled ? ` \xB7 ${t("meta.stalled")}` : ""}`;
    return (0, import_react3.createElement)(
      "div",
      {
        className: "bb-station",
        role: "button",
        tabIndex: 0,
        title,
        "data-scene": scene,
        onClick: () => onOpen(row),
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(row);
          }
        }
      },
      (0, import_react3.createElement)(
        "svg",
        { className: "bb-scene", viewBox: `0 0 ${SCENE_VB.w} ${SCENE_VB.h}`, "aria-hidden": "true" },
        (0, import_react3.createElement)("ellipse", { cx: 88, cy: 122, rx: 42, ry: 5, fill: "rgba(0,0,0,.06)" }),
        (0, import_react3.createElement)(
          "g",
          { fill: "#D9D4CB" },
          (0, import_react3.createElement)("rect", { x: 22, y: 62, width: 11, height: 40, rx: 5 }),
          (0, import_react3.createElement)("rect", { x: 22, y: 96, width: 38, height: 10, rx: 4 }),
          (0, import_react3.createElement)("rect", { x: 36, y: 104, width: 7, height: 14, rx: 2 })
        ),
        blobSeat(scene, seat),
        (0, import_react3.createElement)(
          "g",
          null,
          (0, import_react3.createElement)("rect", { x: 50, y: 88, width: 104, height: 10, rx: 3, fill: "#E8D9C0" }),
          (0, import_react3.createElement)("rect", { x: 58, y: 98, width: 9, height: 22, rx: 2, fill: "#CBB89A" }),
          (0, import_react3.createElement)("rect", { x: 137, y: 98, width: 9, height: 22, rx: 2, fill: "#CBB89A" })
        ),
        (0, import_react3.createElement)(
          "g",
          null,
          (0, import_react3.createElement)("rect", { x: 104, y: 52, width: 52, height: 34, rx: 4, fill: "#3A3F45" }),
          (0, import_react3.createElement)("rect", { x: 126, y: 86, width: 8, height: 3, fill: "#3A3F45" }),
          screenContent(scene)
        ),
        lampShape(scene),
        deskProp(seat.prop)
      ),
      badge ? (0, import_react3.createElement)("span", { className: "bb-badge", title: row.failure ?? "" }, "!") : null,
      (0, import_react3.createElement)(
        "div",
        {
          className: "bb-station-name",
          style: NAME_INK[scene] ? { color: NAME_INK[scene] } : void 0
        },
        compact ? [
          (0, import_react3.createElement)("span", { className: "bb-station-nm", key: "nm" }, bot.name),
          (0, import_react3.createElement)(Elapsed, {
            key: "time",
            since,
            className: stalled ? "bb-station-time bb-stalled" : "bb-station-time"
          })
        ] : bot.name
      ),
      compact ? null : (0, import_react3.createElement)(
        "div",
        { className: "bb-meta" },
        action ? (0, import_react3.createElement)("span", { className: "bb-meta-act", title: action }, action) : null,
        (0, import_react3.createElement)(Elapsed, { since, className: stalled ? "bb-meta-time bb-stalled" : "bb-meta-time" })
      ),
      note ? (0, import_react3.createElement)("span", { className: "bb-note" }) : null
    );
  }
  var Station = (0, import_react3.memo)(StationView, (prev, next) => {
    const a = prev.row;
    const b = next.row;
    return a.bot.id === b.bot.id && a.bot.name === b.bot.name && a.status === b.status && a.scene === b.scene && a.action === b.action && a.since === b.since && a.stalled === b.stalled && a.badge === b.badge && a.failure === b.failure && prev.note === next.note && prev.t === next.t && prev.compact === next.compact && prev.onOpen === next.onOpen;
  });

  // src/client/drawer.js
  var import_react4 = __require("react");
  function Row({ label, children }) {
    return (0, import_react4.createElement)(
      "div",
      { className: "bb-kv" },
      (0, import_react4.createElement)("span", { className: "bb-k" }, label),
      (0, import_react4.createElement)("span", { className: "bb-v" }, children)
    );
  }
  function Drawer({ row, t, onClose, onOpenChat, canOpenChat = true }) {
    if (!row) return null;
    const { bot, status, scene, detail, work, lastResult, since, action, place } = row;
    const label = scene === "done" ? t("status.done") : statusLabel(status, t);
    const approval = detail.kind === "approval" ? detail : null;
    const question = detail.kind === "question" ? detail : null;
    const failure = detail.kind === "error" ? detail : null;
    const hasBody = Boolean(approval || question || failure || lastResult);
    return (0, import_react4.createElement)(
      "div",
      {
        className: "bb-drawer",
        role: "dialog",
        // Modal for assistive tech: the workstations underneath are still in the DOM
        // and must not be announced while the drawer is up. Focus handling (move in,
        // trap Tab, Escape to close) lives in panel.js, next to the drawer state.
        "aria-modal": "true",
        "aria-label": bot.name
      },
      (0, import_react4.createElement)(
        "div",
        { className: "bb-drawer-head" },
        // The same lamp as the floor and the legend, at 14. It used to be an 8px
        // flat colour dot, which carried no shape — so the drawer named a state the
        // reader could not match against anything they had learned to recognise.
        (0, import_react4.createElement)("span", { className: "bb-drawer-lamp" }, (0, import_react4.createElement)(Lamp, { scene, size: 14 })),
        (0, import_react4.createElement)("span", {
          className: "bb-drawer-title",
          style: NAME_INK[scene] ? { color: NAME_INK[scene] } : void 0
        }, bot.name),
        (0, import_react4.createElement)("span", { className: "bb-drawer-sub" }, label),
        (0, import_react4.createElement)("span", { className: "bb-grow" }),
        (0, import_react4.createElement)("button", { className: "bb-icon", type: "button", onClick: onClose, title: t("drawer.close") }, "\xD7")
      ),
      (0, import_react4.createElement)(
        "div",
        { className: "bb-drawer-body" },
        bot.role ? (0, import_react4.createElement)(Row, { label: t("drawer.role") }, bot.role) : null,
        bot.model ? (0, import_react4.createElement)(Row, { label: t("drawer.model") }, bot.model) : null,
        (0, import_react4.createElement)(Row, { label: t("drawer.elapsed") }, since ? (0, import_react4.createElement)(Elapsed, { since }) : t("drawer.unknown")),
        action ? (0, import_react4.createElement)(Row, { label: t("drawer.now") }, action) : null,
        place ? (0, import_react4.createElement)(Row, { label: t("drawer.place") }, place) : null,
        approval ? (0, import_react4.createElement)(
          "div",
          { className: "bb-block" },
          (0, import_react4.createElement)("div", { className: "bb-block-t" }, t("drawer.approval")),
          approval.reason ? (0, import_react4.createElement)("div", { className: "bb-text" }, approval.reason) : null,
          approval.code ? (0, import_react4.createElement)(
            "div",
            null,
            (0, import_react4.createElement)("div", { className: "bb-block-t", style: { marginTop: 4 } }, t("drawer.detail")),
            (0, import_react4.createElement)("pre", { className: "bb-code" }, approval.code)
          ) : approval.text ? (0, import_react4.createElement)("pre", { className: "bb-code" }, approval.text) : null
        ) : null,
        question ? (0, import_react4.createElement)(
          "div",
          { className: "bb-block" },
          (0, import_react4.createElement)("div", { className: "bb-block-t" }, t("drawer.question")),
          question.text ? (0, import_react4.createElement)("div", { className: "bb-text" }, question.text) : null,
          question.hint ? (0, import_react4.createElement)("div", { className: "bb-text bb-dim" }, question.hint) : null,
          (question.options ?? []).length ? (0, import_react4.createElement)(
            "div",
            { style: { marginTop: 6 } },
            (0, import_react4.createElement)(
              "div",
              { className: "bb-block-t" },
              question.multiSelect ? t("drawer.optionsMulti") : t("drawer.options")
            ),
            // Numbering reads as "pick one". A multi-select question gets empty
            // boxes instead, so the shape of the answer matches the question.
            question.options.map((option, index) => (0, import_react4.createElement)(
              "div",
              { className: "bb-opt", key: `${index}-${option?.label ?? ""}` },
              (0, import_react4.createElement)("b", null, question.multiSelect ? `\u2610 ${option?.label ?? ""}` : `${index + 1}. ${option?.label ?? ""}`),
              option?.description ? (0, import_react4.createElement)("span", null, option.description) : null
            )),
            question.allowCustom ? (0, import_react4.createElement)("div", { className: "bb-opt bb-dim" }, t("drawer.allowCustom")) : null
          ) : null
        ) : null,
        failure ? (0, import_react4.createElement)(
          "div",
          { className: "bb-block" },
          (0, import_react4.createElement)("div", { className: "bb-block-t" }, t("drawer.failure")),
          (0, import_react4.createElement)("div", { className: "bb-text" }, failure.message || t("drawer.none"))
        ) : null,
        lastResult ? (0, import_react4.createElement)(
          "div",
          { className: "bb-block" },
          (0, import_react4.createElement)("div", { className: "bb-block-t" }, t("drawer.lastResult")),
          (0, import_react4.createElement)("div", { className: "bb-text" }, lastResult)
        ) : null,
        !hasBody && !work?.target ? (0, import_react4.createElement)("div", { className: "bb-block" }, (0, import_react4.createElement)("div", { className: "bb-text bb-dim" }, t("drawer.none"))) : null
      ),
      (0, import_react4.createElement)(
        "div",
        { className: "bb-drawer-foot" },
        (0, import_react4.createElement)("button", {
          className: "bb-btn",
          type: "button",
          disabled: !canOpenChat,
          title: canOpenChat ? "" : t("drawer.noOpener"),
          onClick: () => onOpenChat(row)
        }, `${t("drawer.openChat")} \u2197`),
        (0, import_react4.createElement)("button", { className: "bb-btn bb-btn-ghost", type: "button", onClick: onClose }, t("drawer.close"))
      )
    );
  }

  // src/client/legend.js
  var import_react5 = __require("react");
  function LegendSheet({ t, onClose }) {
    return (0, import_react5.createElement)(
      "div",
      {
        className: "bb-drawer",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("legend.help")
      },
      (0, import_react5.createElement)(
        "div",
        { className: "bb-drawer-head" },
        (0, import_react5.createElement)("span", { className: "bb-drawer-title" }, t("legend.help")),
        (0, import_react5.createElement)("span", { className: "bb-grow" }),
        (0, import_react5.createElement)("button", {
          className: "bb-icon",
          type: "button",
          onClick: onClose,
          title: t("drawer.close")
        }, "\xD7")
      ),
      (0, import_react5.createElement)(
        "div",
        { className: "bb-drawer-body" },
        LEGEND.map(([key, labelKey]) => (0, import_react5.createElement)(
          "div",
          { className: "bb-lg-row", key },
          (0, import_react5.createElement)("span", { className: "bb-lg-lamp" }, (0, import_react5.createElement)(Lamp, { scene: key, size: 16 })),
          (0, import_react5.createElement)("span", { className: "bb-lg-name" }, t(labelKey)),
          (0, import_react5.createElement)("span", { className: "bb-lg-hint" }, t(`legend.hint.${key}`))
        ))
      )
    );
  }

  // src/client/attention.js
  var import_react6 = __require("react");

  // src/client/layers.js
  var LAYER_ATTENTION = "attention";
  var LAYER_RUNNING = "running";
  var LAYER_IDLE = "idle";
  function layerOf(row) {
    const scene = row?.scene;
    if (scene === "alert" || scene === "error") return LAYER_ATTENTION;
    if (scene === "busy" || scene === "waiting" || scene === "done") return LAYER_RUNNING;
    return LAYER_IDLE;
  }
  var ATTENTION_MAX = 3;
  var waitKey = (row) => Number(row?.approvalAt) || Number(row?.since) || Number(row?.failureAt) || 0;
  var groupRank = (row) => row?.scene === "alert" ? 0 : 1;
  function attentionOf(rows, max = ATTENTION_MAX) {
    const hot = (rows ?? []).filter((row) => row.scene === "alert" || row.scene === "error");
    const limit = max === Number.POSITIVE_INFINITY ? max : Number.isFinite(max) ? Math.max(0, Math.floor(max)) : ATTENTION_MAX;
    const sorted = [...hot].sort((a, b) => {
      const rank = groupRank(a) - groupRank(b);
      return rank !== 0 ? rank : waitKey(a) - waitKey(b);
    });
    const items = sorted.slice(0, limit);
    if (items.length >= 2 && !items.some((row) => row.scene === "error")) {
      const oldestError = sorted.find((row) => row.scene === "error");
      if (oldestError) items[items.length - 1] = oldestError;
    }
    return { items, overflow: Math.max(0, sorted.length - items.length) };
  }
  function topologyOf(works) {
    const open = (works ?? []).filter((work) => Number(work?.open) > 0);
    if (!open.length) return [];
    const idOf = (work) => String(work.fromId ?? work.from ?? "");
    const toOf = (work) => String(work.toId ?? work.to ?? "");
    const keyOf = (from, to) => `${from}\0${to}`;
    const byPair = /* @__PURE__ */ new Map();
    for (const work of open) byPair.set(keyOf(idOf(work), toOf(work)), work);
    const groups = /* @__PURE__ */ new Map();
    for (const work of open) {
      const fromId = idOf(work);
      const toId = toOf(work);
      const reverse = byPair.get(keyOf(toId, fromId));
      const mutual = fromId !== toId && Boolean(reverse) && reverse !== work;
      const edge = {
        id: work.id ?? keyOf(fromId, toId),
        fromId,
        toId,
        from: work.from || fromId,
        to: work.to || toId,
        open: Number(work.open) || 0,
        at: Number(work.at) || 0,
        last: work.last ?? null,
        mutual,
        pair: mutual ? [fromId, toId].sort().join("\0") : null
      };
      if (!groups.has(fromId)) {
        groups.set(fromId, { fromId, from: edge.from, total: 0, edges: [] });
      }
      const group = groups.get(fromId);
      group.edges.push(edge);
      group.total += edge.open;
    }
    for (const group of groups.values()) {
      group.edges.sort((a, b) => b.open - a.open || a.at - b.at);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total || a.fromId.localeCompare(b.fromId));
  }
  var IDLE_SLOP = 18;
  var IDLE_USABLE = SIZE_MIN.w - PANEL_BORDER - 20;
  var IDLE_BUDGET = IDLE_USABLE - IDLE_SLOP;
  var IDLE_GAP = 6;
  var IDLE_PREFIX = 28;
  var NAME_PAD = 4;
  var BADGE_W = 14;
  var CHIP_W = 18;
  var CJK = /[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]|[\u{1f300}-\u{1faff}]|[\u{20000}-\u{2fa1f}]/u;
  var nameWidth = (name) => {
    let width = 0;
    for (const char of String(name ?? "")) width += CJK.test(char) ? 11 : 6.2;
    return width;
  };
  var itemWidth = (row) => nameWidth(row?.bot?.name) + (row?.badge ? BADGE_W : 0) + NAME_PAD;
  function idleLine(rows, budget = IDLE_BUDGET) {
    const kept = [...rows ?? []];
    let overflow = 0;
    const total = (items, withChip) => {
      if (!items.length) return 0;
      const names = items.reduce((sum, row) => sum + itemWidth(row), 0);
      const gaps = IDLE_GAP * (items.length - 1);
      return IDLE_PREFIX + names + gaps + (withChip ? IDLE_GAP + CHIP_W : 0);
    };
    const dropOne = () => {
      let index = -1;
      for (let i = kept.length - 1; i >= 0; i -= 1) {
        if (!kept[i].badge) {
          index = i;
          break;
        }
      }
      if (index < 0) index = kept.length - 1;
      kept.splice(index, 1);
      overflow += 1;
    };
    while (kept.length && total(kept, false) > budget) dropOne();
    while (kept.length && overflow > 0 && total(kept, true) > budget) dropOne();
    return { items: kept, overflow };
  }

  // src/client/attention.js
  function Avatar({ scene, bot, seat }) {
    return (0, import_react6.createElement)(
      "span",
      { className: "bb-att-avatar" },
      (0, import_react6.createElement)(
        "svg",
        { width: 30, height: 30, viewBox: "56 24 60 60", "aria-hidden": "true", focusable: "false" },
        blobSeat(scene, seat ?? seatOf(bot))
      )
    );
  }
  function Attention({ items, overflow = 0, expanded = false, t, onOpen, onExpand }) {
    const rows = items ?? [];
    if (!rows.length) {
      return (0, import_react6.createElement)(
        "div",
        { className: "bb-attention" },
        (0, import_react6.createElement)(
          "div",
          { className: "bb-att-empty" },
          (0, import_react6.createElement)("b", null, "\u2713"),
          (0, import_react6.createElement)("span", null, t("attention.empty"))
        )
      );
    }
    const last = rows.length - 1;
    const chip = overflow > 0 || expanded && rows.length > ATTENTION_MAX;
    return (0, import_react6.createElement)(
      "div",
      { className: "bb-attention" },
      rows.map((row, index) => (0, import_react6.createElement)(
        "div",
        {
          className: "bb-attention-row",
          key: row.bot.id,
          role: "button",
          tabIndex: 0,
          "data-scene": row.scene,
          title: row.action || row.bot.name,
          onClick: () => onOpen(row),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(row);
            }
          }
        },
        (0, import_react6.createElement)(Avatar, { scene: row.scene, bot: row.bot, seat: row.seat }),
        // No NAME_INK here on purpose: in this layer the alert/error split is
        // already carried by the 3px left bar, the lamp's shape and the words of the
        // action. A coloured name would be a fourth copy of the same fact, and it
        // would break the vertical rail into two colours to compare.
        (0, import_react6.createElement)("span", { className: "bb-att-name" }, row.bot.name),
        (0, import_react6.createElement)("span", { className: "bb-att-act" }, row.action),
        // When collapsed the chip rides the last row (`+N` belongs where the list
        // ends). When expanded it moves to the FIRST row: nine expanded rows are
        // 430px inside a 279px body, and `.bb-body` is `overflow:hidden`, so the
        // `−` that lived on the last row was clipped away and the expanded state
        // could not be undone at 420×320 (v0.4.2 audit, finding #6).
        chip && (expanded ? index === 0 : index === last) ? (0, import_react6.createElement)("span", {
          className: "bb-att-more",
          role: "button",
          tabIndex: 0,
          "data-expanded": expanded ? "true" : "false",
          title: expanded ? t("attention.collapse") : t("attention.overflow").replace("{n}", String(overflow)),
          "aria-label": expanded ? t("attention.collapse") : t("attention.overflow").replace("{n}", String(overflow)),
          // The chip lives inside a row that is itself a button, so every
          // activation bubbles: without stopPropagation, clicking `+2` opened
          // the drawer of the Bot on that row (the drawer covers the panel, so
          // the list looked like it had jumped to someone else's details).
          // `preventDefault` is not enough on the keyboard path — the row's
          // handler only looks at `event.key`, not at whether it was handled.
          onClick: (event) => {
            event.stopPropagation();
            onExpand?.();
          },
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onExpand?.();
            }
          }
        }, expanded ? "\u2212" : `+${overflow}`) : null,
        // Always rendered, even when there is no turn start to count from: the
        // column keeps its 44px so the lamps stay on one vertical rail.
        // `waitSince` is the moment the request arrived — `approval.at` when there
        // is one, else the turn start, else the failure. This column answers "how
        // long have I been ignoring this", and using the turn start made a
        // three-second-old approval read as 12m34s (v0.4.2 audit, finding #3).
        (0, import_react6.createElement)("span", { className: "bb-att-time" }, (0, import_react6.createElement)(Elapsed, { since: row.waitSince ?? (row.since || row.failureAt) })),
        (0, import_react6.createElement)("span", { className: "bb-att-lamp" }, (0, import_react6.createElement)(Lamp, { scene: row.scene, size: 12 }))
      ))
    );
  }
  function IdleLine({ items, overflow = 0, expanded = false, t, onOpen, onExpand }) {
    const rows = items ?? [];
    if (!rows.length && !overflow) return null;
    return (0, import_react6.createElement)(
      "div",
      {
        className: "bb-idle",
        "data-expanded": expanded ? "true" : "false"
      },
      (0, import_react6.createElement)("span", { className: "bb-idle-k" }, t("layer.idle")),
      rows.map((row) => (0, import_react6.createElement)(
        "span",
        {
          className: "bb-idle-name",
          key: row.bot.id,
          role: "button",
          tabIndex: 0,
          title: row.bot.name,
          onClick: () => onOpen(row),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(row);
            }
          }
        },
        (0, import_react6.createElement)("span", null, row.bot.name),
        // The badge travels with the name in every compressed form. 0.3.4 made a
        // quiet failure a badge instead of a red lamp; dropping it here would
        // silently revert that.
        row.badge ? (0, import_react6.createElement)("span", { className: "bb-badge bb-badge-inline", title: row.failure ?? "" }, "!") : null
      )),
      overflow > 0 ? (0, import_react6.createElement)("span", {
        className: "bb-idle-more",
        role: "button",
        tabIndex: 0,
        title: t("attention.overflow").replace("{n}", String(overflow)),
        onClick: () => onExpand?.(),
        onKeyDown: (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onExpand?.();
          }
        }
      }, `+${overflow}`) : null
    );
  }

  // src/client/handoffs.js
  var import_react7 = __require("react");
  var GROUPS_MAX = 3;
  var EDGES_MAX = 3;
  var blockedOf = (scene) => {
    if (scene === "alert" || scene === "error") return "true";
    if (!scene || scene === "idle") return "idle";
    return "false";
  };
  function Handoffs({ works, t, onPick, sceneOf: sceneOf2 }) {
    const [all, setAll] = (0, import_react7.useState)(false);
    const groups = topologyOf(works);
    if (!groups.length) return null;
    const shown = all ? groups : groups.slice(0, GROUPS_MAX);
    const hiddenGroups = groups.length - Math.min(groups.length, GROUPS_MAX);
    const more = (label, count) => (0, import_react7.createElement)("div", {
      className: "bb-ho-more",
      role: "button",
      tabIndex: 0,
      onClick: (event) => {
        event.stopPropagation();
        setAll((value) => !value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          setAll((value) => !value);
        }
      }
    }, all ? t("ho.collapse") : label.replace("{n}", String(count)));
    return (0, import_react7.createElement)(
      "div",
      { className: "bb-handoffs", role: "group", "aria-label": t("handoff.title") },
      shown.map((group) => {
        const edges = all ? group.edges : group.edges.slice(0, EDGES_MAX);
        const hiddenItems = group.edges.slice(EDGES_MAX).reduce((sum, edge) => sum + edge.open, 0);
        return (0, import_react7.createElement)(
          "div",
          { className: "bb-ho-group", key: group.fromId },
          (0, import_react7.createElement)(
            "div",
            { className: "bb-ho-group-head" },
            (0, import_react7.createElement)("span", { className: "bb-ho-from" }, group.from || "\uFF1F"),
            (0, import_react7.createElement)("span", { className: "bb-ho-total" }, t("ho.groupTotal").replace("{n}", String(group.total)))
          ),
          edges.map((edge) => {
            const blocked = blockedOf(sceneOf2?.(edge.toId));
            return (0, import_react7.createElement)(
              "div",
              {
                className: "bb-handoff",
                key: edge.id,
                // Keyboard parity with the workstations: this used to be a plain
                // clickable div, so a keyboard user could not open a hand-off at all.
                role: "button",
                tabIndex: 0,
                "data-blocked": blocked,
                "data-mutual": edge.mutual ? "true" : void 0,
                onClick: () => onPick?.(edge),
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPick?.(edge);
                  }
                },
                title: edge.last ?? ""
              },
              // Shape change *and* a word: `⇄` alone is a riddle, so the mutual
              // case also prints 互相等.
              (0, import_react7.createElement)("span", { className: "bb-ho-arrow" }, edge.mutual ? "\u21C4" : "\u2192"),
              (0, import_react7.createElement)("span", { className: "bb-ho-name" }, edge.to || "\uFF1F"),
              (0, import_react7.createElement)("span", { className: "bb-ho-count" }, `${edge.open} ${t("handoff.open")}`),
              blocked === "true" ? (0, import_react7.createElement)("span", { className: "bb-ho-flag" }, t("ho.blocked")) : null,
              blocked === "idle" ? (0, import_react7.createElement)("span", { className: "bb-ho-flag" }, t("ho.notStarted")) : null,
              edge.mutual ? (0, import_react7.createElement)("span", { className: "bb-ho-flag" }, t("ho.mutual")) : null,
              (0, import_react7.createElement)("span", { className: "bb-ho-time" }, ago(edge.at, Date.now(), t))
            );
          }),
          hiddenItems > 0 ? more(t("ho.moreItems"), hiddenItems) : null
        );
      }),
      hiddenGroups > 0 ? more(t("ho.morePeople"), hiddenGroups) : null
    );
  }

  // src/client/poll.js
  var import_react8 = __require("react");

  // src/client/cadence.js
  function teamActive(view) {
    if (!view || typeof view !== "object") return false;
    for (const value of Object.values(view.activity ?? {})) {
      if (value && value !== "idle") return true;
    }
    const work = view.work ?? {};
    if ((work.approvals ?? []).length) return true;
    if (Object.keys(work.waiting ?? {}).length) return true;
    if (Object.keys(work.bots ?? {}).length) return true;
    return false;
  }
  function liveCadence({ active, lastActiveAt, now = Date.now() }) {
    if (active) return POLL_MS;
    if (Number(lastActiveAt) > 0 && now - Number(lastActiveAt) < ACTIVE_TAIL_MS) return POLL_MS;
    return IDLE_POLL_MS;
  }

  // src/client/pollLoop.js
  function pollDelay(base, { active, hidden, misses }) {
    const slow = hidden || !active;
    const target = slow ? SLOW_POLL_MS : base;
    return misses > 0 ? Math.min(target * 2 ** Math.min(misses, 3), SLOW_POLL_MS) : target;
  }
  function createPollLoop({
    base,
    run,
    onValue,
    onError,
    isActive,
    isHidden,
    delayFor = pollDelay,
    timers = { setTimeout: (...args) => setTimeout(...args), clearTimeout: (id) => clearTimeout(id) }
  }) {
    let stopped = false;
    let timer2 = null;
    let inflight = false;
    let misses = 0;
    function arm() {
      if (stopped) return;
      timer2 = timers.setTimeout(fire, delayFor(typeof base === "function" ? base() : base, {
        active: isActive(),
        hidden: isHidden(),
        misses
      }));
    }
    async function fire() {
      timer2 = null;
      if (stopped || inflight) return;
      inflight = true;
      try {
        const value = await run();
        if (!stopped) {
          onValue(value);
          misses = 0;
        }
      } catch (error) {
        if (!stopped) {
          onError(error);
          misses += 1;
        }
      } finally {
        inflight = false;
      }
      arm();
    }
    function wake() {
      if (stopped || inflight) return;
      if (timer2 !== null) {
        timers.clearTimeout(timer2);
        timer2 = null;
      }
      fire();
    }
    return {
      start: fire,
      wake,
      stop() {
        stopped = true;
        if (timer2 !== null) {
          timers.clearTimeout(timer2);
          timer2 = null;
        }
      },
      armed: () => timer2 !== null,
      inFlight: () => inflight
    };
  }

  // src/client/poll.js
  var jitter = (ms) => Math.max(250, Math.round(ms * (0.9 + Math.random() * 0.2)));
  async function callBot(endpoint, payload) {
    const response = await fetch("api/bot", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint, payload: payload ?? null })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error?.message ?? "DS Bot \u8FD4\u56DE\u9519\u8BEF");
    return result.value;
  }
  async function callBoard() {
    const response = await fetch("api/bot-board", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  function usePoll({ base, run, onValue, onError, activeRef, wakeRef }) {
    (0, import_react8.useEffect)(() => {
      const loop = createPollLoop({
        base,
        run,
        onValue,
        onError,
        // `value` is the resolved base — a number, even when `base` is a function.
        delayFor: (value, state) => jitter(pollDelay(value, state)),
        isActive: () => activeRef.current,
        isHidden: () => typeof document !== "undefined" && document.hidden
      });
      const onVisible = () => {
        if (!document.hidden) loop.wake();
      };
      wakeRef.current = loop.wake;
      document.addEventListener("visibilitychange", onVisible);
      loop.start();
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        loop.stop();
        if (wakeRef.current === loop.wake) wakeRef.current = null;
      };
    }, []);
  }
  function useTeam({ active }) {
    const [view, setView] = (0, import_react8.useState)(null);
    const [board, setBoard] = (0, import_react8.useState)(null);
    const [error, setError] = (0, import_react8.useState)(null);
    const activeRef = (0, import_react8.useRef)(active);
    const liveWake = (0, import_react8.useRef)(null);
    const boardWake = (0, import_react8.useRef)(null);
    const sinceRef = (0, import_react8.useRef)(void 0);
    const modelsRef = (0, import_react8.useRef)(void 0);
    const busyRef = (0, import_react8.useRef)(false);
    const lastActiveRef = (0, import_react8.useRef)(0);
    (0, import_react8.useEffect)(() => {
      activeRef.current = active;
      if (!active) return;
      liveWake.current?.();
      boardWake.current?.();
    }, [active]);
    usePoll({
      // An idle team is asked far less often; `unchanged` answers still carry the
      // live half, so a Bot starting work shows up on the very next tick.
      base: () => liveCadence({ active: busyRef.current, lastActiveAt: lastActiveRef.current }),
      activeRef,
      wakeRef: liveWake,
      run: () => callBot("state", { since: sinceRef.current, models: modelsRef.current }),
      onValue: (value) => {
        sinceRef.current = value.revision ?? sinceRef.current;
        modelsRef.current = value.modelsKey ?? modelsRef.current;
        busyRef.current = teamActive(value);
        if (busyRef.current) lastActiveRef.current = Date.now();
        setView((previous) => value.unchanged && previous ? { ...previous, ...value } : value);
        setError(null);
      },
      onError: (err) => setError(err?.message ?? "offline")
    });
    usePoll({
      base: BOARD_MS,
      activeRef,
      wakeRef: boardWake,
      run: callBoard,
      onValue: (value) => setBoard(value),
      // `ok:false` matters: without it the panel fell through to `panel.empty` and
      // told the user 「还没有 Bot」 when the truth was that the snapshot could not be
      // read at all — a cheerful lie in the one place this tool must not lie
      // (v0.4.2 audit, finding #10).
      onError: (err) => setBoard((previous) => ({
        ...previous ?? { works: [], bots: [], errors: [] },
        ok: false,
        reason: "unreadable",
        boardError: err?.message ?? "local read failed"
      }))
    });
    return { view, board, error };
  }

  // src/client/style.js
  var CSS = `
.bb-wrap{position:fixed;right:16px;bottom:120px;z-index:80;font-size:12px;line-height:1.5;color:inherit;
  font-family:inherit;text-align:left;max-width:calc(100vw - 32px)}
.bb-wrap *{box-sizing:border-box}
.bb-pill{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 8px 24px rgba(0,0,0,.14);font-size:12px;color:inherit;font-family:inherit}
.bb-pill:hover{background:var(--dsw-alias-bg-layer-2,#f6f6f4)}
.bb-pill b{font-weight:600}
.bb-dot{width:7px;height:7px;border-radius:50%;flex:none;display:inline-block;border:1px solid #5B5648}
.bb-panel{display:flex;flex-direction:column;border-radius:14px;overflow:hidden;position:relative;
  background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  box-shadow:0 14px 38px rgba(0,0,0,.18)}
/* Head: 39px = 7 + 24 (icon) + 7 + 1 (border). Counts report \u9700\u8981\u4F60 first. */
.bb-head{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid rgba(0,0,0,.06);
  cursor:grab;user-select:none;touch-action:none}
.bb-head:active{cursor:grabbing}
.bb-title{font-weight:600;font-size:12px;white-space:nowrap}
.bb-sum{display:flex;gap:7px;font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden}
/* Emphasis is weight only: the header follows the host theme, and a hard-coded
   colour would go invisible in a dark one. */
.bb-sum-hot{font-weight:700;opacity:1}
.bb-sum-quiet{font-weight:400;opacity:.55}
.bb-grow{flex:1}
.bb-icon{width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:inherit;opacity:.55;
  cursor:pointer;font-size:14px;line-height:1;flex:none}
.bb-icon:hover{opacity:1;background:rgba(0,0,0,.05)}

/* Body: three bands, and only the middle one scrolls. */
.bb-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;
  padding:0;background:#FAF7F1;color:#2C2C2A}
.bb-notices{flex:none;max-height:64px;overflow:auto;padding:6px 10px 0}

/* \u2500\u2500 Layer 1 \xB7 \u9700\u8981\u4F60 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* #FFFFFF against #FAF7F1 is only 1.07:1, so the card's surface encodes nothing.
   What carries the layer is the 44px rhythm, the 3px status bar (5.02 / 6.47:1)
   and the right-hand rail of lamps. Do not "fix" the weak white. */
.bb-attention{flex:none;display:flex;flex-direction:column;gap:${ATTENTION_GAP}px;padding:6px 10px 4px}
.bb-attention-row{position:relative;display:flex;align-items:center;gap:8px;height:${ATTENTION_ROW_H}px;
  padding:0 8px 0 7px;border-left:3px solid transparent;border-radius:9px;
  background:#FFFFFF;box-shadow:0 1px 2px rgba(44,44,42,.10);
  cursor:pointer;outline:none;overflow:hidden}
.bb-attention-row[data-scene="alert"]{border-left-color:#B45309}
.bb-attention-row[data-scene="error"]{border-left-color:#B91C1C}
/* Hover is a 1px inner ring, not a tint: a tint on cream measures 1.06:1, i.e.
   no feedback at all. */
.bb-attention-row:hover{box-shadow:0 1px 2px rgba(44,44,42,.10),inset 0 0 0 1px #8F8776}
.bb-att-avatar{flex:0 0 30px;width:30px;height:30px;border-radius:50%;overflow:hidden;
  display:grid;place-items:center;background:#FAF7F1}
.bb-att-avatar svg{display:block;width:30px;height:30px}
.bb-att-name{flex:0 0 auto;max-width:68px;font-size:12.5px;font-weight:600;color:#2C2C2A;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* The only flexible, and the only clippable, column: prose yields, structure does
   not. Long prose has the drawer as its exit; identity and duration do not. */
.bb-att-act{flex:1 1 auto;min-width:0;font-size:12px;color:#4A4438;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-att-time{flex:0 0 auto;min-width:44px;font-size:11px;color:#6B6558;text-align:right;
  font-variant-numeric:tabular-nums}
.bb-att-lamp{flex:0 0 12px;width:12px;height:12px;display:grid;place-items:center}
/* Empty state: one summary line, never blank. "I looked and there is nothing" is
   the answer this panel exists to give. */
.bb-att-empty{display:flex;align-items:center;gap:6px;height:28px;padding:0 2px;
  font-size:11.5px;color:#6B6558}
.bb-att-empty b{color:#0F766E;font-weight:600}
/* The overflow chip lives *inside* the last row, in the trailing edge of the
   flexible action column, so revealing the 4th, 5th, 6th Bot costs zero height.
   v0.4.0 put it on its own line below the list, which cost 20.5px (a 3px gap plus
   a 17.5px line) \u2014 that pushed layer 2 below its 96px floor \u2014 and, worse, it was
   a bare div: the names it stood for existed nowhere on the panel and could not
   be opened. Same overflow as layer 3's +N, worse treatment, on the more
   important layer. It is now a real control. */
.bb-att-more{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 6px;
  border-radius:9px;background:#F3EDE2;color:#4A4438;font-size:10.5px;font-weight:600;
  line-height:18px;cursor:pointer;outline:none;white-space:nowrap;
  font-variant-numeric:tabular-nums}
/* Hover is a 1px inner ring plus a step in text colour, not a tint: a tint on
   this surface measures 1.105:1, i.e. no feedback \u2014 the same mistake the
   .bb-attention-row hover comment above already argues against. */
.bb-att-more:hover{box-shadow:inset 0 0 0 1px #8F8776;color:#2C2C2A}

/* \u2500\u2500 Layer 2 \xB7 \u5728\u52A8 (the only scroll area) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bb-run{flex:1;min-height:0;overflow:auto;padding:0 10px ${RUN_PAD_B}px}
.bb-run-grid{display:grid;grid-template-columns:repeat(auto-fit,${RUNNING_CELL_W}px);
  gap:${RUN_GRID_GAP}px;justify-content:center}
/* The classroom is not a card grid: no white fill, no drop shadow. A hover ring
   is the only surface change, so the cream room survives. */
.bb-run .bb-station{padding:0 0 1px;border-radius:8px}
.bb-run .bb-station:hover{background:rgba(44,44,42,.05);box-shadow:inset 0 0 0 1px #8F8776}
/* Name and duration on one line, pinned to 18px: the height budget is arithmetic,
   so nothing here may drift with the font family. */
.bb-run .bb-station-name{display:flex;align-items:baseline;justify-content:center;gap:4px;
  margin-top:1px;font-size:12px;font-weight:500;line-height:18px;color:#2C2C2A}
.bb-run .bb-station-nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bb-run .bb-station-time{flex:none;font-size:10.5px;line-height:18px;font-weight:400;color:#6B6558;
  font-variant-numeric:tabular-nums}

/* \u2500\u2500 Layer 2 internal \xB7 hand-offs, grouped by sender \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* A hairline means "above is a note", not "here is a panel". No fill, no border
   box, and no max-height: two scrollbars inside a 420px column fight each other,
   so the list is bounded by rows (3 groups \xD7 3 edges + a count) instead.
   The rule sits on the bottom edge because the table now precedes the grid: when
   the band has to scroll, the relation is read before the individual cells. */
.bb-handoffs{flex:none;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #DDD6C8;
  font-size:11px;color:#2C2C2A}
.bb-ho-group{margin-bottom:6px}
.bb-ho-group:last-child{margin-bottom:0}
/* 600 + deep ink = structural: this is who the bottleneck is. Same size as an
   edge, so the only difference is weight and colour. */
.bb-ho-group-head{display:flex;align-items:baseline;gap:6px;font-size:11px;font-weight:600;
  line-height:16px;color:#4A4438;padding:2px 0}
.bb-ho-from{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Amber is reserved for quantities. "\u5171 N \u9879" is the answer of the whole table:
   the biggest group is the bottleneck. */
.bb-ho-total{flex:none;color:#8A5B00;font-variant-numeric:tabular-nums}
/* 14px indent = subordinate: more than 1em, so the left edge clearly steps in,
   and less than the arrow's advance, so the arrow never hangs outside. */
.bb-handoff{display:flex;align-items:center;gap:6px;height:18px;padding:0 0 0 14px;
  font-size:11px;border-radius:6px;cursor:pointer;outline:none}
.bb-handoff:hover{background:rgba(44,44,42,.05)}
/* A character, not a drawn line: it carries the direction (dispatch), it never
   breaks at any width, and it is already in the DOM. */
.bb-ho-arrow{flex:none;font-size:12px;line-height:1;color:#8A8577}
.bb-ho-name{flex:0 0 auto;max-width:72px;color:#2C2C2A;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.bb-ho-count{flex:none;color:#6B6558;font-variant-numeric:tabular-nums}
.bb-ho-time{margin-left:auto;flex:none;min-width:56px;text-align:right;color:#6B6558;
  font-variant-numeric:tabular-nums}
.bb-ho-flag{flex:none;color:#6B6558}
/* \u88AB\u5835 is the only branch that adds pixels. busy/waiting fall through to the
   default, which is why the laziest implementation is also the correct one. */
.bb-handoff[data-blocked="true"] .bb-ho-count{color:#8A5B00;font-weight:600}
.bb-handoff[data-blocked="true"] .bb-ho-flag{color:#B45309;font-weight:600}
.bb-handoff[data-mutual="true"] .bb-ho-arrow{color:#B45309}
.bb-ho-more{padding:0 0 0 14px;color:#6B6558;font-size:11px;line-height:16px;cursor:pointer}

/* \u2500\u2500 Layer 3 \xB7 \u95F2\u7740: one line, no image, no surface, no lamp \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* height is pinned and wrapping is off: a second line breaks the 480px budget by
   its 1px margin. Overflow degrades to +N, never to a wrap. */
.bb-idle{flex:none;height:${IDLE_ROW_H}px;display:flex;align-items:center;gap:6px;overflow:hidden;
  padding:0 10px;border-top:1px solid #DDD6C8;font-size:11px;background:transparent}
.bb-idle-k{flex:none;font-weight:600;color:#6B6558}
.bb-idle-name{flex:0 0 auto;display:inline-flex;align-items:center;gap:2px;padding:1px 2px;
  border-radius:4px;color:#5F594D;white-space:nowrap;cursor:pointer;outline:none}
.bb-idle-name:hover{color:#2C2C2A;background:rgba(44,44,42,.06)}
/* Same rule as .bb-att-more: a 0.06 black tint on cream is 1.12:1, which is not
   feedback. The ring is 3.3:1 and the text steps to the room's ink. */
.bb-idle-more{flex:none;padding:1px 3px;border-radius:4px;font-weight:600;color:#6B6558;
  cursor:pointer;outline:none}
.bb-idle-more:hover{background:transparent;box-shadow:inset 0 0 0 1px #8F8776;color:#2C2C2A}
/* The inline badge keeps the bb-badge class name (that is what D1 asserts) and
   only changes its position: the badge must survive every compressed form. */
.bb-badge-inline{position:static;flex:none;width:12px;height:12px;line-height:12px;font-size:9px;
  margin-left:2px}
/* The one path that may grow layer 3 \u2014 and only because the user asked for it. */
.bb-idle[data-expanded="true"]{height:auto;max-height:44px;flex-wrap:wrap;padding:4px 10px}

/* \u2500\u2500 Lamps \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bb-lamp{display:block}
.bb-drawer-lamp{flex:none;display:grid;place-items:center}

/* \u2500\u2500 Legend, demoted to a drawer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bb-lg-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11.5px;
  border-bottom:1px solid rgba(0,0,0,.05)}
.bb-lg-row:last-child{border-bottom:0}
.bb-lg-lamp{flex:none;width:16px;height:16px;display:grid;place-items:center}
.bb-lg-name{flex:0 0 62px;font-weight:600;color:#2C2C2A}
.bb-lg-hint{flex:1;min-width:0;color:#6B6558}

/* \u2500\u2500 Workstation (layer 2 card; compact=false is still the default) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bb-station{position:relative;border-radius:10px;padding:2px 2px 4px;cursor:pointer;background:transparent;
  transition:background-color .12s ease;outline:none}
.bb-station:hover{background:rgba(0,0,0,.045)}
.bb-scene{display:block;width:100%;height:auto}
.bb-station-name{margin-top:1px;text-align:center;font-size:12px;font-weight:500;color:#2C2C2A;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-meta{display:flex;gap:6px;align-items:baseline;font-size:11px;color:#6B6558;
  margin-top:1px;min-height:15px}
.bb-meta-act{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bb-meta-time{margin-left:auto;flex:none;min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
.bb-stalled{color:#B45309;font-weight:600}
.bb-badge{position:absolute;top:1px;right:3px;width:14px;height:14px;border-radius:50%;background:#B91C1C;
  color:#fff;font-size:10px;font-weight:700;line-height:14px;text-align:center;pointer-events:none}

/* Every control is reachable by Tab; without a ring you cannot tell where you
   are. This list is extended, never replaced. */
.bb-pill:focus-visible,.bb-icon:focus-visible,.bb-btn:focus-visible,.bb-handoff:focus-visible,
.bb-station:focus-visible,.bb-attention-row:focus-visible,.bb-idle-name:focus-visible,
.bb-idle-more:focus-visible,.bb-att-more:focus-visible,.bb-ho-more:focus-visible{outline:2px solid #378ADD;outline-offset:1px}

/* \u2500\u2500 Motion: unchanged set, unchanged budgets \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bb-blob{transform-box:fill-box;transform-origin:center bottom;animation:bb-breathe 2.6s ease-in-out infinite}
.bb-eyes{transform-box:fill-box;transform-origin:center;animation:bb-blink 3s step-end infinite}
.bb-eyes-slow{animation-duration:6s}
.bb-hand{transform-box:fill-box;transform-origin:center}
.bb-tap{animation:bb-tap .9s step-end infinite}
.bb-wave{animation:bb-wave 1.1s step-end infinite}
.bb-note{position:absolute;left:50%;top:0;width:12px;height:9px;margin-left:-6px;background:#fff;
  border:1px solid rgba(0,0,0,.28);border-radius:2px;pointer-events:none;
  animation:bb-note 2s step-end 1 both}
.bb-pulse{animation:bb-pulse 1.6s ease-in-out infinite}
/* Layer 1 is where you *read*: breathing and blinking in the three rows that
   matter compete with the action text, and the lamp already encodes activity.
   These overrides sit after the base rules they cancel, on purpose. */
.bb-att-avatar .bb-blob,.bb-att-avatar .bb-eyes{animation:none}
.bb-notice{margin:0 0 8px;padding:5px 8px;border-radius:8px;font-size:11px;background:#FDF2F2;color:#9B1C1C;
  border:1px solid rgba(185,28,28,.18)}
.bb-notice-warn{background:#FEF7E6;color:#8A5B00;border-color:rgba(138,91,0,.18)}

/* \u2500\u2500 The sheet (bot detail + legend share one .bb-drawer) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.bb-drawer{position:absolute;inset:0;display:flex;flex-direction:column;background:#FFFDF8;color:#2C2C2A;
  z-index:2}
.bb-drawer-head{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(0,0,0,.08);
  flex:none}
.bb-drawer-title{font-weight:600;font-size:12px}
.bb-drawer-sub{font-size:11px;color:#6B6558}
.bb-drawer-body{flex:1;min-height:0;overflow:auto;padding:10px 12px}
.bb-kv{display:flex;gap:8px;padding:2px 0;font-size:11px}
.bb-k{flex:none;width:52px;color:#6B6558}
.bb-v{flex:1;min-width:0;word-break:break-word}
.bb-block{margin-top:9px;padding-top:8px;border-top:1px dashed rgba(0,0,0,.1)}
.bb-block-t{font-size:11px;font-weight:600;color:#6B6558;margin-bottom:4px}
.bb-code{margin:0;padding:7px 8px;border-radius:8px;background:#2C2C2A;color:#F7F5F0;font-size:11px;
  line-height:1.45;white-space:pre-wrap;word-break:break-word;max-height:min(96px,40%);overflow:auto;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.bb-opt{display:flex;gap:6px;padding:2px 0;font-size:11px}
.bb-opt b{font-weight:600;flex:none}
.bb-opt span{color:#6B6558}
.bb-text{font-size:11px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.bb-dim{color:#6B6558}
.bb-drawer-foot{flex:none;display:flex;gap:8px;padding:9px 12px;border-top:1px solid rgba(0,0,0,.08)}
.bb-btn{flex:1;padding:6px 10px;border-radius:8px;border:1px solid transparent;background:#2C2C2A;color:#FFFDF8;
  font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
.bb-btn:hover{background:#43423F}
.bb-btn:disabled{background:#B6B2A8;cursor:not-allowed}
.bb-btn-ghost{flex:1;background:transparent;color:#2C2C2A;border-color:rgba(0,0,0,.16)}
.bb-btn-ghost:hover{background:rgba(0,0,0,.05)}
.bb-rz{position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;touch-action:none;z-index:3}
.bb-rz::after{content:"";position:absolute;right:3px;bottom:3px;width:9px;height:9px;
  border-right:2px solid rgba(0,0,0,.28);border-bottom:2px solid rgba(0,0,0,.28);border-radius:0 0 3px 0}
@keyframes bb-breathe{0%{transform:scale(1)}50%{transform:scale(1.02)}100%{transform:scale(1)}}
@keyframes bb-blink{0%{transform:scaleY(1)}94%{transform:scaleY(.12)}97%{transform:scaleY(1)}100%{transform:scaleY(1)}}
@keyframes bb-tap{0%{transform:translateY(0)}34%{transform:translateY(2.5px)}67%{transform:translateY(0)}100%{transform:translateY(0)}}
@keyframes bb-wave{0%{transform:translate(0,0)}25%{transform:translate(2px,-6px)}50%{transform:translate(0,-2px)}
  75%{transform:translate(2px,-6px)}100%{transform:translate(0,0)}}
@keyframes bb-note{0%{opacity:0;transform:translateY(-18px)}25%{opacity:1;transform:translateY(-12px)}
  55%{transform:translateY(-4px)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(0)}}
@keyframes bb-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.bb-pulse{animation:none}
  .bb-blob,.bb-eyes,.bb-tap,.bb-wave,.bb-note{animation:none}
  .bb-note{display:none}}
`;
  function ensureStyle() {
    if (typeof document === "undefined") return;
    if (document.getElementById("bb-style")) return;
    const node = document.createElement("style");
    node.id = "bb-style";
    node.textContent = CSS;
    document.head.appendChild(node);
  }

  // src/client/bridge.js
  var opener = null;
  function setOpener(fn) {
    if (typeof fn === "function") opener = fn;
  }
  function hasOpener() {
    return typeof opener === "function";
  }
  function openSession(id) {
    try {
      opener?.(id);
      return Boolean(opener);
    } catch {
      return false;
    }
  }

  // src/client/panel.js
  var readRaw = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw;
    } catch {
      return fallback;
    }
  };
  var writeRaw = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  };
  function notify(title, body) {
    try {
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((result) => {
          if (result === "granted") new Notification(title, { body });
        }).catch(() => {
        });
      }
    } catch {
    }
  }
  function Dot({ tone, busy }) {
    return (0, import_react9.createElement)("span", {
      className: busy ? "bb-dot bb-pulse" : "bb-dot",
      style: { background: tone, boxShadow: busy ? `0 0 0 3px ${tone}33` : "none" }
    });
  }
  var readSize = () => {
    try {
      const raw = readRaw(SIZE_KEY, "");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.w && parsed.h) {
        return {
          w: Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, parsed.w)),
          h: Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, parsed.h))
        };
      }
    } catch {
    }
    return { ...SIZE_DEFAULT };
  };
  var readPos = () => {
    try {
      const raw = readRaw(POS_KEY, "");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  function clampPos(value, size) {
    if (!value || !Number.isFinite(value.left) || !Number.isFinite(value.top)) return null;
    if (typeof window === "undefined") return { left: value.left, top: value.top };
    const width = size?.w ?? SIZE_DEFAULT.w;
    return {
      left: Math.min(Math.max(6, value.left), Math.max(6, (window.innerWidth || 0) - width - 6)),
      top: Math.min(Math.max(6, value.top), Math.max(6, (window.innerHeight || 0) - 60))
    };
  }
  function useStableLayers(rows) {
    const ref = (0, import_react9.useRef)(null);
    if (!ref.current) ref.current = /* @__PURE__ */ new Map();
    const map = ref.current;
    const now = Date.now();
    for (const row of rows) {
      const id = row.bot.id;
      const live = layerOf(row);
      if (live === LAYER_ATTENTION) {
        map.delete(id);
        continue;
      }
      const target = live;
      const entry = map.get(id);
      if (!entry) {
        map.set(id, { layer: target, pending: null, since: now });
        continue;
      }
      if (entry.layer === target) {
        entry.pending = null;
        continue;
      }
      if (entry.pending !== target) {
        entry.pending = target;
        entry.since = now;
        continue;
      }
      if (now - entry.since >= LAYER_STABLE_MS) {
        entry.layer = target;
        entry.pending = null;
      }
    }
    if (map.size > 32) {
      const alive = new Set(rows.map((row) => row.bot.id));
      for (const id of [...map.keys()]) if (!alive.has(id)) map.delete(id);
    }
    return map;
  }
  function Body({
    rows = [],
    works = [],
    notices = [],
    empty = null,
    t,
    onOpen,
    onPick,
    sceneOf: sceneOf2,
    // The static preview renders the post-click state, which is otherwise only
    // reachable by clicking. The panel never passes it; production is unchanged.
    initialAttExpanded = false
  }) {
    const layers = useStableLayers(rows);
    const [expanded, setExpanded] = (0, import_react9.useState)(false);
    const [attExpanded, setAttExpanded] = (0, import_react9.useState)(initialAttExpanded);
    const hot = [];
    const moving = [];
    const resting = [];
    for (const row of rows) {
      const live = layerOf(row);
      if (live === LAYER_ATTENTION) {
        hot.push(row);
        continue;
      }
      const stable = layers.get(row.bot.id)?.layer;
      const bucket = stable === LAYER_RUNNING || stable === LAYER_IDLE ? stable : live;
      if (bucket === LAYER_RUNNING) moving.push(row);
      else resting.push(row);
    }
    if (!rows.length) {
      return (0, import_react9.createElement)(
        "div",
        { className: "bb-body" },
        notices.length ? (0, import_react9.createElement)("div", { className: "bb-notices" }, notices) : null,
        empty
      );
    }
    const idle = idleLine(resting, expanded ? Number.POSITIVE_INFINITY : void 0);
    const hotOver = hot.length > ATTENTION_MAX;
    if (attExpanded && !hotOver) setAttExpanded(false);
    const attOpen = attExpanded && hotOver;
    const attention = attentionOf(hot, attOpen ? Number.POSITIVE_INFINITY : void 0);
    const showRun = moving.length > 0 || (works ?? []).some((work) => Number(work?.open) > 0);
    return (0, import_react9.createElement)(
      "div",
      { className: "bb-body" },
      notices.length ? (0, import_react9.createElement)("div", { className: "bb-notices" }, notices) : null,
      // Layer 1 — 需要你. Always rendered: an empty list is one summary line, never
      // blank, because "I looked and there is nothing" is the answer to the
      // question this panel exists for.
      (0, import_react9.createElement)(Attention, {
        items: attention.items,
        overflow: attention.overflow,
        expanded: attOpen,
        t,
        onOpen,
        onExpand: () => setAttExpanded((value) => !value)
      }),
      // Layer 2 — 在动. The only scroll area in the panel; layers 1 and 3 are
      // always inside the viewport, so "is anything waiting on me" and "who is
      // free" never need a scroll.
      showRun ? (0, import_react9.createElement)(
        "div",
        { className: "bb-run" },
        (0, import_react9.createElement)(Handoffs, { works, t, onPick, sceneOf: sceneOf2 }),
        moving.length ? (0, import_react9.createElement)(
          "div",
          { className: "bb-run-grid" },
          moving.map((row) => (0, import_react9.createElement)(Station, {
            key: row.bot.id,
            row,
            onOpen,
            note: row.note,
            t,
            compact: true
          }))
        ) : null
      ) : null,
      // Layer 3 — 闲着. No image, no surface, no lamp: names only.
      (0, import_react9.createElement)(IdleLine, {
        items: idle.items,
        overflow: idle.overflow,
        expanded,
        t,
        onOpen,
        onExpand: () => setExpanded(true)
      })
    );
  }
  function summarize(rows, works) {
    const counts = { busy: 0, alert: 0, waiting: 0, error: 0, idle: 0, done: 0 };
    for (const row of rows) counts[row.scene] = (counts[row.scene] ?? 0) + 1;
    const openHandoffs = (works ?? []).reduce((sum, work) => sum + (Number(work?.open) || 0), 0);
    const tone = counts.error ? LAMP.error : counts.alert ? LAMP.alert : counts.waiting ? LAMP.waiting : counts.busy ? LAMP.busy : LAMP.idle;
    return { counts, openHandoffs, tone };
  }
  function Head({ counts, openHandoffs = 0, tone, t, onHelp, onCollapse, drag = {} }) {
    return (0, import_react9.createElement)(
      "div",
      { className: "bb-head", ...drag, title: t("panel.drag") },
      (0, import_react9.createElement)(Dot, { tone, busy: counts.busy > 0 }),
      (0, import_react9.createElement)("span", { className: "bb-title" }, t("panel.title")),
      (0, import_react9.createElement)("span", { className: "bb-grow" }),
      // Counts report 需要你 first. The old order led with 干活, which is the one
      // number that never needs the user; emphasis is weight, not colour, because
      // the header follows the host theme and a hard-coded colour goes invisible in
      // a dark one. Both zeroes are shown on purpose: a quiet board has to be able
      // to say "0 waiting, 0 stuck" rather than say nothing.
      (0, import_react9.createElement)(
        "span",
        { className: "bb-sum" },
        (0, import_react9.createElement)(
          "span",
          { className: counts.alert ? "bb-sum-hot" : "bb-sum-quiet" },
          `${counts.alert} ${t("legend.alert")}`
        ),
        (0, import_react9.createElement)(
          "span",
          { className: counts.error ? "bb-sum-hot" : "bb-sum-quiet" },
          `${counts.error} ${t("legend.error")}`
        ),
        (0, import_react9.createElement)("span", { className: "bb-sum-quiet" }, `${counts.busy} ${t("legend.busy")}`),
        (0, import_react9.createElement)("span", { className: "bb-sum-quiet" }, `${counts.waiting} ${t("legend.waiting")}`),
        openHandoffs ? (0, import_react9.createElement)("span", { className: "bb-sum-quiet" }, t("panel.sumHandoff").replace("{n}", String(openHandoffs))) : null
      ),
      // The legend used to be a permanent 27px strip here — six swatches that never
      // changed, at the eye's first landing point. It is now one 24px button that
      // costs nothing until you ask.
      (0, import_react9.createElement)("button", {
        className: "bb-icon",
        type: "button",
        onClick: onHelp,
        title: t("legend.help"),
        "aria-label": t("legend.help")
      }, "?"),
      (0, import_react9.createElement)("button", { className: "bb-icon", type: "button", onClick: onCollapse, title: t("panel.collapse") }, "\xD7")
    );
  }
  function Board(props) {
    const t = (typeof props?.t === "function" ? props.t : null) ?? defaultT;
    const [collapsed, setCollapsed] = (0, import_react9.useState)(() => readRaw(COLLAPSE_KEY, "0") === "1");
    const [size, setSize] = (0, import_react9.useState)(readSize);
    const [pos, setPos] = (0, import_react9.useState)(() => clampPos(readPos(), readSize()));
    const [sheet, setSheet] = (0, import_react9.useState)(null);
    const [waveMap, setWaveMap] = (0, import_react9.useState)({});
    const [noteMap, setNoteMap] = (0, import_react9.useState)({});
    const wrapRef = (0, import_react9.useRef)(null);
    const dragRef = (0, import_react9.useRef)(null);
    const rzRef = (0, import_react9.useRef)(null);
    const posRef = (0, import_react9.useRef)(pos);
    const sizeRef = (0, import_react9.useRef)(size);
    const seenRef = (0, import_react9.useRef)(/* @__PURE__ */ new Set());
    const primedRef = (0, import_react9.useRef)(false);
    const openRef = (0, import_react9.useRef)(/* @__PURE__ */ new Map());
    const waveTimers = (0, import_react9.useRef)(/* @__PURE__ */ new Map());
    const noteTimers = (0, import_react9.useRef)(/* @__PURE__ */ new Map());
    const { view, board, error } = useTeam({ active: !collapsed });
    (0, import_react9.useEffect)(() => {
      ensureStyle();
    }, []);
    (0, import_react9.useEffect)(() => {
      posRef.current = pos;
    }, [pos]);
    (0, import_react9.useEffect)(() => {
      sizeRef.current = size;
    }, [size]);
    (0, import_react9.useEffect)(() => {
      if (typeof window === "undefined" || typeof window.addEventListener !== "function") return void 0;
      const onResize = () => setPos((previous) => previous ? clampPos(previous, sizeRef.current) : previous);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    (0, import_react9.useEffect)(() => {
      if (!sheet) return void 0;
      if (typeof document === "undefined") return void 0;
      const host = wrapRef.current;
      if (!host?.querySelector) return void 0;
      const drawer = host.querySelector(".bb-drawer");
      const previous = document.activeElement ?? null;
      const focusable = () => [...drawer?.querySelectorAll?.("button:not([disabled])") ?? []];
      focusable()[0]?.focus?.();
      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setSheet(null);
          return;
        }
        if (event.key !== "Tab") return;
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus?.();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus?.();
        }
      };
      host.addEventListener("keydown", onKeyDown);
      return () => {
        host.removeEventListener("keydown", onKeyDown);
        previous?.focus?.();
      };
    }, [sheet]);
    const flip = (0, import_react9.useCallback)((value) => {
      setCollapsed(value);
      writeRaw(COLLAPSE_KEY, value ? "1" : "0");
    }, []);
    const bots = view?.bots ?? board?.bots ?? [];
    const activity = view?.activity ?? {};
    const workBots = view?.work?.bots ?? {};
    const waiting = view?.work?.waiting ?? {};
    const approvals = Array.isArray(view?.work?.approvals) ? view.work.approvals : [];
    const questions = view?.questions ?? {};
    const errors = Array.isArray(board?.errors) ? board.errors : [];
    const works = Array.isArray(board?.works) ? board.works : [];
    const rooms = board?.rooms ?? {};
    const nameOf = (0, import_react9.useCallback)((id) => bots.find((bot) => bot.id === id)?.name ?? id, [bots]);
    const rows = (0, import_react9.useMemo)(() => buildRows({
      bots,
      activity,
      workBots,
      waiting,
      approvals,
      questions,
      errors,
      works,
      rooms,
      waveMap,
      noteMap,
      t,
      nameOf
    }), [bots, activity, workBots, waiting, approvals, questions, errors, works, rooms, waveMap, noteMap, nameOf, t]);
    const { counts, openHandoffs, tone } = summarize(rows, works);
    const openDrawer = (0, import_react9.useCallback)((row) => {
      const id = row?.bot?.id;
      if (id) setSheet({ kind: "bot", id });
    }, []);
    const openChat = (0, import_react9.useCallback)((row) => {
      const id = row?.bot?.sessionId ?? row?.bot?.id;
      if (id) openSession(id);
    }, []);
    const alertSig = JSON.stringify(approvals.map((item) => item?.id)) + "|" + JSON.stringify(errors.map((item) => `${item.botId}:${item.at}`));
    (0, import_react9.useEffect)(() => {
      const keys = [
        ...approvals.map((item) => `a:${item?.id}`),
        ...errors.map((item) => `e:${item.botId}:${item.at}`)
      ];
      if (!primedRef.current) {
        keys.forEach((key) => seenRef.current.add(key));
        primedRef.current = true;
        return;
      }
      for (const item of approvals) {
        const key = `a:${item?.id}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        notify(
          `${t("notice.approval")} \xB7 ${nameOf(item?.botId)}`,
          item?.tool ? `${t("notice.approvalBody")} ${item.tool}${item.reason ? `\uFF1A${clip(item.reason, 40)}` : ""}` : t("notice.approvalFallback")
        );
      }
      for (const item of errors) {
        const key = `e:${item.botId}:${item.at}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        notify(`${t("notice.error")} \xB7 ${nameOf(item.botId)}`, clip(item.message, 80));
      }
      if (seenRef.current.size > 400) {
        const kept = [...seenRef.current].slice(-200);
        seenRef.current = /* @__PURE__ */ new Set([...kept, ...keys]);
      }
    }, [alertSig]);
    (0, import_react9.useEffect)(() => {
      for (const work of works) {
        const key = work.id ?? `${work.from}-${work.at}`;
        const previous = openRef.current.get(key);
        if (previous !== void 0 && previous > 0 && work.open === 0 && work.toId) {
          const botId = work.toId;
          setWaveMap((prev) => prev[botId] ? prev : { ...prev, [botId]: true });
          setNoteMap((prev) => prev[botId] ? prev : { ...prev, [botId]: true });
          clearTimeout(waveTimers.current.get(botId));
          clearTimeout(noteTimers.current.get(botId));
          waveTimers.current.set(botId, setTimeout(() => {
            waveTimers.current.delete(botId);
            setWaveMap((prev) => {
              if (!prev[botId]) return prev;
              const next = { ...prev };
              delete next[botId];
              return next;
            });
          }, 7e3));
          noteTimers.current.set(botId, setTimeout(() => {
            noteTimers.current.delete(botId);
            setNoteMap((prev) => {
              if (!prev[botId]) return prev;
              const next = { ...prev };
              delete next[botId];
              return next;
            });
          }, 2e3));
        }
        openRef.current.set(key, work.open ?? 0);
      }
      if (openRef.current.size > 64) {
        const alive = new Set(works.map((work) => work.id ?? `${work.from}-${work.at}`));
        for (const key of [...openRef.current.keys()]) {
          if (!alive.has(key)) openRef.current.delete(key);
        }
      }
    }, [works]);
    (0, import_react9.useEffect)(() => () => {
      for (const timer2 of waveTimers.current.values()) clearTimeout(timer2);
      for (const timer2 of noteTimers.current.values()) clearTimeout(timer2);
      waveTimers.current.clear();
      noteTimers.current.clear();
    }, []);
    const onPointerDown = (event) => {
      if (event.target.closest("button") || event.target.closest(".bb-rz")) return;
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, w: rect.width, h: rect.height };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const left = Math.min(Math.max(6, event.clientX - drag.dx), Math.max(6, window.innerWidth - drag.w - 6));
      const top = Math.min(Math.max(6, event.clientY - drag.dy), Math.max(6, window.innerHeight - 60));
      setPos({ left, top });
    };
    const onPointerUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      writeRaw(POS_KEY, JSON.stringify(posRef.current));
    };
    const onResizeDown = (event) => {
      event.stopPropagation();
      rzRef.current = { x: event.clientX, y: event.clientY, w: sizeRef.current.w, h: sizeRef.current.h };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const onResizeMove = (event) => {
      const start2 = rzRef.current;
      if (!start2) return;
      const w = Math.min(SIZE_MAX.w, Math.max(SIZE_MIN.w, start2.w + event.clientX - start2.x));
      const hh = Math.min(SIZE_MAX.h, Math.max(SIZE_MIN.h, start2.h + event.clientY - start2.y));
      setSize({ w, h: hh });
    };
    const onResizeUp = () => {
      if (!rzRef.current) return;
      rzRef.current = null;
      writeRaw(SIZE_KEY, JSON.stringify(sizeRef.current));
      const next = clampPos(posRef.current, sizeRef.current);
      if (next) {
        posRef.current = next;
        setPos(next);
        writeRaw(POS_KEY, JSON.stringify(next));
      }
    };
    const wrapStyle = pos ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" } : void 0;
    const drawerRow = sheet?.kind === "bot" ? rows.find((row) => row.bot.id === sheet.id) ?? null : null;
    const loading = !view && !board && !error;
    const reason = board && board.ok === false ? board.reason === "no-state" ? t("panel.noState") : board.reason === "unreadable" ? t("panel.unreadable") : board.reason ?? "" : "";
    const sceneOf2 = (id) => rows.find((row) => row.bot.id === id)?.scene;
    const notices = [];
    if (error) notices.push((0, import_react9.createElement)("div", { className: "bb-notice", key: "offline" }, `${t("panel.offline")}\uFF1A${error}`));
    if (board?.boardError) notices.push((0, import_react9.createElement)("div", { className: "bb-notice", key: "board" }, `${t("panel.boardError")}\uFF1A${board.boardError}`));
    if (reason) notices.push((0, import_react9.createElement)("div", { className: "bb-notice bb-notice-warn", key: "reason" }, reason));
    if (board?.stale) notices.push((0, import_react9.createElement)("div", { className: "bb-notice bb-notice-warn", key: "stale" }, t("panel.stale")));
    if (collapsed) {
      return (0, import_react9.createElement)(
        "div",
        { className: "bb-wrap", style: wrapStyle },
        (0, import_react9.createElement)(
          "button",
          {
            className: "bb-pill",
            type: "button",
            onClick: () => flip(false),
            title: t("panel.expand")
          },
          (0, import_react9.createElement)(Dot, { tone, busy: counts.busy > 0 }),
          (0, import_react9.createElement)("b", null, `${counts.busy} ${t("legend.busy")}`),
          counts.alert ? (0, import_react9.createElement)("span", { style: { fontWeight: 600 } }, `${counts.alert} ${t("legend.alert")}`) : null,
          counts.waiting ? (0, import_react9.createElement)("span", null, `${counts.waiting} ${t("legend.waiting")}`) : null,
          counts.error ? (0, import_react9.createElement)("span", { style: { fontWeight: 600 } }, `${counts.error} ${t("legend.error")}`) : null
        )
      );
    }
    return (0, import_react9.createElement)(
      "div",
      { className: "bb-wrap", style: wrapStyle, ref: wrapRef },
      (0, import_react9.createElement)(
        "div",
        { className: "bb-panel", style: { width: size.w, height: size.h } },
        (0, import_react9.createElement)(Head, {
          counts,
          openHandoffs,
          tone,
          t,
          onHelp: () => setSheet((previous) => previous?.kind === "legend" ? null : { kind: "legend" }),
          onCollapse: () => flip(true),
          drag: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
        }),
        (0, import_react9.createElement)(Body, {
          rows,
          works,
          notices,
          empty: (0, import_react9.createElement)(
            "div",
            { className: "bb-text", style: { color: "#6B6558" } },
            loading ? t("panel.loading") : t("panel.empty")
          ),
          t,
          onOpen: openDrawer,
          onPick: (edge) => {
            const target = rows.find((row) => row.bot.id === edge.toId);
            if (target) openDrawer(target);
          },
          sceneOf: sceneOf2
        }),
        drawerRow ? (0, import_react9.createElement)(Drawer, {
          row: drawerRow,
          t,
          canOpenChat: hasOpener(),
          onClose: () => setSheet(null),
          onOpenChat: (row) => {
            openChat(row);
            setSheet(null);
          }
        }) : null,
        sheet?.kind === "legend" ? (0, import_react9.createElement)(LegendSheet, { t, onClose: () => setSheet(null) }) : null,
        (0, import_react9.createElement)("div", {
          className: "bb-rz",
          title: t("panel.resize"),
          onPointerDown: onResizeDown,
          onPointerMove: onResizeMove,
          onPointerUp: onResizeUp,
          onPointerCancel: onResizeUp
        })
      )
    );
  }

  // src/client/index.js
  function apply(ctx) {
    const t = installLocale(ctx);
    const bindWorkspace = (host) => {
      let workspace;
      try {
        workspace = host?.uiWorkspace ?? host?.get?.("uiWorkspace");
      } catch {
        workspace = void 0;
      }
      if (workspace?.openSession) setOpener(workspace.openSession.bind(workspace));
    };
    if (typeof ctx.inject === "function") ctx.inject(["uiWorkspace"], bindWorkspace);
    else bindWorkspace(ctx);
    ctx.slots.inject("shell.overlay", () => ctx.slots.register({
      name: "shell.overlay",
      id: "bot-board",
      order: 500,
      locale: NS,
      inject: () => ({ t })
    }, Board));
  }
  var inject = ["slots"];
  return __toCommonJS(index_exports);
})();

    return __bbEntry
  },
})
