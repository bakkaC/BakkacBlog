# 导入脚本说明（import-export.py）

用于把飞书/Notion 导出的**单篇文档**快速导入到 `src/content/{notes|blogs|thoughts}`，同时整理图片到对应的 `assets` 目录，并自动改写 Markdown 图片路径。

## 适用的导出结构

导出内容大致类似（单篇）：

```
导出文件夹/
  xxx.md
  images/            # 或者 assets/ 等本地图片目录
    image-1.png
    image-2.png
```

## 用法

```bash
python3 scripts/import-export.py /path/to/exported-folder --to notes
python3 scripts/import-export.py /path/to/export.zip --to blogs
# 不写 --to 默认导入 notes
```

## 做了什么

- 查找导出内容中的 **唯一** `.md` 文件
- 将 `.md` 移动到目标集合目录：
  - `src/content/notes/`
  - `src/content/blogs/`
  - `src/content/thoughts/`
- 将图片目录复制到：
  - `src/content/<集合>/assets/<文档名>/`
- 把 Markdown 中的相对图片路径统一改为：
  - `assets/<文档名>/<原目录>/<图片>`

示例：

```
原始：![](images/文档bug相关记录-image.png)
改写：![](assets/文档bug相关记录/images/文档bug相关记录-image.png)
```

## 限制与注意

- **仅支持单篇导出**（导出目录内只能有 1 个 `.md`）
- 若目标 `.md` 或 `assets/<文档名>` 已存在，会直接报错避免覆盖
- 链接以 `http://`、`https://`、`mailto:`、`data:`、`#` 开头的不会被改写
- 文档名中的空格会被替换为 `%20`（与现有内容一致）

## 常见报错

- `expected exactly 1 markdown file`：导出目录内有多个 `.md`，请先拆分
- `markdown already exists`：目标集合已有同名 md，需重命名或手动清理
- `assets folder already exists`：同名 assets 目录已存在

## 可扩展方向（需要的话告诉我）

- 支持批量导入（一个目录内多篇文档）
- 自动判断落入 notes/blogs/thoughts
- 支持“移动”而非“复制”资源
