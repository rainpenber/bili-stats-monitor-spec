// T008: Bilibili API Mock 工具 - 模拟 B站 API 响应
export const mockBilibiliVideoResponse = {
  code: 0,
  message: '0',
  ttl: 1,
  data: {
    bvid: 'BV1234567890',
    aid: 123456789,
    videos: 1,
    tid: 21,
    tname: '日常',
    title: '测试视频标题',
    pubdate: 1704067200,
    ctime: 1704067200,
    desc: '测试视频描述',
    owner: {
      mid: 123456789,
      name: '测试UP主',
      face: 'https://example.com/avatar.jpg'
    },
    stat: {
      aid: 123456789,
      view: 100000,
      danmaku: 500,
      reply: 200,
      favorite: 300,
      coin: 150,
      share: 80,
      now_rank: 0,
      his_rank: 0,
      like: 800,
      dislike: 0
    },
    pic: 'https://example.com/cover.jpg'
  }
}

export const mockBilibiliAuthorResponse = {
  code: 0,
  message: '0',
  ttl: 1,
  data: {
    mid: 123456789,
    name: '测试UP主',
    sex: '保密',
    face: 'https://example.com/avatar.jpg',
    sign: '这是个人签名',
    level: 6,
    birthday: '01-01',
    follower: 50000,
    following: 200
  }
}

export const mockBilibiliFansResponse = {
  code: 0,
  message: '0',
  ttl: 1,
  data: {
    follower: 50123
  }
}

/**
 * Mock Bilibili API 的 fetch 函数
 */
export function mockBilibiliAPI() {
  const originalFetch = globalThis.fetch
  
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString()
    
    // Mock 视频信息 API
    if (urlString.includes('api.bilibili.com/x/web-interface/view')) {
      return new Response(JSON.stringify(mockBilibiliVideoResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Mock 博主信息 API
    if (urlString.includes('api.bilibili.com/x/space/acc/info')) {
      return new Response(JSON.stringify(mockBilibiliAuthorResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Mock 粉丝数 API
    if (urlString.includes('api.bilibili.com/x/relation/stat')) {
      return new Response(JSON.stringify(mockBilibiliFansResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 其他请求使用原始 fetch
    return originalFetch(url, init)
  }
  
  return () => {
    globalThis.fetch = originalFetch
  }
}

