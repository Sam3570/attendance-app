'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
// Importing your preferred icon library
import { 
  HiOutlineMail, 
  HiOutlineLockClosed, 
  HiOutlineArrowLeft, 
  HiOutlineShieldCheck 
} from "react-icons/hi"

export default function TraineeLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const { data: traineeData, error: traineeError } = await supabase
        .from('trainees')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (traineeError || !traineeData) {
        await supabase.auth.signOut()
        throw new Error('Account not found. Please contact admin.')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full border border-gray-100">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            {/* Using your requested icon here */}
            <HiOutlineShieldCheck className="w-12 h-12 text-[#5a4cf4]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Trainee Login</h1>
          <p className="text-gray-500 text-sm mt-1">Please enter your credentials.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-[#1e293b] text-sm font-bold mb-2">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <HiOutlineMail className="w-5 h-5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#ebf2ff] border-none rounded-xl text-gray-900 font-semibold focus:ring-2 focus:ring-indigo-400 outline-none transition-all placeholder:text-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[#1e293b] text-sm font-bold mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <HiOutlineLockClosed className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#ebf2ff] border-none rounded-xl text-gray-900 font-semibold focus:ring-2 focus:ring-indigo-400 outline-none transition-all placeholder:text-gray-400"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5a4cf4] hover:bg-[#4a3ee0] text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center text-[#5a4cf4] font-bold text-sm hover:underline">
            <HiOutlineArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}