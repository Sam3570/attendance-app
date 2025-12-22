// "use client"
// import { useState } from "react"
// import { supabase } from "@/lib/supabase"
// import { useRouter } from "next/navigation"
// import Link from "next/link"
// import { HiOutlineUser } from "react-icons/hi"

// // Icons
// import { HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowLeft } from "react-icons/hi"

// export default function AdminLogin() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState("")
//   const router = useRouter()

//   const handleLogin = async (e) => {
//     e.preventDefault()
//     setLoading(true)
//     setError("")

//     try {
//       const { data, error: signInError } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       })

//       if (signInError) throw signInError

//       const { data: adminData, error: adminError } = await supabase
//         .from("admin_users")
//         .select("*")
//         .eq("user_id", data.user?.id)
//         .single()

//       if (adminError || !adminData) {
//         await supabase.auth.signOut()
//         throw new Error("You are not authorized as admin")
//       }

//       router.push("/admin/dashboard")
//     } catch (err) {
//       setError(err.message || "Something went wrong")
//     } finally {
//       setLoading(false)
//     }
//   }

//   const accent = "#2DD796"

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-[Inter]">
//       <div
//         className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8"
//         style={{ boxShadow: "0 8px 30px rgba(45,215,150,0.12)" }}
//       >
//         <div className="flex flex-col items-center">
//           <div
//             className="p-3 rounded-full mb-3"
//             style={{ backgroundColor: `${accent}20` /* light translucent circle */ }}
//           >
//             <HiOutlineUser className="text-3xl" style={{ color: accent }} />
//           </div>

//           <h1 className="text-2xl font-semibold text-gray-800">Trainee Login</h1>
//           <p className="text-gray-500 text-sm mt-1 text-center">
//             Please enter your credentials.
//           </p>
//         </div>

//         {error && (
//           <div className="mt-4 mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleLogin} className="space-y-4 mt-6">

//           {/* EMAIL */}
//           <div>
//             <label className="text-sm font-medium text-gray-700">Email</label>

//             <div className="relative mt-3">
//               <div className="absolute left-3 top-3">
//                 <HiOutlineMail className="text-xl" style={{ color: "#9CA3AF" }} />
//               </div>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 placeholder="admin@company.com"
//                 className="pl-11 w-full border rounded-xl px-4 py-3 
//                   bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 text-[#121212]"
//                 style={{
//                   boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
//                   borderColor: "#E6E9EE",
//                 }}
//               />
//             </div>
//           </div>

//           {/* PASSWORD */}
//           <div>
//             <label className="text-sm font-medium text-gray-700">Password</label>

//             <div className="relative mt-3">
//               <div className="absolute left-3 top-3">
//                 <HiOutlineLockClosed className="text-xl" style={{ color: "#9CA3AF" }} />
//               </div>
//               <input
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//                 placeholder="Enter your password"
//                 className="pl-11 w-full border rounded-xl px-4 py-3 
//                   bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 text-[#121212]"
//                 style={{
//                   boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
//                   borderColor: "#E6E9EE",
//                 }}
//               />
//             </div>
//           </div>

//           {/* LOGIN BUTTON */}
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full text-white py-3 rounded-xl transition disabled:opacity-60"
//             style={{
//               background: `linear-gradient(90deg, ${accent}, #20b37a)`,
//               boxShadow: "0 6px 18px rgba(45,215,150,0.28)",
//             }}
//             aria-busy={loading}
//           >
//             {loading ? "Logging in..." : "Sign In"}
//           </button>
//         </form>

//         {/* BACK TO HOME */}
//         <div className="mt-6 text-center flex justify-center items-center gap-2">
//   <HiOutlineArrowLeft className="text-lg" style={{ color: accent }} />
//   <Link
//     href="/"
//     className="text-sm font-medium hover:underline"
//     style={{ color: accent }}
//   >
//     Back to Home
//   </Link>
// </div>

//         {/* small footer help text */}
//         <div className="mt-6 text-xs text-center text-gray-400">
//           Forgot your password? <span className="text-gray-500">Contact support</span>
//         </div>
//       </div>
//     </div>
//   )
// }


'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      // Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Check if user is a trainee (not admin)
      const { data: traineeData, error: traineeError } = await supabase
        .from('trainees')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (traineeError || !traineeData) {
        await supabase.auth.signOut()
        throw new Error('Account not found. Please contact admin.')
      }

      // Redirect to trainee dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            👤 Trainee Login
          </h1>
          <p className="text-gray-600 mt-2">Access your attendance portal</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="trainee@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-green-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}