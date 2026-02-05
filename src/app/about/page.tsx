'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useMarkdownRender } from '@/hooks/use-markdown-render'
import { pushAbout, type AboutData } from './services/push-about'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import LikeButton from '@/components/like-button'
import GithubSVG from '@/svgs/github.svg'
import initialData from './list.json'

export default function Page() {
    const [data, setData] = useState<AboutData>(initialData as AboutData)
    const [originalData, setOriginalData] = useState<AboutData>(initialData as AboutData)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isPreviewMode, setIsPreviewMode] = useState(false)

    // --- 权限接入：接入新明的加密系统 ---
    const { siteContent, rawPem, isHydrated } = useConfigStore()
    const { content, loading } = useMarkdownRender(data.content)
    const hideEditButton = siteContent.hideEditButton ?? false

    const handleEnterEditMode = () => {
        setIsEditMode(true)
        setIsPreviewMode(false)
    }

    // --- 修改后的核心保存逻辑：直接从内存提取密钥 ---
    const handleSave = async () => {
        if (!rawPem) {
            toast.error('登录状态已失效，请重新登录')
            return
        }

        setIsSaving(true)
        try {
            // 直接传递内存中解密好的 rawPem 供后端服务验证
            await pushAbout(data, rawPem) 

            setOriginalData(data)
            setIsEditMode(false)
            setIsPreviewMode(false)
            toast.success('关于页面保存成功！')
        } catch (error: any) {
            console.error('Failed to save:', error)
            toast.error(`保存失败: ${error?.message || '未知错误'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setData(originalData)
        setIsEditMode(false)
        setIsPreviewMode(false)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 只有在已登录状态下，才响应快捷键进入编辑模式
            if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
                if (rawPem) {
                    e.preventDefault()
                    setIsEditMode(true)
                    setIsPreviewMode(false)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isEditMode, rawPem])

    return (
        <>
            {/* 🔴 物理拆除：删掉了之前隐藏的文件 input 密钥导入器 */}

            <div className='flex flex-col items-center justify-center px-6 pt-32 pb-12 max-sm:px-0'>
                <div className='w-full max-w-[800px]'>
                    {isEditMode ? (
                        isPreviewMode ? (
                            <div className='space-y-6'>
                                <div className='text-center'>
                                    <h1 className='mb-4 text-4xl font-bold'>{data.title || '预览标题'}</h1>
                                    <p className='text-secondary text-lg'>{data.description || '预览描述'}</p>
                                </div>

                                {loading ? (
                                    <div className='text-secondary text-center'>渲染中...</div>
                                ) : (
                                    <div className='card relative p-6'>
                                        <div className='prose prose-sm max-w-none'>{content}</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className='space-y-6'>
                                <div className='space-y-4'>
                                    <input
                                        type='text'
                                        placeholder='标题'
                                        className='w-full px-4 py-3 text-center text-2xl font-bold bg-white/50 border rounded-xl'
                                        value={data.title}
                                        onChange={e => setData({ ...data, title: e.target.value })}
                                    />
                                    <input
                                        type='text'
                                        placeholder='描述'
                                        className='w-full px-4 py-3 text-center text-lg bg-white/50 border rounded-xl'
                                        value={data.description}
                                        onChange={e => setData({ ...data, description: e.target.value })}
                                    />
                                </div>

                                <div className='card relative'>
                                    <textarea
                                        placeholder='使用 Markdown 编写你的个人简介...'
                                        className='min-h-[400px] w-full resize-none text-sm bg-transparent border-none focus:ring-0'
                                        value={data.content}
                                        onChange={e => setData({ ...data, content: e.target.value })}
                                    />
                                </div>
                            </div>
                        )
                    ) : (
                        <>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='mb-12 text-center'>
                                <h1 className='mb-4 text-4xl font-bold'>{data.title}</h1>
                                <p className='text-secondary text-lg'>{data.description}</p>
                            </motion.div>

                            {loading ? (
                                <div className='text-secondary text-center'>加载中...</div>
                            ) : (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className='card relative p-6'>
                                    <div className='prose prose-sm max-w-none'>{content}</div>
                                </motion.div>
                            )}
                        </>
                    )}

                    <div className='mt-8 flex items-center justify-center gap-6'>
                        {/* 🔗 修改后的个人主页链接 */}
                        <motion.a
                            href='https://github.com/yuanxinming-cy'
                            target='_blank'
                            rel='noreferrer'
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            className='bg-card flex h-[53px] w-[53px] items-center justify-center rounded-full border shadow-sm transition-shadow hover:shadow-md'>
                            <GithubSVG />
                        </motion.a>

                        <LikeButton slug='about-page' delay={0} />
                    </div>
                </div>
            </div>

            {/* --- 右上角控制台：权限感知 --- */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.6 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className='fixed top-4 right-6 z-10 flex gap-3 max-sm:hidden'
            >
                {isEditMode ? (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancel}
                            disabled={isSaving}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm'>
                            取消
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsPreviewMode(prev => !prev)}
                            disabled={isSaving}
                            className={`rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm`}>
                            {isPreviewMode ? '返回编辑' : '预览'}
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className='brand-btn px-6'
                        >
                            {isSaving ? '保存中...' : '保存修改'}
                        </motion.button>
                    </>
                ) : (
                    // --- 只有在登录状态下且配置未隐藏时显示编辑 ---
                    isHydrated && rawPem && !hideEditButton && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleEnterEditMode}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
                            管理关于页
                        </motion.button>
                    )
                )}
            </motion.div>
        </>
    )
}