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
