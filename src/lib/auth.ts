import { createInstallationToken, getInstallationId, signAppJwt } from './github-client'
import { GITHUB_CONFIG } from '@/consts'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { toast } from 'sonner'

const GITHUB_TOKEN_CACHE_KEY = 'github_token'

/**
 * ✅ 确保导出 clearAllAuthCache 以修复编译错误
 */
export function clearAllAuthCache(): void {
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(GITHUB_TOKEN_CACHE_KEY)
    }
}

/**
 * ✅ 恢复 hasAuth 导出
 */
export async function hasAuth(): Promise<boolean> {
    return !!useConfigStore.getState().rawPem
}

/**
 * ✅ 恢复旧系统需要的缓存操作函数（作为兼容占位）
 */
export async function getPemFromCache() { 
    return useConfigStore.getState().rawPem 
}

export async function savePemToCache(pem: string) { 
    console.log('私钥已由 ConfigStore 统一接管，无需重复保存。') 
}

/**
 * 统一的认证 Token 获取逻辑
 */
export async function getAuthToken(): Promise<string> {
    const cachedToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(GITHUB_TOKEN_CACHE_KEY) : null
    if (cachedToken) return cachedToken

    // 直接从新系统获取解密后的 rawPem
    const privateKey = useConfigStore.getState().rawPem
    if (!privateKey) throw new Error('未检测到私钥，请先登录系统')

    try {
        const jwt = signAppJwt(GITHUB_CONFIG.APP_ID, privateKey)
        const installationId = await getInstallationId(jwt, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO)
        const token = await createInstallationToken(jwt, installationId)
        
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(GITHUB_TOKEN_CACHE_KEY, token)
        }
        return token
    } catch (error: any) {
        throw new Error(error?.message || 'GitHub 认证流程失败')
    }
}