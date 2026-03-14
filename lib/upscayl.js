const UPSCAYL_BASE = 'https://api.upscayl.org';

async function upscaylJson(path, apiKey, body) {
  const res = await fetch(`${UPSCAYL_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Upscayl ${path} invalid response: ${text.slice(0, 160)}`);
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : text.slice(0, 200);
    throw new Error(`Upscayl ${path} failed (${res.status}): ${msg}`);
  }
  return data;
}

export async function runUpscayl2K(inputBuf, fileType, originalFileName, apiKey) {
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
    body: form,
  });
  const startText = await startRes.text();
  let startJson = {};
  try {
    startJson = startText ? JSON.parse(startText) : {};
  } catch {
    throw new Error(`Upscayl start-task invalid response: ${startText.slice(0, 160)}`);
  }
  if (!startRes.ok) {
    throw new Error(`Upscayl start-task failed (${startRes.status}): ${startText.slice(0, 200)}`);
  }
  const taskId = startJson?.data?.taskId;
  if (!taskId) throw new Error('Upscayl start-task missing taskId');

  const deadline = Date.now() + 110_000;
  let downloadUrl = null;
  let lastStatus = null;
  while (Date.now() < deadline) {
    const st = await upscaylJson('/get-task-status', apiKey, { data: { taskId } });
    const status = st?.data?.status;
    lastStatus = status || null;
    if (status === 'PROCESSED') {
      const filesOut = st?.data?.files;
      const first = Array.isArray(filesOut) ? filesOut[0] : null;
      const url = first?.downloadUrl || first?.downloadLink;
      if (typeof url === 'string' && url.startsWith('http')) {
        downloadUrl = url;
        break;
      }
      // If API says PROCESSED but we can't find a URL field, surface raw response for debugging
      throw new Error(
        `Upscayl PROCESSED but missing download URL. Raw file data: ${JSON.stringify(
          first ?? st?.data ?? st,
        ).slice(0, 400)}`,
      );
    }
    if (status === 'PROCESSING_FAILED') {
      throw new Error('Upscayl processing failed');
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!downloadUrl) {
    throw new Error(
      `Upscayl timeout waiting for 2K result (last status: ${lastStatus ?? 'unknown'})`,
    );
  }

  return { downloadUrl, taskId };
}

