# Học Tiếng Nhật N5

Ứng dụng web flashcard 200 từ vựng JLPT N5, tối ưu cho máy tính bảng.

- Chữ lớn: từ tiếng Nhật, cách đọc (kana), phiên âm romaji, nghĩa tiếng Việt
- NEXT / PREV (nút, vuốt ngang trên thẻ, hoặc phím ← →)
- Khu vực luyện viết bằng ngón tay / bút (có chữ mờ để đồ theo, hoàn tác, xoá)
- Lưu lịch sử học trong trình duyệt (localStorage): từ đã xem, theo ngày, đã thuộc
- Lọc theo nhóm, xáo trộn, chế độ che đáp án

Dữ liệu từ vựng nằm trong `words.json`.

## Chạy thử

```bash
python3 -m http.server 8000
```

## Triển khai

Mỗi lần push/merge vào `main`, workflow `.github/workflows/deploy.yml` sẽ deploy lên GitHub Pages.
Lần đầu: vào **Settings → Pages → Build and deployment → Source** và chọn **GitHub Actions**.

## Ứng dụng Android (APK)

App được đóng gói bằng [Capacitor](https://capacitorjs.com/) (chạy offline, toàn màn hình, giữ màn hình sáng).
Workflow `.github/workflows/android.yml` build APK mỗi khi push vào `main` và đăng lên release **latest**:

`https://github.com/tuanhuycao19/hoc-tieng-nhat/releases/download/latest/tieng-nhat-n5.apk`

Trên Android: tải file về → mở → cho phép "Cài ứng dụng không rõ nguồn gốc" → Cài đặt.
APK được ký bằng khoá cố định `android/app/app.keystore` nên bản mới cài đè được lên bản cũ, lịch sử học được giữ lại.

Build tại máy (cần Android SDK, JDK 21):

```bash
npm ci && npm run sync && cd android && ./gradlew assembleRelease
```

Ghi chú: font `fonts/klee-one-600.woff2` chỉ chứa các chữ có trong `words.json` hiện tại; chữ mới sẽ dùng font hệ thống.
