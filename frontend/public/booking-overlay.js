(function () {
  var w = window;
  w.BusinessOps = w.BusinessOps || {};
  var slug = w.BusinessOps.businessSlug;
  if (!slug) return;

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var link = target.closest("a[data-business-ops-booking]");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    var overlay = document.getElementById("business-ops-booking-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "business-ops-booking-overlay";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;";
      var frame = document.createElement("iframe");
      frame.src = href;
      frame.style.cssText =
        "width:100%;max-width:720px;height:90vh;border:0;border-radius:12px;background:#fff;";
      overlay.appendChild(frame);
      overlay.addEventListener("click", function (ev) {
        if (ev.target === overlay) overlay.remove();
      });
      document.body.appendChild(overlay);
    }
  });
})();
