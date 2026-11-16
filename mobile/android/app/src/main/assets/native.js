(() => {
  if (window.__membershipPrintInstalled) return;
  window.__membershipPrintInstalled = true;
  const print = doc => {
    const html = '<!doctype html>' + doc.documentElement.outerHTML;
    window.location.href = 'membership-print://invoice#' + encodeURIComponent(html);
  };
  window.print = () => print(document);
  const prepare = frame => {
    // The invoice uses a same-origin srcdoc iframe; replace print before its onload handler.
    frame.addEventListener('load', () => {
      try { frame.contentWindow.print = () => print(frame.contentDocument); } catch {}
    }, true);
  };
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.tagName === 'IFRAME') prepare(node);
      node.querySelectorAll('iframe').forEach(prepare);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
