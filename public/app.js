const postsEl = document.getElementById("posts");
const relevantOnly = document.getElementById("relevantOnly");

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderPost(p) {
  const when = p.published_at ?? p.fetched_at;
  const badge = p.is_market_relevant ? `<span class="badge">${escapeHtml(p.matched_keywords)}</span>` : "";
  const link = p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener">source</a>` : "";
  return `
    <article class="post ${p.is_market_relevant ? "relevant" : ""}">
      <div class="meta">${new Date(when).toLocaleString()} ${badge} ${link}</div>
      <div class="content">${escapeHtml(p.content || p.title || "")}</div>
    </article>
  `;
}

async function load() {
  const qs = relevantOnly.checked ? "?relevant=1" : "";
  const res = await fetch(`/api/posts${qs}`);
  const { posts } = await res.json();
  postsEl.innerHTML = posts.length ? posts.map(renderPost).join("") : "<p class=\"empty\">No posts yet.</p>";
}

relevantOnly.addEventListener("change", load);
load();
setInterval(load, 30_000);
