// Keeps the download page on the current release without a deploy.
//
// version.json is the same manifest the app's updater reads, served by jsDelivr.
// If the fetch fails the page keeps the numbers baked into the markup, so an
// offline visitor still sees a working download.
(function () {
  "use strict";

  // GitHub's contents API is authoritative and CORS-enabled, so it is the
  // primary source. jsDelivr is a fallback only: it caches @main and can serve
  // the previous manifest for a while after a release, which is exactly how a
  // page ends up advertising last week's build.
  var SOURCES = [
    {
      url: "https://api.github.com/repos/lolcaken/the-moath-macro/contents/version.json?ref=main",
      contents: true
    },
    {
      url: "https://cdn.jsdelivr.net/gh/lolcaken/the-moath-macro@main/version.json",
      contents: false
    }
  ];

  var toast = document.getElementById("toast");
  var toastTimer = 0;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function formatSize(bytes) {
    if (!bytes || typeof bytes !== "number") return null;
    // Decimal megabytes, the same number GitHub prints on the release page.
    return (bytes / 1e6).toFixed(2) + " MB";
  }

  function shortSha(sha) {
    if (!sha || sha.length < 16) return sha;
    return sha.slice(0, 8) + "\u2026" + sha.slice(-7);
  }

  function setText(name, value) {
    if (!value) return;
    var nodes = document.querySelectorAll('[data-manifest="' + name + '"]');
    for (var i = 0; i < nodes.length; i += 1) nodes[i].textContent = value;
  }

  function setHref(id, url) {
    var node = document.getElementById(id);
    if (node && url) node.href = url;
  }

  function apply(manifest) {
    if (!manifest || !manifest.assets) return;
    var portable = manifest.assets["windows-x64"];
    var setup = manifest.assets["windows-x64-setup"];

    setText("version", "v" + manifest.version);
    if (portable) {
      setText("size-zip", formatSize(portable.size));
      setText("sha", shortSha(portable.sha256));
      setHref("btn-portable", portable.url);
      if (portable.sha256) {
        document.body.dataset.sha = portable.sha256;
      }
    }
    if (setup) {
      setText("size-setup", formatSize(setup.size));
      setHref("btn-installer", setup.url);
    }
  }

  function decodeContents(payload) {
    // contents API: { content: "<base64>", encoding: "base64" }
    if (!payload || !payload.content) throw new Error("no content");
    var binary = window.atob(payload.content.replace(/\n/g, ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    var text = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(text);
  }

  function fetchManifest() {
    if (!("fetch" in window)) return;

    var next = function (index) {
      if (index >= SOURCES.length) return;
      var source = SOURCES[index];
      fetch(source.url, { cache: "no-cache" })
        .then(function (res) {
          if (!res.ok) throw new Error("manifest " + res.status);
          return res.json();
        })
        .then(function (payload) {
          var manifest = source.contents ? decodeContents(payload) : payload;
          if (!manifest || !manifest.version) throw new Error("bad manifest");
          apply(manifest);
        })
        .catch(function () {
          next(index + 1);
        });
    };

    next(0);
  }

  function copyChecksum() {
    var button = document.getElementById("copy-sha");
    if (!button) return;
    var sha = document.body.dataset.sha;
    if (!sha) {
      var node = document.querySelector('[data-manifest="sha"]');
      sha = node ? node.textContent : "";
    }
    if (!sha) return;

    var done = function () { showToast("SHA-256 copied"); };
    var failed = function () { showToast("Copy failed"); };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sha).then(done, failed);
      return;
    }
    var area = document.createElement("textarea");
    area.value = sha;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy") ? done() : failed();
    } catch (error) {
      failed();
    }
    document.body.removeChild(area);
  }

  var copyButton = document.getElementById("copy-sha");
  if (copyButton) copyButton.addEventListener("click", copyChecksum);

  fetchManifest();
})();
