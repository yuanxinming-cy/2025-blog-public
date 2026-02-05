'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { motion } from 'motion/react'
import { ArrowRight, ShieldCheck } from 'lucide-react' // 需确认已安装 lucide-react

export default function LoginPage() {
	const [inputKey, setInputKey] = useState('')
	const { password, setPassword } = useConfigStore()
	const router = useRouter()

	// 如果已经有密钥，直接弹回首页
	useEffect(() => {
		if (password) {
			router.push('/')
		}
	}, [password, router])

	const handleLogin = (e: React.FormEvent) => {
		e.preventDefault()
		if (inputKey.trim()) {
			setPassword(inputKey.trim())
			router.push('/')
		}
	}

	return (
		<div className='min-h-screen w-full flex items-center justify-center bg-[#f8fafc] relative'>
			{/* 背景装饰：呼应你首页的氛围 */}
			<div className='absolute inset-0 overflow-hidden pointer-events-none'>
				<div className='absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-50 rounded-full blur-3xl opacity-50' />
				<div className='absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-50' />
			</div>

			<motion.div 
				initial={{ opacity: 0, y: 15 }} 
				animate={{ opacity: 1, y: 0 }}
				className='z-10 w-[90%] max-w-[400px]'
			>
				<div className='bg-white/70 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-10 shadow-xl shadow-emerald-900/5'>
					<div className='flex flex-col items-center mb-8'>
						<div className='w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4'>
							<ShieldCheck className='w-7 h-7 text-emerald-600' />
						</div>
						<h1 className='text-lg font-semibold text-slate-700'>管理员验证</h1>
						<p className='text-xs text-slate-400 mt-1'>请输入 Access Key 以开启编辑权限</p>
					</div>

					<form onSubmit={handleLogin} className='space-y-4'>
						<div className='relative'>
							<input
								autoFocus
								type='password'
								value={inputKey}
								onChange={(e) => setInputKey(e.target.value)}
								placeholder='••••••••'
								className='w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all'
							/>
							<button
								type='submit'
								className='absolute right-2 top-2 bottom-2 aspect-square bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors'
							>
								<ArrowRight className='w-4 h-4' />
							</button>
						</div>
					</form>
					
					<div className='mt-8 text-center'>
						<button 
							onClick={() => router.push('/')}
							className='text-xs text-slate-400 hover:text-slate-600 transition-colors'
						>
							返回首页
						</button>
					</div>
				</div>
			</motion.div>
		</div>
	)
}
