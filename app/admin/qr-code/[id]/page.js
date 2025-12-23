'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { generateToken } from '@/lib/utils'
import { QRCodeCanvas } from 'qrcode.react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HiOutlineArrowLeft,
  HiOutlineQrcode,
  HiOutlineInformationCircle,
} from 'react-icons/hi'

const INDIGO = '#6366F1'
const QR_REFRESH_SECONDS = 30 // 🔥 rotate every 30 sec

export default function QRCodePage() {
  const { id } = useParams()
  const router = useRouter()
  const timerRef = useRef(null)

  const [training, setTraining] = useState(null)
  const [qrPayload, setQrPayload] = useState(null)
  const [loading, setLoading] = useState(true)

  /* ---------------- AUTH + LOAD ---------------- */
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

    // Generate immediately + start rotation
    generateAndRotateQR(data.id)
    timerRef.current = setInterval(
      () => generateAndRotateQR(data.id),
      QR_REFRESH_SECONDS * 1000
    )
  }

  /* ---------------- QR ROTATION (IST SAFE) ---------------- */
  const generateAndRotateQR = async (trainingId) => {
    const token = generateToken()

    // Get IST timestamp safely
    const istNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    )

    const expiresAt = Math.floor(
      (istNow.getTime() + QR_REFRESH_SECONDS * 1000) / 1000
    )

    // Save latest token
    await supabase
      .from('trainings')
      .update({ qr_token: token })
      .eq('id', trainingId)

    // Build QR payload (NO GPS)
    setQrPayload({
      training_id: trainingId,
      token,
      expires_at: expiresAt
    })
  }

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold">Live QR Attendance</h1>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 font-bold"
          >
            <HiOutlineArrowLeft /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white p-8 rounded-3xl shadow-xl border">

          <h2 className="text-xl font-extrabold mb-4">
            {training.name}
          </h2>

          <div className="text-center space-y-6">
            <div className="inline-block p-6 bg-white border rounded-3xl shadow">
              {qrPayload && (
                <QRCodeCanvas
                  value={JSON.stringify(qrPayload)}
                  size={360}
                  level="H"
                  includeMargin
                  fgColor={INDIGO}
                />
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="font-bold text-emerald-800">
                QR refreshes every {QR_REFRESH_SECONDS} seconds
              </p>
              <p className="text-sm text-emerald-600">
                Screenshots expire automatically
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border text-left">
              <h3 className="font-extrabold flex items-center gap-2 mb-2">
                <HiOutlineInformationCircle className="text-indigo-500" />
                How it works
              </h3>
              <ol className="list-decimal list-inside text-sm space-y-1 text-slate-600">
                <li>QR changes every 30 seconds</li>
                <li>Only logged-in trainees can scan</li>
                <li>Expired QR is rejected</li>
                <li>One attendance per user per day</li>
              </ol>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
