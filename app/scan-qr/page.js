'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateDistance, formatDate, getCurrentLocation, validateLocationAccuracy } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Link } from 'next/link'
import { 
  HiOutlineCamera, 
  HiOutlineMapPin, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineArrowLeft,
  HiOutlineSignal
} from 'react-icons/hi2'

/* ---------------- STEP 1: GET PRECISE LOCATION WITH BETTER ERROR HANDLING ---------------- */
const prepareScanner = async () => {
  setError('')
  setResult(null)
  setProcessing(true)
  setScannedOnce(false)
  setLocationAttempts(0)

  // Check geolocation support first
  const geoCheck = checkGeolocationSupport()
  
  if (!geoCheck.supported) {
    setError('Geolocation is not supported by your browser. Please use Chrome, Firefox, Safari, or Edge.')
    setProcessing(false)
    return
  }

  if (!geoCheck.secureContext) {
    setError('Location access requires HTTPS connection. Please access this site via HTTPS or contact your administrator.')
    setProcessing(false)
    return
  }

  // Check if location permission is already denied
  if (navigator.permissions) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      console.log('📋 Location permission status:', permission.state)
      
      if (permission.state === 'denied') {
        setError(
          'Location permission is blocked.\n\n' +
          'To fix this:\n' +
          '• Click the lock icon in your browser address bar\n' +
          '• Find Location/Geolocation settings\n' +
          '• Change permission to "Allow"\n' +
          '• Refresh the page and try again'
        )
        setProcessing(false)
        return
      }
    } catch (permErr) {
      console.warn('Could not check permission status:', permErr)
    }
  }

  try {
    console.log('📍 Requesting precise GPS location...')
    
    const loc = await getCurrentLocation(100, 15000)
    
    setLocationAttempts(prev => prev + 1)
    
    console.log('✅ Location obtained:', {
      lat: loc.latitude.toFixed(6),
      lon: loc.longitude.toFixed(6),
      accuracy: Math.round(loc.accuracy) + 'm',
      timestamp: new Date(loc.timestamp).toLocaleTimeString()
    })

    // Validate accuracy
    const accuracyCheck = validateLocationAccuracy(loc.accuracy, 200)
    
    if (!accuracyCheck.valid) {
      setError(accuracyCheck.message)
      setProcessing(false)
      return
    }

    if (loc.accuracy > 100) {
      console.warn(`⚠️ Moderate accuracy: ${Math.round(loc.accuracy)}m`)
    }

    setLocation(loc)
    setScanning(true)
    
  } catch (err) {
    console.error('❌ Location error caught:', err)
    setError(err.message || 'Unable to get your location. Please check permissions and try again.')
  } finally {
    setProcessing(false)
  }
}

