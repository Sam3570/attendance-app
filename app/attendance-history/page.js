'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  HiOutlineChevronLeft, 
  HiOutlineCalendar, 
  HiOutlineCheckCircle, 
  HiOutlineMapPin,
  HiOutlineClock
} from 'react-icons/hi2'

export default function AttendanceHistory() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    restoreSession()
  }, [])

  /* ---------------- SESSION + TRAINEE ---------------- */
  const restoreSession = async () => {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      router.push('/login')
      return
    }

    const user = data.session.user

    const { data: traineeData } = await supabase
      .from('trainees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!traineeData) {
      router.push('/dashboard')
      return
    }

    fetchAttendance(traineeData.id)
  }

  /* ---------------- FETCH ATTENDANCE ---------------- */
  const fetchAttendance = async (traineeId) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          trainings (name, location_name)
        `)
        .eq('trainee_id', traineeId)
        .order('check_in_time', { ascending: false })

      if (error) throw error
      setAttendance(data || [])
    } catch (err) {
      console.error('Attendance fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- STATS ---------------- */
  const totalDays = attendance.length
  const validLocationCount = attendance.length // geo removed
  const outOfRangeCount = 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-700 flex items-center gap-2">
            <HiOutlineCalendar className="w-7 h-7" /> Attendance History
          </h1>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-semibold"
          >
            <HiOutlineChevronLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Days Present" value={totalDays} color="text-indigo-600" />
          <StatCard title="Valid Check-ins" value={validLocationCount} color="text-green-600" />
          <StatCard title="Out of Range" value={outOfRangeCount} color="text-red-600" />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <h2 className="px-6 py-4 text-xl font-bold text-slate-800 border-b">
            Detailed Records
          </h2>

          {attendance.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <HiOutlineCalendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-semibold">No attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Header>Date</Header>
                    <Header>Training</Header>
                    <Header>Check-in Time (IST)</Header>
                    <Header>Status</Header>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attendance.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50">

                      {/* DATE */}
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(record.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Asia/Kolkata'
                        })}
                      </td>

                      {/* TRAINING */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {record.trainings?.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <HiOutlineMapPin className="w-3 h-3" />
                          {record.trainings?.location_name}
                        </div>
                      </td>

                      {/* TIME */}
                      <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-2">
                        <HiOutlineClock className="w-4 h-4 text-indigo-400" />
                        {new Date(record.check_in_time).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                          timeZone: 'Asia/Kolkata'
                        })}
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <HiOutlineCheckCircle className="w-4 h-4" /> Present
                        </span>
                      </td>

                    </tr>
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

/* ---------------- UI HELPERS ---------------- */

const Header = ({ children }) => (
  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
    {children}
  </th>
)

const StatCard = ({ title, value, color }) => (
  <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
    <p className="text-sm text-slate-500">{title}</p>
    <h2 className={`text-4xl font-extrabold mt-1 ${color}`}>{value}</h2>
  </div>
)
