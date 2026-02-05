import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware' // 引入持久化中间件
import siteContent from '@/config/site-content.json'
import cardStyles from '@/config/card-styles.json'

export type SiteContent = typeof siteContent
export type CardStyles = typeof cardStyles

interface ConfigStore {
	siteContent: SiteContent
	cardStyles: CardStyles
	regenerateKey: number
	configDialogOpen: boolean
	password: string // 新增：用于存储密钥
	setSiteContent: (content: SiteContent) => void
	setCardStyles: (styles: CardStyles) => void
	setPassword: (password: string) => void // 新增：设置密钥的方法
	resetSiteContent: () => void
	resetCardStyles: () => void
	regenerateBubbles: () => void
	setConfigDialogOpen: (open: boolean) => void
}

export const useConfigStore = create<ConfigStore>()(
	persist(
		(set, get) => ({
			siteContent: { ...siteContent },
			cardStyles: { ...cardStyles },
			regenerateKey: 0,
			configDialogOpen: false,
			password: '', // 初始密钥为空
			setSiteContent: (content: SiteContent) => {
				set({ siteContent: content })
			},
			setCardStyles: (styles: CardStyles) => {
				set({ cardStyles: styles })
			},
			setPassword: (password: string) => {
				set({ password })
			},
			resetSiteContent: () => {
				set({ siteContent: { ...siteContent } })
			},
			resetCardStyles: () => {
				set({ cardStyles: { ...cardStyles } })
			},
			regenerateBubbles: () => {
				set(state => ({ regenerateKey: state.regenerateKey + 1 }))
			},
			setConfigDialogOpen: (open: boolean) => {
				set({ configDialogOpen: open })
			}
		}),
		{
			name: 'xinming-blog-storage', // 存储在 localStorage 中的 key
			storage: createJSONStorage(() => localStorage),
			// 关键：只持久化 password，其他 UI 状态（如弹窗是否打开）刷新即重置
			partialize: (state) => ({ password: state.password }), 
		}
	)
)
