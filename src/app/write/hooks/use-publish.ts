'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { pushBlog } from '../services/push-blog'
import { deleteBlog } from '../services/delete-blog'
import { useWriteStore } from '../stores/write-store'
import { useConfigStore } from '@/app/(home)/stores/config-store' //

export function usePublish() {
    const { loading, setLoading, form, cover, images, mode, originalSlug } = useWriteStore()
    
    // --- 接入新权限系统 ---
    const { rawPem } = useConfigStore() //

    // 🔴 物理拆除：不再需要导入密钥的逻辑
    // const onChoosePrivateKey = ...

    const onPublish = useCallback(async () => {
        // 关键校验：如果没有解密后的私钥，禁止发布
        if (!rawPem) {
            toast.error('登录已过期或未登录，无法发布')
            return
        }

        try {
            setLoading(true)
            await pushBlog({
                form,
                cover,
                images,
                mode,
                originalSlug,
                // 注意：如果 pushBlog 需要私钥，这里直接传入 rawPem
                privateKey: rawPem 
            })

            const successMsg = mode === 'edit' ? '更新成功' : '发布成功'
            toast.success(successMsg)
        } catch (err: any) {
            console.error(err)
            toast.error(err?.message || '操作失败')
        } finally {
            setLoading(false)
        }
    }, [form, cover, images, mode, originalSlug, setLoading, rawPem])

    const onDelete = useCallback(async () => {
        const targetSlug = originalSlug || form.slug
        if (!targetSlug) {
            toast.error('缺少 slug，无法删除')
            return
        }

        if (!rawPem) {
            toast.error('权限不足')
            return
        }

        try {
            setLoading(true)
            // 如果 deleteBlog 也需要私钥，请确保传入 rawPem
            await deleteBlog(targetSlug, rawPem) 
            toast.success('删除成功')
        } catch (err: any) {
            console.error(err)
            toast.error(err?.message || '删除失败')
        } finally {
            setLoading(false)
        }
    }, [form.slug, originalSlug, setLoading, rawPem])

    return {
        // 这里的 isAuth 建议改为判断 rawPem 是否存在
        isAuth: !!rawPem, 
        loading,
        // 物理拆除：返回一个空操作或直接在 UI 层删掉调用处
        onChoosePrivateKey: () => console.warn('文件导入已禁用'), 
        onPublish,
        onDelete
    }
}