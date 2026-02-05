import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import { toast } from 'sonner'
import { fileToBase64NoPrefix } from '@/lib/file-utils'
import type { SiteContent, CardStyles } from '../stores/config-store'
import type { FileItem, ArtImageUploads, SocialButtonImageUploads, BackgroundImageUploads } from '../config-dialog/site-settings'

type ArtImageConfig = SiteContent['artImages'][number]
type BackgroundImageConfig = SiteContent['backgroundImages'][number]

export async function pushSiteContent(
    siteContent: SiteContent,
    cardStyles: CardStyles,
    faviconItem?: FileItem | null,
    avatarItem?: FileItem | null,
    artImageUploads?: ArtImageUploads,
    removedArtImages?: ArtImageConfig[],
    backgroundImageUploads?: BackgroundImageUploads,
    removedBackgroundImages?: BackgroundImageConfig[],
    socialButtonImageUploads?: SocialButtonImageUploads
): Promise<void> {
    // 1. 安全检查：确保配置项不是 '-' 或 undefined，防止 fetch 报错
    const owner = GITHUB_CONFIG.OWNER
    const repo = GITHUB_CONFIG.REPO
    const branch = GITHUB_CONFIG.BRANCH || 'main'

    if (!owner || owner === '-' || !repo || repo === '-') {
        const msg = 'GitHub 配置无效，请检查 src/consts.ts 中的 OWNER 和 REPO'
        toast.error(msg)
        throw new Error(msg)
    }

    // 2. 获取认证令牌
    const token = await getAuthToken()

    // 3. 获取分支最新 commit SHA
    toast.info('正在连接仓库...')
    const refPath = `heads/${branch}`
    
    // getRef 内部会执行 fetch，如果 owner/repo 正常，此处不会再报 Invalid value
    const refData = await getRef(token, owner, repo, refPath)
    const latestCommitSha = refData.sha

    const commitMessage = `chore: update site configuration via web editor`

    const treeItems: TreeItem[] = []

    // --- 准备文件内容 ---
    
    // 处理站点内容配置
    const siteContentJson = JSON.stringify(siteContent, null, '\t')
    const siteContentBlob = await createBlob(token, owner, repo, toBase64Utf8(siteContentJson), 'base64')
    treeItems.push({
        path: 'src/config/site-content.json',
        mode: '100644',
        type: 'blob',
        sha: siteContentBlob.sha
    })

    // 处理卡片样式配置
    const cardStylesJson = JSON.stringify(cardStyles, null, '\t')
    const cardStylesBlob = await createBlob(token, owner, repo, toBase64Utf8(cardStylesJson), 'base64')
    treeItems.push({
        path: 'src/config/card-styles.json',
        mode: '100644',
        type: 'blob',
        sha: cardStylesBlob.sha
    })

    // --- 处理图片上传 (如果有) ---
    if (faviconItem?.type === 'file') {
        const content = await fileToBase64NoPrefix(faviconItem.file)
        const blob = await createBlob(token, owner, repo, content, 'base64')
        treeItems.push({ path: 'public/favicon.png', mode: '100644', type: 'blob', sha: blob.sha })
    }

    if (avatarItem?.type === 'file') {
        const content = await fileToBase64NoPrefix(avatarItem.file)
        const blob = await createBlob(token, owner, repo, content, 'base64')
        treeItems.push({ path: 'public/images/avatar.png', mode: '100644', type: 'blob', sha: blob.sha })
    }

    // --- 执行 Git 操作流水线 ---

    try {
        toast.info('正在构建提交树...')
        const treeData = await createTree(token, owner, repo, treeItems, latestCommitSha)

        toast.info('正在签署提交...')
        const commitData = await createCommit(token, owner, repo, commitMessage, treeData.sha, [latestCommitSha])

        toast.info('正在同步到 GitHub...')
        // 使用 force: true 确保更新成功，避免 422 冲突
        await updateRef(token, owner, repo, refPath, commitData.sha, true)

        toast.success('站点配置保存成功！')
    } catch (error: any) {
        console.error('Push site content error:', error)
        throw new Error(error?.message || '同步至 GitHub 失败')
    }
}