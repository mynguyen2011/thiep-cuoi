// Trang admin bản GitHub Pages: đăng nhập bằng token GitHub, lưu thiệp bằng cách commit vào kho
(async function () {
  const { THEMES, render, tick, toast, esc } = Invite;
  const $ = (s) => document.querySelector(s);
  const SITE = location.href.replace(/admin\.html.*$/, "").replace(/[?#].*$/, "");
  let GH = null;            // {owner, repo, branch, token}
  let saved = null, draft = null, dirty = false, wishes = [], sha = null;
  const pending = {};       // "images/x.jpg" -> dataURL (chưa đẩy lên GitHub)
  const src = (p) => (p && pending[p]) || p;

  // ---------- GitHub API ----------
  async function gh(path, opts = {}) {
    const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(GH.owner)}/${encodeURIComponent(GH.repo)}${path ? "/" + path : ""}`, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${GH.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = r.status === 401 ? "Token không hợp lệ hoặc đã hết hạn." : r.status === 404 ? "Không tìm thấy kho hoặc token không có quyền vào kho này." : r.status === 403 ? "Token không có quyền ghi (cần quyền Contents: Read and write)." : r.status === 409 || r.status === 422 ? "Thiệp vừa được sửa ở nơi khác. Tải lại trang rồi sửa lại giúp nhé." : (j.message || "Lỗi GitHub " + r.status);
      throw Object.assign(new Error(msg), { status: r.status });
    }
    return j;
  }
  const b64ToText = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  function textToB64(t) { const bytes = new TextEncoder().encode(t); let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  async function readWedding() {
    const f = await gh(`contents/data/wedding.json?ref=${encodeURIComponent(GH.branch)}&t=${Date.now()}`);
    sha = f.sha; return JSON.parse(b64ToText(f.content));
  }
  async function putFile(path, b64, message, fileSha) {
    const body = { message, content: b64, branch: GH.branch }; if (fileSha) body.sha = fileSha;
    return gh(`contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
  }

  // ---------- đăng nhập ----------
  const store = { get() { try { return JSON.parse(localStorage.getItem("gh-admin") || sessionStorage.getItem("gh-admin") || "null"); } catch { return null; } },
    set(v, remember) { try { (remember ? localStorage : sessionStorage).setItem("gh-admin", JSON.stringify(v)); } catch {} },
    clear() { try { localStorage.removeItem("gh-admin"); sessionStorage.removeItem("gh-admin"); } catch {} } };
  function guessRepo() {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return { owner: "", repo: "" };
    const seg = location.pathname.split("/").filter(Boolean)[0];
    return { owner: m[1], repo: seg && !seg.endsWith(".html") ? seg : `${m[1]}.github.io` };
  }
  function showLogin(msg) {
    $("#ui").innerHTML = ""; $("#app").innerHTML = ""; document.body.classList.remove("editing");
    const g = guessRepo(), last = store.get() || {};
    $("#owner").value = last.owner || g.owner; $("#repo").value = last.repo || g.repo; $("#branch").value = last.branch || "main";
    $("#login").hidden = false; $("#loginErr").textContent = msg || ""; $("#token").focus();
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true; $("#loginErr").textContent = "";
    GH = { owner: $("#owner").value.trim(), repo: $("#repo").value.trim(), branch: $("#branch").value.trim() || "main", token: $("#token").value.trim() };
    try {
      if (!GH.owner || !GH.repo || !GH.token) throw new Error("Vui lòng điền đủ tài khoản, tên kho và token.");
      const info = await gh("");
      if (!info.permissions || !info.permissions.push) throw new Error("Token này chỉ đọc được, không ghi được vào kho.");
      store.clear(); store.set(GH, $("#remember").checked); $("#token").value = "";
      await start();
    } catch (x) { GH = null; $("#loginErr").textContent = x.message; }
    finally { btn.disabled = false; }
  });

  async function start() {
    $("#login").hidden = true;
    saved = await readWedding();
    wishes = await loadWishes(saved.sheetUrl);
    draft = structuredClone(saved); dirty = false;
    $("#ui").innerHTML = editorHtml();
    document.body.classList.add("editing");
    fillEditor(); paint(); bind();
  }
  async function loadWishes(url) {
    if (!url) return [];
    try { const r = await fetch(url + (url.includes("?") ? "&" : "?") + "action=wishes"); return r.ok ? await r.json() : []; } catch { return []; }
  }
  function viewData() {
    const d = structuredClone(draft);
    ["cover", "gQr", "bQr"].forEach((k) => (d[k] = src(d[k])));
    d.album = (d.album || []).map(src);
    if (!d.sheetUrl) { d.rsvpOpen = false; d.wishesOpen = false; }
    return d;
  }
  function paint() { $("#app").innerHTML = render(viewData(), { preview: true, wishes }); tick(); }

  const F = (id, label, hint, ph, type = "text") => `<label class="fl">${label}${hint ? `<span class="hint">${hint}</span>` : ""}${type === "area" ? `<textarea id="f-${id}" data-k="${id}" placeholder="${esc(ph)}"></textarea>` : `<input id="f-${id}" data-k="${id}" type="${type}" placeholder="${esc(ph)}">`}</label>`;
  const G = (title, sub, inner, open) => `<details class="grp"${open ? " open" : ""}><summary><span>${title}<small>${sub}</small></span></summary><div class="grp-in">${inner}</div></details>`;
  function editorHtml() {
    return `<aside class="editor" aria-label="Quản lý thiệp">
  <div class="ed-head"><h3>Quản lý thiệp</h3><button class="btn ghost peekbtn" type="button" id="peek">Xem thử</button><button class="btn ghost" type="button" id="logout">Đăng xuất</button></div>
  <div class="ed-tabs" role="tablist">
    <button role="tab" aria-selected="true" data-tab="p-content">Nội dung</button>
    <button role="tab" aria-selected="false" data-tab="p-guests">Khách mời</button>
    <button role="tab" aria-selected="false" data-tab="p-share">Chia sẻ</button>
  </div>
  <div class="ed-body" id="p-content">
    <div class="tip">Điền từng mục bên dưới, thiệp bên cạnh đổi ngay khi bạn gõ. Mục để trống sẽ tự ẩn. Bấm <b>Lưu thiệp</b> để khách thấy bản mới.${draft.sample ? `<div style="margin-top:8px">Các ô đang có nội dung ví dụ. <button class="btn ghost" type="button" id="clearSample">Xoá hết ví dụ</button></div>` : ""}</div>
    ${G("1. Màu & phong cách", "Chọn mẫu, bật song ngữ", `<div class="themes" id="themes">${Object.entries(THEMES).map(([k, t]) => `<button type="button" data-theme="${k}" style="background:${t.bg};color:${t.ac}" aria-label="${t.name}">${t.motif}</button>`).join("")}</div><div class="themes-l">${Object.values(THEMES).map((t) => `<span>${t.name}</span>`).join("")}</div><label class="chk"><input type="checkbox" id="f-bilingual" data-k="bilingual"> Hiện thêm tiếng Anh cho khách nước ngoài</label>`, true)}
    ${G("2. Cô dâu & chú rể", "Tên in to trên bìa thiệp", `<div class="two">${F("groom", "Tên chú rể", "Tên gọi, 2–3 chữ", "VD: Minh Quân")}${F("bride", "Tên cô dâu", "", "VD: Thảo Vy")}</div>`, true)}
    ${G("3. Ngày cưới", "Ngày giờ tiệc, ngày âm lịch", `<div class="two">${F("date", "Ngày tiệc cưới", "", "", "date")}${F("time", "Giờ đón khách", "", "", "time")}</div>${F("lunar", "Ngày âm lịch", "Ghi giống thiệp giấy, có thể để trống", "VD: Nhằm ngày 12 tháng 11 năm Bính Ngọ")}`)}
    ${G("4. Nơi tổ chức tiệc", "Nhà hàng, sảnh, địa chỉ, bản đồ", `${F("venue", "Tên nhà hàng / nơi tổ chức", "", "VD: Trung tâm Tiệc cưới Hoa Sen")}${F("hall", "Sảnh", "Để trống nếu tổ chức tại nhà", "VD: Sảnh Ngọc Lan")}${F("address", "Địa chỉ", "", "VD: 18 Đường Hoa Sen, Quận 3, TP.HCM")}${F("map", "Link Google Maps", "Mở Google Maps, tìm nhà hàng, bấm Chia sẻ → Sao chép đường liên kết. Để trống thì thiệp tự tìm theo địa chỉ.", "https://maps.app.goo.gl/...", "url")}`)}
    ${G("5. Gia đình hai bên", "Tên cha mẹ, lời mời", `${F("groomParents", "Cha mẹ chú rể", "Mỗi người một dòng", "Ông Nguyễn Văn A\nBà Trần Thị B", "area")}${F("groomHome", "Địa chỉ nhà trai", "Có thể để trống", "VD: Quận 3, TP.HCM")}${F("brideParents", "Cha mẹ cô dâu", "Mỗi người một dòng", "Ông Lê Văn C\nBà Phạm Thị D", "area")}${F("brideHome", "Địa chỉ nhà gái", "Có thể để trống", "VD: TP. Thủ Đức")}${F("message", "Lời mời", "", "Trân trọng kính mời quý khách đến dự...", "area")}`)}
    ${G("6. Các lễ trong ngày", "Lễ vu quy, lễ thành hôn (không bắt buộc)", `<div class="two">${F("ev1Label", "Tên lễ 1", "", "Lễ vu quy")}${F("ev1Time", "Giờ & ngày", "", "08:00 · 20/12/2026")}</div>${F("ev1Place", "Nơi làm lễ 1", "", "Tư gia nhà gái")}<div class="two">${F("ev2Label", "Tên lễ 2", "", "Lễ thành hôn")}${F("ev2Time", "Giờ & ngày", "", "10:00 · 20/12/2026")}</div>${F("ev2Place", "Nơi làm lễ 2", "", "Tư gia nhà trai")}`)}
    ${G("7. Ảnh cưới", "1 ảnh bìa và tối đa 12 ảnh album", `<label class="fl">Ảnh bìa<span class="hint">Ảnh dọc, rõ mặt hai bạn</span><input type="file" id="f-cover" accept="image/*"></label><div class="thumbs" id="coverThumb"></div><label class="fl">Album ảnh<span class="hint">Chọn nhiều ảnh cùng lúc được. Ảnh tự thu nhỏ để thiệp mở nhanh.</span><input type="file" id="f-album" accept="image/*" multiple></label><div class="thumbs" id="albumThumbs"></div>`)}
    ${G("8. Chuyện tình & lời cảm ơn", "Vài dòng kỷ niệm", `${F("story", "Câu chuyện của hai bạn", "Để trống nếu không muốn hiện", "Gặp nhau năm..., sau ... năm yêu nhau...", "area")}${F("thanks", "Lời cảm ơn cuối thiệp", "", "Sự hiện diện của quý khách là niềm vinh hạnh...", "area")}`)}
    ${G("9. Xác nhận tham dự & lời chúc", "Nối Google Sheets, bật/tắt form, số liên hệ", `${F("sheetUrl", "Link Google Apps Script (Web app)", "Dán link kết thúc bằng /exec, xem hướng dẫn trong thư mục google-sheets. Để trống thì form xác nhận và lời chúc sẽ ẩn.", "https://script.google.com/macros/s/.../exec", "url")}${F("sheetLink", "Link Google Sheet của bạn", "Để mở nhanh danh sách khách ở tab Khách mời", "https://docs.google.com/spreadsheets/d/...", "url")}<label class="chk"><input type="checkbox" id="f-rsvpOpen" data-k="rsvpOpen"> Cho khách gửi xác nhận tham dự</label><label class="chk"><input type="checkbox" id="f-wishesOpen" data-k="wishesOpen"> Cho khách gửi lời chúc</label><div class="two">${F("gName", "Người liên hệ 1", "", "Nhà trai / Anh Quân")}${F("gContact", "Số điện thoại", "", "0901 234 567", "tel")}</div><div class="two">${F("bName", "Người liên hệ 2", "", "Nhà gái / Chị Vy")}${F("bContact", "Số điện thoại", "", "0907 654 321", "tel")}</div>`)}
    ${G("10. Hộp mừng cưới", "Số tài khoản và mã QR ngân hàng", `<div class="tip">Mở app ngân hàng, vào "Mã QR nhận tiền", chụp màn hình rồi tải lên đây. Để trống nếu không muốn hiện.</div><b style="font-size:13px">Nhà trai</b><div class="two">${F("gBank", "Ngân hàng", "", "Vietcombank")}${F("gAcc", "Số tài khoản", "", "0123 4567 890")}</div>${F("gHolder", "Chủ tài khoản", "", "NGUYEN MINH QUAN")}<label class="fl">Ảnh mã QR nhà trai<input type="file" id="f-gQr" accept="image/*"></label><div class="thumbs" id="gQrThumb"></div><b style="font-size:13px">Nhà gái</b><div class="two">${F("bBank", "Ngân hàng", "", "Techcombank")}${F("bAcc", "Số tài khoản", "", "1903 5555 2468")}</div>${F("bHolder", "Chủ tài khoản", "", "LE THAO VY")}<label class="fl">Ảnh mã QR nhà gái<input type="file" id="f-bQr" accept="image/*"></label><div class="thumbs" id="bQrThumb"></div>`)}
    <div id="discardBox"></div>
  </div>
  <div class="ed-body" id="p-guests" hidden></div>
  <div class="ed-body" id="p-share" hidden>
    <details class="grp" open><summary><span>Link cho khách<small>Chỉ xem thiệp, không có nút sửa</small></span></summary><div class="grp-in">
      <div class="linkbox"><input readonly value="${esc(SITE)}"><button class="btn sec2" type="button" data-copy="${esc(SITE)}">Sao chép</button></div>
      <a class="btn sec2" href="./" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">Mở thử như khách</a>
      <div class="tip">Sau khi bấm Lưu, GitHub cần khoảng 1–2 phút để cập nhật trang cho khách.</div>
    </div></details>
    <details class="grp" open><summary><span>Link admin<small>Cần token GitHub để đăng nhập</small></span></summary><div class="grp-in">
      <div class="linkbox"><input readonly value="${esc(SITE)}admin.html"><button class="btn sec2" type="button" data-copy="${esc(SITE)}admin.html">Sao chép</button></div>
      <div class="tip">Kho: <b>${esc(GH.owner)}/${esc(GH.repo)}</b> · nhánh <b>${esc(GH.branch)}</b></div>
    </div></details>
  </div>
  <div class="ed-foot" id="foot"><button class="btn sec2" type="button" id="cancel">Hoàn tác</button><button class="btn pri" type="button" id="save">Lưu thiệp</button></div>
</aside>`;
  }

  function fillEditor() {
    document.querySelectorAll("[data-k]").forEach((el) => {
      const k = el.dataset.k;
      if (el.type === "checkbox") el.checked = k === "rsvpOpen" || k === "wishesOpen" ? draft[k] !== false : !!draft[k];
      else el.value = draft[k] ?? "";
    });
    document.querySelectorAll("[data-theme]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.theme === draft.theme));
    drawThumbs();
  }
  function drawThumbs() {
    const one = (id, key) => { $(id).innerHTML = draft[key] ? `<div class="t" style="background-image:url('${esc(src(draft[key]))}')"><button type="button" data-rm="${key}" aria-label="Xoá ảnh">×</button></div>` : ""; };
    one("#coverThumb", "cover"); one("#gQrThumb", "gQr"); one("#bQrThumb", "bQr");
    $("#albumThumbs").innerHTML = (draft.album || []).map((u, i) => `<div class="t" style="background-image:url('${esc(src(u))}')"><button type="button" data-rm="album:${i}" aria-label="Xoá ảnh">×</button></div>`).join("");
  }
  function setDirty(v) { dirty = v; $("#save").textContent = v ? "Lưu thiệp •" : "Lưu thiệp"; }

  async function shrink(file, max, type = "image/jpeg", q = 0.82) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Không đọc được ảnh này.")); i.src = url; });
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const x = c.getContext("2d"); if (type === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL(type, q);
    } finally { URL.revokeObjectURL(url); }
  }
  // Ảnh được giữ tạm trong trình duyệt, chỉ đẩy lên GitHub khi bấm Lưu
  async function addImage(file, max, type) {
    const dataUrl = await shrink(file, max, type);
    const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, "0")).join("");
    const path = `images/${id}.${type === "image/png" ? "png" : "jpg"}`;
    pending[path] = dataUrl; return path;
  }

  function bind() {
    const ed = $(".editor");
    ed.addEventListener("input", (e) => {
      const el = e.target; if (!el.dataset.k) return;
      draft[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value.trim() === "" && el.type === "url" ? "" : el.value; setDirty(true); paint();
    });
    ed.addEventListener("change", async (e) => { if (e.target.id === "f-sheetUrl") { wishes = await loadWishes(draft.sheetUrl); paint(); } });
    ed.addEventListener("click", (e) => {
      const th = e.target.closest("[data-theme]"); if (th) { draft.theme = th.dataset.theme; setDirty(true); fillEditor(); paint(); }
      const rm = e.target.closest("[data-rm]");
      if (rm) { const k = rm.dataset.rm; if (k.startsWith("album:")) draft.album.splice(+k.split(":")[1], 1); else draft[k] = ""; setDirty(true); drawThumbs(); paint(); }
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        document.querySelectorAll(".ed-tabs button").forEach((b) => b.setAttribute("aria-selected", b === tab));
        ["p-content", "p-guests", "p-share"].forEach((id) => ($("#" + id).hidden = id !== tab.dataset.tab));
        $("#foot").hidden = tab.dataset.tab !== "p-content";
        if (tab.dataset.tab === "p-guests") loadGuests();
      }
    });
    const single = (id, key, max, type) => $(id).addEventListener("change", async (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      try { draft[key] = await addImage(f, max, type); setDirty(true); drawThumbs(); paint(); toast("Đã thêm ảnh. Bấm Lưu thiệp để đăng."); } catch (x) { toast(x.message); }
    });
    single("#f-cover", "cover", 1200, "image/jpeg"); single("#f-gQr", "gQr", 700, "image/png"); single("#f-bQr", "bQr", 700, "image/png");
    $("#f-album").addEventListener("change", async (e) => {
      const files = [...e.target.files]; e.target.value = ""; draft.album = draft.album || [];
      const room = 12 - draft.album.length; if (room <= 0) return toast("Album đã đủ 12 ảnh, xoá bớt để thêm");
      for (const f of files.slice(0, room)) { try { draft.album.push(await addImage(f, 1400, "image/jpeg")); } catch (x) { toast(x.message); } }
      setDirty(true); drawThumbs(); paint();
      toast(files.length > room ? `Đã thêm ${room} ảnh, album tối đa 12 ảnh` : "Đã thêm ảnh. Bấm Lưu thiệp để đăng.");
    });
    $("#peek").onclick = () => {
      document.body.classList.add("peek");
      const b = document.createElement("button"); b.className = "fab"; b.textContent = "Tiếp tục sửa";
      b.onclick = () => { document.body.classList.remove("peek"); b.remove(); }; document.body.appendChild(b);
    };
    $("#cancel").onclick = () => {
      if (!dirty) return toast("Không có thay đổi nào chưa lưu");
      $("#discardBox").innerHTML = `<div class="confirm">Quay về bản đã lưu, bỏ các thay đổi?<div style="display:flex;gap:8px"><button class="btn sec2" type="button" id="keep">Tiếp tục sửa</button><button class="btn pri" type="button" id="discard">Bỏ thay đổi</button></div></div>`;
      $("#discardBox").scrollIntoView({ behavior: "smooth" });
      $("#keep").onclick = () => ($("#discardBox").innerHTML = "");
      $("#discard").onclick = () => { draft = structuredClone(saved); $("#discardBox").innerHTML = ""; setDirty(false); fillEditor(); paint(); };
    };
    $("#save").onclick = async () => {
      const btn = $("#save"); btn.disabled = true;
      try {
        const used = new Set([draft.cover, draft.gQr, draft.bQr, ...(draft.album || [])]);
        const todo = Object.keys(pending).filter((p) => used.has(p));
        let n = 0;
        for (const p of todo) {
          btn.textContent = `Đang đăng ảnh ${++n}/${todo.length}…`;
          await putFile(p, pending[p].split(",")[1], "Thêm ảnh thiệp cưới");
          delete pending[p];
        }
        btn.textContent = "Đang lưu…";
        const clean = { ...draft, sample: false };
        const res = await putFile("data/wedding.json", textToB64(JSON.stringify(clean, null, 2) + "\n"), "Cập nhật thiệp cưới", sha);
        sha = res.content.sha; saved = clean; draft = structuredClone(saved); setDirty(false);
        toast("Đã lưu. Khoảng 1–2 phút nữa khách sẽ thấy bản mới.");
      } catch (x) { setDirty(true); toast(x.message); if (x.status === 401) showLogin(x.message); }
      finally { btn.disabled = false; if (!dirty) btn.textContent = "Lưu thiệp"; }
    };
    $("#logout").onclick = () => {
      if (dirty && !$("#logoutConfirm")) {
        $("#discardBox").innerHTML = `<div class="confirm" id="logoutConfirm">Bạn có thay đổi chưa lưu. Bấm Đăng xuất lần nữa để thoát mà không lưu.</div>`;
        return $("#discardBox").scrollIntoView({ behavior: "smooth" });
      }
      store.clear(); GH = null; dirty = false; showLogin("Đã đăng xuất. Token đã được xoá khỏi trình duyệt này.");
    };
    const cs = $("#clearSample");
    if (cs) cs.onclick = () => {
      Object.keys(draft).forEach((k) => { if (typeof draft[k] === "string" && k !== "theme") draft[k] = ""; });
      draft.album = []; setDirty(true); cs.parentElement.remove(); fillEditor(); paint(); toast("Đã xoá ví dụ, mời bạn điền thông tin");
    };
  }
  document.addEventListener("submit", (e) => { if (e.target.closest(".inv")) { e.preventDefault(); toast("Đây là bản xem trước, khách mới gửi được form này."); } });
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- khách mời (đọc từ Google Sheets) ----------
  async function loadGuests() {
    const box = $("#p-guests");
    if (!draft.sheetUrl) {
      box.innerHTML = `<div class="tip">Chưa nối Google Sheets. Làm theo hướng dẫn trong thư mục <b>google-sheets</b>, rồi dán link Web app vào mục 9 ở tab Nội dung và bấm Lưu.</div>`;
      return;
    }
    wishes = await loadWishes(draft.sheetUrl); paint();
    box.innerHTML = `
      <div class="tip">Danh sách khách xác nhận nằm trong Google Sheet của bạn (trang tính <b>XacNhan</b>). Lời chúc ở trang tính <b>LoiChuc</b>; tick ô cột <b>An</b> để ẩn một lời chúc khỏi thiệp.</div>
      ${draft.sheetLink ? `<a class="btn pri" style="text-align:center;text-decoration:none" href="${esc(draft.sheetLink)}" target="_blank" rel="noopener">Mở Google Sheet</a>` : `<div class="tip">Dán link Google Sheet vào mục 9 để có nút mở nhanh ở đây.</div>`}
      <details class="grp" open><summary><span>Lời chúc đang hiện trên thiệp<small>${wishes.length} lời chúc</small></span></summary><div class="grp-in glist">
        ${wishes.length ? wishes.map((w) => `<div class="gitem"><b>${esc(w.name)}</b><div>${esc(w.text)}</div></div>`).join("") : `<div class="tip">Chưa có lời chúc nào.</div>`}
      </div></details>
      <button class="btn sec2" type="button" id="reloadGuests">Tải lại</button>`;
    $("#reloadGuests").onclick = loadGuests;
  }

  // ---------- khởi động ----------
  GH = store.get();
  if (GH && GH.token) { try { await start(); } catch (x) { showLogin(x.message); } }
  else showLogin();
})();
