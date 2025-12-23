'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateDistance, formatDate, getCurrentLocation } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  HiOutlineCamera, 
  HiOutlineMapPin, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineArrowLeft 
} from 'react-icons/hi2'

export default function ScanQR() {
  const [user, setUser] = useState(null)
  const [trainee, setTrainee] = useState(null)

  const [location, setLocation] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scannedOnce, setScannedOnce] = useState(false)

  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const router = useRouter()

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // FIXED: Use maybeSingle() to handle missing trainee gracefully
    const { data: traineeData, error: traineeError } = await supabase
      .from('trainees')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (traineeError) {
      console.error('Error fetching trainee:', traineeError)
      setError('Failed to load trainee profile. Please contact admin.')
      return
    }

    if (!traineeData) {
      setError('Trainee profile not found. Please contact admin.')
      return
    }

    setTrainee(traineeData)
  }

  /* ---------------- STEP 1: GET LOCATION FIRST ---------------- */
  const prepareScanner = async () => {
    setError('')
    setResult(null)
    setProcessing(true)
    setScannedOnce(false)

    try {
      console.log('📍 Requesting location...')
      const loc = await getCurrentLocation()
      console.log('✅ Location obtained:', loc)
      setLocation(loc)
      setScanning(true)
    } catch (err) {
      console.error('❌ Location error:', err)
      setError('Unable to get your location. Please enable location services and try again.')
    } finally {
      setProcessing(false)
    }
  }

  /* ---------------- STEP 2: SCAN QR ---------------- */
  const handleScan = async (data) => {
    if (!data || scannedOnce || !location) return

    setScannedOnce(true)
    setScanning(false)
    setProcessing(true)

    try {
      console.log('🔍 QR Data received:', data.text)

      // FIXED: Better error handling for JSON parsing
      let qrData
      try {
        qrData = JSON.parse(data.text)
      } catch (parseError) {
        throw new Error('Invalid QR code format. Please ensure you are scanning the correct QR code.')
      }

      console.log('📋 Parsed QR Data:', qrData)

      // FIXED: More specific validation
      if (!qrData.training_id) {
        throw new Error('QR code missing training information.')
      }
      if (!qrData.date) {
        throw new Error('QR code missing date information.')
      }
      if (!qrData.token) {
        throw new Error('QR code missing security token.')
      }

      const today = formatDate(new Date())
      console.log('📅 Today:', today, 'QR Date:', qrData.date)

      if (qrData.date !== today) {
        throw new Error(`This QR code is for ${qrData.date}. Please scan today's QR code.`)
      }

      if (!trainee?.id) {
        throw new Error('Trainee profile not loaded. Please refresh the page and try again.')
      }

      // FIXED: Check enrollment first
      const { data: enrollment, error: enrollError } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', qrData.training_id)
        .maybeSingle()

      console.log('📝 Enrollment check:', enrollment)

      if (enrollError) {
        console.error('Enrollment error:', enrollError)
        throw new Error('Error checking training enrollment.')
      }

      if (!enrollment) {
        throw new Error('You are not enrolled in this training. Please contact admin.')
      }

      // Check duplicate attendance
      const { data: existing, error: existError } = await supabase
        .from('attendance')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', qrData.training_id)
        .eq('date', today)
        .maybeSingle()

      if (existError) {
        console.error('Attendance check error:', existError)
      }

      if (existing) {
        const time = new Date(existing.check_in_time).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        throw new Error(`Attendance already marked today at ${time}.`)
      }

      // Get training details
      const { data: training, error: trainingError } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', qrData.training_id)
        .single()

      console.log('🎓 Training data:', training)

      if (trainingError || !training) {
        console.error('Training error:', trainingError)
        throw new Error('Training information not found. Please contact admin.')
      }

      if (training.qr_token !== qrData.token) {
        throw new Error('QR code has expired. Please scan the latest QR code.')
      }

      // FIXED: Geofence Calculation with proper number conversion
      const distance = calculateDistance(
        parseFloat(location.latitude),
        parseFloat(location.longitude),
        parseFloat(training.latitude),
        parseFloat(training.longitude)
      )

      console.log('📏 Distance calculated:', distance, 'meters')

      const geofenceRadius = parseInt(training.geofence_radius) || 100
      const isWithinGeofence = distance <= geofenceRadius

      console.log('🎯 Geofence check:', {
        distance,
        radius: geofenceRadius,
        isValid: isWithinGeofence
      })

      // FIXED: STRICT GEOFENCE MODE
      const STRICT_GEOFENCE = true // Set to false to allow out-of-range attendance

      if (STRICT_GEOFENCE && !isWithinGeofence) {
        throw new Error(
          `You are ${Math.round(distance)}m away from the training location. ` +
          `You must be within ${geofenceRadius}m to mark attendance.`
        )
      }

      // Save attendance
      const { error: insertError } = await supabase
        .from('attendance')
        .insert([{
          trainee_id: trainee.id,
          training_id: training.id,
          date: today,
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          distance_meters: Math.round(distance),
          is_within_geofence: isWithinGeofence,
          qr_token: qrData.token,
          status: 'present'
        }])

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        throw new Error('Failed to save attendance: ' + insertError.message)
      }

      console.log('✅ Attendance saved successfully!')

      setResult({
        success: true,
        trainingName: training.name,
        distance: distance,
        isWithinGeofence: isWithinGeofence,
        time: new Date().toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      })

      // FIXED: Browser notification (if permission granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Attendance Marked!', {
          body: `${training.name} - ${new Date().toLocaleTimeString()}`,
        })
      }

    } catch (err) {
      console.error('❌ Scan error:', err)
      setError(err.message || 'Scan failed due to an unknown error.')
      setScannedOnce(false)
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }

  /* ---------------- UI Components ---------------- */

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-semibold">
        {error ? 'Retrying...' : 'Processing Attendance...'}
      </p>
    </div>
  )

  const InitialView = () => (
    <div className="text-center space-y-6">
      <HiOutlineMapPin className="text-6xl text-indigo-400 mx-auto" />
      <h2 className="text-xl font-bold text-slate-800">Start Attendance Check</h2>
      <p className="text-slate-500 text-sm">
        Tap below to grant location access and open the camera for scanning.
      </p>
      
      <button
        onClick={prepareScanner}
        disabled={processing}
        className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
      >
        <HiOutlineCamera className="text-2xl" /> 
        {processing ? 'Checking Location...' : 'Open Camera & Scan'}
      </button>
    </div>
  )

  const SuccessResult = ({ result }) => (
    <div className="text-center space-y-6 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-300">
      <HiOutlineCheckCircle className="text-6xl text-emerald-600 mx-auto" />
      <h2 className="text-2xl font-black text-emerald-800">Attendance Marked!</h2>
      
      <div className="bg-white p-4 rounded-xl text-left space-y-2 border border-emerald-200">
        <p className="font-bold text-slate-700">
          Training: <span className="text-indigo-600">{result.trainingName}</span>
        </p>
        <p className="text-sm text-slate-600">
          Check-in Time: <span className="font-semibold">{result.time}</span>
        </p>
        
        <div className="flex justify-between border-t mt-3 pt-3">
          <p className="text-sm font-medium text-slate-500">Your Distance:</p>
          <p className={`text-sm font-bold ${result.isWithinGeofence ? 'text-emerald-600' : 'text-rose-600'}`}>
            {Math.round(result.distance)} meters
          </p>
        </div>
        
        <p className={`text-xs font-semibold ${result.isWithinGeofence ? 'text-emerald-500' : 'text-rose-500'}`}>
          {result.isWithinGeofence ? 'Location Valid ✅' : 'Location Out of Range ❌'}
        </p>
      </div>

      <Link 
        href="/dashboard" 
        className="w-full flex items-center justify-center gap-2 text-indigo-600 font-bold py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
      >
        <HiOutlineArrowLeft /> Back to Dashboard
      </Link>
    </div>
  )

  const ErrorResult = ({ message }) => (
    <div className="text-center space-y-6 p-6 bg-rose-50 rounded-2xl border-2 border-rose-300">
      <HiOutlineXCircle className="text-6xl text-rose-600 mx-auto" />
      <h2 className="text-2xl font-black text-rose-800">Check-in Failed</h2>
      
      <p className="text-rose-700 font-medium bg-white p-4 rounded-lg border border-rose-200">
        {message}
      </p>
      
      <button
        onClick={prepareScanner}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
      >
        <HiOutlineCamera className="text-2xl" /> Try Again
      </button>

      <Link 
        href="/dashboard" 
        className="w-full flex items-center justify-center gap-2 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <HiOutlineArrowLeft /> Dashboard
      </Link>
    </div>
  )

  /* ---------------- MAIN RENDER ---------------- */
  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto bg-white p-6 rounded-3xl shadow-2xl shadow-slate-200/50">

        <h1 className="text-2xl font-black text-center text-slate-800 mb-6">
          Attendance Scanner
        </h1>
        
        {/* Loading/Processing State */}
        {processing && <LoadingSpinner />}
        
        {/* Error State */}
        {error && !processing && !scanning && <ErrorResult message={error} />}

        {/* Initial State */}
        {!scanning && !processing && !result && !error && <InitialView />}

        {/* Scanning State */}
        {scanning && (
          <div className="space-y-4">
            <p className="text-center text-sm font-semibold text-slate-500">
              Align QR code within the frame
            </p>
            
            <div className="aspect-square w-full rounded-xl overflow-hidden border-4 border-indigo-500/50 relative">
              <Scanner
                onScan={(res) => {
                  if (res && res.length > 0 && res[0].rawValue) {
                    handleScan({ text: res[0].rawValue })
                  }
                }}
                onError={(err) => {
                  console.error('Scanner error:', err)
                }}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' },
                }}
              />
              <div className="absolute inset-0 border-30 border-white/50 pointer-events-none rounded-xl"></div>
            </div>

            <button
              onClick={() => {
                setScanning(false)
                setScannedOnce(false)
              }}
              className="w-full mt-3 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              Cancel Scan
            </button>
          </div>
        )}

        {/* Success State */}
        {result?.success && <SuccessResult result={result} />}

      </div>
    </div>
  )
}