'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { 
  HiOutlineUser, 
  HiOutlineCalendar, 
  HiOutlineCheckCircle, 
  HiOutlineMapPin, 
  HiOutlineAcademicCap,
  HiOutlineQrCode
} from 'react-icons/hi2'

export default function TraineeDashboard() {
  const [user, setUser] = useState(null)
  const [trainee, setTrainee] = useState(null)
  const [trainings, setTrainings] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

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
    await fetchTraineeData(user.id)
  }

  const fetchTraineeData = async (userId) => {
    try {
      // FIXED: Use maybeSingle() to handle missing trainee properly
      const { data: traineeData, error: traineeError } = await supabase
        .from('trainees')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (traineeError) {
        console.error('Trainee fetch error:', traineeError)
        throw traineeError
      }

      if (!traineeData) {
        setError('Trainee profile not found. Please contact your administrator.')
        setLoading(false)
        return
      }

      setTrainee(traineeData)

      // Get enrolled trainings
      const { data: enrollments, error: enrollError } = await supabase
        .from('training_enrollments')
        .select(`
          *,
          trainings (*)
        `)
        .eq('trainee_id', traineeData.id)
        .eq('is_active', true)

      if (enrollError) {
        console.error('Enrollments fetch error:', enrollError)
        throw enrollError
      }

      // FIXED: Filter out null trainings and handle properly
      const trainingsList = (enrollments || [])
        .filter(e => e.trainings) // Remove null trainings
        .map(e => e.trainings)
      
      setTrainings(trainingsList)

      // Get today's attendance
      const today = formatDate(new Date())
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          trainings (name)
        `)
        .eq('trainee_id', traineeData.id)
        .eq('date', today)

      if (attendanceError) {
        console.error('Attendance fetch error:', attendanceError)
        // Don't throw - just log, attendance might be empty
      }

      setTodayAttendance(attendanceData || [])

    } catch (error) {
      console.error('Error fetching trainee data:', error)
      setError('Error loading dashboard: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Error state - trainee not found
  if (error || !trainee) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Profile Not Found</h2>
          <p className="text-slate-600 mb-6">
            {error || 'Your trainee profile has not been created yet. Please contact your administrator to set up your account.'}
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-100 rounded-full">
              <HiOutlineUser className="w-6 h-6 text-teal-600"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Welcome, {trainee.name}!</h1>
              <p className="text-slate-500 text-sm">{trainee.designation}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/scan-qr"
            className="flex items-center justify-center gap-3 p-6 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all transform hover:scale-[1.01] text-center font-extrabold text-xl"
          >
            <HiOutlineQrCode className="w-8 h-8"/> SCAN QR CODE
          </Link>
          
          <Link
            href="/attendance-history"
            className="flex items-center justify-center gap-3 p-6 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-[1.01] text-center font-extrabold text-xl"
          >
            <HiOutlineCalendar className="w-8 h-8"/> HISTORY
          </Link>
        </div>

        {/* TODAY'S ATTENDANCE STATUS */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <HiOutlineCheckCircle className="text-teal-600 w-6 h-6"/> Today's Status ({formatDate(new Date())})
          </h2>
          
          {todayAttendance.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg p-4 flex items-center justify-between">
              <p className="text-yellow-800 font-semibold">
                ⚠️ Attendance not marked for any training today.
              </p>
              <Link
                href="/scan-qr"
                className="text-yellow-600 hover:text-yellow-700 font-medium text-sm transition-colors flex items-center gap-1"
              >
                Go to Scan <HiOutlineQrCode className="w-4 h-4"/>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAttendance.map(record => (
                <div key={record.id} className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HiOutlineCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0"/>
                    <div>
                      <p className="font-semibold text-green-800">
                        {record.trainings?.name || 'Unknown Training'}
                      </p>
                      <p className="text-sm text-green-600">
                        Check-in: {new Date(record.check_in_time).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                    Present
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY TRAININGS */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <HiOutlineAcademicCap className="text-indigo-600 w-6 h-6"/> Enrolled Trainings
          </h2>
          
          {trainings.length === 0 ? (
            <div className="text-slate-500 p-4 bg-slate-50 rounded-lg text-center">
              <p className="mb-2">You are not enrolled in any active trainings yet.</p>
              <p className="text-sm">Please contact your administrator to enroll in trainings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainings.map(training => {
                const isMarkedToday = todayAttendance.some(a => a.training_id === training.id)
                
                return (
                  <div key={training.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-lg transition flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">{training.name}</h3>
                      <p className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                        <HiOutlineMapPin className="w-4 h-4 text-indigo-400"/> {training.location_name}
                      </p>
                      <p className="text-sm text-slate-600 mb-4 flex items-center gap-1">
                        <HiOutlineCalendar className="w-4 h-4 text-indigo-400"/> {training.start_date} to {training.end_date}
                      </p>
                    </div>
                    
                    {isMarkedToday ? (
                      <div className="mt-3 bg-green-100 text-green-700 text-center py-2 rounded-lg font-bold text-sm">
                        ✓ Attendance Marked
                      </div>
                    ) : (
                      <Link
                        href="/scan-qr"
                        className="mt-3 block w-full bg-teal-500 text-white text-center py-2 rounded-lg hover:bg-teal-600 font-bold text-sm transition"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <HiOutlineQrCode className="w-5 h-5"/> Mark Attendance
                        </span>
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* PROFILE CARD */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <HiOutlineUser className="text-purple-600 w-6 h-6"/> Your Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem label="Full Name" value={trainee.name} />
            <DetailItem label="Email" value={trainee.email} />
            <DetailItem label="Phone" value={trainee.phone || 'N/A'} />
            <DetailItem label="Designation" value={trainee.designation} />
            <DetailItem label="Posting Location" value={trainee.posting_location || 'N/A'} />
          </div>
        </div>
        
      </div>
    </div>
  )
}

const DetailItem = ({ label, value }) => (
  <div>
    <span className="text-sm font-medium text-slate-500">{label}</span>
    <p className="text-lg font-semibold text-slate-800">{value}</p>
  </div>
)