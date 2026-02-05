'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { ProjectCard, type Project } from './components/project-card'
import CreateDialog from './components/create-dialog'
import { pushProjects } from './services/push-projects'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import type { ImageItem } from './components/image-upload-dialog'

export default function Page() {
    const [projects, setProjects] = useState<Project[]>(initialList as Project[])
    const [originalProjects, setOriginalProjects] = useState<Project[]>(initialList as Project[])
    const [isEditMode, setIsEditMode] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())

    // --- 权限接入：接入新明的加密系统 ---
    const { siteContent, rawPem, isHydrated } = useConfigStore()
    const hideEditButton = siteContent.hideEditButton ?? false

    const handleUpdate = (updatedProject: Project, oldProject: Project, imageItem?: ImageItem) => {
        setProjects(prev => prev.map(p => (p.url === oldProject.url ? updatedProject : p)))
        if (imageItem) {
            setImageItems(prev => {
                const newMap = new Map(prev)
                newMap.set(updatedProject.url, imageItem)
                return newMap
            })
        }
    }

    const handleAdd = () => {
        setEditingProject(null)
        setIsCreateDialogOpen(true)
    }

    const handleSaveProject = (updatedProject: Project) => {
        if (editingProject) {
            const updated = projects.map(p => (p.url === editingProject.url ? updatedProject : p))
            setProjects(updated)
        } else {
            setProjects([...projects, updatedProject])
        }
    }

    const handleDelete = (project: Project) => {
        if (confirm(`确定要删除 ${project.name} 吗？`)) {
            setProjects(projects.filter(p => p.url !== project.url))
        }
    }

    // --- 修改后的核心保存逻辑：直接从 ConfigStore 调取密钥 ---
    const handleSave = async () => {
        if (!rawPem) {
            toast.error('登录状态已失效，请重新登录')
            return
        }

        setIsSaving(true)
        try {
            // 直接传递内存中解密好的 rawPem
            await pushProjects({
                projects,
                imageItems,
                privateKey: rawPem // 假设 pushProjects 需要此参数
            })

            setOriginalProjects(projects)
            setImageItems(new Map())
            setIsEditMode(false)
            toast.success('项目配置保存成功！')
        } catch (error: any) {
            console.error('Failed to save:', error)
            toast.error(`保存失败: ${error?.message || '未知错误'}`)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setProjects(originalProjects)
        setImageItems(new Map())
        setIsEditMode(false)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 只有在已登录状态下，才响应快捷键进入编辑模式
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

            <div className='flex flex-col items-center justify-center px-6 pt-32 pb-12'>
                <div className='grid w-full max-w-[1200px] grid-cols-2 gap-6 max-md:grid-cols-1'>
                    {projects.map((project) => (
                        <ProjectCard 
                            key={project.url} 
                            project={project} 
                            isEditMode={isEditMode} 
                            onUpdate={handleUpdate} 
                            onDelete={() => handleDelete(project)} 
                        />
                    ))}
                </div>
            </div>

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
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
                        >
                            取消
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAdd}
                            disabled={isSaving}
                            className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
                        >
                            添加项目
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className='brand-btn px-6'
                        >
                            {isSaving ? '保存中...' : '提交修改'}
                        </motion.button>
                    </>
                ) : (
                    // --- 核心权限：只有在登录状态下才显示编辑入口 ---
                    isHydrated && rawPem && !hideEditButton && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditMode(true)}
                            className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
                        >
                            管理项目
                        </motion.button>
                    )
                )}
            </motion.div>

            {isCreateDialogOpen && (
                <CreateDialog 
                    project={editingProject} 
                    onClose={() => setIsCreateDialogOpen(false)} 
                    onSave={handleSaveProject} 
                />
            )}
        </>
    )
}