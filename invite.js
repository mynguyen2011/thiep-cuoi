// Phần hiển thị thiệp — dùng chung cho trang khách và trang admin (xem trước)
window.Invite = (function () {
  const THEMES = {
    songhy: { name: "Song hỷ đỏ", motif: "囍", bg: "#8e1b1b", fg: "#f6e3b4", ac: "#e7c06a", soft: "rgba(255,255,255,.08)", pattern: "radial-gradient(circle at 50% 0,rgba(231,192,106,.18),transparent 60%),repeating-linear-gradient(45deg,rgba(231,192,106,.05) 0 2px,transparent 2px 14px)" },
    hoanggia: { name: "Hoàng gia", motif: "♛", bg: "#14213d", fg: "#f2e8cf", ac: "#d4af37", soft: "rgba(255,255,255,.06)", pattern: "repeating-radial-gradient(circle at 50% 50%,rgba(212,175,55,.06) 0 1px,transparent 1px 22px)" },
    luaxanh: { name: "Lụa xanh", motif: "❦", bg: "#1f3d36", fg: "#efe6cf", ac: "#c9a96a", soft: "rgba(255,255,255,.07)", pattern: "linear-gradient(160deg,rgba(255,255,255,.07),transparent 50%)" },
    hongphan: { name: "Hồng phấn", motif: "❀", bg: "#f7e1e1", fg: "#5a2a35", ac: "#b04a66", soft: "rgba(90,42,53,.06)", pattern: "radial-gradient(circle at 20% 15%,rgba(176,74,102,.14),transparent 35%),radial-gradient(circle at 80% 85%,rgba(176,74,102,.14),transparent 35%)" },
    toigian: { name: "Tối giản", motif: "&", bg: "#fbfaf7", fg: "#222222", ac: "#8a7458", soft: "rgba(0,0,0,.04)", pattern: "none" },
  };

  // Phông chữ Google có hỗ trợ tiếng Việt
  const FONTS = {
    script: [
      ["Great Vibes", "cursive"], ["Dancing Script", "cursive"], ["Charm", "cursive"], ["Pacifico", "cursive"],
      ["Lobster", "cursive"], ["Cormorant Garamond", "serif"], ["Playfair Display", "serif"],
    ],
    display: [
      ["Cormorant Garamond", "serif"], ["Playfair Display", "serif"], ["Lora", "serif"], ["Noto Serif", "serif"],
      ["Roboto Slab", "serif"], ["Montserrat", "sans-serif"],
    ],
    body: [
      ["Be Vietnam Pro", "sans-serif"], ["Montserrat", "sans-serif"], ["Quicksand", "sans-serif"], ["Nunito", "sans-serif"],
      ["Lora", "serif"], ["Noto Serif", "serif"],
    ],
  };
  const DEFAULT_FONTS = { script: "Great Vibes", display: "Cormorant Garamond", body: "Be Vietnam Pro" };
  const NAME_SIZES = { s: 42, m: 54, l: 66 };
  const loaded = new Set(["Great Vibes", "Cormorant Garamond", "Be Vietnam Pro"]);
  function fontStack(role, name) {
    const f = FONTS[role].find((x) => x[0] === name) || FONTS[role][0];
    return `'${f[0]}', ${f[1]}`;
  }
  function ensureFonts(fonts) {
    const need = Object.values(fonts || {}).filter((n) => n && !loaded.has(n));
    if (!need.length) return;
    need.forEach((n) => loaded.add(n));
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?" + need.map((n) => "family=" + n.replace(/ /g, "+") + ":wght@400;600;700").join("&") + "&display=swap";
    document.head.appendChild(l);
  }

  // Các mục có sẵn của thiệp, theo thứ tự mặc định
  const SECTIONS = [
    { id: "cover", name: "Bìa thiệp" },
    { id: "invite", name: "Lời mời & gia đình" },
    { id: "party", name: "Thời gian tiệc" },
    { id: "venue", name: "Địa điểm" },
    { id: "story", name: "Chuyện tình yêu" },
    { id: "album", name: "Album ảnh" },
    { id: "rsvp", name: "Xác nhận tham dự" },
    { id: "wishes", name: "Sổ lời chúc" },
    { id: "gift", name: "Hộp mừng cưới" },
    { id: "thanks", name: "Lời cảm ơn" },
  ];
  // Ghép bố cục đã lưu với các mục có sẵn (thiệp cũ chưa có bố cục vẫn chạy)
  function layout(d) {
    const saved = Array.isArray(d.sections) ? d.sections : [];
    const out = [];
    const seen = new Set();
    for (const s of saved) {
      if (!s || !s.id || seen.has(s.id)) continue;
      if (s.custom || SECTIONS.some((x) => x.id === s.id)) { out.push({ align: "center", show: true, ...s }); seen.add(s.id); }
    }
    for (const b of SECTIONS) {
      if (seen.has(b.id)) continue;
      const show = b.id === "rsvp" ? d.rsvpOpen !== false : b.id === "wishes" ? d.wishesOpen !== false : true;
      out.push({ id: b.id, show, align: "center" });
    }
    return out;
  }
  const sectionName = (s) => (s.custom ? s.title || "Mục mới" : (SECTIONS.find((x) => x.id === s.id) || {}).name || s.id);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl = (s) => esc(s).replace(/\n/g, "<br>");
  const has = (s) => String(s ?? "").trim() !== "";
  const DOW = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const DOW_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pd = (d) => { const [y, m, dd] = (d || "").split("-").map(Number); return y && m && dd ? new Date(y, m - 1, dd) : null; };
  const ini = (s) => (String(s || "").trim().split(/\s+/).pop() || "").charAt(0);

  function wishesHtml(list) {
    if (!list || !list.length) return `<div class="wish" style="text-align:center;opacity:.75">Chưa có lời chúc nào. Hãy là người đầu tiên.</div>`;
    return list.map((w) => `<div class="wish"><b>${esc(w.name)}</b><br>${nl(w.text)}</div>`).join("");
  }
  const cardsWrap = (inner, n) => `<div class="cards${n === 1 ? " one" : ""}">${inner}</div>`;

  // Nội dung từng mục. Trả về "" khi mục không có gì để hiện.
  function sectionBody(id, d, t, opts, s) {
    const bi = d.bilingual, en = (x) => (bi ? `<span class="en">${x}</span>` : "");
    const dt = pd(d.date);
    switch (id) {
      case "cover": {
        const dshort = dt ? `${String(dt.getDate()).padStart(2, "0")} · ${String(dt.getMonth() + 1).padStart(2, "0")} · ${dt.getFullYear()}` : "";
        const g = has(d.groom), b = has(d.bride);
        const initials = [g ? esc(ini(d.groom)) : "", b ? esc(ini(d.bride)) : ""].filter(Boolean).join("&amp;");
        return `<div class="frame"></div>
          <div class="motif">${t.motif}</div>
          <div class="small">Thư mời cưới${bi ? " · Wedding invitation" : ""}</div>
          <div class="photo" style="${d.cover ? `background-image:url('${esc(d.cover)}')` : ""}">${d.cover ? "" : initials}</div>
          ${g ? `<div class="names">${esc(d.groom)}</div>` : ""}${g && b ? `<div class="amp">&amp;</div>` : ""}${b ? `<div class="names">${esc(d.bride)}</div>` : ""}
          ${dshort ? `<div class="bigdate">${dshort}</div>` : ""}
          ${has(d.lunar) ? `<div class="small">${esc(d.lunar)}</div>` : ""}`;
      }
      case "invite": {
        const side = (label, enl, p, h) => has(p) || has(h) ? `<div><b>${label}${bi ? " · " + enl : ""}</b>${nl(String(p || "").trim())}${has(h) ? `<div style="opacity:.75;font-size:12.5px;margin-top:4px">${esc(h)}</div>` : ""}</div>` : "";
        const sides = [side("Nhà trai", "Groom's family", d.groomParents, d.groomHome), side("Nhà gái", "Bride's family", d.brideParents, d.brideHome)].filter(Boolean);
        if (!has(d.message) && !sides.length) return "";
        return `<div class="sep">✦ ✦ ✦</div>
          ${has(d.message) ? `<p class="p" style="margin-top:16px">${nl(d.message)}${en("We joyfully invite you to celebrate our wedding with our families.")}</p>` : ""}
          ${sides.length ? `<div class="parents${sides.length === 1 ? " one" : ""}">${sides.join("")}</div>` : ""}`;
      }
      case "party": {
        if (!dt && !has(d.time)) return "";
        const dlong = dt ? `${DOW[dt.getDay()]}, ngày ${dt.getDate()} tháng ${dt.getMonth() + 1} năm ${dt.getFullYear()}` : "";
        const dlongEn = dt ? `${DOW_EN[dt.getDay()]}, ${MON_EN[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}` : "";
        let cal = "";
        if (dt) {
          const y = dt.getFullYear(), m = dt.getMonth(), f = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
          cal = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((x) => `<span class="h">${x}</span>`).join("") + "<span></span>".repeat(f);
          for (let i = 1; i <= n; i++) cal += `<span class="${i === dt.getDate() ? "on" : ""}">${i}</span>`;
        }
        const evs = [[d.ev1Label, d.ev1Time, d.ev1Place], [d.ev2Label, d.ev2Time, d.ev2Place]].filter((e) => has(e[0]));
        return `<h2>Tiệc cưới${en("Wedding reception")}</h2>
          ${has(d.time) ? `<div class="big">${esc(d.time)}</div>` : ""}
          <div>${dlong}${en(dlongEn)}</div>
          ${has(d.lunar) ? `<div style="opacity:.8;font-size:13px">(${esc(d.lunar)})</div>` : ""}
          ${dt ? `<div class="small" style="margin-top:16px">Tháng ${dt.getMonth() + 1} · ${dt.getFullYear()}</div><div class="cal">${cal}</div>` : ""}
          ${dt ? `<div class="count" data-count="${esc(d.date)}T${esc(d.time || "00:00")}"></div>` : ""}
          ${evs.length ? `<div class="events">${evs.map((e) => `<div class="event"><b>${esc(e[0])}</b>${esc(e[1])}${has(e[2]) ? `<div style="opacity:.8;font-size:13px">${esc(e[2])}</div>` : ""}</div>`).join("")}</div>` : ""}`;
      }
      case "venue": {
        if (!has(d.venue) && !has(d.address)) return "";
        const mapHref = d.map || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([d.venue, d.address].filter(has).join(", "));
        return `<h2>Địa điểm${en("Venue")}</h2>
          <div class="big" style="font-size:28px">${esc(d.venue)}</div>
          ${has(d.hall) ? `<div style="color:var(--ac);font-weight:600">${esc(d.hall)}</div>` : ""}
          <div style="opacity:.85;font-size:14px;margin-top:6px">${esc(d.address)}</div>
          <a class="btn-i fill" href="${esc(mapHref)}" target="_blank" rel="noopener">Chỉ đường Google Maps</a>`;
      }
      case "story":
        return has(d.story) ? `<h2>Chuyện của chúng mình${en("Our story")}</h2><p class="p">${nl(d.story)}</p>` : "";
      case "album": {
        const album = d.album || [];
        if (!album.length && !opts.preview) return "";
        return `<h2>Album ảnh${en("Gallery")}</h2><div class="gal">${album.length ? album.map((u, i) => `<img src="${esc(u)}" alt="Ảnh cưới ${i + 1}" data-zoom loading="lazy">`).join("") : `<div class="ph">Ảnh cưới sẽ hiện ở đây (khách không thấy mục trống này)</div>`}</div>`;
      }
      case "rsvp": {
        const contact = (name, c) => has(c) ? `<div><b class="lbl">${esc(name)}</b><div class="acc">${esc(c)}</div><button class="btn-i" type="button" data-copy="${esc(c.replace(/\s/g, ""))}">Sao chép số</button></div>` : "";
        const list = [contact(d.gName || "Nhà trai", d.gContact), contact(d.bName || "Nhà gái", d.bContact)].filter(Boolean);
        const form = opts.noForms ? "" : `<p class="p" style="margin-bottom:16px">Quý khách vui lòng xác nhận để gia đình chuẩn bị chu đáo.</p><div id="rsvpBox"><form id="rsvpForm" novalidate>
          <input name="name" placeholder="Tên của bạn" maxlength="80" required>
          <input name="phone" placeholder="Số điện thoại (không bắt buộc)" maxlength="20" inputmode="tel">
          <select name="attend"><option value="yes">Tôi sẽ đến dự</option><option value="no">Rất tiếc, tôi không đến được</option></select>
          <div class="row"><select name="guests" aria-label="Số người"><option value="1">1 người</option><option value="2">2 người</option><option value="3">3 người</option><option value="4">4 người</option><option value="5">5 người</option></select>
          <select name="side" aria-label="Khách bên nào"><option value="groom">Khách nhà trai</option><option value="bride">Khách nhà gái</option></select></div>
          <div class="err-i" id="rsvpErr"></div><button class="btn-i fill" type="submit">Gửi xác nhận</button></form></div>`;
        if (!form && !list.length) return "";
        return `<h2>Xác nhận tham dự${en("RSVP")}</h2>${form}
          ${list.length ? `<p class="p" style="margin:22px auto 12px;font-size:13px;opacity:.85">${form ? "Hoặc gọi / nhắn Zalo:" : "Quý khách vui lòng gọi hoặc nhắn Zalo để báo tham dự:"}</p>${cardsWrap(list.join(""), list.length)}` : ""}`;
      }
      case "wishes":
        if (opts.noForms) return "";
        return `<h2>Sổ lời chúc${en("Wishes")}</h2>
          <form id="wishForm" novalidate><input name="name" placeholder="Tên của bạn" maxlength="80" required><textarea name="text" rows="3" maxlength="500" placeholder="Gửi lời chúc đến cô dâu chú rể" required></textarea><div class="err-i" id="wishErr"></div><button class="btn-i fill" type="submit">Gửi lời chúc</button></form>
          <div class="wishes" id="wishList">${wishesHtml(opts.wishes)}</div>`;
      case "gift": {
        const gift = (side, bank, acc, holder, qr) => (has(acc) || qr) ? `<div><b class="lbl">${side}</b>${qr ? `<img class="qr" src="${esc(qr)}" alt="Mã QR chuyển khoản ${side}" data-zoom>` : ""}<div>${esc(bank)}</div><div class="acc">${esc(acc)}</div><div style="opacity:.8;font-size:12px">${esc(holder)}</div>${has(acc) ? `<button class="btn-i" type="button" data-copy="${esc(acc.replace(/\s/g, ""))}">Sao chép STK</button>` : ""}</div>` : "";
        const list = [gift("Nhà trai", d.gBank, d.gAcc, d.gHolder, d.gQr), gift("Nhà gái", d.bBank, d.bAcc, d.bHolder, d.bQr)].filter(Boolean);
        return list.length ? `<h2>Hộp mừng cưới${en("Wedding gift")}</h2>${cardsWrap(list.join(""), list.length)}` : "";
      }
      case "thanks":
        return `<div class="motif" style="font-size:40px">${t.motif}</div><div class="names" style="font-size:42px">Thank you</div>${has(d.thanks) ? `<p class="p" style="margin-top:8px">${nl(d.thanks)}</p>` : ""}`;
      default:
        if (s && s.custom) {
          if (!has(s.title) && !has(s.text) && !s.image) return "";
          return `${has(s.title) ? `<h2>${esc(s.title)}</h2>` : ""}${s.image ? `<img class="cimg" src="${esc(s.image)}" alt="" data-zoom>` : ""}${has(s.text) ? `<p class="p">${nl(s.text)}</p>` : ""}`;
        }
        return "";
    }
  }

  function render(d, opts = {}) {
    const t = THEMES[d.theme] || THEMES.songhy;
    const fonts = { ...DEFAULT_FONTS, ...(d.fonts || {}) };
    ensureFonts(fonts);
    const vars = `--bg:${t.bg};--fg:${t.fg};--ac:${t.ac};--soft:${t.soft};--pattern:${t.pattern};--f-script:${fontStack("script", fonts.script)};--f-display:${fontStack("display", fonts.display)};--f-body:${fontStack("body", fonts.body)};--name-size:${NAME_SIZES[d.nameSize] || NAME_SIZES.m}px`;
    let alt = false, html = "";
    for (const s of layout(d)) {
      if (!s.show) continue;
      const body = sectionBody(s.custom ? "custom" : s.id, d, t, opts, s);
      if (!body) continue;
      const cls = ["sec", "al-" + (["left", "right"].includes(s.align) ? s.align : "center")];
      if (s.id === "cover") cls.push("cover");
      else { if (alt) cls.push("alt"); alt = !alt; }
      html += `<section class="${cls.join(" ")}" data-sec="${esc(s.id)}">${body}</section>`;
    }
    return `<div class="inv"${opts.preview ? " data-preview" : ""} style="${vars}">${html}</div>`;
  }

  function tick() {
    document.querySelectorAll("[data-count]").forEach((el) => {
      let ms = new Date(el.dataset.count) - new Date();
      if (isNaN(ms)) return; if (ms < 0) ms = 0;
      const v = [Math.floor(ms / 864e5), Math.floor((ms % 864e5) / 36e5), Math.floor((ms % 36e5) / 6e4), Math.floor((ms % 6e4) / 1e3)];
      el.innerHTML = v.map((x, i) => `<div><b>${String(x).padStart(2, "0")}</b><small>${["Ngày", "Giờ", "Phút", "Giây"][i]}</small></div>`).join("");
    });
  }
  setInterval(tick, 1000);

  let tt;
  function toast(m) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 2800);
  }
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]");
    if (c) { const v = c.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast("Đã sao chép " + v), () => toast(v)); return; }
    const z = e.target.closest("[data-zoom]");
    if (z) { const lb = document.createElement("div"); lb.className = "lightbox"; lb.innerHTML = `<img src="${esc(z.src)}" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); }
  });

  return { THEMES, FONTS, DEFAULT_FONTS, SECTIONS, layout, sectionName, render, tick, toast, esc, wishesHtml };
})();
