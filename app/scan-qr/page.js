'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// Using Hi icons to match the login page consistency
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
      setError('Trainee profile not found. Contact admin.')
      return
    }
    setTrainee(traineeData)
  }

  const startScan = () => {
    setError('')
    setResult(null)
    setScannedOnce(false)
    setScanning(true)
  }

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
        throw new Error('Invalid QR code format')
      }

      const { training_id, token, expires_at } = qr
      if (!training_id || !token || !expires_at) throw new Error('Incomplete QR data')

      const now = Math.floor(Date.now() / 1000)
      if (now > expires_at) throw new Error('QR code expired. Please scan the latest QR.')

      const { data: training } = await supabase.from('trainings').select('*').eq('id', training_id).single()
      if (!training) throw new Error('Training session not found')
      if (training.qr_token !== token) throw new Error('QR code is outdated.')

      const { data: enrollment } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', training_id)
        .maybeSingle()

      if (!enrollment) throw new Error('You are not enrolled in this training')

      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      const today = istNow.toISOString().split('T')[0]

      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', training_id)
        .eq('date', today)
        .maybeSingle()

      if (existing) throw new Error('Attendance already marked for today')

      const { error: insertError } = await supabase.from('attendance').insert([{
        trainee_id: trainee.id,
        training_id,
        date: today,
        qr_token: token,
        status: 'present'
      }])

      if (insertError) throw new Error(insertError.message)

      setResult({
        success: true,
        trainingName: training.name,
        time: istNow.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      })
    } catch (err) {
      setError(err.message)
      setScannedOnce(false)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full border border-gray-100">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <HiOutlineShieldCheck className="w-12 h-12 text-[#5a4cf4]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Attendance Scanner</h1>
          <p className="text-gray-500 text-sm mt-1">Scan the session QR code</p>
        </div>

        {/* State: Processing */}
        {processing && (
          <div className="text-center py-10">
            <div className="animate-spin flex justify-center mb-4">
              <HiOutlineRefresh className="w-10 h-10 text-[#5a4cf4]" />
            </div>
            <p className="font-bold text-[#1e293b]">Verifying Attendance...</p>
          </div>
        )}

        {/* State: Error */}
        {error && !processing && (
          <div className="text-center space-y-6">
            <div className="bg-red-50 p-4 rounded-2xl">
              <HiOutlineXCircle className="text-5xl text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-bold text-sm leading-relaxed">{error}</p>
            </div>
            <button
              onClick={startScan}
              className="w-full bg-[#5a4cf4] text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              Try Scanning Again
            </button>
          </div>
        )}

        {/* State: Idle / Initial */}
        {!scanning && !processing && !result && !error && (
          <div className="space-y-4">
            <div className="bg-[#ebf2ff] p-6 rounded-2xl border-2 border-dashed border-indigo-200 text-center">
               <HiOutlineCamera className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
               <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Ready to scan</p>
            </div>
            <button
              onClick={startScan}
              className="w-full flex items-center justify-center gap-2 bg-[#5a4cf4] hover:bg-[#4a3ee0] text-white py-4 rounded-xl font-bold shadow-md transition-all active:scale-95"
            >
              <HiOutlineCamera className="w-5 h-5" /> Open Scanner
            </button>
          </div>
        )}

        {/* State: Scanning */}
        {scanning && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border-4 border-[#ebf2ff] shadow-inner">
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
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {/* State: Success */}
        {result?.success && (
          <div className="text-center space-y-6">
            <div className="bg-emerald-50 p-6 rounded-2xl">
              <HiOutlineCheckCircle className="text-6xl text-emerald-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-emerald-800">Attendance Marked!</h2>
              <div className="mt-2 text-sm text-emerald-700 font-medium">
                <p className="opacity-75">{result.trainingName}</p>
                <p className="text-xs mt-1">Logged at: {result.time}</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 text-[#5a4cf4] font-bold text-sm hover:underline"
            >
              <HiOutlineArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}