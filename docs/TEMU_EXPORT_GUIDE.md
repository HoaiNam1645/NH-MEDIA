# Hướng Dẫn Chức Năng Temu Export

## Tổng Quan

Chức năng Temu Export cho phép xuất sản phẩm từ hệ thống sang file Excel theo định dạng chuẩn của Temu, giúp đăng sản phẩm hàng loạt lên sàn Temu một cách nhanh chóng.

---

## Danh Sách Categories Hỗ Trợ (23 categories)

| Category ID | Tên Sản Phẩm | Configs |
|-------------|--------------|---------|
| 9519 | Egg-Cups | PACK_CUSTOM |
| 10334 | Tumblers | CUSTOM, PACK_CUSTOM |
| 10585 | Mugs | NORMAL, CUSTOM, PACK, PACK_CUSTOM |
| 10601 | Wiskey Glass | PACK_CUSTOM |
| 11459 | Table Runner | CUSTOM |
| 11666 | Banners | NORMAL |
| 11899 | Blanket | NORMAL, CUSTOM |
| 12042 | Pillow | CUSTOM |
| 12141 | Ornament | NORMAL, CUSTOM |
| 12193 | Acrylic Blocks | CUSTOM |
| 12217 | Tapestry | CUSTOM |
| 12253 | Doormat | NORMAL, CUSTOM, PACK_CUSTOM |
| 12869 | Poster | CUSTOM |
| 13018 | Wooden Block | NORMAL |
| 17332 | Wrapping Paper | NORMAL |
| 22120 | Car Visor Clip | PACK, PACK_CUSTOM |
| 24376 | Phone Case | CUSTOM |
| 24675 | Flag | NORMAL, CUSTOM |
| 28924 | Graduation Stole | CUSTOM |
| 29007 | Bikini | CUSTOM |
| 30152 | Cap | CUSTOM |
| 30471 | Hawaiian Shirt | CUSTOM |
| 40381 | Booktracker | CUSTOM |

---

## Loại Config

- **NORMAL**: Sản phẩm thường (Normal product)
- **CUSTOM**: Sản phẩm tùy chỉnh (Custom product) - có in ấn theo yêu cầu
- **PACK**: Sản phẩm đóng gói nhiều cái (Pack)
- **PACK_CUSTOM**: Sản phẩm đóng gói + tùy chỉnh

---

## Cách Sử Dụng

### Bước 1: Chọn Products
- Vào danh sách sản phẩm
- Chọn các sản phẩm muốn export
- Click nút "Export Temu"

### Bước 2: Cấu Hình Export
1. **Temu Category**: Chọn category tương ứng trên Temu
2. **Config Type**: Chọn loại config (NORMAL/CUSTOM/PACK...)
3. **SKU Prefix**: Nhập prefix cho SKU (mặc định: CG)
4. **Custom Description** (tùy chọn): Nhập mô tả tùy chỉnh

### Bước 3: Download
- Click "Export" để tải file Excel
- File sẽ có định dạng: `temu-{categoryId}-{configType}-{timestamp}.xlsx`

---

## Cấu Trúc File Excel Xuất Ra

### Header (Rows 1-4)
- Lấy từ file `template.xlsx` của mỗi category
- Chứa tiêu đề các cột theo chuẩn Temu

### Data (Row 5+)
Mỗi dòng là một variant của sản phẩm

### Các Cột Quan Trọng

| Cột | Nội Dung |
|-----|----------|
| E | Category ID trên Temu |
| F | Đường dẫn category |
| G | Loại sản phẩm (Normal/Custom) |
| L | Tên sản phẩm (từ database) |
| M | **Contribution Goods** (Parent SKU) |
| N | **Contribution SKU** (Child SKU) |
| T | Mô tả sản phẩm |
| Images | 10 cột hình ảnh (tối đa) |
| Option1 | Size/Color/Variant 1 |
| Option2 | Variant 2 (nếu có) |
| Price | Giá bán |

---

## Công Thức SKU Tự Động

