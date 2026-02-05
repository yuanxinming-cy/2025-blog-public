import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import CryptoJS from 'crypto-js' // 引入加密库

interface ConfigStore {
    // ... 原有属性 ...
    encryptedPem: string  // 硬盘里存加密后的乱码
    rawPem: string        // 内存里存解密后的原始 PEM
    setAuth: (pem: string, password?: string) => void
    logout: () => void
}

export const useConfigStore = create<ConfigStore>()(
    persist(
        (set) => ({
            // ... 原有初始化 ...
            encryptedPem: '',
            rawPem: '',

            // 登录/设置逻辑
            setAuth: (pemContent, password) => {
                if (password) {
                    // 如果提供了密码，说明是初次绑定，加密后存入硬盘
                    const encrypted = CryptoJS.AES.encrypt(pemContent, password).toString()
                    set({ encryptedPem: encrypted, rawPem: pemContent })
                } else {
                    // 如果没提密码，仅更新内存（用于解密后的填充）
                    set({ rawPem: pemContent })
                }
            },
            logout: () => set({ encryptedPem: '', rawPem: '' }),
        }),
        {
            name: 'xinming-secure-storage',
            storage: createJSONStorage(() => localStorage),
            // 关键：只把加密后的乱码存硬盘，原始 PEM 绝对不存硬盘
            partialize: (state) => ({ encryptedPem: state.encryptedPem } as any),
        }
    )
)
