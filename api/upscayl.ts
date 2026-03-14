const UPSCAYL_BASE = 'https://api.upscayl.org';

async function upscaylJson(path: string, apiKey: string, body: unknown) {
  const res = await fetch(`${UPSCAYL_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Upscayl ${path} invalid response: ${text.slice(0, 160)}`);
  }
  if (!res.ok) {
    const msg = typeof (data as any)?.error === 'string' ? (data as any).error : text.slice(0, 200);
    throw new Error(`Upscayl ${path} failed (${res.status}): ${msg}`);
  }
  return data;
}

export async function runUpscayl2K(inputBuf: Buffer, fileType: string, originalFileName: string, apiKey: string) {
  const form = new FormData();
  form.set('enhanceFace', 'false');
  form.set('model', 'upscayl-lite-4x');
  form.set('scale', '2');
  form.set('saveImageAs', 'jpg');
  const ext = fileType.includes('png') ? 'png' : fileType.includes('webp') ? 'webp' : 'jpg';
  form.set('file', new Blob([inputBuf], { type: fileType }), `${originalFileName || 'image'}.${ext}`);

  const startRes = await fetch(`${UPSCAYL_BASE}/start-task`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form as any,
  });
  const startText = await startRes.text();
  let startJson: any = {};
  try {
    startJson = startText ? JSON.parse(startText) : {};
  } catch {
    throw new Error(`Upscayl start-task invalid response: ${startText.slice(0, 160)}`);
  }
  if (!startRes.ok) {
    throw new Error(`Upscayl start-task failed (${startRes.status}): ${startText.slice(0, 200)}`);
  }
  const taskId = (startJson as any)?.data?.taskId as string | undefined;
  if (!taskId) throw new Error('Upscayl start-task missing taskId');

  const deadline = Date.now() + 110_000;
  let downloadUrl: string | null = null;
  while (Date.now() < deadline) {
    const st = await upscaylJson('/get-task-status', apiKey, { data: { taskId } });
    const status = (st as any)?.data?.status as string | undefined;
    if (status === 'PROCESSED') {
      const filesOut = (st as any)?.data?.files;
      const first = Array.isArray(filesOut) ? filesOut[0] : null;
      const url = first?.downloadUrl;
      if (typeof url === 'string' && url.startsWith('http')) {
        downloadUrl = url;
        break;
      }
    }
    if (status === 'PROCESSING_FAILED') {
      throw new Error('Upscayl processing failed');
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (!downloadUrl) throw new Error('Upscayl timeout waiting for 2K result');

  return { downloadUrl, taskId };
}

