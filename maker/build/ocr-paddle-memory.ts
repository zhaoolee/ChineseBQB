import type { Plugin } from 'vite'

const START = '    const loadedAssets = await Promise.all(['
const END = '    this.modelConfig = {'
const SESSION = '        graphOptimizationLevel: "all"'

/** The pinned SDK initializes both ONNX sessions concurrently and retains both
 * tar-backed model buffers until they finish. Initialize one model at a time,
 * relinquish its source bytes, and expose partial sessions to failure cleanup.
 */
export function boundedPaddleSource(source: string): string {
  const start = source.indexOf(START), end = source.indexOf(END, start)
  if (start < 0 || end < 0 || source.indexOf(START, start + 1) >= 0
    || !source.slice(start, end).includes('const [detModel, recModel] = await Promise.all([')
    || source.split(SESSION).length !== 2) {
    throw new Error('PaddleOCR initialization changed; review the mobile memory contract before upgrading')
  }
  const sequential = `    await this.disposeModelsOnly();
    const loadedAssets = [];
    try {
      let asset = await loadModelAsset(assets.det, fetchImpl);
      validateLoadedModelName("TextDetection", this.pipelineConfig.modelSelection.textDetectionModelName, asset.configText);
      this.detModel = await createDetModel({ ort: this.ort, modelBytes: asset.modelBytes,
        configText: asset.configText, backend, webgpuState, batchSize: this.pipelineConfig.textDetectionBatchSize });
      loadedAssets.push({ download: asset.download });
      asset = null;
      asset = await loadModelAsset(assets.rec, fetchImpl);
      validateLoadedModelName("TextRecognition", this.pipelineConfig.modelSelection.textRecognitionModelName, asset.configText);
      this.recModel = await createRecModel({ ort: this.ort, modelBytes: asset.modelBytes,
        configText: asset.configText, backend, webgpuState, batchSize: this.pipelineConfig.textRecognitionBatchSize });
      loadedAssets.push({ download: asset.download });
      asset = null;
    } catch (error) {
      await this.disposeModelsOnly();
      throw error;
    }
`
  return (source.slice(0, start) + sequential + source.slice(end)).replace(SESSION,
    `${SESSION.replace('"all"', 'globalThis.__CHINESEBQB_OCR_LOW_MEMORY__ ? "basic" : "all"')},
        ...(globalThis.__CHINESEBQB_OCR_LOW_MEMORY__ ? { enableCpuMemArena: false, enableMemPattern: false } : {})`)
}

export function boundedPaddleMemory(): Plugin {
  return {
    name: 'bounded-paddle-model-initialization',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@paddleocr/paddleocr-js/dist/index.mjs')) return null
      return { code: boundedPaddleSource(code), map: null }
    },
  }
}