### Cột M - Contribution Goods (Parent SKU)
```excel
="CG"&TEXT(ROUNDUP((ROW()-4)/N,0),"000000")
```
- `CG` = SKU Prefix (có thể thay đổi)
- `N` = Số variants của sản phẩm
- Ví dụ: `CG000001`, `CG000002`...

### Cột N - Contribution SKU (Child SKU)
```excel
=M5&"-"&COUNTIF($M$5:M5,M5)-1
```
- Ghép Parent SKU + số thứ tự variant
- Ví dụ: `CG000001-0`, `CG000001-1`, `CG000001-2`...

### Ví Dụ với Wooden Block (4 sizes)
| Row | Cột M | Cột N |
|-----|-------|-------|
| 5 | CG000001 | CG000001-0 |
| 6 | CG000001 | CG000001-1 |
| 7 | CG000001 | CG000001-2 |
| 8 | CG000001 | CG000001-3 |
| 9 | CG000002 | CG000002-0 |
| 10 | CG000002 | CG000002-1 |
| ... | ... | ... |

---

## Thứ Tự Ưu Tiên Dữ Liệu

### Product Name
```
product.listingTitle → product.title → 'Untitled'
```

### Description
```
customDescription → product.description → template.description → ''
```

### Variants
```
customVariants (upload) → template variants (index.json)
```

---

## Cấu Trúc Thư Mục Templates

```
templates/
├── index.json                 # Danh sách tất cả categories
├── {categoryId}/
│   ├── index.json            # Variants & description mặc định
│   ├── template.xlsx         # File Excel mẫu (có header)
│   ├── normal.json           # Config cho NORMAL type
│   ├── custom.json           # Config cho CUSTOM type
│   ├── pack.json             # Config cho PACK type
│   └── pack_custom.json      # Config cho PACK_CUSTOM type
```

### Ví dụ: templates/13018/index.json (Wooden Block)
```json
{
  "categoryId": "13018",
  "productName": "Wooden Block",
  "description": "🌿 Custom Shape Wooden Block...",
  "variants": [
    { "option1": "4 inch", "price": 100 },
    { "option1": "5 inch", "price": 110 },
    { "option1": "6 inch", "price": 120 },
    { "option1": "8 inch", "price": 130 }
  ],
  "availableConfigs": ["NORMAL"]
}
```

---

## Giới Hạn

- **Tối đa 10 hình** mỗi sản phẩm
- **Data bắt đầu từ row 5** (rows 1-4 là header)
- Mỗi product tạo ra N dòng (N = số variants)

---

## Lưu Ý Quan Trọng

1. **Template.xlsx bắt buộc**: Mỗi category cần có file `template.xlsx` chứa header
2. **Variants trong index.json**: Nếu không upload custom variants, hệ thống dùng variants mặc định
3. **SKU Formula**: Cột M và N sử dụng công thức Excel, không phải giá trị tĩnh
4. **Product Name**: Lấy từ database, không phải từ template

---

## Troubleshooting

| Vấn Đề | Giải Pháp |
|--------|-----------|
| Thiếu header | Kiểm tra file `template.xlsx` tồn tại |
| Variants rỗng | Kiểm tra `index.json` có field `variants` |
| SKU sai | Kiểm tra số variants và SKU prefix |
| Hình không hiển thị | Kiểm tra product có images trong database |

---

## API Endpoint

```
POST /api/export/temu
```

### Request Body
```json
{
  "productIds": ["id1", "id2"],      // hoặc
  "categoryId": "db-category-id",    // filter theo category
  "temuCategoryId": "13018",         // Temu category ID
  "configType": "NORMAL",            // NORMAL/CUSTOM/PACK/PACK_CUSTOM
  "skuPrefix": "CG",                 // Prefix cho SKU
  "customDescription": "...",        // Mô tả tùy chỉnh (optional)
  "customVariants": [...]            // Variants tùy chỉnh (optional)
}
```

### Response
- File Excel (.xlsx) download trực tiếp
