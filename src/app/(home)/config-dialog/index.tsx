'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { DialogModal } from '@/components/dialog-modal'
import { useConfigStore } from '../stores/config-store' //
import { pushSiteContent } from '../services/push-site-content'
import type { SiteContent, CardStyles } from '../stores/config-store'
import { SiteSettings, type FileItem, type ArtImageUploads, type BackgroundImageUploads, type SocialButtonImageUploads } from './site-settings'
import { ColorConfig } from './color-config'
import { HomeLayout } from './home-layout'

interface ConfigDialogProps {
    open: boolean
    onClose: () => void
}

type TabType = 'site' | 'color' | 'layout'

export default function ConfigDialog({ open, onClose }: ConfigDialogProps) {
    // --- 权限接入：直接从 ConfigStore 获取 rawPem 和登录状态 ---
    const { siteContent, setSiteContent, cardStyles, setCardStyles, regenerateBubbles, rawPem, isHydrated } = useConfigStore()
    
    const [formData, setFormData] = useState<SiteContent>(siteContent)
    const [cardStylesData, setCardStylesData] = useState<CardStyles>(cardStyles)
    const [originalData, setOriginalData] = useState<SiteContent>(siteContent)
    const [originalCardStyles, setOriginalCardStyles] = useState<CardStyles>(cardStyles)
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('site')
    
    // 🔴 物理拆除：不再需要 keyInputRef
    // const keyInputRef = useRef<HTMLInputElement>(null)

    const [faviconItem, setFaviconItem] = useState<FileItem | null>(null)
    const [avatarItem, setAvatarItem] = useState<FileItem | null>(null)
    const [artImageUploads, setArtImageUploads] = useState<ArtImageUploads>({})
    const [backgroundImageUploads, setBackgroundImageUploads] = useState<BackgroundImageUploads>({})
    const [socialButtonImageUploads, setSocialButtonImageUploads] = useState<SocialButtonImageUploads>({})

    useEffect(() => {
        if (open) {
            const current = { ...siteContent }
            const currentCardStyles = { ...cardStyles }
            setFormData(current)
            setCardStylesData(currentCardStyles)
            setOriginalData(current)
            setOriginalCardStyles(currentCardStyles)
            setFaviconItem(null)
            setAvatarItem(null)
            setArtImageUploads({})
            setBackgroundImageUploads({})
            setSocialButtonImageUploads({})
            setActiveTab('site')
        }
    }, [open, siteContent, cardStyles])

    useEffect(() => {
        return () => {
            if (faviconItem?.type === 'file') URL.revokeObjectURL(faviconItem.previewUrl)
            if (avatarItem?.type === 'file') URL.revokeObjectURL(avatarItem.previewUrl)
            Object.values(artImageUploads).forEach(item => item.type === 'file' && URL.revokeObjectURL(item.previewUrl))
            Object.values(backgroundImageUploads).forEach(item => item.type === 'file' && URL.revokeObjectURL(item.previewUrl))
            Object.values(socialButtonImageUploads).forEach(item => item.type === 'file' && URL.revokeObjectURL(item.previewUrl))
        }
    }, [faviconItem, avatarItem, artImageUploads, backgroundImageUploads, socialButtonImageUploads])

    // --- 修改后的保存逻辑：静默使用 rawPem ---
    const handleSave = async () => {
        if (!rawPem) {
            toast.error('认证已过期，请重新登录')
            return
        }

        setIsSaving(true)
        try {
            const originalArtImages = originalData.artImages ?? []
            const currentArtImages = formData.artImages ?? []
            const removedArtImages = originalArtImages.filter(orig => !currentArtImages.some(current => current.id === orig.id))

            const originalBackgroundImages = originalData.backgroundImages ?? []
            const currentBackgroundImages = formData.backgroundImages ?? []
            const removedBackgroundImages = originalBackgroundImages.filter(orig => !currentBackgroundImages.some(current => current.id === orig.id))

            await pushSiteContent(
                formData,
                cardStylesData,
                faviconItem,
                avatarItem,
                artImageUploads,
                removedArtImages,
                backgroundImageUploads,
                removedBackgroundImages,
                socialButtonImageUploads,
                // 将内存中的密钥传给服务函数
                rawPem 
            )
            
            setSiteContent(formData)
            setCardStyles(cardStylesData)
            updateThemeVariables(formData.theme)
            setFaviconItem(null)
            setAvatarItem(null)
            setArtImageUploads({})
            setBackgroundImageUploads({})
            setSocialButtonImageUploads({})
            toast.success('配置已保存')
            onClose()
        } catch (error: any) {
            console.error('Failed to save:', error)
            toast.error(`保存失败: ${error?.message || '未知错误'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        if (faviconItem?.type === 'file') URL.revokeObjectURL(faviconItem.previewUrl)
        if (avatarItem?.type === 'file') URL.revokeObjectURL(avatarItem.previewUrl)
        
        setSiteContent(originalData)
        setCardStyles(originalCardStyles)
        regenerateBubbles()
        
        if (typeof document !== 'undefined') {
            document.title = originalData.meta.title
            const metaDescription = document.querySelector('meta[name="description"]')
            if (metaDescription) {
                metaDescription.setAttribute('content', originalData.meta.description)
            }
        }
        updateThemeVariables(originalData.theme)
        setFaviconItem(null)
        setAvatarItem(null)
        setArtImageUploads({})
        setBackgroundImageUploads({})
        setSocialButtonImageUploads({})
        onClose()
    }

    const updateThemeVariables = (theme?: SiteContent['theme']) => {
        if (typeof document === 'undefined' || !theme) return
        const root = document.documentElement
        const vars = {
            '--color-brand': theme.colorBrand,
            '--color-brand-secondary': theme.colorBrandSecondary,
            '--color-primary': theme.colorPrimary,
            '--color-secondary': theme.colorSecondary,
            '--color-bg': theme.colorBg,
            '--color-border': theme.colorBorder,
            '--color-card': theme.colorCard,
            '--color-article': theme.colorArticle
        }
        Object.entries(vars).forEach(([key, value]) => value && root.style.setProperty(key, value))
    }

    const handlePreview = () => {
        setSiteContent(formData)
        setCardStyles(cardStylesData)
        regenerateBubbles()
        if (typeof document !== 'undefined') {
            document.title = formData.meta.title
            const metaDescription = document.querySelector('meta[name="description"]')
            if (metaDescription) metaDescription.setAttribute('content', formData.meta.description)
        }
        updateThemeVariables(formData.theme)
        onClose()
    }

    const tabs: { id: TabType; label: string }[] = [
        { id: 'site', label: '网站设置' },
        { id: 'color', label: '色彩配置' },
        { id: 'layout', label: '首页布局' }
    ]

    return (
        <>
            {/* 🔴 物理拆除：删除了隐藏的文件 input 密钥导入器 */}

            <DialogModal open={open} onClose={handleCancel} className='card scrollbar-none max-h-[90vh] min-h-[600px] w-[640px] overflow-y-auto'>
                <div className='mb-6 flex items-center justify-between'>
                    <div className='flex gap-1'>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                                    activeTab === tab.id ? 'text-brand' : 'text-secondary hover:text-primary'
                                }`}>
                                {tab.label}
                                {activeTab === tab.id && <div className='bg-brand absolute right-0 bottom-0 left-0 h-0.5' />}
                            </button>
                        ))}
                    </div>
                    <div className='flex gap-3'>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePreview}
                            className='bg-card rounded-xl border px-6 py-2 text-sm'>
                            预览
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancel}
                            disabled={isSaving}
                            className='bg-card rounded-xl border px-6 py-2 text-sm'>
                            取消
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSave} // 直接绑定 handleSave
                            disabled={isSaving} 
                            className='brand-btn px-6'
                        >
                            {isSaving ? '保存中...' : (isHydrated && rawPem ? '保存' : '未认证')}
                        </motion.button>
                    </div>
                </div>

                <div className='min-h-[200px]'>
                    {activeTab === 'site' && (
                        <SiteSettings
                            formData={formData}
                            setFormData={setFormData}
                            faviconItem={faviconItem}
                            setFaviconItem={setFaviconItem}
                            avatarItem={avatarItem}
                            setAvatarItem={setAvatarItem}
                            artImageUploads={artImageUploads}
                            setArtImageUploads={setArtImageUploads}
                            backgroundImageUploads={backgroundImageUploads}
                            setBackgroundImageUploads={setBackgroundImageUploads}
                            socialButtonImageUploads={socialButtonImageUploads}
                            setSocialButtonImageUploads={setSocialButtonImageUploads}
                        />
                    )}
                    {activeTab === 'color' && <ColorConfig formData={formData} setFormData={setFormData} />}
                    {activeTab === 'layout' && <HomeLayout cardStylesData={cardStylesData} setCardStylesData={setCardStylesData} onClose={onClose} />}
                </div>
            </DialogModal>
        </>
    )
}