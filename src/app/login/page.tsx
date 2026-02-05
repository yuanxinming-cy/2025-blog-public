'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import CryptoJS from 'crypto-js'
import { motion } from 'motion/react' //
import { KeyRound, ShieldCheck, UploadCloud, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const { encryptedPem, setAuth } = useConfigStore()
    const [password, setPassword] = useState('')
    const [pemFileContent, setPemFileContent] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleAction = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (encryptedPem) {
            // --- 场景：解锁模式 ---
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedPem, password)
                const originalPem = bytes.toString(CryptoJS.enc.Utf8)
                if (originalPem.startsWith('-----BEGIN')) {
                    setAuth(originalPem) // 解密成功，存入内存
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
            setAuth(pemFileContent, password) // 加密并存储
            router.push('/')
        }
    }

    return (
        <div className='min-h-screen w-full flex items-center justify-center bg-[#f8fafc]'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-md p-6'>
                <div className='bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-xl'>
                    <div className='text-center mb-8'>
                        <div className='w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                            {encryptedPem ? <KeyRound /> : <ShieldCheck />}
                        </div>
                        <h1 className='text-xl font-bold text-slate-700'>
                            {encryptedPem ? '身份验证' : '初始化管理员'}
                        </h1>
                    </div>

                    <form onSubmit={handleAction} className='space-y-6'>
                        {!encryptedPem && (
                            <label className='block w-full border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-emerald-400 cursor-pointer transition-all'>
                                <UploadCloud className='mx-auto mb-2 text-slate-300' />
                                <span className='text-xs text-slate-500'>{pemFileContent ? '已选择密钥文件' : '点击上传 .pem 密钥'}</span>
                                <input type='file' className='hidden' onChange={e => {
                                    const reader = new FileReader()
                                    reader.onload = (ev) => setPemFileContent(ev.target?.result as string)
                                    reader.readAsText(e.target.files![0])
                                }} />
                            </label>
                        )}

                        <div className='relative'>
                            <input
                                type='password'
                                placeholder={encryptedPem ? '输入您的登录密码' : '请设置一个登录密码'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className='w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all'
                            />
                            <button type='submit' className='absolute right-2 top-2 bottom-2 aspect-square bg-slate-800 text-white rounded-xl flex items-center justify-center'>
                                <ArrowRight className='w-4 h-4' />
                            </button>
                        </div>
                        {error && <p className='text-center text-red-400 text-xs'>{error}</p>}
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
