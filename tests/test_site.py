import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("builder", ROOT / "scripts/build_site.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class FolderLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def picture(self, relative, color="red"):
        file = self.root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (20, 30), color).save(file, "PNG")
        return file

    def test_add_rename_remove_and_stable_numbered_url(self):
        file = self.picture('111_AI_新分类_BQB/子目录/你好 #?&"🍉.PNG')
        original = file.read_bytes()
        first = builder.generate(self.root)
        self.assertEqual((len(first['categories']), first['total']), (1, 1))
        self.assertEqual(first['categories'][0]['title'], '新分类')
        self.assertEqual(first['categories'][0]['slug'], 'bqb-111')
        self.assertEqual(file.read_bytes(), original)
        old = self.root / '111_AI_新分类_BQB'
        new = self.root / '111_换个名字_BQB'
        old.rename(new)
        self.picture('112_新增_BQB/02.gif') # File extension must not override detected format.
        second = builder.generate(self.root)
        self.assertEqual(second['total'], 2)
        renamed = next(c for c in second['categories'] if c['slug'] == 'bqb-111')
        self.assertEqual(renamed['title'], '换个名字')
        shutil.rmtree(new)
        third = builder.generate(self.root)
        self.assertEqual(third['total'], 1)
        self.assertFalse((self.root / '.hugo-generated/content/categories/bqb-111').exists())
        self.assertFalse((self.root / '.hugo-generated/static/catalog/bqb-111.json').exists())
        self.assertEqual(len(list((self.root / '.hugo-generated/static/media').iterdir())), 1)

    def test_hidden_non_images_symlinks_empty_and_duplicate_content(self):
        source = self.picture('001_测试_BQB/1.JPG')
        self.picture('001_测试_BQB/.hidden/2.jpg')
        (source.parent / 'notes.md').write_text('not an image')
        (source.parent / 'secret.jpg').symlink_to(source)
        (source.parent / 'duplicate.png').write_bytes(source.read_bytes())
        (self.root / '002_空分类_BQB').mkdir()
        self.picture('not-a-category/no.jpg')
        data = builder.generate(self.root)
        self.assertEqual(len(data['categories']), 2)
        self.assertEqual(data['categories'][0]['count'], 0)
        self.assertEqual(data['total'], 2)
        media = list((self.root / '.hugo-generated/static/media').iterdir())
        self.assertEqual(len(media), 1)
        self.assertEqual(media[0].suffix, '.png')
        self.assertFalse(media[0].is_symlink())

    def test_duplicate_category_numbers_fail_before_deployment(self):
        (self.root / '001_第一_BQB').mkdir()
        (self.root / '001_重复_BQB').mkdir()
        with self.assertRaisesRegex(ValueError, '重复的分类编号'):
            builder.generate(self.root)

    def test_mixed_language_names_are_not_truncated(self):
        self.assertEqual(builder.category_identity('070JOJO的奇妙冒险BQB')[2], 'JOJO的奇妙冒险')
        self.assertEqual(builder.category_identity('060MurCat_Mur猫😺BQB')[2], 'Mur猫😺')

    def test_corrupt_image_fails_instead_of_publishing_broken_gallery(self):
        directory = self.root / '001_损坏_BQB'
        directory.mkdir()
        (directory / 'broken.jpg').write_text('broken')
        with self.assertRaises(OSError):
            builder.generate(self.root)

    def test_animated_gif_is_preserved(self):
        directory = self.root / '001_动画_BQB'
        directory.mkdir()
        frames = [Image.new('RGB', (10, 10), color) for color in ('red', 'blue')]
        source = directory / '动画.gif'
        frames[0].save(source, save_all=True, append_images=frames[1:], duration=100, loop=0)
        data = builder.generate(self.root)
        self.assertEqual(data['animated'], 1)
        image = json.loads((self.root / '.hugo-generated/static/catalog/bqb-001.json').read_text())[0]
        self.assertEqual((self.root / '.hugo-generated/static' / image['src']).read_bytes(), source.read_bytes())


class DownloadTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node is needed for the browser ZIP writer test')
    def test_browser_zip_roundtrip_chinese_emoji_nested_and_binary(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'test.zip'
            script = '''const fs = require('node:fs');
const {createZip} = require(process.argv[1]);
const files = [{name:'子目录/你好 #&🍉.gif',bytes:Uint8Array.from([0,255,1,128,42])},
{name:'空文件.txt',bytes:new Uint8Array()}];
createZip(files).arrayBuffer().then(buffer => fs.writeFileSync(process.argv[2], Buffer.from(buffer)));
'''
            subprocess.run(['node', '-e', script, str(ROOT / 'site/assets/js/zip.js'), str(archive)], check=True)
            with zipfile.ZipFile(archive) as result:
                self.assertIsNone(result.testzip())
                self.assertEqual(result.read('子目录/你好 #&🍉.gif'), bytes([0, 255, 1, 128, 42]))
                self.assertEqual(result.read('空文件.txt'), b'')


if __name__ == '__main__':
    unittest.main()
