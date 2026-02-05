'use client'

import Link from 'next/link'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { motion } from 'motion/react'

dayjs.extend(weekOfYear)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'
import ShortLineSVG from '@/svgs/short-line.svg'
import { useBlogIndex, type BlogIndexItem } from '@/hooks/use-blog-index'
import { useCategories } from '@/hooks/use-categories'
import { useReadArticles } from '@/hooks/use-read-articles'
import JuejinSVG from '@/svgs/juejin.svg'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { cn } from '@/lib/utils'
import { saveBlogEdits } from './services/save-blog-edits'
import { Check } from 'lucide-react'
import { CategoryModal } from './components/category-modal'

type DisplayMode = 'day' | 'week' | 'month' | 'year' | 'category'

export default function BlogPage() {
    const { items, loading } = useBlogIndex()
    const { categories: categoriesFromServer } = useCategories()
    const { isRead } = useReadArticles()
    
    // --- 权限接入：接入新明的加密系统 ---
    const { siteContent, rawPem, isHydrated } = useConfigStore()
    const hideEditButton = siteContent.hideEditButton ?? false
    const enableCategories = siteContent.enableCategories ?? false

    const [editMode, setEditMode] = useState(false)
    const [editableItems, setEditableItems] = useState<BlogIndexItem[]>([])
    const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)
    const [displayMode, setDisplayMode] = useState<DisplayMode>('year')
    const [categoryModalOpen, setCategoryModalOpen] = useState(false)
    const [categoryList, setCategoryList] = useState<string[]>([])
    const [newCategory, setNewCategory] = useState('')

    useEffect(() => {
        if (!editMode) {
            setEditableItems(items)
        }
    }, [items, editMode])

    useEffect(() => {
        setCategoryList(categoriesFromServer || [])
    }, [categoriesFromServer])

    const displayItems = editMode ? editableItems : items

    const { groupedItems, groupKeys, getGroupLabel } = useMemo(() => {
        const sorted = [...displayItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        const grouped = sorted.reduce(
            (acc, item) => {
                let key: string
                let label: string
                const date = dayjs(item.date)

                switch (displayMode) {
                    case 'category':
                        key = item.category || '未分类'
                        label = key
                        break
                    case 'day':
                        key = date.format('YYYY-MM-DD')
                        label = date.format('YYYY年MM月DD日')
                        break
                    case 'week':
                        const week = date.week()
                        key = `${date.format('YYYY')}-W${week.toString().padStart(2, '0')}`
                        label = `${date.format('YYYY')}年第${week}周`
                        break
                    case 'month':
                        key = date.format('YYYY-MM')
                        label = date.format('YYYY年MM月')
                        break
                    case 'year':
                    default:
                        key = date.format('YYYY')
                        label = date.format('YYYY年')
                        break
                }

                if (!acc[key]) {
                    acc[key] = { items: [], label }
                }
                acc[key].items.push(item)
                return acc
            },
            {} as Record<string, { items: BlogIndexItem[]; label: string }>
        )

        const keys = Object.keys(grouped).sort((a, b) => {
            if (displayMode === 'category') {
                const categoryOrder = new Map(categoryList.map((c, index) => [c, index]))
                const aOrder = categoryOrder.has(a) ? categoryOrder.get(a)! : Number.MAX_SAFE_INTEGER
                const bOrder = categoryOrder.has(b) ? categoryOrder.get(b)! : Number.MAX_SAFE_INTEGER
                if (aOrder !== bOrder) return aOrder - bOrder
                return a.localeCompare(b)
            }
            if (displayMode === 'week') {
                const [yearA, weekA] = a.split('-W').map(Number)
                const [yearB, weekB] = b.split('-W').map(Number)
                if (yearA !== yearB) return yearB - yearA
                return weekB - weekA
            }
            return b.localeCompare(a)
        })

        return {
            groupedItems: grouped,
            groupKeys: keys,
            getGroupLabel: (key: string) => grouped[key]?.label || key
        }
    }, [displayItems, displayMode, categoryList])

    const selectedCount = selectedSlugs.size

    const toggleEditMode = useCallback(() => {
        setEditMode(prev => !prev)
        if (editMode) {
            setEditableItems(items)
            setSelectedSlugs(new Set())
        }
    }, [editMode, items])

    const toggleSelect = useCallback((slug: string) => {
        setSelectedSlugs(prev => {
            const next = new Set(prev)
            if (next.has(slug)) next.delete(slug)
            else next.add(slug)
            return next
        })
    }, [])

    const handleSelectAll = useCallback(() => {
        setSelectedSlugs(new Set(editableItems.map(item => item.slug)))
    }, [editableItems])

    const handleSelectGroup = useCallback((groupKey: string) => {
        const group = groupedItems[groupKey]
        if (!group) return
        const allSelected = group.items.every(item => selectedSlugs.has(item.slug))
        setSelectedSlugs(prev => {
            const next = new Set(prev)
            group.items.forEach(item => {
                if (allSelected) next.delete(item.slug)
                else next.add(item.slug)
            })
            return next
        })
    }, [groupedItems, selectedSlugs])

    const handleDeselectAll = useCallback(() => setSelectedSlugs(new Set()), [])

    const handleItemClick = useCallback((event: React.MouseEvent, slug: string) => {
        if (!editMode) return
        event.preventDefault()
        event.stopPropagation()
        toggleSelect(slug)
    }, [editMode, toggleSelect])

    const handleDeleteSelected = useCallback(() => {
        if (selectedCount === 0) return
        setEditableItems(prev => prev.filter(item => !selectedSlugs.has(item.slug)))
        setSelectedSlugs(new Set())
    }, [selectedCount, selectedSlugs])

    const handleCancel = useCallback(() => {
        setEditableItems(items)
        setSelectedSlugs(new Set())
        setEditMode(false)
    }, [items])

    // --- 自动注入私钥的保存逻辑 ---
    const handleSave = useCallback(async () => {
        const removedSlugs = items.filter(item => !editableItems.some(editItem => editItem.slug === item.slug)).map(item => item.slug)
        const normalizedCategoryList = categoryList.map(c => c.trim()).filter(Boolean)
        const hasChanges = removedSlugs.length > 0 || 
            JSON.stringify(normalizedCategoryList) !== JSON.stringify((categoriesFromServer || []).map(c => c.trim()).filter(Boolean))

        if (!hasChanges) {
            toast.info('未检测到任何修改')
            return
        }

        if (!rawPem) {
            toast.error('登录状态已失效，请重新登录')
            return
        }

        try {
            setSaving(true)
            // 直接传递内存中解密好的 rawPem，无需再次导入文件
            await saveBlogEdits(items, editableItems, normalizedCategoryList, rawPem) 
            setEditMode(false)
            setSelectedSlugs(new Set())
            setCategoryModalOpen(false)
            toast.success('保存成功')
        } catch (error: any) {
            toast.error(error?.message || '保存失败')
        } finally {
            setSaving(false)
        }
    }, [items, editableItems, categoryList, categoriesFromServer, rawPem])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!editMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault()
                if (rawPem) toggleEditMode()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [editMode, toggleEditMode, rawPem])

    return (
        <>
            <div className='flex flex-col items-center justify-center gap-6 px-6 pt-24 max-sm:pt-24'>
                {items.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='card btn-rounded relative mx-auto flex items-center gap-1 p-1 max-sm:hidden'>
                        {[
                            { value: 'day', label: '日' },
                            { value: 'week', label: '周' },
                            { value: 'month', label: '月' },
                            { value: 'year', label: '年' },
                            ...(enableCategories ? ([{ value: 'category', label: '分类' }] as const) : [])
                        ].map(option => (
                            <motion.button
                                key={option.value}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDisplayMode(option.value as DisplayMode)}
                                className={cn(
                                    'btn-rounded px-3 py-1.5 text-xs font-medium transition-all',
                                    displayMode === option.value ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand hover:bg-white/60'
                                )}>
                                {option.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}

                {groupKeys.map((groupKey) => {
                    const group = groupedItems[groupKey]
                    if (!group) return null
                    return (
                        <motion.div
                            key={groupKey}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: INIT_DELAY / 2 }}
                            className='card relative w-full max-w-[840px] space-y-6'>
                            <div className='mb-3 flex items-center justify-between gap-3 text-base'>
                                <div className='flex items-center gap-3'>
                                    <div className='font-medium'>{getGroupLabel(groupKey)}</div>
                                    <div className='h-2 w-2 rounded-full bg-[#D9D9D9]'></div>
                                    <div className='text-secondary text-sm'>{group.items.length} 篇文章</div>
                                </div>
                                {editMode && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSelectGroup(groupKey)}
                                        className={cn(
                                            'rounded-lg border px-3 py-1 text-xs transition-colors',
                                            group.items.every(item => selectedSlugs.has(item.slug))
                                                ? 'border-brand/40 bg-brand/10 text-brand'
                                                : 'text-secondary bg-white/60'
                                        )}>
                                        {group.items.every(item => selectedSlugs.has(item.slug)) ? '取消全选' : '全选本组'}
                                    </motion.button>
                                )}
                            </div>
                            <div>
                                {group.items.map(it => {
                                    const isSelected = selectedSlugs.has(it.slug)
                                    return (
                                        <Link
                                            href={`/blog/${it.slug}`}
                                            key={it.slug}
                                            onClick={event => handleItemClick(event, it.slug)}
                                            className={cn(
                                                'group flex min-h-10 items-center gap-3 py-3 transition-all',
                                                editMode ? cn('rounded-lg border px-3', isSelected ? 'border-brand/60 bg-brand/5' : 'border-transparent hover:bg-white/60') : 'cursor-pointer'
                                            )}>
                                            {editMode && (
                                                <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border text-[10px]', isSelected ? 'border-brand bg-brand text-white' : 'border-[#D9D9D9]')}>
                                                    <Check size={10} />
                                                </span>
                                            )}
                                            <span className='text-secondary w-[44px] shrink-0 text-sm font-medium'>{dayjs(it.date).format('MM-DD')}</span>
                                            <div className='relative flex h-2 w-2 items-center justify-center'>
                                                <div className='bg-secondary group-hover:bg-brand h-[5px] w-[5px] rounded-full transition-all group-hover:h-4'></div>
                                                <ShortLineSVG className='absolute bottom-4' />
                                            </div>
                                            <div className={cn('flex-1 truncate text-sm font-medium transition-all', editMode ? null : 'group-hover:text-brand group-hover:translate-x-2')}>
                                                {it.title || it.slug}
                                                {isRead(it.slug) && <span className='text-secondary ml-2 text-xs'>[已读]</span>}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* --- 右上角控制台：权限感知 --- */}
            <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                className='absolute top-4 right-6 flex items-center gap-3 max-sm:hidden'>
                {editMode ? (
                    <>
                        {enableCategories && (
                            <motion.button onClick={() => setCategoryModalOpen(true)} disabled={saving} className='rounded-xl border bg-white/60 px-4 py-2 text-sm'>
                                分类管理
                            </motion.button>
                        )}
                        <motion.button onClick={handleCancel} disabled={saving} className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
                            取消
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSave} 
                            disabled={saving} 
                            className='brand-btn px-6'
                        >
                            {saving ? '保存中...' : '提交修改'}
                        </motion.button>
                    </>
                ) : (
                    // --- 核心权限：只有登录且配置未隐藏时显示编辑 ---
                    isHydrated && rawPem && !hideEditButton && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleEditMode}
                            className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
                            管理文章
                        </motion.button>
                    )
                )}
            </motion.div>

            <CategoryModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                categoryList={categoryList}
                newCategory={newCategory}
                onNewCategoryChange={setNewCategory}
                onAddCategory={() => {}}
                onRemoveCategory={() => {}}
                onReorderCategories={() => {}}
                editableItems={editableItems}
                onAssignCategory={() => {}}
            />
        </>
    )
}