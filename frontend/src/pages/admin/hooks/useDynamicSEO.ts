// frontend/src/hooks/useDynamicSEO.ts
import { useEffect } from 'react';
import { api } from '../../../api/client';

export function useDynamicSEO() {
  useEffect(() => {
    api.get('/settings').then(res => {
      const data = res.data;
      if (data) {
        // 1. 动态修改网页标签页标题
        document.title = data.seoTitle;

        // 2. 动态修改 Description Meta
        let descMeta = document.querySelector('meta[name="description"]');
        if (!descMeta) {
          descMeta = document.createElement('meta');
          descMeta.setAttribute('name', 'description');
          document.head.appendChild(descMeta);
        }
        descMeta.setAttribute('content', data.seoDescription);

        // 3. 动态修改 Keywords Meta
        let keyMeta = document.querySelector('meta[name="keywords"]');
        if (!keyMeta) {
          keyMeta = document.createElement('meta');
          keyMeta.setAttribute('name', 'keywords');
          document.head.appendChild(keyMeta);
        }
        keyMeta.setAttribute('content', data.seoKeywords);
      }
    }).catch(console.error);
  }, []);
}