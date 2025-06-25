const express = require('express');
const axios = require('axios');
const app = express();

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

// 优先返回缓存
app.get('/api/feishu-table-first-row', async (req, res) => {
  try {
    if (feishuCache) {
      return res.json(feishuCache);
    }
    feishuCache = await fetchFeishuData();
    lastFetchTime = Date.now();
    res.json(feishuCache);
  } catch (e) {
    console.error('飞书API错误：', e.response ? e.response.data : e);
    res.status(500).json({ error: e.message, detail: e.response ? e.response.data : e });
  }
});

// 手动刷新接口
app.get('/api/refresh-feishu', async (req, res) => {
  try {
    feishuCache = await fetchFeishuData();
    lastFetchTime = Date.now();
    res.json({ success: true, time: lastFetchTime });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static('.'));

app.listen(3000, () => console.log('Server running on http://localhost:3000'));