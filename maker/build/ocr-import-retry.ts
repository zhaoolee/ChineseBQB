import type { Plugin } from 'vite'

// Kept self-contained because Rollup inserts this factory into the importing chunk.
export const OCR_IMPORT_FACTORY = String.raw`function createOcrImporter(baseUrl, importer = (url) => import(url), pause = (ms) => new Promise(resolve => setTimeout(resolve, ms))) {
  const pending = new Map();
  let retryId = 0;
  return function load(path) {
    const url = new URL(path, baseUrl);
    if (pending.has(url.href)) return pending.get(url.href);
    const task = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = new URL(url.href);
        if (attempt) {
          await pause(attempt * 500);
          candidate.searchParams.set('ocr_retry', Date.now() + '-' + (++retryId));
        }
        try {
          return await importer(candidate.href);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|failed to load module script|load failed/i.test(message)) throw error;
          if (attempt === 2) {
            const failure = new Error('识别程序下载失败，请检查网络后点「重新识别」');
            failure.name = 'OcrModuleLoadError';
            throw failure;
          }
        }
      }
    })();
    pending.set(url.href, task);
    task.catch(() => { if (pending.get(url.href) === task) pending.delete(url.href); });
    return task;
  };
}`

export function retryOcrImports(): Plugin {
  return {
    name: 'retry-ocr-module-downloads',
    apply: 'build',
    renderDynamicImport({ targetModuleId }) {
      if (targetModuleId && /\/node_modules\/(?:@paddleocr\/paddleocr-js|onnxruntime-web)\//.test(targetModuleId)) {
        return { left: '__importOcrModule(', right: ')' }
      }
      return null
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk')
      const runtime = chunks.find(chunk => Object.keys(chunk.modules).some(id => id.includes('/@paddleocr/paddleocr-js/')))
      if (!runtime || !Object.keys(runtime.modules).some(id => id.includes('/onnxruntime-web/'))) {
        this.error('Paddle and ONNX Runtime must share one retriable OCR chunk')
      }
      const byName = new Map(chunks.map(chunk => [chunk.fileName, chunk]))
      for (const entry of chunks.filter(chunk => chunk.isEntry)) {
        const seen = new Set<string>()
        const visit = (name: string): boolean => {
          if (name === runtime.fileName) return true
          if (seen.has(name)) return false
          seen.add(name)
          return byName.get(name)?.imports.some(visit) ?? false
        }
        if (entry.imports.some(visit) || !entry.code.includes('ocr_retry')) {
          this.error('The app must remain usable when the OCR module fails to download')
        }
      }
    },
    renderChunk(code) {
      if (!code.includes('__importOcrModule(')) return null
      return {
        code: `${OCR_IMPORT_FACTORY}\nconst __importOcrModule = createOcrImporter(import.meta.url);\n${code}`,
        map: null,
      }
    },
  }
}
