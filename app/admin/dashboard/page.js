'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HiOutlineLogout,
  HiOutlineClipboardList,
  HiOutlineAcademicCap,
  HiOutlineUsers,
  HiOutlineLink,
  HiOutlinePlus,
  HiOutlineQrcode,
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiOutlineFlag,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCollection,
} from 'react-icons/hi'

const PURPLE = '#6366F1'
const GREEN = '#10B981'
const BLUE = '#0EA5E9'

export default function AdminDashboard() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [trainings, setTrainings] = useState([])
  const [trainees, setTrainees] = useState([])
  const [enrollments, setEnrollments] = useState(0)
  const [todayAttendance, setTodayAttendance] = useState(0)
  const [formMessage, setFormMessage] = useState(null) // Global message for form submissions

  const [showTraining, setShowTraining] = useState(false)
  const [showTrainee, setShowTrainee] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)

  /* ---------------- FORM STATES ---------------- */

  const [trainingForm, setTrainingForm] = useState({
    name: '',
    location_name: '',
    latitude: '',
    longitude: '',
    geofence_radius: '100',
    start_date: '',
    end_date: '',
  })

  const [traineeForm, setTraineeForm] = useState({
    name: '',
    email: '',
    phone: '',
    posting_location: '',
    password: '',
  })

  const [enrollForm, setEnrollForm] = useState({
    trainee_id: '',
    training_id: '',
  })

  /* ---------------- DATA FETCHERS (RELIABLE) ---------------- */

  // Use useCallback for stability
  const fetchTrainings = useCallback(async () => {
    const { data } = await supabase
      .from('trainings')
      .select('*')
      .order('created_at', { ascending: false })
    setTrainings(data || [])
    return data || [] // Return data for Promise.all
  }, [])

  const fetchTrainees = useCallback(async () => {
    const { data } = await supabase.from('trainees').select('*')
    setTrainees(data || [])
    return data || [] // Return data for Promise.all
  }, [])

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    const { count: enrollCount } = await supabase
      .from('training_enrollments')
      .select('*', { count: 'exact', head: true })

    const { count: attendCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)

    setEnrollments(enrollCount || 0)
    setTodayAttendance(attendCount || 0)
  }, [])

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.push('/admin/login')
        return
      }

      setUser(data.user)
      // Wait for all essential data to load
      await Promise.all([
        fetchTrainings(),
        fetchTrainees(),
        fetchStats(),
      ])
      setLoading(false)
    }

    init()
  }, [router, fetchTrainings, fetchTrainees, fetchStats]) // Added dependencies

  /* ---------------- ACTIONS ---------------- */

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTrainingForm(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
      },
      (error) => {
        alert('Unable to retrieve your location. Please ensure location permissions are enabled. Error: ' + error.message);
      }
    );
  };

  const createTraining = async (e) => {
    e.preventDefault()
    setFormMessage(null) // Clear previous messages
    
    // Validation
    if (!trainingForm.latitude || !trainingForm.longitude) {
      setFormMessage({ type: 'error', text: "Please provide or detect coordinates first." });
      return;
    }
    
    try {
      const { error } = await supabase.from('trainings').insert([{
        ...trainingForm,
        latitude: parseFloat(trainingForm.latitude),
        longitude: parseFloat(trainingForm.longitude),
        geofence_radius: parseInt(trainingForm.geofence_radius, 10),
      }])

      if (error) throw error

      // **FIX 1: Reliable Data Refresh**
      await fetchTrainings() 

      setTrainingForm({ name: '', location_name: '', latitude: '', longitude: '', geofence_radius: '100', start_date: '', end_date: '' })
      setShowTraining(false)
      setFormMessage({ type: 'success', text: "Training successfully created." });

    } catch (error) {
      console.error('Error creating training:', error)
      setFormMessage({ type: 'error', text: `Failed to create training: ${error.message}` });
    }
  }

  const createTrainee = async (e) => {
    e.preventDefault()
    setFormMessage(null)

    try {
      const response = await fetch('/api/admin/create-trainee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traineeForm),
      })
      
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create user account.')

      // **FIX 1: Reliable Data Refresh**
      await fetchTrainees()
      
      setTraineeForm({ name: '', email: '', phone: '', posting_location: '', password: '' })
      setShowTrainee(false)
      setFormMessage({ type: 'success', text: "Trainee successfully created and account initiated." });

    } catch (error) {
      console.error('Error creating trainee:', error)
      setFormMessage({ type: 'error', text: `Failed to create trainee: ${error.message}` });
    }
  }

  const enrollTrainee = async (e) => {
    e.preventDefault()
    setFormMessage(null)

    if (!enrollForm.trainee_id || !enrollForm.training_id) {
        setFormMessage({ type: 'error', text: "Please select both a Trainee and a Training." });
        return;
    }
    
    try {
      const { error } = await supabase.from('training_enrollments').insert([{
        trainee_id: enrollForm.trainee_id,
        training_id: enrollForm.training_id,
        is_active: true,
      }])

      if (error) throw error

      // **FIX 1: Reliable Data Refresh**
      await fetchStats() // Only need to refresh stats count for this action
      
      setEnrollForm({ trainee_id: '', training_id: '' })
      setShowEnroll(false)
      setFormMessage({ type: 'success', text: "Trainee successfully enrolled." });

    } catch (error) {
      console.error('Error enrolling trainee:', error)
      // Check for unique constraint violation (trainee already enrolled in training)
      if (error.code === '23505') { 
          setFormMessage({ type: 'error', text: "Enrollment failed: Trainee is already enrolled in this training." });
      } else {
          setFormMessage({ type: 'error', text: `Failed to enroll trainee: ${error.message}` });
      }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const toggleForm = (formName) => {
    setFormMessage(null); // Clear messages when toggling forms
    if (formName === 'training') {
      setShowTraining(!showTraining);
      setShowTrainee(false);
      setShowEnroll(false);
    } else if (formName === 'trainee') {
      setShowTrainee(!showTrainee);
      setShowTraining(false);
      setShowEnroll(false);
    } else if (formName === 'enroll') {
      setShowEnroll(!showEnroll);
      setShowTraining(false);
      setShowTrainee(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-semibold text-gray-500">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <span className="text-slate-400 text-sm font-medium">company.com</span>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/admin/attendance"
              className="px-5 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 transition hover:opacity-90 shadow-sm"
              style={{ background: '#4F46E5' }}>
              <HiOutlineClipboardList className="text-xl" /> Attendance View
            </Link>
            <button onClick={logout}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition">
              <HiOutlineLogout className="text-xl" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Trainees" count={trainees.length} icon={<HiOutlineUsers />} color="emerald" />
          <StatCard label="Attendance Today" count={todayAttendance} icon={<HiOutlineClipboardList />} color="sky" />
          <StatCard label="Enrollments" count={enrollments} icon={<HiOutlineLink />} color="indigo" />
        </div>

        {/* MAIN ACTION BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionBtn color={PURPLE} icon={<HiOutlinePlus />} onClick={() => toggleForm('training')}>
            Create Training
          </ActionBtn>
          <ActionBtn color={GREEN} icon={<HiOutlineUsers />} onClick={() => toggleForm('trainee')}>
            Create Trainee
          </ActionBtn>
          <ActionBtn color={BLUE} icon={<HiOutlineLink />} onClick={() => toggleForm('enroll')}>
            Enroll Trainee
          </ActionBtn>
        </div>

        {/* --- GLOBAL MESSAGE FEEDBACK --- */}
        {formMessage && (
            <div 
            className={`p-4 rounded-xl flex items-center gap-3 font-semibold transition-all animate-in fade-in duration-300 ${
                formMessage.type === 'success' 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
            >
            {formMessage.type === 'success' ? <HiOutlineCheckCircle className="w-6 h-6 flex-shrink-0"/> : <HiOutlineXCircle className="w-6 h-6 flex-shrink-0"/>}
            <p>{formMessage.text}</p>
            </div>
        )}

        {/* FORMS SECTION */}
        <div className="space-y-6">
          {showTraining && (
            <FormCard title="Create New Training">
              <form onSubmit={createTraining} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Name and Location Fields */}
                <Input label="Training Name" placeholder="e.g., Tech Workshop" value={trainingForm.name} onChange={v => setTrainingForm({ ...trainingForm, name: v })} />
                <Input label="Location Name" placeholder="e.g., Building A, Room 101" value={trainingForm.location_name} onChange={v => setTrainingForm({ ...trainingForm, location_name: v })} />
                
                {/* Geolocation Section */}
                <div className="md:col-span-2 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <HiOutlineLocationMarker className="text-xl" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Auto-Detect Coordinates</p>
                      <p className="text-xs text-slate-500">Get current GPS latitude and longitude</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Detect My Location
                  </button>
                </div>

                <Input label="Latitude" placeholder="e.g., 40.7128" value={trainingForm.latitude} onChange={v => setTrainingForm({ ...trainingForm, latitude: v })} />
                <Input label="Longitude" placeholder="e.g., -74.0060" value={trainingForm.longitude} onChange={v => setTrainingForm({ ...trainingForm, longitude: v })} />
                
                <Input label="Geofence Radius (meters)" placeholder="100" value={trainingForm.geofence_radius} onChange={v => setTrainingForm({ ...trainingForm, geofence_radius: v })} />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" label="Start Date" value={trainingForm.start_date} onChange={v => setTrainingForm({ ...trainingForm, start_date: v })} />
                  <Input type="date" label="End Date" value={trainingForm.end_date} onChange={v => setTrainingForm({ ...trainingForm, end_date: v })} />
                </div>

                <SubmitBtn color={PURPLE}>Create Training</SubmitBtn>
              </form>
            </FormCard>
          )}

          {showTrainee && (
            <FormCard title="Create New Trainee">
              <form onSubmit={createTrainee} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                <Input label="Full Name" placeholder="e.g., John Doe" value={traineeForm.name} onChange={v => setTraineeForm({ ...traineeForm, name: v })} />
                <Input label="Email Address" placeholder="e.g., john@company.com" value={traineeForm.email} onChange={v => setTraineeForm({ ...traineeForm, email: v })} />
                <Input label="Phone Number" placeholder="+1 (555) 000-0000" value={traineeForm.phone} onChange={v => setTraineeForm({ ...traineeForm, phone: v })} />
                <Input label="Posting Location" placeholder="e.g., New York Office" value={traineeForm.posting_location} onChange={v => setTraineeForm({ ...traineeForm, posting_location: v })} />
                <Input type="password" label="Initial Password" placeholder="••••••••" value={traineeForm.password} onChange={v => setTraineeForm({ ...traineeForm, password: v })} />
                <SubmitBtn color={GREEN}>Create Trainee</SubmitBtn>
              </form>
            </FormCard>
          )}

          {showEnroll && (
            <FormCard title="Enroll Trainee">
              <form onSubmit={enrollTrainee} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                <Select label="Select Trainee" value={enrollForm.trainee_id} onChange={v => setEnrollForm({ ...enrollForm, trainee_id: v })}>
                  {/* FIX 2: Ensure the first option is properly selected */}
                  {trainees.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                <Select label="Select Training" value={enrollForm.training_id} onChange={v => setEnrollForm({ ...enrollForm, training_id: v })}>
                  {/* FIX 2: Ensure the first option is properly selected */}
                  {trainings.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                {/* Submit button now correctly spans both columns if needed */}
                <div className='md:col-span-2'>
                    <SubmitBtn color={BLUE}>Enroll Trainee</SubmitBtn>
                </div>
              </form>
            </FormCard>
          )}
        </div>

          {/* TRAINING LIST */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Available Trainings</h2>
            <div className="bg-slate-200 h-px flex-grow mx-4"></div>
            <span className="text-slate-500 font-medium text-sm">{trainings.length} records found</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map(t => (
              <div key={t.id} className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{t.name}</h3>
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                    Active
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg"><HiOutlineLocationMarker className="text-slate-400" /></div>
                    <span className="truncate">{t.location_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg"><HiOutlineCalendar className="text-slate-400" /></div>
                    <span>{t.start_date} → {t.end_date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-slate-50 rounded-lg"><HiOutlineFlag className="text-slate-400" /></div>
                    <span>Geofence: {t.geofence_radius}m radius</span>
                  </div>
                </div>

                <Link href={`/admin/qr-code/${t.id}`}
                  className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-indigo-600 hover:text-white transition-all">
                  <HiOutlineQrcode className="text-xl" /> Generate QR Code
                </Link>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}

/* ---------------- UI HELPERS (Unchanged) ---------------- */

const StatCard = ({ label, count, icon, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600'
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

const ActionBtn = ({ children, onClick, color, icon }) => (
  <button onClick={onClick}
    className="py-4 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-start gap-4 shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-transform active:scale-95"
    style={{ background: color }}>
    <span className="text-2xl bg-white/20 p-2 rounded-lg">{icon}</span>
    {children}
  </button>
)

const FormCard = ({ title, children }) => (
  <section className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
    <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
      <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
      {title}
    </h2>
    {children}
  </section>
)

const Input = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-bold text-slate-600 ml-1">{label}</label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all outline-none placeholder:text-slate-300"
      required
    />
  </div>
)

const Select = ({ label, value, onChange, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-bold text-slate-600 ml-1">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none appearance-none transition-all"
      required>
      <option value="" className="text-slate-400">Select an option</option>
      {children}
    </select>
  </div>
)

const SubmitBtn = ({ children, color }) => (
  <button
    type="submit" // Ensure type is submit
    style={{ background: color }}
    className="md:col-span-2 text-white py-4 rounded-xl font-bold mt-4 shadow-lg hover:opacity-90 transition-opacity active:scale-[0.99]">
    {children}
  </button>
)