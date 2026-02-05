'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConfigStore } from '@/app/(home)/stores/config-store' //
import CryptoJS from 'crypto-js'
import { motion } from 'motion/react' //
import { KeyRound, ShieldCheck, UploadCloud, LogOut } from 'lucide-react'

export default function LoginPage() {
    const { encryptedPem, setAuth, isHydrated, rawPem, logout } = useConfigStore()
    const [password, setPassword] = useState('')
    const [pemFileContent, setPemFileContent] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    // --- 解决“回不去”的问题：增加一个手动退出逻辑 ---
    // 只有当你手动访问 /login 且 rawPem 已经存在时，我们才自动跳走
    // 如果你想重新设置，点击下方的“退出并清理”
    useEffect(() => {
        if (rawPem && isHydrated) {
            // router.push('/') // 先注释掉这行自动跳转，方便调试界面！
        }
    }, [rawPem, isHydrated, router])

    const handleAction = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (encryptedPem) {
            // 解锁模式
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedPem, password)
                const originalPem = bytes.toString(CryptoJS.enc.Utf8)
                
                // --- 严谨校验：必须包含 PEM 头且长度合理 ---
                if (originalPem.includes('-----BEGIN') && originalPem.length > 100) {
                    setAuth(originalPem) 
                    alert('验证成功！')
                    router.push('/')
                } else {
                    throw new Error('Invalid Key')
                }
            } catch {
                setError('密码错误，解密失败！')
            }
        } else {
            // 初始化模式
            if (!pemFileContent.includes('-----BEGIN')) {
                setError('文件格式错误：未检测到有效的 PEM 头部')
                return
            }
            if (password.length < 4) {
                setError('为了安全，请设置至少 4 位密码')
                return
            }
            setAuth(pemFileContent, password)
            alert('初始化成功！已加密存储。')
            router.push('/')
        }
    }

    if (!isHydrated) return null // 等待加载，防止水合报错

    return (
        <div className='min-h-screen w-full flex items-center justify-center bg-slate-50'>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='w-full max-w-md p-6'>
                <div className='bg-white rounded-[2rem] p-10 shadow-xl border border-slate-100'>
                    <div className='text-center mb-8'>
                        <h1 className='text-2xl font-bold text-slate-800'>新明，这是新界面</h1>
                        <p className='text-sm text-slate-400'>如果看到这行字，说明改动生效了</p>
                    </div>

                    <form onSubmit={handleAction} className='space-y-6'>
                        {!encryptedPem ? (
                            <div className="space-y-4">
                                <label className="block p-4 border-2 border-dashed rounded-xl text-center cursor-pointer hover:bg-slate-50">
                                    <UploadCloud className="mx-auto text-slate-300 mb-2" />
                                    <span className="text-xs text-slate-500">
                                        {pemFileContent ? "✅ 文件已读取" : "第一步：上传 PEM 文件"}
                                    </span>
                                    <input type="file" className="hidden" onChange={e => {
                                        const file = e.target.files?.[0]
                                        if(file){
                                            const reader = new FileReader()
                                            reader.onload = (ev) => setPemFileContent(ev.target?.result as string)
                                            reader.readAsText(file)
                                        }
                                    }} />
                                </label>
                                <input 
                                    type="password"
                                    placeholder="第二步：设置解锁密码"
                                    className="w-full p-4 bg-slate-100 rounded-xl outline-none"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4 text-center">
                                <p className="text-xs text-emerald-500 font-bold">检测到已加密的密钥，请输入密码解锁</p>
                                <input 
                                    type="password"
                                    placeholder="输入密码..."
                                    className="w-full p-4 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all">
                            {encryptedPem ? "解锁进入" : "完成配置"}
                        </button>

                        {error && <p className="text-center text-red-500 text-xs font-bold">{error}</p>}
                    </form>

                    {/* 解决“回不去”的终极手段：重置按钮 */}
                    <div className="mt-10 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <button onClick={() => router.push('/')} className="text-xs text-slate-300 hover:text-slate-600">返回首页</button>
                        <button 
                            onClick={() => {
                                if(confirm('确定要清除本地所有登录数据吗？')) {
                                    logout()
                                    localStorage.clear()
                                    window.location.reload()
                                }
                            }} 
                            className="flex items-center gap-1 text-xs text-red-300 hover:text-red-500"
                        >
                            <LogOut size={12}/> 清除数据
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
