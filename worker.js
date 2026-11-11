// Cloudflare Worker：接收网站表单提交 → 转发到钉钉群机器人
// 环境变量（在 Cloudflare Workers 控制台 Settings → Variables 里配置，切勿写进前端）：
//   DINGTALK_WEBHOOK  钉钉自定义机器人 Webhook 完整地址（含 access_token）
//   ALLOWED_ORIGIN    （可选）允许的前端来源，如 https://你的项目.pages.dev；填 * 表示不校验

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理浏览器跨域预检
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 健康检查：浏览器打开 Worker 根路径能看到 OK
    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "consult-apply worker alive" });
    }

    // 只处理 /apply 的 POST
    if (request.method === "POST" && url.pathname === "/apply") {
      try {
        const body = await request.json();
        const name = (body.name || "").toString().slice(0, 100);
        const contact = (body.contact || "").toString().slice(0, 100);
        const demand = (body.demand || "").toString().slice(0, 1000);
        const budget = (body.budget || "").toString().slice(0, 100);

        if (!name || !contact) {
          return json({ ok: false, error: "姓名和联系方式必填" }, 400);
        }

        if (!env.DINGTALK_WEBHOOK) {
          return json({ ok: false, error: "服务端未配置 DINGTALK_WEBHOOK" }, 500);
        }

        const text = [
          "## 📩 新的咨询申请",
          "",
          `- **称呼**：${name}`,
          `- **联系方式**：${contact}`,
          `- **需求**：${demand || "（未填写）"}`,
          `- **预算**：${budget || "（未填写）"}`,
          `- **时间**：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
        ].join("\n");

        const dingRes = await fetch(env.DINGTALK_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            msgtype: "markdown",
            markdown: { title: "新的咨询申请", text },
          }),
        });
        const dingText = await dingRes.text();

        if (!dingRes.ok) {
          return json({ ok: false, error: "钉钉推送失败", detail: dingText }, 502);
        }

        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
      }
    }

    return json({ ok: false, error: "Not Found" }, 404);
  },
};
