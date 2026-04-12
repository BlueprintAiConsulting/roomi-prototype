// AudioWorklet processor for mic capture — runs on audio thread
// Must be loaded as a module URL
const WORKLET_CODE = `
class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._targetSize = 2048;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const samples = input[0];
    for (let i = 0; i < samples.length; i++) {
      this._buffer.push(samples[i]);
    }
    while (this._buffer.length >= this._targetSize) {
      const chunk = this._buffer.splice(0, this._targetSize);
      const int16 = new Int16Array(this._targetSize);
      for (let i = 0; i < this._targetSize; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, chunk[i] * 32768));
      }
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('mic-capture', MicCaptureProcessor);
`;

export function createWorkletBlob() {
  return URL.createObjectURL(new Blob([WORKLET_CODE], { type: 'application/javascript' }));
}
