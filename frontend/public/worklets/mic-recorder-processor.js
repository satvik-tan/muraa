class MicRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    // ⁠ inputs[0][0] ⁠ is the first channel of the incoming audio block.
    const input = inputs[0];
    const channel = input?.[0];

    if (!channel) return true;

    // Web Audio gives us Float32 samples in the range [-1, 1].
    // Convert them into signed 16-bit PCM samples for Nova.
    const int16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      int16[i] = sample < 0 ? sample * 32768 : sample * 32767;
    }

    // Send the raw PCM16 bytes back to the React hook.
    this.port.postMessage(int16.buffer, [int16.buffer]);
    return true;
  }
}

registerProcessor("mic-recorder-processor", MicRecorderProcessor);