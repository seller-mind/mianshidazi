// STT API - 语音转文字
// 方案：客户端录音上传 → 服务端上传到DashScope临时存储 → Paraformer识别
// 参考文档：https://help.aliyun.com/zh/model-studio/get-temporary-file-url

import { NextRequest, NextResponse } from 'next/server';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

// 上传凭证返回的字段
interface UploadPolicy {
  upload_host: string;
  upload_dir: string;
  oss_access_key_id: string;
  policy: string;
  signature: string;
  expire_in_seconds: number;
  max_file_size_mb: number;
  x_oss_object_acl: string;
  x_oss_forbid_overwrite: string;
}

// 第一步：获取上传凭证（GET请求）
async function getUploadPolicy(): Promise<UploadPolicy> {
  const url = 'https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=paraformer-v2';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('getUploadPolicy failed:', res.status, errText);
    throw new Error('获取上传凭证失败');
  }

  const data = await res.json();
  return data.data;
}

// 第二步：上传文件到OSS
async function uploadToOss(
  policy: UploadPolicy,
  fileData: ArrayBuffer,
  filename: string
): Promise<string> {
  const key = policy.upload_dir + '/' + filename;

  const formData = new FormData();
  formData.append('OSSAccessKeyId', policy.oss_access_key_id);
  formData.append('policy', policy.policy);
  formData.append('Signature', policy.signature);
  formData.append('key', key);
  // 必须添加的额外字段
  formData.append('x-oss-object-acl', policy.x_oss_object_acl);
  formData.append('x-oss-forbid-overwrite', policy.x_oss_forbid_overwrite);
  formData.append('file', new Blob([fileData]), filename);

  const res = await fetch(policy.upload_host, { method: 'POST', body: formData });
  if (!res.ok) {
    const errText = await res.text();
    console.error('uploadToOss failed:', res.status, errText);
    throw new Error('上传文件失败');
  }

  return key;
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

  if (!res.ok) {
    const errText = await res.text();
    console.error('submitAsrTask failed:', res.status, errText);
    throw new Error('提交识别任务失败');
  }

  const data = await res.json();
  const taskId = data.output?.task_id;
  if (!taskId) {
    console.error('submitAsrTask no task_id:', JSON.stringify(data));
    throw new Error('提交识别任务异常');
  }
  return taskId;
}

// 第四步：查询识别结果
async function queryAsrResult(taskId: string): Promise<string> {
  for (let i = 0; i < 60; i++) { // 最多等18秒
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` },
    });

    const data = await res.json();
    const status = data.output?.task_status;

    if (status === 'SUCCEEDED') {
      const results = data.output.results;
      if (results && results.length > 0) {
        // 检查子任务状态
        const succeededResult = results.find((r: { subtask_status: string }) => r.subtask_status === 'SUCCEEDED');
        if (succeededResult?.transcription_url) {
          const transRes = await fetch(succeededResult.transcription_url);
          const transData = await transRes.json();
          const text = transData.transcripts?.[0]?.text || '';
          return text;
        }
      }
      return '';
    }

    if (status === 'FAILED') {
      console.error('ASR task failed:', JSON.stringify(data.output));
      throw new Error('识别失败');
    }

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

    console.log(`STT: uploading ${filename}, size=${audioData.byteLength}`);

    // 1. 获取上传凭证
    const policy = await getUploadPolicy();

    // 2. 上传到OSS
    const ossKey = await uploadToOss(policy, audioData, filename);

    // 3. 用 oss:// 前缀的临时URL
    const fileUrl = `oss://${ossKey}`;

    console.log(`STT: file uploaded, key=${ossKey}, submitting ASR task...`);

    // 4. 提交识别任务
    const taskId = await submitAsrTask(fileUrl);

    console.log(`STT: task submitted, id=${taskId}, waiting for result...`);

    // 5. 等待结果
    const text = await queryAsrResult(taskId);

    console.log(`STT: result="${text}"`);

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
