# Nối Google Sheets để nhận xác nhận tham dự và lời chúc

Làm một lần, khoảng 5 phút.

1. Vào https://sheets.google.com, tạo bảng tính mới, đặt tên ví dụ "Khách đám cưới".
2. Trên menu chọn **Tiện ích mở rộng → Apps Script** (Extensions → Apps Script).
3. Xoá hết mã có sẵn, dán toàn bộ nội dung tệp `Code.gs` vào, bấm biểu tượng lưu.
4. Bấm **Triển khai → Tùy chọn triển khai mới** (Deploy → New deployment).
   - Bấm bánh răng cạnh "Chọn loại", chọn **Ứng dụng web** (Web app).
   - **Thực thi với tư cách:** Tôi (Me).
   - **Người có quyền truy cập:** Bất kỳ ai (Anyone).
   - Bấm **Triển khai**, cấp quyền khi Google hỏi (chọn tài khoản → Advanced → Go to ... (unsafe) → Allow; đây là script của chính bạn).
5. Sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).
6. Mở trang admin của thiệp → mục **9. Xác nhận tham dự & lời chúc** → dán URL đó vào ô "Link Google Apps Script". Dán thêm link bảng tính vào ô "Link Google Sheet" để mở nhanh. Bấm **Lưu thiệp**.

Sau khi khách gửi lần đầu, bảng tính sẽ tự có 2 trang:

- **XacNhan:** thời gian, tên, sẽ đến hay không, số người, khách bên nào, điện thoại.
- **LoiChuc:** tên, lời chúc, ô **An**. Tick ô An để ẩn lời chúc đó khỏi thiệp.

Lưu ý: nếu sau này sửa `Code.gs`, phải vào **Triển khai → Quản lý triển khai → sửa (bút chì) → Phiên bản: Mới → Triển khai** thì thay đổi mới có hiệu lực. URL giữ nguyên.
