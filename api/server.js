import axios from 'axios';

const APP_ID = 'cli_a8d0c6219fbbd00b';
const APP_SECRET = 'O6eLgL4eYXLNtfjjYF1AVerfJCFQ5HrD';
const APP_TOKEN = 'DYMsbqRDfaaLxZsjbRZcUxxonUf';
const TABLE_ID = 'tblVtWCoThFQAwnC';

// 缓存变量
let feishuCache = null;
let lastFetchTime = 0;

async function getTenantAccessToken() {
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: APP_ID,
    app_secret: APP_SECRET
  });
  return res.data.tenant_access_token;
}

async function fetchFeishuData() {
  const token = await getTenantAccessToken();
  let allItems = [];
  let pageToken = '';
  let hasMore = true;
  while (hasMore) {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=100${pageToken ? `&page_token=${pageToken}` : ''}`;
    const data = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    allItems = allItems.concat(data.data.data.items);
    hasMore = data.data.data.has_more;
    pageToken = data.data.data.page_token || '';
  }
  return { items: allItems };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 只处理 /api/feishu-table-first-row 路径
    if (req.url.startsWith('/api/feishu-table-first-row')) {
      try {
        if (feishuCache) {
          return res.status(200).json(feishuCache);
        }
        feishuCache = await fetchFeishuData();
        lastFetchTime = Date.now();
        return res.status(200).json(feishuCache);
      } catch (e) {
        console.error('飞书API错误：', e.response ? e.response.data : e);
        return res.status(500).json({ error: e.message, detail: e.response ? e.response.data : e });
      }
    } else if (req.url.startsWith('/api/refresh-feishu')) {
      try {
        feishuCache = await fetchFeishuData();
        lastFetchTime = Date.now();
        return res.status(200).json({ success: true, time: lastFetchTime });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}