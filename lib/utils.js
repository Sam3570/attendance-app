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

// ---------------- LOCATION WITH ACCURACY VALIDATION ----------------
export function getCurrentLocation(minAccuracy = 100, maxWaitTime = 15000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by your browser'))
      return
    }

    let attempts = 0
    let bestPosition = null
    let watchId = null
    let timeoutId = null

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }

    const checkPosition = (position) => {
      attempts++
      const accuracy = position.coords.accuracy

      console.log(`📍 Location attempt ${attempts}: accuracy ${Math.round(accuracy)}m`, {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: accuracy
      })

      // Keep the best position we've seen
      if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
        bestPosition = position
        console.log(`🎯 New best position: ${Math.round(accuracy)}m accuracy`)
      }

      // If we have good accuracy, resolve immediately
      if (accuracy <= minAccuracy) {
        console.log('✅ Excellent accuracy achieved:', Math.round(accuracy), 'm')
        cleanup()
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed
        })
        return
      }

      // After 3 attempts with reasonable accuracy, use best available
      if (attempts >= 3 && bestPosition && bestPosition.coords.accuracy < 500) {
        console.log('⚠️ Using best available after 3 attempts:', Math.round(bestPosition.coords.accuracy), 'm')
        cleanup()
        resolve({
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
          altitude: bestPosition.coords.altitude,
          speed: bestPosition.coords.speed
        })
      }
    }

    const handleError = (error) => {
      cleanup()
      console.error('❌ Geolocation error:', error)
      
      const errorMessage = 
        error.code === 1 
          ? 'Location permission denied. Please enable location access in your browser settings.' 
        : error.code === 2 
          ? 'Location unavailable. Please ensure GPS/Location Services are enabled on your device.' 
        : 'Location request timed out. Please try again in an open area with clear sky view.'
      
      reject(new Error(errorMessage))
    }

    // Use watchPosition for continuous updates
    watchId = navigator.geolocation.watchPosition(
      checkPosition,
      handleError,
      {
        enableHighAccuracy: true, // Force GPS usage
        timeout: 10000,
        maximumAge: 2000 // Allow 2s cache as fallback
      }
    )

    // Absolute maximum timeout
    timeoutId = setTimeout(() => {
      if (bestPosition) {
        const finalAccuracy = Math.round(bestPosition.coords.accuracy)
        console.log(`⏱️ Timeout reached (${maxWaitTime}ms), using best position: ${finalAccuracy}m accuracy`)
        cleanup()
        resolve({
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
          altitude: bestPosition.coords.altitude,
          speed: bestPosition.coords.speed
        })
      } else {
        cleanup()
        reject(new Error('Could not get location within time limit. Please ensure location services are enabled and try again.'))
      }
    }, maxWaitTime)
  })
}

// ---------------- VALIDATE LOCATION ACCURACY ----------------
export function validateLocationAccuracy(accuracy, maxAccuracy = 200) {
  if (accuracy > maxAccuracy) {
    return {
      valid: false,
      message: `Location accuracy is ${Math.round(accuracy)}m. Please:\n• Move to an open area with clear sky view\n• Ensure GPS is enabled on your device\n• Grant high-accuracy location permission\n• Wait a few seconds and try again`
    }
  }
  return { valid: true }
}