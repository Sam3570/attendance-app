import Link from "next/link"
import { HiOutlineShieldCheck, HiOutlineUser, HiOutlineLocationMarker } from "react-icons/hi"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">

        {/* TITLE WITH ICON */}
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 flex items-center justify-center gap-2">
          <HiOutlineLocationMarker className="text-indigo-600 text-4xl" />
          Attendance System
        </h1>

        {/* BUTTONS */}
        <div className="space-y-4">

          {/* ADMIN LOGIN */}
          <Link
            href="/admin/login"
            className="block w-full bg-[#432DD7] text-white font-semibold py-3 px-4 rounded-lg text-center transition flex items-center justify-center gap-2"
          >
            <HiOutlineShieldCheck className="text-xl" />
            Admin Login
          </Link>

          {/* TRAINEE LOGIN */}
          <Link
            href="/login"
            className="block w-full bg-[#2dd796] text-white font-semibold py-3 px-4 rounded-lg text-center transition flex items-center justify-center gap-2"
          >
            <HiOutlineUser className="text-xl" />
            Trainee Login
          </Link>

        </div>

        {/* FOOTER TEXT */}
        <p className="text-center text-gray-600 text-sm mt-6">
          QR Code + Geofence Based Attendance Tracking
        </p>
        
      </div>
    </div>
  )
}
