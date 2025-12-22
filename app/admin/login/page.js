"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HiOutlineShieldCheck } from "react-icons/hi"

// Icons
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowLeft } from "react-icons/hi"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", data.user?.id)
        .single()

      if (adminError || !adminData) {
        await supabase.auth.signOut()
        throw new Error("You are not authorized as admin")
      }

      router.push("/admin/dashboard")
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-[Inter]">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-8">

        <h1 className="text-2xl font-bold text-gray-800 text-center flex justify-center items-center gap-2">
    <HiOutlineShieldCheck className="text-indigo-600 text-3xl" />
    Admin Login
    </h1>
        <p className="text-gray-500 text-sm mt-1 text-center">
          Please enter your credentials.
        </p>

        {error && (
          <div className="mt-4 mb-4 rounded-md bg-red-50 border border-red-300 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 mt-6">

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>

            <div className="relative mt-2">
              <HiOutlineMail className="absolute left-3 top-3 text-gray-500 text-xl" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@company.com"
                className="pl-11 w-full border border-gray-300 rounded-lg px-4 py-3 
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-[#121212]"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>

            <div className="relative mt-2">
              <HiOutlineLockClosed className="absolute left-3 top-3 text-gray-500 text-xl" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="pl-11 w-full border border-gray-300 rounded-lg px-4 py-3 
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-[#121212]"
              />
            </div>
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>

        {/* BACK TO HOME */}
        <div className="mt-6 text-center flex justify-center items-center gap-1">
          <HiOutlineArrowLeft className="text-indigo-600 text-lg" />
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  )
}