export default function ScanQR() {
  const [user, setUser] = useState(null)
  const [trainee, setTrainee] = useState(null)

  const [location, setLocation] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [scannedOnce, setScannedOnce] = useState(false)
  const [locationAttempts, setLocationAttempts] = useState(0)

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

  /* ---------------- STEP 1: GET PRECISE LOCATION ---------------- */
  const prepareScanner = async () => {
    setError('')
    setResult(null)
    setProcessing(true)
    setScannedOnce(false)
    setLocationAttempts(0)

    try {
      console.log('📍 Requesting precise GPS location...')
      
      // Get location with accuracy validation
      const loc = await getCurrentLocation(100, 15000) // Want 100m accuracy, wait max 15s
      
      setLocationAttempts(prev => prev + 1)
      
      console.log('✅ Location obtained:', {
        lat: loc.latitude.toFixed(6),
        lon: loc.longitude.toFixed(6),
        accuracy: Math.round(loc.accuracy) + 'm'
      })

      // Validate accuracy before proceeding
      const accuracyCheck = validateLocationAccuracy(loc.accuracy, 200)
      
      if (!accuracyCheck.valid) {
        setError(accuracyCheck.message)
        setProcessing(false)
        return
      }

      // Show warning if accuracy is moderate (100-200m)
      if (loc.accuracy > 100) {
        console.warn(`⚠️ Moderate accuracy: ${Math.round(loc.accuracy)}m`)
      }

      setLocation(loc)
      setScanning(true)
      
    } catch (err) {
      console.error('❌ Location error:', err)
      setError(err.message || 'Unable to get your location. Please enable location services and try again.')
    } finally {
      setProcessing(false)
    }
  }

  /* ---------------- STEP 2: SCAN QR CODE ---------------- */
  const handleScan = async (data) => {
    if (!data || scannedOnce || !location) return

    setScannedOnce(true)
    setScanning(false)
    setProcessing(true)

    try {
      console.log('🔍 QR Data received:', data.text)

      // Parse QR data
      let qrData
      try {
        qrData = JSON.parse(data.text)
      } catch (parseError) {
        throw new Error('Invalid QR code format. Please scan the official training QR code.')
      }

      console.log('📋 Parsed QR Data:', qrData)

      // Validate QR data structure
      if (!qrData.training_id) {
        throw new Error('QR code missing training information.')
      }
      if (!qrData.date) {
        throw new Error('QR code missing date information.')
      }
      if (!qrData.token) {
        throw new Error('QR code missing security token.')
      }

      // Check date validity
      const today = formatDate(new Date())
      console.log('📅 Date check - Today:', today, '| QR Date:', qrData.date)

      if (qrData.date !== today) {
        throw new Error(`This QR code is for ${qrData.date}. Please scan today's QR code (${today}).`)
      }

      if (!trainee?.id) {
        throw new Error('Trainee profile not loaded. Please refresh the page and try again.')
      }

      // Check enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', qrData.training_id)
        .maybeSingle()

      console.log('📝 Enrollment status:', enrollment ? 'Enrolled ✅' : 'Not enrolled ❌')

      if (enrollError) {
        console.error('Enrollment check error:', enrollError)
        throw new Error('Error verifying enrollment. Please try again.')
      }

      if (!enrollment) {
        throw new Error('You are not enrolled in this training. Please contact your administrator.')
      }

      // Check for duplicate attendance
      const { data: existing, error: existError } = await supabase
        .from('attendance')
        .select('*')
        .eq('trainee_id', trainee.id)
        .eq('training_id', qrData.training_id)
        .eq('date', today)
        .maybeSingle()

      if (existError) {
        console.error('Duplicate check error:', existError)
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

      console.log('🎓 Training:', training?.name || 'Not found')

      if (trainingError || !training) {
        console.error('Training fetch error:', trainingError)
        throw new Error('Training information not found. Please contact admin.')
      }

      // Verify QR token
      if (training.qr_token !== qrData.token) {
        throw new Error('QR code has expired or is invalid. Please scan the latest QR code.')
      }

      // Calculate distance with precise geofencing
      const distance = calculateDistance(
        parseFloat(location.latitude),
        parseFloat(location.longitude),
        parseFloat(training.latitude),
        parseFloat(training.longitude)
      )

      const geofenceRadius = parseInt(training.geofence_radius) || 100
      const isWithinGeofence = distance <= geofenceRadius

      console.log('📏 Geofence validation:', {
        distance: Math.round(distance) + 'm',
        radius: geofenceRadius + 'm',
        status: isWithinGeofence ? 'VALID ✅' : 'OUT OF RANGE ❌',
        locationAccuracy: Math.round(location.accuracy) + 'm'
      })

      // STRICT GEOFENCE ENFORCEMENT
      const STRICT_GEOFENCE = true

      if (STRICT_GEOFENCE && !isWithinGeofence) {
        throw new Error(
          `You are ${Math.round(distance)}m away from the training location.\n\n` +
          `Required: Within ${geofenceRadius}m\n` +
          `Your location accuracy: ±${Math.round(location.accuracy)}m\n\n` +
          `Please move closer to the training venue and try again.`
        )
      }

      // Save attendance record
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
        console.error('❌ Database insert error:', insertError)
        throw new Error('Failed to save attendance. Please try again.')
      }

      console.log('✅ Attendance saved successfully!')

      // Set success result
      setResult({
        success: true,
        trainingName: training.name,
        distance: distance,
        isWithinGeofence: isWithinGeofence,
        accuracy: location.accuracy,
        time: new Date().toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      })

      // Browser notification (if permission granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Attendance Marked!', {
          body: `${training.name} - ${new Date().toLocaleTimeString()}`,
          icon: '/icon.png'
        })
      }

    } catch (err) {
      console.error('❌ Scan processing error:', err)
      setError(err.message || 'Scan failed. Please try again.')
      setScannedOnce(false)
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }

  /* ---------------- UI COMPONENTS ---------------- */

  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-slate-700 font-bold text-lg">
          {processing && !scanning ? 'Getting Precise GPS Location...' : 'Processing Attendance...'}
        </p>
        <p className="text-xs text-slate-500 max-w-xs">
          {processing && !scanning 
            ? 'This may take 5-15 seconds for accurate positioning. Please wait...'
            : 'Verifying your attendance...'
          }
        </p>
        {locationAttempts > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-indigo-600">
            <HiOutlineSignal className="animate-pulse" />
            <span>Improving accuracy...</span>
          </div>
        )}
      </div>
    </div>
  )

  const InitialView = () => (
    <div className="text-center space-y-6">
      <div className="relative">
        <HiOutlineMapPin className="text-7xl text-indigo-400 mx-auto animate-bounce" />
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-indigo-200 rounded-full blur-sm"></div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-800">Start Attendance Check</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          We'll get your precise GPS location first, then open the camera to scan the QR code.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
        <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
          <HiOutlineSignal className="text-lg" />
          Location Tips:
        </p>
        <ul className="text-xs text-amber-700 space-y-1 ml-6 list-disc">
          <li>Move to an open area if indoors</li>
          <li>Enable GPS/High-Accuracy mode</li>
          <li>Allow precise location permission</li>
          <li>Wait 10-15 seconds for best accuracy</li>
        </ul>
      </div>
      
      <button
        onClick={prepareScanner}
        disabled={processing}
        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <HiOutlineCamera className="text-2xl" /> 
        {processing ? 'Getting Location...' : 'Get Location & Scan QR'}
      </button>
    </div>
  )

  const SuccessResult = ({ result }) => (
    <div className="text-center space-y-6 p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-300 shadow-lg">
      <div className="relative">
        <HiOutlineCheckCircle className="text-7xl text-emerald-600 mx-auto animate-bounce" />
        <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
      </div>
      
      <h2 className="text-3xl font-black text-emerald-800">
        Attendance Marked! ✓
      </h2>
      
      <div className="bg-white p-5 rounded-xl text-left space-y-3 border-2 border-emerald-200 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Training</p>
          <p className="font-bold text-lg text-indigo-600">{result.trainingName}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Check-in Time</p>
            <p className="text-sm font-bold text-slate-700">{result.time}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Distance</p>
            <p className={`text-sm font-bold ${result.isWithinGeofence ? 'text-emerald-600' : 'text-rose-600'}`}>
              {Math.round(result.distance)}m away
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-lg">
          <p className="text-xs font-bold text-emerald-700">Location Status</p>
          <p className={`text-xs font-bold px-3 py-1 rounded-full ${
            result.isWithinGeofence 
              ? 'bg-emerald-200 text-emerald-800' 
              : 'bg-rose-200 text-rose-800'
          }`}>
            {result.isWithinGeofence ? 'Valid ✅' : 'Out of Range ⚠️'}
          </p>
        </div>

        {result.accuracy && (
          <p className="text-xs text-slate-500 text-center pt-2 border-t">
            GPS Accuracy: ±{Math.round(result.accuracy)}m
          </p>
        )}
      </div>

      <Link 
        href="/dashboard" 
        className="w-full flex items-center justify-center gap-2 text-indigo-600 font-bold py-3 rounded-xl bg-white border-2 border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
      >
        <HiOutlineArrowLeft /> Back to Dashboard
      </Link>
    </div>
  )

  const ErrorResult = ({ message }) => (
    <div className="text-center space-y-6 p-6 bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl border-2 border-rose-300 shadow-lg">
      <div className="relative">
        <HiOutlineXCircle className="text-7xl text-rose-600 mx-auto" />
      </div>
      
      <h2 className="text-3xl font-black text-rose-800">Check-in Failed</h2>
      
      <div className="text-rose-700 bg-white p-5 rounded-xl border-2 border-rose-200 text-left shadow-sm">
        {message.split('\n').map((line, i) => (
          <p key={i} className={`${i > 0 ? 'text-sm mt-2 ml-2' : 'font-semibold'} ${line.startsWith('•') ? 'ml-4' : ''}`}>
            {line}
          </p>
        ))}
      </div>
      
      <div className="space-y-3">
        <button
          onClick={prepareScanner}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95"
        >
          <HiOutlineCamera className="text-2xl" /> Try Again
        </button>

        <Link 
          href="/dashboard" 
          className="w-full flex items-center justify-center gap-2 text-slate-600 font-bold py-3 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <HiOutlineArrowLeft /> Back to Dashboard
        </Link>
      </div>
    </div>
  )

  /* ---------------- MAIN RENDER ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 font-sans flex items-center justify-center">
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl shadow-slate-300/50">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 mb-2">
            Attendance Scanner
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto"></div>
        </div>
        
        {/* Loading/Processing State */}
        {processing && <LoadingSpinner />}
        
        {/* Error State */}
        {error && !processing && !scanning && <ErrorResult message={error} />}

        {/* Initial State */}
        {!scanning && !processing && !result && !error && <InitialView />}

        {/* Scanning State */}
        {scanning && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-slate-700">
                Scan Training QR Code
              </p>
              <p className="text-sm text-slate-500">
                Align the QR code within the frame below
              </p>
            </div>
            
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-xl">
              <Scanner
                onScan={(res) => {
                  if (res && res.length > 0 && res[0].rawValue) {
                    handleScan({ text: res[0].rawValue })
                  }
                }}
                onError={(err) => {
                  console.error('📷 Scanner error:', err)
                }}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' },
                }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white rounded-2xl shadow-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl"></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setScanning(false)
                setScannedOnce(false)
                setLocation(null)
              }}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-200 active:scale-95"
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