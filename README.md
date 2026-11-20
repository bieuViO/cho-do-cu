# Chợ Đồ Cũ Chơn Thành

Sàn đăng bán đồ đã qua sử dụng. Đăng tin miễn phí, sàn thu phí khi món được bán.

- Web tĩnh (HTML + JS), chạy trên GitHub Pages.
- Dữ liệu, đăng nhập, ảnh: Supabase (dự án `cho-do-cu`, Singapore).
- Mọi quy tắc tiền/phí được kiểm tra ở server (RLS + trigger), không tin trình duyệt:
  - Người bán không tự sửa phí, không tự đánh dấu đã nộp phí, không sửa tin người khác.
  - Báo "Đã bán" qua hàm `mark_sold` → phí tính theo cấu hình.
  - Có phí quá hạn thì không đăng tin mới / mở lại tin.
  - Quản trị (email trong bảng `admin_emails`) ghi nhận thu phí, xác thực người bán, ẩn tin.

## Phí mặc định (sửa trong mục Quản trị)
5% giá bán, tối thiểu 5.000đ, tối đa 200.000đ; món dưới 50.000đ miễn phí; nộp trong 7 ngày.

## Tệp
- `index.html` – giao diện
- `app.js` – xử lý
- `supabase.min.js` – thư viện @supabase/supabase-js 2.119.0
- `supabase/schema.sql` – cấu trúc cơ sở dữ liệu

Khóa trong `app.js` là khóa công khai (publishable) của Supabase, được phép nằm trên web.
