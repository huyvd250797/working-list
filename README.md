# Working-List V1.0.0

Web app danh sách công việc cá nhân theo hướng nhập nhanh, tìm kiếm tức thì và đổi trạng thái chỉ với một lần bấm.

## Chức năng chính

- Thêm nhanh bằng Enter.
- Cú pháp nhanh: `#nhan`, `@homnay`, `@ngaymai`, `!cao`, `!thap`.
- Ba trạng thái: Cần làm, Đang làm, Đã xong.
- Tìm theo nội dung, ghi chú hoặc nhãn.
- Lọc hôm nay, quá hạn, trạng thái và ưu tiên cao.
- Thêm/sửa đầy đủ nội dung, ghi chú, ưu tiên, hạn xử lý và nhãn.
- Dark Mode/Light Mode và ghi nhớ lựa chọn.
- Xuất/Nhập file JSON để sao lưu hoặc chuyển dữ liệu.
- Hoàn tác sau khi xóa.
- Responsive cho máy tính và điện thoại.

## Yêu cầu

- Node.js 22.13 trở lên.
- npm đi kèm Node.js.

## Chạy trên máy tính

Mở Terminal hoặc Command Prompt tại thư mục source, sau đó chạy:

```bash
npm install
npm run dev
```

Mở địa chỉ hiển thị trong Terminal, thông thường là `http://localhost:3000`.

## Kiểm tra bản production

### Bản tiêu chuẩn

```bash
npm run build:next
npm run start
```

### Bản tĩnh để deploy

```bash
npm run build:static
```

Kết quả nằm trong thư mục `out`.

## Deploy lên Netlify

### Cách 1: Deploy từ GitHub

1. Giải nén source và đẩy toàn bộ project lên GitHub.
2. Vào Netlify, chọn **Add new site** → **Import an existing project**.
3. Chọn repository Working-List.
4. Netlify sẽ tự đọc file `netlify.toml`.
5. Xác nhận:
   - Build command: `npm run build:static`
   - Publish directory: `out`
   - Node version: `22.13.0`
6. Bấm **Deploy site**.

### Cách 2: Deploy kéo thả

1. Chạy `npm install` và `npm run build:static` trên máy tính.
2. Vào trang Netlify Drop.
3. Kéo nguyên thư mục `out` vào vùng upload.

## Deploy lên Vercel

1. Đẩy source lên GitHub.
2. Trong Vercel chọn **Add New Project** và import repository.
3. File `vercel.json` đã cấu hình sẵn:
   - Build command: `npm run build:static`
   - Output directory: `out`
4. Bấm **Deploy**.

## Dữ liệu được lưu ở đâu?

Dữ liệu V1 được lưu trong `localStorage` của trình duyệt:

- Không cần database, tài khoản hoặc biến môi trường.
- Mỗi trình duyệt/mỗi thiết bị có một danh sách riêng.
- Xóa dữ liệu trình duyệt có thể làm mất danh sách.
- Nên mở menu ba chấm và chọn **Xuất file sao lưu** định kỳ.
- Muốn chuyển máy: xuất JSON ở máy cũ và nhập JSON ở máy mới.

## Phím tắt

- `N`: đưa con trỏ tới ô nhập nhanh.
- `/`: đưa con trỏ tới ô tìm kiếm.
- `Esc`: đóng modal, menu hoặc xóa tìm kiếm.

## Nâng cấp sau này

Để đồng bộ giữa điện thoại và máy tính, có thể thay lớp lưu dữ liệu hiện tại bằng Supabase mà không cần thiết kế lại giao diện.

---

© 2026 HuyVo
