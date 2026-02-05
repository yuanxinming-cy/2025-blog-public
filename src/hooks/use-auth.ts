'use client'

import { create } from 'zustand'
import { 
    clearAllAuthCache, 
    getAuthToken as getToken, 
    hasAuth as checkAuth,
    getPemFromCache,
    savePemToCache
} from '@/lib/auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'

interface AuthStore {
    isAuth: boolean
    privateKey: string | null
    setPrivateKey: (pem: string) => void
    getAuthToken: () => Promise<string>
    logout: () => void
}

/**
 * 💡 桥接旧版 AuthStore 到新版 ConfigStore
 */
export const useAuthStore = create<AuthStore>((set) => ({
    // 状态与新系统实时同步
    isAuth: !!useConfigStore.getState().rawPem,
    privateKey: useConfigStore.getState().rawPem,

    setPrivateKey: (pem: string) => {
        // 兼容性占位：不再允许通过此途径设置私钥，引导使用新登录页
        console.warn('请使用系统登录页面进行身份认证。')
    },

    getAuthToken: async () => {
        return await getToken()
    },

    logout: () => {
        clearAllAuthCache()
        // 这里可以视情况决定是否同时清空 ConfigStore
        set({ isAuth: false, privateKey: null })
    }
}))