'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import GridView from './grid-view'
import CreateDialog from './components/create-dialog'
import { pushShares } from './services/push-shares'
import { useConfigStore } from '@/app/(home)/stores/config-store' //
import initialList from './list.json'
import type { Share } from './components/share-card'
import type { LogoItem } from './components/logo-upload-dialog'

export default function Page() {
    const [shares, setShares] = useState<Share[]>(initialList as Share[])
    const [originalShares, setOriginalShares] = useState<Share[]>(initialList as Share[])
    const [isEditMode, setIsEditMode] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingShare, setEditingShare] = useState<Share | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [logoItems, setLogoItems] = useState<Map<string, LogoItem>>(new Map())

    // --- 权限接入：接入新明的加密系统 ---
    const { siteContent, rawPem, isHydrated } = useConfigStore() //
    const hideEditButton = siteContent.hideEditButton ?? false

    const handleUpdate = (updatedShare: Share, oldShare: Share, logoItem?: LogoItem) => {
        setShares(prev => prev.map(s => (s.url === oldShare.url ? updatedShare : s)))
        if (logoItem) {
            setLogoItems(prev => {
                const newMap = new Map(prev)
                newMap.set(updatedShare.url, logoItem)
                return newMap
            })
        }
    }

    const handleAdd = () => {
        setEditingShare(null)
        setIsCreateDialogOpen(true)
    }

    const handleSaveShare = (updatedShare: Share) => {
        if (editingShare) {
            const updated = shares.map(s => (s.url === editingShare.url ? updatedShare : s))
            setShares(updated)
        } else {
            setShares([...shares, updatedShare])
        }
    }

    const handleDelete = (share: Share) => {
        if (confirm(`确定要删除分享：${share.name} 吗？`)) {
            setShares(shares.filter(s => s.url !== share.url))
        }
    }

    // --- 核心保存逻辑：直接从 ConfigStore 调取解密后的密钥 ---
    const handleSave = async () => {
        if (!rawPem) {
            toast.error('登录状态已失效，请重新登录')
            return
        }

        setIsSaving(true)
        try {
            // 将 rawPem 作为授权密钥传入
            await pushShares({
                shares,
                logoItems,
                privateKey: rawPem 
            })

            setOriginalShares(shares)
            setLogoItems(new Map())
            setIsEditMode(false)
            toast.success('分享配置保存成功！')
        } catch (error: any) {
            console.error('Failed to save:', error)
            toast.error(`保存失败: ${error?.message || '未知错误'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setShares(originalShares)
        setLogoItems(new Map())
        setIsEditMode(false)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 只有在已登录状态下，才响应快捷键进入管理模式
            if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
                if (rawPem) {
                    e.preventDefault()
                    setIsEditMode(true)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isEditMode, rawPem])

    return (
        <>
            {/* 🔴 物理拆除：删掉了之前隐藏的文件 input 密钥导入器 */}

            <GridView shares={shares} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

            {/* --- 右上角控制台：权限感知 --- */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.6 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className='absolute top-4 right-6 flex gap-3 max-sm:hidden'
            >
                {isEditMode ? (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancel}
                            disabled={isSaving}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm'
                        >
                            取消
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAdd}
                            disabled={isSaving}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm'
                        >
                            添加分享
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className='brand-btn px-6 shadow-lg'
                        >
                            {isSaving ? '保存中...' : '提交修改'}
                        </motion.button>
                    </>
                ) : (
                    // --- 核心权限：只有在登录状态下且配置未隐藏时显示编辑入口 ---
                    isHydrated && rawPem && !hideEditButton && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditMode(true)}
                            className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
                        >
                            管理分享
                        </motion.button>
                    )
                )}
            </motion.div>

            {isCreateDialogOpen && (
                <CreateDialog 
                    share={editingShare} 
                    onClose={() => setIsCreateDialogOpen(false)} 
                    onSave={handleSaveShare} 
                />
            )}
        </>
    )
}