// ---------------- DISTANCE (HAVERSINE) ----------------
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // meters (DO NOT round here)
}

// ---------------- TOKEN ----------------
export function generateToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

// ---------------- DATE ----------------
export function formatDate(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().split('T')[0]
}

// ---------------- LOCATION (CRITICAL FIX) ----------------
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, // 🔥 THIS FIXES 5km ISSUE
          altitude: position.coords.altitude,
          speed: position.coords.speed
        })
      },
      (error) => {
        reject(
          new Error(
            error.code === 1
              ? 'Location permission denied'
              : 'Unable to fetch location'
          )
        )
      },
      {
        enableHighAccuracy: true, // 🔥 force GPS
        timeout: 20000,
        maximumAge: 0             // 🔥 no cached IP location
      }
    )
  })
}
