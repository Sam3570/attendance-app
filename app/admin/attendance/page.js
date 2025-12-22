'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { 
  HiOutlineArrowLeft, 
  HiOutlineDownload, 
  HiOutlineClipboardCheck, 
  HiOutlineLocationMarker, 
  HiOutlineExclamationCircle,
  HiOutlineCalendar,
  HiOutlineAcademicCap
} from 'react-icons/hi'

const INDIGO = '#6366F1'
const EMERALD = '#10B981'
const ROSE = '#F43F5E'

export default function AttendanceView() {
  const router = useRouter()

  const [trainings, setTrainings] = useState([])
  const [selectedTraining, setSelectedTraining] = useState('')
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchTrainings()
  }, [])

  useEffect(() => {
    if (selectedTraining) fetchAttendance()
  }, [selectedTraining, selectedDate])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchTrainings = async () => {
    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTrainings(data)
      if (data.length > 0) setSelectedTraining(data[0].id)
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          trainees (
            name,
            email,
            phone,
            posting_location
          )
        `)
        .eq('training_id', selectedTraining)
        .eq('date', selectedDate)
        .order('check_in_time', { ascending: true })

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (attendance.length === 0) {
      alert('No data to export')
      return
    }
    const headers = ['Name', 'Email', 'Phone', 'Posting Location', 'Check-in Time', 'Distance (m)', 'Status']
    const rows = attendance.map(record => [
      record.trainees.name,
      record.trainees.email,
      record.trainees.phone || 'N/A',
      record.trainees.posting_location || 'N/A',
      new Date(record.check_in_time).toLocaleString(),
      record.distance_meters,
      record.is_within_geofence ? 'Valid' : 'Out of Range'
    ])
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${selectedDate}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Attendance Records</h1>
            <span className="text-slate-400 text-sm font-medium">company.com</span>
          </div>
          <Link href="/admin/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">
            <HiOutlineArrowLeft /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* FILTERS CARD */}
        <section className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-600 ml-1">Select Training</label>
              <select
                value={selectedTraining}
                onChange={(e) => setSelectedTraining(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none transition-all"
              >
                {trainings.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-600 ml-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-100 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <HiOutlineDownload className="text-xl" /> Export CSV
              </button>
            </div>
          </div>
        </section>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Present" count={attendance.length} icon={<HiOutlineClipboardCheck />} color="indigo" />
          <StatCard label="Valid Location" count={attendance.filter(a => a.is_within_geofence).length} icon={<HiOutlineLocationMarker />} color="emerald" />
          <StatCard label="Out of Range" count={attendance.filter(a => !a.is_within_geofence).length} icon={<HiOutlineExclamationCircle />} color="rose" />
        </div>

        {/* TABLE SECTION */}
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Trainee Check-ins</h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Fetching records...</p>
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-20">
                <HiOutlineCalendar className="text-5xl text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No attendance records found for this date</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] uppercase tracking-[0.15em] font-black">
                    <th className="px-8 py-5">Trainee Details</th>
                    <th className="px-8 py-5">Posting Location</th>
                    <th className="px-8 py-5">Check-in Time</th>
                    <th className="px-8 py-5 text-center">Distance</th>
                    <th className="px-8 py-5 text-right">Geofence Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{record.trainees.name}</div>
                        <div className="text-xs text-slate-400 font-medium">{record.trainees.email}</div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                            {record.trainees.posting_location || 'Not Specified'}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600">
                        {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="px-8 py-5 text-center font-mono text-sm font-bold text-slate-500">
                        {record.distance_meters}m
                      </td>
                      <td className="px-8 py-5 text-right">
                        {record.is_within_geofence ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-black uppercase">
                            <div className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse"></div>
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-black uppercase">
                             <div className="w-1 h-1 rounded-full bg-rose-600"></div>
                             Out of Range
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

/* ---------------- UI HELPERS ---------------- */

const StatCard = ({ label, count, icon, color }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600'
  }
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
      <div className={`p-4 rounded-xl text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-3xl font-black text-slate-800">{count}</div>
        <div className="text-sm font-semibold text-slate-400 uppercase tracking-tight">{label}</div>
      </div>
    </div>
  )
}