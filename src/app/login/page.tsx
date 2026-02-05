'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConfigStore } from '@/app/(home)/stores/config-store' //
import CryptoJS from 'crypto-js'
import { motion } from 'motion/react' //
import { KeyRound, ShieldCheck, UploadCloud, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const { encryptedPem, setAuth, isHydrated, rawPem } = useConfigStore()
    const [password, setPassword] = useState('')
    const [pemFileContent, setPemFileContent] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    // --- 防炸逻辑 1：如果已经解锁成功，自动跳回首页 ---
    useEffect(() => {
        if (rawPem) {
            router.push('/')
        }
    }, [rawPem, router])

    const handleAction = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (encryptedPem) {
            // --- 场景：解锁模式 ---
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedPem, password)
                const originalPem = bytes.toString(CryptoJS.enc.Utf8)
                // 校验解密结果是否真的是 PEM 格式
                if (originalPem.includes('-----BEGIN')) {
                    setAuth(originalPem) 
                    router.push('/')
                } else {
                    throw new Error()
                }
            } catch {
                setError('密码错误，无法解密密钥')
            }
        } else {
            // --- 场景：初次绑定模式 ---
            if (!pemFileContent || !password) {
                setError('请同时上传文件并设置密码')
                return
            }
            setAuth(pemFileContent, password)
            router.push('/')
        }
    }

    // --- 防炸逻辑 2：等待存储就绪 ---
    // 如果 Zustand 还没读完 localStorage，我们先渲染一个空白或者加载状态
    // 这样可以彻底避免 Hydration Error
    if (!isHydrated) {
        return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-400 text-xs">Loading Secure Storage...</div>
    }

    return (
        <div className='min-h-screen w-full flex items-center justify-center bg-[#f8fafc]'>
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className='w-full max-w-md p-6'
            >
                <div className='bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-xl'>
                    <div className='text-center mb-8'>
                        <div className='w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                            {encryptedPem ? <KeyRound /> : <ShieldCheck />}
                        </div>
                        <h1 className='text-xl font-bold text-slate-700'>
                            {encryptedPem ? '身份验证' : '初始化管理员'}
                        </h1>
                        <p className='text-xs text-slate-400 mt-2'>
                            {encryptedPem ? '请输入本地解锁密码' : '请关联 PEM 密钥并设置访问密码'}
                        </p>
                    </div>

                    <form onSubmit={handleAction} className='space-y-6'>
                        {!encryptedPem && (
                            <label className='block w-full border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 cursor-pointer transition-all bg-white/50'>
                                <UploadCloud className='mx-auto mb-2 text-slate-300' />
                                <span className='text-xs text-slate-500 block'>
                                    {pemFileContent ? '✅ 密钥已读取' : '点击上传 .pem 密钥文件'}
                                </span>
                                <input type='file' className='hidden' accept=".pem,.key,.txt" onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        const reader = new FileReader()
                                        reader.onload = (ev) => setPemFileContent(ev.target?.result as string)
                                        reader.readAsText(file)
                                    }
                                }} />
                            </label>
                        )}

                        <div className='relative'>
                            <input
                                autoFocus
                                type='password'
                                placeholder={encryptedPem ? '输入解锁密码' : '设置新的登录密码'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className='w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all placeholder:text-slate-300'
                            />
                            <button 
                                type='submit' 
                                className='absolute right-2 top-2 bottom-2 aspect-square bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors'
                            >
                                <ArrowRight className='w-4 h-4' />
                            </button>
                        </div>
                        {error && (
                            <motion.p 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className='text-center text-red-400 text-[10px] font-medium'
                            >
                                {error}
                            </motion.p>
                        )}
                    </form>

                    <div className='mt-8 text-center'>
                        <button 
                            onClick={() => router.push('/')}
                            className='text-[10px] uppercase tracking-widest text-slate-300 hover:text-slate-500 transition-colors'
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
