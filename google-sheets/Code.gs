/**
 * Nhận xác nhận tham dự và lời chúc từ thiệp cưới, ghi vào Google Sheet này.
 * Cách cài: xem google-sheets/HUONG-DAN.md
 */
const SHEET_RSVP = "XacNhan";
const SHEET_WISH = "LoiChuc";

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sh;
}
// Cắt độ dài và chặn công thức (=, +, -, @) để khách không chèn được lệnh vào Sheet
function clean_(s, n) {
  s = String(s == null ? "" : s).trim().slice(0, n);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let b;
  try { b = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { return out_({ error: "Dữ liệu không hợp lệ." }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (b.type === "rsvp") {
      const name = clean_(b.name, 80);
      if (!name) return out_({ error: "Vui lòng nhập tên." });
      sheet_(SHEET_RSVP, ["Thời gian", "Tên", "Tham dự", "Số người", "Khách bên", "Điện thoại"]).appendRow([
        new Date(), name, b.attend === "no" ? "Không đến" : "Sẽ đến",
        Math.min(10, Math.max(1, Number(b.guests) || 1)), b.side === "bride" ? "Nhà gái" : "Nhà trai", clean_(b.phone, 20),
      ]);
      return out_({ ok: true });
    }
    if (b.type === "wish") {
      const name = clean_(b.name, 80), text = clean_(b.text, 500);
      if (!name || !text) return out_({ error: "Vui lòng nhập tên và lời chúc." });
      const sh = sheet_(SHEET_WISH, ["Thời gian", "Tên", "Lời chúc", "An"]);
      sh.appendRow([new Date(), name, text, false]);
      sh.getRange(sh.getLastRow(), 4).insertCheckboxes();
      return out_({ ok: true });
    }
    return out_({ error: "Yêu cầu không hợp lệ." });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "wishes") {
    const sh = sheet_(SHEET_WISH, ["Thời gian", "Tên", "Lời chúc", "An"]);
    const rows = sh.getDataRange().getValues().slice(1);
    const list = rows
      .filter(function (r) { return r[1] && r[2] && r[3] !== true; })
      .slice(-100).reverse()
      .map(function (r) { return { name: String(r[1]).replace(/^'/, ""), text: String(r[2]).replace(/^'/, ""), at: new Date(r[0]).getTime() }; });
    return out_(list);
  }
  return out_({ ok: true });
}
