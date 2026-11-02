# Thiệp cưới online trên GitHub Pages

- Link khách (chỉ xem): `https://<tai-khoan>.github.io/<ten-kho>/`
- Link admin (cần token GitHub): `https://<tai-khoan>.github.io/<ten-kho>/admin.html`

Thiệp nằm trên máy chủ GitHub nên không cần VPS và không lộ IP của bạn. Xác nhận tham dự và lời chúc lưu vào Google Sheet của bạn.

## 1. Đưa lên GitHub

1. Tạo tài khoản ở https://github.com nếu chưa có.
2. Bấm **New repository**, đặt tên ví dụ `thiep-cuoi`, chọn **Public**, bấm **Create repository**.
3. Trong kho vừa tạo, bấm **uploading an existing file**, kéo thả **toàn bộ nội dung** thư mục này (gồm cả thư mục `data`, `images`, tệp `.nojekyll`), bấm **Commit changes**.
   - Tệp `.nojekyll` bắt đầu bằng dấu chấm, có máy sẽ ẩn đi. Nếu thiếu cũng không sao.
4. Vào **Settings → Pages**: mục *Source* chọn **Deploy from a branch**, nhánh **main**, thư mục **/(root)**, bấm **Save**.
5. Đợi 1–2 phút, link thiệp hiện ở đầu trang Settings → Pages.

## 2. Tạo token để đăng nhập trang admin

1. Vào https://github.com/settings/personal-access-tokens/new (Fine-grained token).
2. Đặt tên "Thiệp cưới", chọn thời hạn (ví dụ 90 ngày, đủ tới sau đám cưới).
3. **Repository access → Only select repositories** → chọn kho `thiep-cuoi`.
4. **Permissions → Repository permissions → Contents → Read and write**.
5. Bấm **Generate token**, sao chép token (chỉ hiện một lần).
6. Mở `.../admin.html`, nhập tài khoản, tên kho, dán token, bấm Đăng nhập.

Token chỉ ghi được vào đúng kho thiệp này. Đừng gửi token cho ai. Lỡ lộ thì vào trang token trên GitHub bấm **Delete**, tạo cái mới.

## 3. Nối Google Sheets

Xem `google-sheets/HUONG-DAN.md`.

## Cách hoạt động

- Bấm **Lưu thiệp** trong trang admin: ảnh mới và tệp `data/wedding.json` được commit vào kho. GitHub Pages cập nhật lại sau khoảng 1–2 phút.
- Trang khách đọc `data/wedding.json` để hiện thiệp; form xác nhận và lời chúc gửi thẳng tới Google Apps Script.

## Tên miền riêng (không bắt buộc)

Settings → Pages → **Custom domain**, nhập tên miền, rồi ở nơi quản lý tên miền thêm bản ghi `CNAME` trỏ về `<tai-khoan>.github.io`. Tick **Enforce HTTPS** khi GitHub cho phép.
