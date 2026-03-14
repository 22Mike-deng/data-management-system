/**
 * 数据导入导出API
 * 创建者：dzh
 * 创建时间：2026-03-14
 * 更新时间：2026-03-14
 */
import request from '@/utils/request';
import type { ApiResponse } from '@/types';

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
 * 导出数据
 */
export function exportData(tableId: string, format: 'csv' | 'json' | 'xlsx' = 'xlsx') {
  // 直接打开下载链接
  const token = localStorage.getItem('token');
  const url = `${request.defaults.baseURL}/data-import-export/export/${tableId}?format=${format}&token=${token}`;
  window.open(url, '_blank');
}

/**
 * 下载导入模板
 */
export function downloadTemplate(tableId: string, format: 'csv' | 'json' | 'xlsx' = 'xlsx') {
  const token = localStorage.getItem('token');
  const url = `${request.defaults.baseURL}/data-import-export/template/${tableId}?format=${format}&token=${token}`;
  window.open(url, '_blank');
}
