'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// Import icons for professional design
import { 
  HiOutlineChevronLeft, 
  HiOutlineCalendar, 
  HiOutlineCheckCircle, 
  HiOutlineMapPin,
  HiOutlineXCircle,
  HiOutlineClock
} from 'react-icons/hi2'

export default function AttendanceHistory() {
  const [trainee, setTrainee] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
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

    // Get trainee info
    const { data: traineeData } = await supabase
      .from('trainees')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setTrainee(traineeData)
    
    if (traineeData) {
      fetchAttendance(traineeData.id)
    }
  }

  const fetchAttendance = async (traineeId) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          trainings (name, location_name)
        `)
        .eq('trainee_id', traineeId)
        .order('date', { ascending: false })

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics outside the render loop
  const totalDays = attendance.length
  const validLocationCount = attendance.filter(a => a.is_within_geofence).length
  const outOfRangeCount = totalDays - validLocationCount

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-700 flex items-center gap-3">
            <HiOutlineCalendar className="w-7 h-7"/> Attendance History
          </h1>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-semibold transition-colors"
          >
            <HiOutlineChevronLeft className="w-5 h-5"/> Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* --- STATS CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <StatCard 
            title="Total Days Present" 
            value={totalDays} 
            color="text-indigo-600"
            icon={HiOutlineCalendar}
            bg="bg-indigo-50"
          />
          
          <StatCard 
            title="Valid Location Check-ins" 
            value={validLocationCount} 
            color="text-green-600"
            icon={HiOutlineCheckCircle}
            bg="bg-green-50"
          />
          
          <StatCard 
            title="Out of Range Check-ins" 
            value={outOfRangeCount} 
            color="text-red-600"
            icon={HiOutlineXCircle}
            bg="bg-red-50"
          />

        </div>

        {/* --- ATTENDANCE LIST (Table) --- */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <h2 className="px-6 py-4 text-xl font-bold text-slate-800 border-b">
             Detailed Records
          </h2>
          {attendance.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <HiOutlineCalendar className="w-12 h-12 mx-auto text-slate-300 mb-4"/>
              <p className="text-lg font-semibold">No attendance records found.</p>
              <p className="text-sm">Start marking your attendance via QR code scan!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeader title="Date"/>
                    <TableHeader title="Training Program"/>
                    <TableHeader title="Check-in Time"/>
                    <TableHeader title="Distance"/>
                    <TableHeader title="Status"/>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {attendance.map((record) => (
                    <AttendanceRow key={record.id} record={record} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Helper Components for Cleanliness ---

const TableHeader = ({ title }) => (
    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
    </th>
)

const AttendanceRow = ({ record }) => {
    const isWithinGeofence = record.is_within_geofence
    
    return (
        <tr className="hover:bg-slate-50 transition-colors">
            {/* Date */}
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                {new Date(record.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                })}
            </td>
            
            {/* Training */}
            <td className="px-6 py-4">
                <div className="flex flex-col">
                    <div className="font-semibold text-slate-800">{record.trainings.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                        <HiOutlineMapPin className="w-3 h-3"/> {record.trainings.location_name}
                    </div>
                </div>
            </td>
            
            {/* Check-in Time */}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 flex items-center gap-2">
                <HiOutlineClock className="w-4 h-4 text-indigo-400"/>
                {new Date(record.check_in_time).toLocaleTimeString()}
            </td>
            
            {/* Distance */}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {record.distance_meters ? `${record.distance_meters}m` : 'N/A'}
            </td>
            
            {/* Status */}
            <td className="px-6 py-4 whitespace-nowrap">
                {isWithinGeofence ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
                        <HiOutlineCheckCircle className="w-4 h-4"/> Valid
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">
                        <HiOutlineXCircle className="w-4 h-4"/> Out of Range
                    </span>
                )}
            </td>
        </tr>
    )
}

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 border border-slate-100 flex items-center justify-between transition-transform hover:scale-[1.01]`}>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h2 className={`text-4xl font-extrabold mt-1 ${color}`}>{value}</h2>
        </div>
        <div className={`p-3 rounded-full ${bg}`}>
            <Icon className={`w-8 h-8 ${color}`} />
        </div>
    </div>
)