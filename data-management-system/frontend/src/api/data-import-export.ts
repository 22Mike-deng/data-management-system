/**
 * 数据导入导出API
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import request from '@/utils/request';
import type { ApiResponse } from '@/types';

// API 基础地址 - 使用相对路径以通过 Vite 代理
const API_BASE = '/api';

/**
 * 导入数据
 */
export function importData(
  tableId: string,
  file: File,
  format: string,
  onProgress?: (percent: number) => void,
): Promise<ApiResponse<{
  success: boolean;
  total: number;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}>> {
  const formData = new FormData();
  formData.append('file', file);

  return request.post(`/data-import-export/import/${tableId}?format=${format}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
}

/**
 * 通用文件下载函数
 */
async function downloadFile(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '下载失败' }));
    throw new Error(errorData.message || `下载失败: ${response.status}`);
  }

  // 获取文件 blob
  const blob = await response.blob();
  
  // 创建下载链接
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // 清理
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * 导出数据
 */
export async function exportData(tableId: string, format: 'csv' | 'json' | 'xlsx' = 'xlsx'): Promise<void> {
  const url = `${API_BASE}/data-import-export/export/${tableId}?format=${format}`;
  // 生成默认文件名
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `export_${timestamp}.${format}`;
  await downloadFile(url, filename);
}

/**
 * 下载导入模板
 */
export async function downloadTemplate(tableId: string, format: 'csv' | 'json' | 'xlsx' = 'xlsx'): Promise<void> {
  const url = `${API_BASE}/data-import-export/template/${tableId}?format=${format}`;
  const filename = `template.${format}`;
  await downloadFile(url, filename);
}
