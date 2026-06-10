(function () {
  var RESIZE = "plan-pricing-widget:resize";

  function initFrame(frame) {
    frame.style.border = "0";
    frame.style.minWidth = "100%";
    frame.style.width = "100%";
    if (!frame.style.minHeight) {
      frame.style.minHeight = "320px";
    }
  }

  document.querySelectorAll("iframe.plan-pricing-widget").forEach(initFrame);

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== RESIZE || typeof data.height !== "number") {
      return;
    }

    document.querySelectorAll("iframe.plan-pricing-widget").forEach(function (frame) {
      if (frame.contentWindow !== event.source) return;
      var height = Math.max(120, Math.ceil(data.height));
      frame.style.height = height + "px";
    });
  });
})();
