'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { generateToken, formatDate } from '@/lib/utils'
import { QRCodeCanvas } from 'qrcode.react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HiOutlineArrowLeft,
  HiOutlineQrcode,
  HiOutlineRefresh,
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiOutlineFlag,
  HiOutlineInformationCircle,
} from 'react-icons/hi'

const INDIGO = '#6366F1'

export default function QRCodePage() {
  const params = useParams()
  const router = useRouter()

  const [training, setTraining] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)

  /* ---------------- AUTH + FETCH ---------------- */
  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
      return
    }

    await fetchTraining()
    setLoading(false)
  }

  const fetchTraining = async () => {
    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error || !data) {
      alert('Failed to load training')
      router.push('/admin/dashboard')
      return
    }

    setTraining(data)
  }

  /* ---------------- GENERATE QR (FIXED) ---------------- */
  const generateQRCode = async () => {
    if (!training) return

    const today = formatDate(new Date())
    const token = generateToken()

    // 1️⃣ Save token in DB
    const { error } = await supabase
      .from('trainings')
      .update({
        qr_token: token,
        qr_generated_date: today,
      })
      .eq('id', training.id)

    if (error) {
      alert('Failed to save QR token')
      return
    }

    // 2️⃣ Re-fetch training from DB (CRITICAL)
    const { data: freshTraining, error: fetchError } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', training.id)
      .single()

    if (fetchError) {
      alert('Failed to reload training')
      return
    }

    setTraining(freshTraining)

    // 3️⃣ Build QR payload ONLY from DB-backed data
    const payload = {
      training_id: freshTraining.id,
      training_name: freshTraining.name,
      date: today,
      token: freshTraining.qr_token,
      latitude: freshTraining.latitude,
      longitude: freshTraining.longitude,
      geofence_radius: freshTraining.geofence_radius,
    }

    setQrData(payload)
  }

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold">QR Code Generator</h1>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 font-bold hover:bg-slate-200"
          >
            <HiOutlineArrowLeft /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">

          {/* TRAINING INFO */}
          {training && (
            <div className="mb-8 bg-slate-50 p-6 rounded-2xl border">
              <h2 className="text-xl font-extrabold mb-4">{training.name}</h2>

              <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <HiOutlineLocationMarker className="text-indigo-500" />
                  {training.location_name}
                </div>
                <div className="flex items-center gap-2">
                  <HiOutlineFlag className="text-indigo-500" />
                  {training.geofence_radius}m radius
                </div>
                <div className="flex items-center gap-2">
                  <HiOutlineCalendar className="text-indigo-500" />
                  {training.start_date} → {training.end_date}
                </div>
              </div>
            </div>
          )}

          {/* QR AREA */}
          {!qrData ? (
            <div className="text-center border-4 border-dashed border-indigo-200 rounded-3xl p-10 bg-indigo-50">
              <HiOutlineQrcode className="text-6xl text-indigo-400 mx-auto mb-6" />
              <button
                onClick={generateQRCode}
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-indigo-700"
              >
                Generate Today’s QR
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8">

              <div className="inline-block p-6 bg-white border rounded-3xl shadow-lg">
                <QRCodeCanvas
                  value={JSON.stringify(qrData)}
                  size={380}
                  level="H"
                  includeMargin
                  fgColor={INDIGO}
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="font-bold text-emerald-800">
                  Active for {qrData.date}
                </p>
                <p className="text-sm text-emerald-600">
                  Regenerate to invalidate old QR
                </p>
              </div>

              <button
                onClick={generateQRCode}
                className="flex items-center justify-center gap-2 mx-auto bg-slate-100 px-6 py-3 rounded-xl font-bold hover:bg-slate-200"
              >
                <HiOutlineRefresh /> Regenerate QR
              </button>

              <div className="bg-slate-50 p-6 rounded-2xl border text-left">
                <h3 className="font-extrabold flex items-center gap-2 mb-2">
                  <HiOutlineInformationCircle className="text-indigo-500" />
                  Instructions
                </h3>
                <ol className="list-decimal list-inside text-sm space-y-1 text-slate-600">
                  <li>Display QR on screen</li>
                  <li>Trainees scan via app</li>
                  <li>Geofence + token validated</li>
                  <li>Regenerate to block misuse</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
