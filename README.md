# 极简验证流：网站表单 → Cloudflare Worker → 钉钉

目录结构：
```
consult-site/
├── public/
│   └── index.html   # 静态页面（放到 Cloudflare Pages 托管）
├── worker.js        # 后端（放到 Cloudflare Workers）
└── README.md
```

## 一、创建钉钉群机器人，拿到 Webhook

1. 钉钉里建一个群（可以只有你自己 + 一个机器人）。
2. 群设置 → 智能群助手 → 添加机器人 → 选「自定义」（通过 Webhook 接入）。
3. 安全设置选「**自定义关键词**」，填：`咨询`（页面推送标题含"新的咨询申请"以外的正文需含关键词；本 Worker 推送内容含"咨询"二字，满足关键词校验）。
   - 或选「加签」，把 Secret 记下（本极简版用关键词更简单）。
4. 完成，复制 Webhook 地址，形如：
   `https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxx`

> 若选「加签」，Worker 需要额外计算 sign，本极简版未包含；验证阶段建议选「自定义关键词」= 咨询。

## 二、部署前端到 Cloudflare Pages

1. 把本仓库推到你的 GitHub（见第四节）。
2. Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git。
3. 选中该仓库，构建配置：
   - Build command：`exit 0`
   - Build output directory：`public`
4. 部署后得到：`https://你的项目名.pages.dev`

## 三、部署后端到 Cloudflare Workers

1. Cloudflare 控制台 → Workers & Pages → Create → Worker → 命名 `consult-apply`。
2. 把 `worker.js` 内容贴进在线编辑器，Deploy。
3. Settings → Variables → 添加变量：
   - `DINGTALK_WEBHOOK` = 你第一步复制的 Webhook（建议勾选 Encrypt/Secret）
4. 部署后得到：`https://consult-apply.你的账号.workers.dev`
5. 浏览器打开该地址应看到 `{"ok":true,"service":"consult-apply worker alive"}`。

## 四、把前端连到后端

打开 `public/index.html`，把这一行的地址换成你自己的 Worker：
```js
const API_ENDPOINT = "https://consult-apply.你的账号.workers.dev";
```
提交到 GitHub，Cloudflare Pages 会自动重新部署。

## 五、放到 GitHub 的正确目录位置

仓库根目录建议这样放（与 Pages 的 build output directory=public 对应）：
```
你的仓库名/
├── public/
│   └── index.html
├── worker.js
└── README.md
```
前端只需 public/ 目录；worker.js 由你在 Cloudflare 在线编辑器粘贴，不必放进 Pages 发布目录（放仓库里只是备份）。

## 六、验证

1. 浏览器打开 `https://你的项目名.pages.dev`
2. 填写表单（称呼、联系方式必填），提交。
3. 页面显示「提交成功」，同时钉钉群收到一条 Markdown 卡片。
4. 若失败：打开浏览器控制台（F12）看报错；或在 Worker 里返回钉钉原始响应排查。
