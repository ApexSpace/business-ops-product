(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-chatbot-key");
  if (!key) return;

  var origin = script.src.replace(/\/widgets\/chatbot\.js.*$/, "");
  var iframeSrc = origin + "/widgets/chatbot/" + encodeURIComponent(key);
  var position = script.getAttribute("data-position") || "right";
  var side = position === "left" ? "left:20px" : "right:20px";

  var launcher = document.createElement("button");
  launcher.setAttribute("aria-label", "Open chat");
  launcher.style.cssText =
    "position:fixed;bottom:20px;" +
    side +
    ";z-index:9998;width:56px;height:56px;border-radius:50%;border:none;background:#2563eb;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2);font-size:24px;line-height:1;";
  launcher.textContent = "\uD83D\uDCAC";

  var frame = document.createElement("iframe");
  frame.src = iframeSrc;
  frame.title = "Website chat";
  frame.style.cssText =
    "display:none;position:fixed;bottom:88px;" +
    side +
    ";z-index:9999;width:380px;height:min(600px,85vh);max-width:calc(100vw - 24px);border:0;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.18);";
  frame.allow = "clipboard-write";

  var open = false;
  launcher.addEventListener("click", function () {
    open = !open;
    frame.style.display = open ? "block" : "none";
    launcher.textContent = open ? "\u00D7" : "\uD83D\uDCAC";
  });

  document.body.appendChild(launcher);
  document.body.appendChild(frame);
})();
