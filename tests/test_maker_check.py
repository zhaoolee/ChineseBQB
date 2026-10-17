import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("maker_check", ROOT / "scripts/check_maker.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class MakerArtifactTests(unittest.TestCase):
    def test_requires_maker_index_and_keeps_the_pages_budget(self):
        with tempfile.TemporaryDirectory() as temp:
            public = Path(temp)
            with self.assertRaises(ValueError):
                checker.check(public, limit=1000)
            maker = public / "maker"
            maker.mkdir()
            (maker / "index.html").write_text(
                '<link rel="stylesheet" href="/ChineseBQB/maker/assets/app.css">'
                '<script type="module" src="/ChineseBQB/maker/assets/app.js"></script>',
                encoding="utf-8",
            )
            assets = maker / "assets"
            assets.mkdir()
            (assets / "app.css").write_text("body{background:url('/ChineseBQB/maker/assets/app.js')}", encoding="utf-8")
            (assets / "app.js").write_text("export const ready = true\n", encoding="utf-8")
            models = maker / "models"
            models.mkdir()
            for name in checker.MODEL_FILES:
                (maker / name).write_bytes(b"tar")
            (public / "photo.bin").write_bytes(b"x" * 50)
            checker.check(public, limit=1000)
            with self.assertRaises(ValueError):
                checker.check(public, limit=10)

    def test_rejects_assets_outside_the_maker_base(self):
        with tempfile.TemporaryDirectory() as temp:
            public = Path(temp)
            maker = public / "maker"
            maker.mkdir()
            (maker / "index.html").write_text('<script src="/assets/app.js"></script>', encoding="utf-8")
            models = maker / "models"
            models.mkdir()
            for name in checker.MODEL_FILES:
                (maker / name).write_bytes(b"tar")
            with self.assertRaises(ValueError) as caught:
                checker.check(public)
            self.assertIn("/assets", str(caught.exception))

    def test_requires_vendored_ocr_models(self):
        with tempfile.TemporaryDirectory() as temp:
            public = Path(temp)
            maker = public / "maker"
            maker.mkdir()
            (maker / "index.html").write_text("<title>Maker</title>", encoding="utf-8")
            with self.assertRaises(ValueError) as caught:
                checker.check(public)
            self.assertIn("PP-OCRv5_mobile_det_onnx_infer.tar", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
