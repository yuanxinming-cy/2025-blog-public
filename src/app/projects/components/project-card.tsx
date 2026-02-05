'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSize } from '@/hooks/use-size'
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog'

export interface Project {
    name: string
    year: number
    description: string
    image: string
    url: string
    tags: string[]
    github?: string
    npm?: string
}

interface ProjectCardProps {
    project: Project
    isEditMode?: boolean
    onUpdate?: (project: Project, oldProject: Project, imageItem?: ImageItem) => void
    onDelete?: () => void
}

export function ProjectCard({ project, isEditMode = false, onUpdate, onDelete }: ProjectCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const { maxSM } = useSize()
    const [localProject, setLocalProject] = useState(project)
    const [showImageDialog, setShowImageDialog] = useState(false)
    const [imageItem, setImageItem] = useState<ImageItem | null>(null)
    const router = useRouter()

    const handleFieldChange = (field: keyof Project, value: any) => {
        const updated = { ...localProject, [field]: value }
        setLocalProject(updated)
        onUpdate?.(updated, project, imageItem || undefined)
    }

    const handleImageSubmit = (image: ImageItem) => {
        setImageItem(image)
        const imageUrl = image.type === 'url' ? image.url : image.previewUrl
        const updated = { ...localProject, image: imageUrl }
        setLocalProject(updated)
        onUpdate?.(updated, project, image)
    }

    const handleTagsChange = (tagsStr: string) => {
        const tags = tagsStr
            .split(',')
            .map(t => t.trim())
            .filter(t => t)
        handleFieldChange('tags', tags)
    }

    const handleCancel = () => {
        setLocalProject(project)
        setIsEditing(false)
        setImageItem(null)
    }

    //  新增：智能跳转处理函数
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        // 如果是以 / 开头的内部路径，执行 SPA 跳转，不打开新窗口
        if (url.startsWith('/')) {
            e.preventDefault()
            router.push(url)
        }
        // 否则（https:// 等），Link 组件会自动执行原有的 target="_blank" 逻辑
    }

    const canEdit = isEditMode && isEditing

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            {...(maxSM ? { animate: { opacity: 1, scale: 1 } } : { whileInView: { opacity: 1, scale: 1 } })}
            className='card relative flex flex-col gap-4'>
            {isEditMode && (
                <div className='absolute top-3 right-3 z-10 flex gap-2'>
                    {isEditing ? (
                        <>
                            <button onClick={handleCancel} className='rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
                                取消
                            </button>
                            <button onClick={() => setIsEditing(false)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
                                完成
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
                                编辑
                            </button>
                            <button onClick={onDelete} className='rounded-lg px-2 py-1.5 text-xs text-red-400 transition-colors hover:text-red-600'>
                                删除
                            </button>
                        </>
                    )}
                </div>
            )}

            <div className='flex items-start gap-4'>
                <div className='group relative'>
                    <img
                        src={localProject.image}
                        alt={localProject.name}
                        className={cn('h-16 w-16 shrink-0 rounded-xl object-cover', canEdit && 'cursor-pointer')}
                        onClick={() => canEdit && setShowImageDialog(true)}
                    />
                    {canEdit && (
                        <div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                            <span className='text-xs text-white'>更换</span>
                        </div>
                    )}
                </div>
                <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                        <h3
                            contentEditable={canEdit}
                            suppressContentEditableWarning
                            onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
                            className={cn('text-lg font-semibold', canEdit && 'cursor-text focus:outline-none')}>
                            {localProject.name}
                        </h3>
                        {canEdit ? (
                            <input
                                type='number'
                                value={localProject.year}
                                onChange={e => handleFieldChange('year', parseInt(e.target.value) || 0)}
                                className='text-secondary border-secondary/20 w-18 rounded border px-2 py-1 text-sm focus:outline-none'
                            />
                        ) : (
                            <span className='text-secondary text-sm'>{localProject.year}</span>
                        )}
                    </div>
                    <div className='mt-2 flex flex-wrap gap-2'>
                        {canEdit ? (
                            <input
                                type='text'
                                value={localProject.tags.join(', ')}
                                onChange={e => handleTagsChange(e.target.value)}
                                placeholder='标签，用逗号分隔'
                                className='bg-secondary/10 border-secondary/20 w-full rounded-lg border px-2 py-1 text-xs focus:outline-none'
                            />
                        ) : (
                            localProject.tags.map(tag => (
                                <span key={tag} className='text-secondary bg-card rounded-lg px-2 py-1 text-xs'>
                                    {tag}
                                </span>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <p
                contentEditable={canEdit}
                suppressContentEditableWarning
                onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
                className={cn('text-secondary text-sm leading-relaxed', canEdit && 'cursor-text focus:outline-none')}>
                {localProject.description}
            </p>

            <div className='flex flex-wrap gap-2'>
                {canEdit ? (
                    <>
                        <input
                            type='url'
                            value={localProject.url}
                            onChange={e => handleFieldChange('url', e.target.value)}
                            placeholder='网站 URL 或内部路径 (/projects/...)'
                            className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
                        />
                        <input
                            type='url'
                            value={localProject.github || ''}
                            onChange={e => handleFieldChange('github', e.target.value || undefined)}
                            placeholder='GitHub URL（可选）'
                            className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
                        />
                        <input
                            type='url'
                            value={localProject.npm || ''}
                            onChange={e => handleFieldChange('npm', e.target.value || undefined)}
                            placeholder='NPM URL（可选）'
                            className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
                        />
                    </>
                ) : (
                    <>
                        {/* 优化：根据路径属性动态决定跳转行为 */}
                        <Link
                            href={localProject.url}
                            target={localProject.url.startsWith('/') ? '_self' : '_blank'}
                            onClick={(e) => handleNavigation(e, localProject.url)}
                            rel='noopener noreferrer'
                            className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'>
                            {localProject.url.startsWith('/') ? 'Open App' : 'Website'}
                        </Link>
                        {localProject.github && (
                            <Link
                                href={localProject.github}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'>
                                GitHub
                            </Link>
                        )}
                        {localProject.npm && (
                            <Link
                                href={localProject.npm}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'>
                                NPM
                            </Link>
                        )}
                    </>
                )}
            </div>

            {canEdit && showImageDialog && (
                <ImageUploadDialog currentImage={localProject.image} onClose={() => setShowImageDialog(false)} onSubmit={handleImageSubmit} />
            )}
        </motion.div>
    )
}