import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("import-export.py")
spec = importlib.util.spec_from_file_location("import_export", MODULE_PATH)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ImportExportImagesTest(unittest.TestCase):
    def test_copies_and_rewrites_directly_referenced_notion_image(self):
        with tempfile.TemporaryDirectory() as directory:
            export = Path(directory)
            markdown = export / "A page.md"
            image = export / "A page image.png"
            image.write_bytes(b"png")
            content = "![diagram](A%20page%20image.png)"

            assets = module.collect_assets(export, export, content)

            self.assertEqual([image.resolve()], [target for _, target in assets])
            self.assertEqual(
                "![diagram](assets/A%20page/A%20page%20image.png)",
                module.rewrite_links(content, assets, export, "A%20page"),
            )

    def test_rewrites_html_image_sources_and_keeps_query(self):
        with tempfile.TemporaryDirectory() as directory:
            export = Path(directory)
            (export / "images").mkdir()
            (export / "images" / "cover.png").write_bytes(b"png")
            content = '<img src="images/cover.png?width=800">'
            assets = module.collect_assets(export, export, content)

            self.assertEqual(
                '<img src="assets/Page/images/cover.png?width=800">',
                module.rewrite_links(content, assets, export, "Page"),
            )


if __name__ == "__main__":
    unittest.main()
