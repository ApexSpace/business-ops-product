(function () {
  var RESIZE = "trial-signup-widget:resize";

  function initFrame(frame) {
    frame.style.border = "0";
    frame.style.minWidth = "100%";
    frame.style.width = "100%";
    if (!frame.style.minHeight) {
      // Tall enough for the services step (3-col grid + Continue) before resize fires.
      frame.style.minHeight = "620px";
    }
  }

  document.querySelectorAll("iframe.trial-signup-widget").forEach(initFrame);

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== RESIZE || typeof data.height !== "number") {
      return;
    }

    document.querySelectorAll("iframe.trial-signup-widget").forEach(function (frame) {
      if (frame.contentWindow !== event.source) return;
      var height = Math.max(480, Math.ceil(data.height));
      frame.style.height = height + "px";
      frame.style.minHeight = height + "px";
      frame.style.overflow = "hidden";
    });
  });
})();
