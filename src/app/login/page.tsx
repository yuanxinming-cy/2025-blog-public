'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import CryptoJS from 'crypto-js'
import { motion } from 'motion/react'
import { KeyRound, ShieldCheck, UploadCloud, LogOut, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    const { encryptedPem, setAuth, isHydrated, rawPem, logout } = useConfigStore()
    const [password, setPassword] = useState('')
    const [pemFileContent, setPemFileContent] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (rawPem && isHydrated) {
            router.push('/')
        }
    }, [rawPem, isHydrated, router])

    const handleAction = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        
        if (encryptedPem) {
            // UNLOCK MODE
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedPem, password)
                const originalPem = bytes.toString(CryptoJS.enc.Utf8)
                
                if (originalPem.includes('-----BEGIN') && originalPem.length > 100) {
                    setAuth(originalPem) 
                    router.push('/')
                } else {
                    throw new Error('Invalid Key')
                }
            } catch {
                setError('Incorrect password. Decryption failed.')
            }
        } else {
            // INITIALIZATION MODE
            if (!pemFileContent.includes('-----BEGIN')) {
                setError('Invalid file format. PEM header not found.')
                return
            }
            if (password.length < 4) {
                setError('Password must be at least 4 characters long.')
                return
            }
            setAuth(pemFileContent, password)
            router.push('/')
        }
    }

    if (!isHydrated) return null 

    return (
        <div className='min-h-screen w-full flex items-center justify-center bg-slate-50'>
            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className='w-full max-w-md p-6'
            >
                <div className='bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100'>
                    <div className='text-center mb-8'>
                        <div className='w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                            {encryptedPem ? <KeyRound size={28} /> : <ShieldCheck size={28} />}
                        </div>
                        <h1 className='text-2xl font-bold text-slate-800 tracking-tight'>
                            {encryptedPem ? 'Administrator Access' : 'System Initialization'}
                        </h1>
                        <p className='text-sm text-slate-400 mt-2'>
                            {encryptedPem 
                                ? 'Verify your identity to manage the site' 
                                : 'Upload your PEM key to set up admin rights'}
                        </p>
                    </div>

                    <form onSubmit={handleAction} className='space-y-6'>
                        {!encryptedPem ? (
                            <div className="space-y-4">
                                <label className="block p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                                    <UploadCloud className="mx-auto text-slate-300 mb-2" />
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        {pemFileContent ? "✅ Key Loaded Successfully" : "Step 1: Upload .PEM File"}
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
                                <div className='space-y-1.5'>
                                    <label className='text-[10px] font-bold text-slate-400 uppercase ml-1'>Step 2: Set Access Password</label>
                                    <input 
                                        type="password"
                                        placeholder="Enter password..."
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className='space-y-1.5'>
                                    <label className='text-[10px] font-bold text-slate-400 uppercase ml-1'>Access Key Required</label>
                                    <input 
                                        type="password"
                                        placeholder="Enter your password..."
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-emerald-600 shadow-lg shadow-slate-900/10 hover:shadow-emerald-600/20 transition-all"
                        >
                            {encryptedPem ? "Authorize Session" : "Finalize Setup"}
                        </button>

                        {error && (
                            <motion.p 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="text-center text-rose-500 text-xs font-medium bg-rose-50 py-2 rounded-lg"
                            >
                                {error}
                            </motion.p>
                        )}
                    </form>

                    <div className="mt-10 pt-6 border-t border-slate-50 flex justify-between items-center">
                        <button 
                            onClick={() => router.push('/')} 
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                        >
                            <ArrowLeft size={12}/> Home
                        </button>
                        <button 
                            onClick={() => {
                                if(confirm('Erase all local security data? This action cannot be undone.')) {
                                    logout()
                                    window.location.reload()
                                }
                            }} 
                            className="flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:text-rose-500 transition-colors uppercase tracking-widest"
                        >
                            <LogOut size={12}/> Reset
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}