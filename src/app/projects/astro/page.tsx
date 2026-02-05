'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import initialList from './list.json'

// ✅ 修正：使用绝对路径引用原有组件，避免层级加深导致的 Module not found
import { RandomLayout } from '@/app/pictures/components/random-layout'
import UploadDialog from '@/app/pictures/components/upload-dialog'

// ✅ 修正：引用当前目录下的服务函数
import { pushPictures } from './services/push-pictures'

// ✅ 修正：接入最新的加密中心，废弃旧的 Auth 逻辑
import { useConfigStore } from '@/app/(home)/stores/config-store'
import type { ImageItem } from '@/app/projects/components/image-upload-dialog'

export interface Picture {
    id: string
    uploadedAt: string
    description?: string
    image?: string
    images?: string[]
}

export default function AstroPage() {
    const [pictures, setPictures] = useState<Picture[]>(initialList as Picture[])
    const [originalPictures, setOriginalPictures] = useState<Picture[]>(initialList as Picture[])
    const [isEditMode, setIsEditMode] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
    const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
    const router = useRouter()

    // --- 权限接入：直接使用全局解密后的密钥 ---
    const { siteContent, rawPem, isHydrated } = useConfigStore()
    const hideEditButton = siteContent.hideEditButton ?? false

    const handleUploadSubmit = ({ images, description }: { images: ImageItem[]; description: string }) => {
        const now = new Date().toISOString()
        if (images.length === 0) {
            toast.error('请至少选择一张图片')
            return
        }

        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const desc = description.trim() || undefined
        const imageUrls = images.map(imageItem => (imageItem.type === 'url' ? imageItem.url : imageItem.previewUrl))

        const newPicture: Picture = {
            id,
            uploadedAt: now,
            description: desc,
            images: imageUrls
        }

        const newMap = new Map(imageItems)
        images.forEach((imageItem, index) => {
            if (imageItem.type === 'file') {
                newMap.set(`${id}::${index}`, imageItem)
            }
        })

        setPictures(prev => [...prev, newPicture])
        setImageItems(newMap)
        setIsUploadDialogOpen(false)
    }

    const handleDeleteSingleImage = (pictureId: string, imageIndex: number | 'single') => {
        setPictures(prev => {
            return prev
                .map(picture => {
                    if (picture.id !== pictureId) return picture
                    if (imageIndex === 'single') return null
                    if (picture.images && picture.images.length > 0) {
                        const newImages = picture.images.filter((_, idx) => idx !== imageIndex)
                        if (newImages.length === 0) return null
                        return { ...picture, images: newImages }
                    }
                    return picture
                })
                .filter((p): p is Picture => p !== null)
        })

        setImageItems(prev => {
            const next = new Map(prev)
            if (imageIndex === 'single') {
                for (const key of next.keys()) {
                    if (key.startsWith(`${pictureId}::`)) next.delete(key)
                }
            } else {
                next.delete(`${pictureId}::${imageIndex}`)
                const keysToUpdate: Array<{ oldKey: string; newKey: string }> = []
                for (const key of next.keys()) {
                    if (key.startsWith(`${pictureId}::`)) {
                        const [, indexStr] = key.split('::')
                        const oldIndex = Number(indexStr)
                        if (!isNaN(oldIndex) && oldIndex > imageIndex) {
                            keysToUpdate.push({
                                oldKey: key,
                                newKey: `${pictureId}::${oldIndex - 1}`
                            })
                        }
                    }
                }
                for (const { oldKey, newKey } of keysToUpdate) {
                    const value = next.get(oldKey)
                    if (value) {
                        next.set(newKey, value)
                        next.delete(oldKey)
                    }
                }
            }
            return next
        })
    }

    const handleDeleteGroup = (picture: Picture) => {
        if (!confirm('确定要删除这一组图片吗？')) return
        setPictures(prev => prev.filter(p => p.id !== picture.id))
        setImageItems(prev => {
            const next = new Map(prev)
            for (const key of next.keys()) {
                if (key.startsWith(`${picture.id}::`)) next.delete(key)
            }
            return next
        })
    }

    // --- 修改后的保存逻辑：静默使用内存密钥 ---
    const handleSave = async () => {
        if (!rawPem) {
            toast.error('认证已过期，请重新登录')
            return
        }

        setIsSaving(true)
        try {
            await pushPictures({
                pictures,
                imageItems,
                // 如果 pushPictures 需要密钥，直接传 rawPem
                privateKey: rawPem 
            })

            setOriginalPictures(pictures)
            setImageItems(new Map())
            setIsEditMode(false)
            toast.success('照片墙更新成功！')
        } catch (error: any) {
            console.error('Failed to save:', error)
            toast.error(`保存失败: ${error?.message || '未知错误'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setPictures(originalPictures)
        setImageItems(new Map())
        setIsEditMode(false)
    }

    // 根据认证状态显示文案
    const buttonText = isHydrated && rawPem ? '保存' : '未认证'

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault()
                setIsEditMode(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isEditMode])

    return (
        <>
            {/* 🔴 物理拆除：删除了多余的文件 input 密钥导入器 */}

            <RandomLayout 
                pictures={pictures} 
                isEditMode={isEditMode} 
                onDeleteSingle={handleDeleteSingleImage} 
                onDeleteGroup={handleDeleteGroup} 
            />

            {pictures.length === 0 && (
                <div className='text-secondary flex min-h-screen items-center justify-center text-center text-sm'>
                    照片墙空空如也，点击右上角「编辑」开始上传。
                </div>
            )}

            <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='absolute top-4 right-6 flex gap-3 max-sm:hidden'>
                {isEditMode ? (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/image-toolbox')}
                            className='rounded-xl border bg-blue-50 px-4 py-2 text-sm text-blue-700'>
                            压缩工具
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancel}
                            disabled={isSaving}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
                            取消
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsUploadDialogOpen(true)}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
                            添加照片
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className='brand-btn px-6'
                        >
                            {isSaving ? '保存中...' : buttonText}
                        </motion.button>
                    </>
                ) : (
                    !hideEditButton && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditMode(true)}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
                            管理照片墙
                        </motion.button>
                    )
                )}
            </motion.div>

            {isUploadDialogOpen && <UploadDialog onClose={() => setIsUploadDialogOpen(false)} onSubmit={handleUploadSubmit} />}
        </>
    )
}