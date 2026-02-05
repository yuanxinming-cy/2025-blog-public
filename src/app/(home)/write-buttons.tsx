'use client'

import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
import PenSVG from '@/svgs/pen.svg'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useConfigStore } from './stores/config-store' //
import { useCenterStore } from '@/hooks/use-center'
import { useRouter } from 'next/navigation'
import { useSize } from '@/hooks/use-size'
import DotsSVG from '@/svgs/dots.svg'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function WriteButton() {
	const center = useCenterStore()
	// 引入 rawPem (内存密钥) 和 isHydrated (加载状态)
	const { cardStyles, setConfigDialogOpen, siteContent, rawPem, isHydrated } = useConfigStore()
	const { maxSM } = useSize()
	const router = useRouter()
	const styles = cardStyles.writeButtons
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard

	const [show, setShow] = useState(false)

	useEffect(() => {
		// 只有在权限验证通过后，才启动入场动画延迟
		if (isHydrated && rawPem) {
			const timer = setTimeout(() => setShow(true), styles.order * ANIMATION_DELAY * 1000)
			return () => clearTimeout(timer)
		}
	}, [styles.order, isHydrated, rawPem])

	// --- 核心隐藏逻辑 ---
	// 1. 如果还在加载本地存储，不显示
	// 2. 如果内存中没有解密后的 PEM，直接消失
	if (!isHydrated || !rawPem) return null

	if (maxSM) return null

	if (!show) return null

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset - styles.height - CARD_SPACING / 2 - clockCardStyles.height

	return (
		<HomeDraggableLayer cardKey='writeButtons' x={x} y={y} width={styles.width} height={styles.height}>
			<motion.div 
				initial={{ left: x, top: y }} 
				animate={{ left: x, top: y }} 
				className='absolute flex items-center gap-4'
			>
				{/* Write Article Button */}
				<motion.button
					onClick={() => router.push('/write')}
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					style={{ boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.4)' }}
					className='brand-btn whitespace-nowrap'
				>
					{siteContent.enableChristmas && (
						<img
							src='/images/christmas/snow-8.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 60, left: -2, top: -4, opacity: 0.95 }}
						/>
					)}
					<PenSVG />
					<span>Write</span>
				</motion.button>

				{/* System Configuration Button */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setConfigDialogOpen(true)}
					className='p-2'
				>
					<DotsSVG className='h-6 w-6 text-slate-400' />
				</motion.button>
			</motion.div>
		</HomeDraggableLayer>
	)
}