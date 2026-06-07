import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RootConfig } from '@app/core/config/configuration';

@Injectable()
export class ChatbotWidgetPageService {
  constructor(private readonly config: ConfigService<RootConfig, true>) {}

  renderWidgetPage(publicKey: string): string {
    const backendPublicUrl = this.config.get('app.backendPublicUrl', {
      infer: true,
    });
    const apiPrefix = this.config.get('app.apiPrefix', { infer: true });
    const apiBase = `${backendPublicUrl.replace(/\/$/, '')}/${apiPrefix.replace(/^\//, '')}`;
    const escapedKey = this.escapeHtml(publicKey);
    const escapedApi = this.escapeHtml(apiBase);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chat</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111; }
    #root { display: flex; flex-direction: column; height: 100vh; max-height: 100dvh; }
    header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: #fff; }
    header img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 85%; padding: 8px 12px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-break: break-word; }
    .msg.in { margin-left: auto; color: #fff; }
    .msg.out { margin-right: auto; background: #f1f5f9; color: #111; }
    #form, #composer { padding: 16px; border-top: 1px solid #e2e8f0; }
    #form label { display: block; font-size: 12px; margin-bottom: 4px; color: #64748b; }
    #form input, #form textarea, #composer input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; margin-bottom: 8px; }
    button.primary { width: 100%; padding: 10px; border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; }
    button.ghost { width: 100%; padding: 8px; border: none; background: transparent; color: #64748b; cursor: pointer; font-size: 13px; }
    #composer { display: flex; gap: 8px; }
    #composer input { flex: 1; margin: 0; }
    #composer button { width: 44px; flex-shrink: 0; border: none; border-radius: 8px; color: #fff; cursor: pointer; }
    #status { text-align: center; padding: 24px; color: #64748b; font-size: 14px; }
    footer.brand { text-align: center; font-size: 10px; color: #94a3b8; padding: 4px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div id="root">
    <div id="status">Loading chat…</div>
  </div>
  <script>
(function () {
  var PUBLIC_KEY = "${escapedKey}";
  var API_BASE = "${escapedApi}";
  var POLL_MS = 4000;
  var state = { config: null, sessionId: null, messages: [], phase: "loading", since: null, color: "#2563eb" };

  function storageKey(suffix) { return "ba_chatbot_" + PUBLIC_KEY + "_" + suffix; }
  function visitorId() {
    var k = storageKey("visitor");
    var v = localStorage.getItem(k);
    if (!v) { v = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
  }
  function api(path, opts) {
    return fetch(API_BASE + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}))
      .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error((b && b.message) || "Request failed"); return b.data !== undefined ? b.data : b; }); });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function render() {
    var root = document.getElementById("root");
    root.innerHTML = "";
    if (!state.config) {
      root.appendChild(el("div", null, "Chat is unavailable."));
      return;
    }
    var cfg = state.config;
    state.color = cfg.primaryColor || state.color;
    var header = el("header");
    header.style.backgroundColor = state.color;
    if (cfg.avatarUrl) {
      var img = document.createElement("img");
      img.src = cfg.avatarUrl;
      img.alt = "";
      header.appendChild(img);
    }
    var titles = el("div");
    var titleEl = el("strong", null, cfg.widgetTitle);
    var subEl = el("small", null, cfg.acknowledgementMessage || "We typically reply soon");
    titles.appendChild(titleEl);
    titles.appendChild(document.createElement("br"));
    titles.appendChild(subEl);
    header.appendChild(titles);
    root.appendChild(header);

    if (state.phase === "form" && cfg.collectContactInfo && !state.sessionId) {
      var form = el("div");
      form.id = "form";
      form.appendChild(el("p", null, cfg.welcomeMessage));
      var name = inputField("name", cfg.requireName ? "Your name" : "Your name (optional)");
      var email = inputField("email", cfg.requireEmail ? "Email" : "Email (optional)", "email");
      var phone = cfg.requirePhone ? inputField("phone", "Phone") : null;
      form.appendChild(name);
      form.appendChild(email);
      if (phone) form.appendChild(phone);
      if (cfg.showNotesField) {
        var notes = document.createElement("textarea");
        notes.placeholder = "How can we help?";
        notes.rows = 3;
        notes.id = "notes";
        form.appendChild(notes);
      }
      var startBtn = el("button", "primary", "Start chat");
      startBtn.style.backgroundColor = state.color;
      startBtn.onclick = function () { startSession(false); };
      form.appendChild(startBtn);
      if (cfg.allowAnonymous) {
        var anon = el("button", "ghost", "Continue without details");
        anon.onclick = function () { startSession(true); };
        form.appendChild(anon);
      }
      root.appendChild(form);
    } else {
      var msgs = el("div");
      msgs.id = "messages";
      if (!state.messages.length) msgs.appendChild(el("p", null, cfg.welcomeMessage));
      state.messages.forEach(function (m) {
        var bubble = el("div", "msg " + (m.direction === "INBOUND" ? "in" : "out"), m.text || "");
        if (m.direction === "INBOUND") bubble.style.backgroundColor = state.color;
        msgs.appendChild(bubble);
      });
      root.appendChild(msgs);
      var composer = el("div");
      composer.id = "composer";
      var input = document.createElement("input");
      input.placeholder = "Type a message…";
      input.id = "composer-input";
      var send = el("button", null, "➤");
      send.style.backgroundColor = state.color;
      send.onclick = function () { sendMessage(input.value); };
      input.onkeydown = function (e) { if (e.key === "Enter") sendMessage(input.value); };
      composer.appendChild(input);
      composer.appendChild(send);
      root.appendChild(composer);
      msgs.scrollTop = msgs.scrollHeight;
    }
    if (cfg.showBranding) root.appendChild(el("footer", "brand", "Powered by website chat"));
  }
  function inputField(id, ph, type) {
    var i = document.createElement("input");
    i.id = id;
    i.placeholder = ph;
    if (type) i.type = type;
    return i;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function startSession(anonymous) {
    var body = {
      visitorId: visitorId(),
      visitorName: (document.getElementById("name") || {}).value || undefined,
      visitorEmail: (document.getElementById("email") || {}).value || undefined,
      visitorPhone: (document.getElementById("phone") || {}).value || undefined,
      initialMessage: (document.getElementById("notes") || {}).value || undefined,
      pageUrl: document.referrer || window.location.href,
      anonymous: !!anonymous
    };
    api("/public/chatbots/" + encodeURIComponent(PUBLIC_KEY) + "/sessions", { method: "POST", body: JSON.stringify(body) })
      .then(function (data) {
        state.sessionId = data.sessionId;
        localStorage.setItem(storageKey("session"), data.sessionId);
        state.phase = "chat";
        render();
        poll();
      })
      .catch(function () { alert("Could not start chat"); });
  }
  function sendMessage(text) {
    text = (text || "").trim();
    if (!text) return;
    if (!state.sessionId) {
      startSession(!state.config.collectContactInfo);
      return;
    }
    api("/public/chatbots/sessions/" + encodeURIComponent(state.sessionId) + "/messages", { method: "POST", body: JSON.stringify({ text: text }) })
      .then(function (msg) {
        state.messages.push(msg);
        var input = document.getElementById("composer-input");
        if (input) input.value = "";
        render();
        poll();
      });
  }
  function poll() {
    if (!state.sessionId) return;
    var q = state.since ? "?since=" + encodeURIComponent(state.since) : "";
    api("/public/chatbots/sessions/" + encodeURIComponent(state.sessionId) + "/messages" + q)
      .then(function (items) {
        if (items && items.length) {
          var seen = {};
          state.messages.forEach(function (m) { seen[m.id] = true; });
          items.forEach(function (m) { if (!seen[m.id]) state.messages.push(m); });
          state.since = items[items.length - 1].createdAt;
          render();
        }
      })
      .catch(function () {});
  }
  api("/public/chatbots/" + encodeURIComponent(PUBLIC_KEY) + "/config")
    .then(function (cfg) {
      state.config = cfg;
      state.sessionId = localStorage.getItem(storageKey("session"));
      state.phase = state.sessionId ? "chat" : (cfg.collectContactInfo ? "form" : "chat");
      if (!state.sessionId && !cfg.collectContactInfo) {
        startSession(true);
        return;
      }
      render();
      if (state.sessionId) {
        poll();
        setInterval(poll, POLL_MS);
      }
    })
    .catch(function () {
      document.getElementById("root").innerHTML = "<div id=\\"status\\">Chat is unavailable right now.</div>";
    });
})();
  </script>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
