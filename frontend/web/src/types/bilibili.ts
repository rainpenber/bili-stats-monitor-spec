// B站账号绑定相关类型定义

export interface BilibiliAccount {
  accountId: string
  uid: string
  nickname: string
  bindMethod: 'cookie' | 'qrcode'
  boundAt: string
  status: 'valid' | 'expired'
}

export interface QRCodeSession {
  qrcodeKey: string
  qrUrl: string
  expireAt: string
}

export type QRCodeStatus = 'pending' | 'scanned' | 'confirmed' | 'expired'

export interface QRCodePollResponse {
  status: QRCodeStatus
  message: string
  account?: BilibiliAccount
}

export interface CookieBindingInput {
  cookie: string
}

export interface CookieBindingResponse {
  account: BilibiliAccount
}

