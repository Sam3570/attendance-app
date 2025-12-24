'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  HiOutlineCamera, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineArrowLeft,
  HiOutlineShieldCheck,
  HiOutlineRefresh
} from 'react-icons/hi'

export default function ScanQR() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [trainee, setTrainee] = useState(null)

  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scannedOnce, setScannedOnce] = useState(false)

  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    const { data: traineeData } = await supabase
      .from('trainees')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!traineeData) {
      setError('Trainee profile not found. Please contact admin.')
      return
    }

    setTrainee(traineeData)
  }

  /* ---------------- START SCAN ---------------- */
  const startScan = () => {
    setError('')
    setResult(null)
    setScannedOnce(false)
    setScanning(true)
  }

  /* ---------------- HANDLE QR ---------------- */
  const handleScan = async (data) => {
    if (!data || scannedOnce) return

    setScannedOnce(true)
    setScanning(false)
    setProcessing(true)

    try {
      let qr
      try {
        qr = JSON.parse(data.text)
      } catch {
        throw new Error('Invalid QR code')
      }

      const { training_id, token, expires_at } = qr
      if (!training_id || !token || !expires_at) {
        throw new Error('Incomplete QR data')
      }

      const now = Math.floor(Date.now() / 1000)
      if (now > expires_at) {
        throw new Error('QR code expired. Please scan latest QR.')
      }

      const { data: training } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', training_id)
        .single()

      if (!training) throw new Error('Training not found')
      if (training.qr_token !== token) {
        throw new Error('QR code is outdated')
      }

      const { data: enrollment } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', training_id)
        .maybeSingle()

      if (!enrollment) {
        throw new Error('You are not enrolled in this training')
      }

      // IST date for "date" column
      const istNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      )
      const today = istNow.toISOString().split('T')[0]

      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('trainee_id', trainee.id)
        .eq('training_id', training_id)
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        throw new Error('Attendance already marked for today')
      }

      /* ✅ FINAL FIX — EXPLICIT UTC TIME INSERT */
      const { error: insertError } = await supabase
        .from('attendance')
        .insert([
          {
            trainee_id: trainee.id,
            training_id,
            date: today,
            check_in_time: new Date().toISOString(), // ✅ CRITICAL FIX
            qr_token: token,
            status: 'present',
          }
        ])

      if (insertError) throw new Error(insertError.message)

      setResult({
        success: true,
        trainingName: training.name,
        time: istNow.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      })

    } catch (err) {
      setError(err.message)
      setScannedOnce(false)
    } finally {
      setProcessing(false)
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full border border-gray-100">

        {/* Header */}
        <div className="text-center mb-8">
          <HiOutlineShieldCheck className="w-12 h-12 text-[#5a4cf4] mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-slate-800">Attendance Scanner</h1>
          <p className="text-gray-500 text-sm">Scan training QR code</p>
        </div>

        {/* Processing */}
        {processing && (
          <div className="text-center py-10">
            <HiOutlineRefresh className="w-10 h-10 text-[#5a4cf4] animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-700">Verifying attendance…</p>
          </div>
        )}

        {/* Error */}
        {error && !processing && (
          <div className="space-y-4 text-center">
            <HiOutlineXCircle className="text-5xl text-red-500 mx-auto" />
            <p className="text-red-600 font-bold text-sm">{error}</p>
            <button
              onClick={startScan}
              className="w-full bg-[#5a4cf4] text-white py-3 rounded-xl font-bold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Idle */}
        {!scanning && !processing && !result && !error && (
          <button
            onClick={startScan}
            className="w-full bg-[#5a4cf4] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <HiOutlineCamera /> Open Scanner
          </button>
        )}

        {/* Scanner */}
        {scanning && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border-4 border-indigo-200">
              <Scanner
                onScan={(res) => {
                  if (res?.[0]?.rawValue) {
                    handleScan({ text: res[0].rawValue })
                  }
                }}
                constraints={{ facingMode: 'environment' }}
              />
            </div>
            <button
              onClick={() => setScanning(false)}
              className="w-full bg-gray-100 py-3 rounded-xl font-bold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Success */}
        {result?.success && (
          <div className="text-center space-y-4">
            <HiOutlineCheckCircle className="text-6xl text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-700">Attendance Marked</h2>
            <p className="text-sm text-emerald-600">{result.trainingName}</p>
            <p className="text-xs text-slate-500">Time: {result.time}</p>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-sm"
            >
              <HiOutlineArrowLeft /> Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
