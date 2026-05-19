// STT API - 语音转文字
// 方案：客户端录音上传 → 服务端先上传到DashScope获取临时URL → 调Paraformer识别
// DashScope提供文件上传凭证接口，可以上传本地文件获取临时URL

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

// 第一步：获取上传凭证
async function getUploadPolicy(filename: string): Promise<{ url: string; policy: string; signature: string; ossAccessKeyId: string; key: string }> {
  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'getPolicy', file_name: filename }),
  });

  if (!res.ok) {
    throw new Error('获取上传凭证失败');
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any).data;
}

// 第二步：上传文件到OSS
async function uploadToOss(policy: Record<string, string>, fileData: ArrayBuffer, filename: string): Promise<void> {
  const formData = new FormData();
  formData.append('key', policy.key || filename);
  formData.append('policy', policy.policy);
  formData.append('Signature', policy.signature);
  formData.append('OSSAccessKeyId', policy.ossAccessKeyId || '');
  formData.append('file', new Blob([fileData]), filename);

  const res = await fetch(policy.url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('上传文件失败');
}

// 第三步：提交识别任务
async function submitAsrTask(fileUrl: string): Promise<string> {
  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'paraformer-v2',
      input: { file_urls: [fileUrl] },
      parameters: { language_hints: ['zh', 'en'] },
    }),
  });

  const data = await res.json();
  return data.output.task_id;
}

// 第四步：查询识别结果
async function queryAsrResult(taskId: string): Promise<string> {
  for (let i = 0; i < 30; i++) { // 最多等10秒
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` },
    });

    const data = await res.json();
    const status = data.output?.task_status;

    if (status === 'SUCCEEDED') {
      // 获取识别结果
      const results = data.output.results;
      if (results && results.length > 0 && results[0].transcription_url) {
        const transRes = await fetch(results[0].transcription_url);
        const transData = await transRes.json();
        const text = transData.transcripts?.[0]?.text || '';
        return text;
      }
      return '';
    }

    if (status === 'FAILED') {
      throw new Error('识别失败');
    }

    // 等待200ms重试
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  throw new Error('识别超时');
}

export async function POST(request: NextRequest) {
  if (!DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'STT未配置' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size < 500) {
      return NextResponse.json({ error: '音频太短' }, { status: 400 });
    }

    // 读取音频
    const audioData = await audioFile.arrayBuffer();
    const filename = `voice_${Date.now()}.webm`;

    // 1. 获取上传凭证
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = await getUploadPolicy(filename) as any;

    // 2. 上传到OSS
    await uploadToOss(policy, audioData, filename);

    // 3. 构建文件URL
    const fileUrl = policy.key ? `oss://${policy.key}` : `oss://${filename}`;

    // 4. 提交识别任务
    const taskId = await submitAsrTask(fileUrl);

    // 5. 等待结果
    const text = await queryAsrResult(taskId);

    if (!text) {
      return NextResponse.json({ error: '未识别到内容' }, { status: 400 });
    }

    return NextResponse.json({ text });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('STT error:', error.message);
    return NextResponse.json({ error: error.message || '语音识别失败' }, { status: 500 });
  }
}
