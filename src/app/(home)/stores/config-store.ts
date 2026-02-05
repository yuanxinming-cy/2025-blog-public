import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import CryptoJS from 'crypto-js'
import siteContent from '@/config/site-content.json'
import cardStyles from '@/config/card-styles.json'

export type SiteContent = typeof siteContent
export type CardStyles = typeof cardStyles

interface ConfigStore {
	// --- 原有的 UI 配置状态 ---
	siteContent: SiteContent
	cardStyles: CardStyles
	regenerateKey: number
	configDialogOpen: boolean
	
	// --- 新增的身份验证状态 ---
	encryptedPem: string  // 持久化存储在 localStorage 的加密内容
	rawPem: string        // 仅存在于内存中的原始 PEM (刷新即消失，需重新解密)
	isHydrated: boolean   // 标记 Zustand 是否已完成本地数据读取

	// --- 原有的方法 ---
	setSiteContent: (content: SiteContent) => void
	setCardStyles: (styles: CardStyles) => void
	resetSiteContent: () => void
	resetCardStyles: () => void
	regenerateBubbles: () => void
	setConfigDialogOpen: (open: boolean) => void

	// --- 新增的身份验证方法 ---
	setAuth: (pem: string, userPassword?: string) => void
	logout: () => void
	setHydrated: (val: boolean) => void
}

export const useConfigStore = create<ConfigStore>()(
	persist(
		(set, get) => ({
			// 初始化原有配置
			siteContent: { ...siteContent },
			cardStyles: { ...cardStyles },
			regenerateKey: 0,
			configDialogOpen: false,
			
			// 初始化新增状态
			encryptedPem: '',
			rawPem: '',
			isHydrated: false,

			// 原有方法实现
			setSiteContent: (content) => set({ siteContent: content }),
			setCardStyles: (styles) => set({ cardStyles: styles }),
			resetSiteContent: () => set({ siteContent: { ...siteContent } }),
			resetCardStyles: () => set({ cardStyles: { ...cardStyles } }),
			regenerateBubbles: () => set(state => ({ regenerateKey: state.regenerateKey + 1 })),
			setConfigDialogOpen: (open) => set({ configDialogOpen: open }),

			// 新增身份验证方法实现
			setAuth: (pemContent, userPassword) => {
				if (userPassword) {
					// 初次设置：加密并存入 localStorage
					const encrypted = CryptoJS.AES.encrypt(pemContent, userPassword).toString()
					set({ encryptedPem: encrypted, rawPem: pemContent })
				} else {
					// 解锁成功：仅填充内存
					set({ rawPem: pemContent })
				}
			},
			logout: () => set({ encryptedPem: '', rawPem: '' }),
			setHydrated: (val) => set({ isHydrated: val })
		}),
		{
			name: 'xinming-secure-storage',
			storage: createJSONStorage(() => localStorage),
			// 核心过滤：只持久化 encryptedPem。原始 PEM 和 UI 状态都不存硬盘
			partialize: (state) => ({ 
				encryptedPem: state.encryptedPem 
			} as ConfigStore),
			// 当数据从本地恢复完成时，更新标志位
			onRehydrateStorage: () => (state) => {
				state?.setHydrated(true)
			}
		}
	)
)
