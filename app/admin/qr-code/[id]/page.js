'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { generateToken } from '@/lib/utils'
import { QRCodeCanvas } from 'qrcode.react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HiOutlineArrowLeft,
  HiOutlineInformationCircle,
  HiOutlineRefresh,
  HiOutlineShieldCheck
} from 'react-icons/hi'

const BRAND_PURPLE = '#5a4cf4'
const QR_REFRESH_SECONDS = 30 

export default function QRCodePage() {
  const { id } = useParams()
  const router = useRouter()
  const timerRef = useRef(null)

  const [training, setTraining] = useState(null)
  const [qrPayload, setQrPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRotating, setIsRotating] = useState(false)

  useEffect(() => {
    init()
    return () => clearInterval(timerRef.current)
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
      return
    }

    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      alert('Training not found')
      router.push('/admin/dashboard')
      return
    }

    setTraining(data)
    setLoading(false)

    // Generate first QR
    generateAndRotateQR(data.id)
    
    // Background rotation logic (no UI timer)
    timerRef.current = setInterval(() => {
      generateAndRotateQR(data.id)
    }, QR_REFRESH_SECONDS * 1000)
  }

  const generateAndRotateQR = async (trainingId) => {
    setIsRotating(true)
    const token = generateToken()
    const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const expiresAt = Math.floor((istNow.getTime() + QR_REFRESH_SECONDS * 1000) / 1000)

    await supabase.from('trainings').update({ qr_token: token }).eq('id', trainingId)

    setQrPayload({
      training_id: trainingId,
      token,
      expires_at: expiresAt
    })
    
    // Brief animation effect for the icon
    setTimeout(() => setIsRotating(false), 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#5a4cf4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HiOutlineShieldCheck className="w-8 h-8 text-[#5a4cf4]" />
            <h1 className="text-xl font-extrabold text-[#1e293b]">Live Attendance</h1>
          </div>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ebf2ff] text-[#5a4cf4] font-bold text-sm hover:bg-indigo-100 transition-colors"
          >
            <HiOutlineArrowLeft /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-50">
          
          <div className="text-center mb-10">
            <span className="bg-[#ebf2ff] text-[#5a4cf4] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
              Secure Session
            </span>
            <h2 className="text-3xl font-black text-[#1e293b] mt-4">
              {training.name}
            </h2>
          </div>

          <div className="text-center space-y-10">
            {/* QR CODE CONTAINER */}
            <div className="inline-block p-8 bg-white border-4 border-[#ebf2ff] rounded-[2.5rem] shadow-sm">
              {qrPayload ? (
                <QRCodeCanvas
                  value={JSON.stringify(qrPayload)}
                  size={320}
                  level="H"
                  includeMargin
                  fgColor={BRAND_PURPLE}
                />
              ) : (
                <div className="w-[320px] h-[320px] flex items-center justify-center bg-gray-50 rounded-2xl">
                  <HiOutlineRefresh className="animate-spin text-gray-300 w-10 h-10" />
                </div>
              )}
            </div>

            {/* STATUS BADGE */}
            <div className="bg-[#ebf2ff] rounded-2xl p-6 flex items-center justify-center gap-4">
               <div className={`bg-white p-2 rounded-lg shadow-sm ${isRotating ? 'animate-spin' : ''}`}>
                  <HiOutlineRefresh className="w-5 h-5 text-[#5a4cf4]" />
               </div>
               <p className="font-bold text-[#1e293b]">Dynamic QR Protection Active</p>
            </div>

            {/* SECURITY INFO */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 text-left">
              <h3 className="font-bold text-[#1e293b] flex items-center gap-2 mb-4">
                <HiOutlineInformationCircle className="text-[#5a4cf4] w-5 h-5" />
                Security Guidelines
              </h3>
              <div className="grid grid-cols-1 gap-4 text-sm font-medium text-gray-500">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-50">
                  <div className="w-2 h-2 rounded-full bg-[#5a4cf4]"></div>
                  <span>Automatically expires screenshots</span>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-50">
                  <div className="w-2 h-2 rounded-full bg-[#5a4cf4]"></div>
                  <span>Authorized trainee access only</span>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-50">
                  <div className="w-2 h-2 rounded-full bg-[#5a4cf4]"></div>
                  <span>Single daily attendance per user</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}