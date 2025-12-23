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

  return R * c // meters
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

// ---------------- IMPROVED LOCATION WITH PROGRESSIVE FALLBACK ----------------
export function getCurrentLocation(minAccuracy = 100, maxWaitTime = 20000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }

    let bestPosition = null
    let watchId = null
    let timeoutId = null
    let hasResolved = false
    let attemptCount = 0

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const resolveWithPosition = (position) => {
      if (hasResolved) return
      hasResolved = true
      cleanup()
      
      console.log('✅ Resolving with position:', {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy) + 'm'
      })

      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        timestamp: position.timestamp
      })
    }

    const rejectWithError = (message) => {
      if (hasResolved) return
      hasResolved = true
      cleanup()
      reject(new Error(message))
    }

    const handleSuccess = (position) => {
      if (hasResolved) return
      
      attemptCount++
      const accuracy = position.coords.accuracy

      console.log(`📍 Location reading ${attemptCount}:`, {
        accuracy: Math.round(accuracy) + 'm',
        lat: position.coords.latitude.toFixed(6),
        lon: position.coords.longitude.toFixed(6)
      })

      // Update best position
      if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
        bestPosition = position
        console.log(`🎯 New best: ${Math.round(accuracy)}m`)
      }

      // Resolve if we have good accuracy
      if (accuracy <= minAccuracy) {
        console.log('✅ Target accuracy reached!')
        resolveWithPosition(position)
        return
      }

      // After a few attempts, accept moderate accuracy
      if (attemptCount >= 2 && accuracy <= 300) {
        console.log('⚠️ Accepting moderate accuracy after multiple attempts')
        resolveWithPosition(position)
        return
      }
    }

    const handleError = (error) => {
      if (hasResolved) return

      console.error('❌ Geolocation error:', {
        code: error?.code,
        message: error?.message
      })

      // If we have any position at all, use it instead of failing
      if (bestPosition) {
        console.log('⚠️ Error occurred but using best available position')
        resolveWithPosition(bestPosition)
        return
      }

      let errorMessage = 'Unable to get location. '

      if (error?.code === 1) {
        errorMessage = 'Location permission denied.\n\nPlease allow location access and try again.'
      } else if (error?.code === 2) {
        errorMessage = 'Location unavailable.\n\nPlease:\n• Enable GPS/Location Services\n• Check network connection\n• Try again'
      } else if (error?.code === 3) {
        errorMessage = 'Location request timed out.\n\nPlease:\n• Move to an open area\n• Wait for GPS signal\n• Try again'
      } else {
        errorMessage = 'Location error.\n\nPlease enable GPS and location permissions.'
      }

      rejectWithError(errorMessage)
    }

    console.log('🚀 Starting location request...')

    // Try with watchPosition first
    try {
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 15000, // 15 second timeout per attempt
          maximumAge: 5000 // Accept 5s old position
        }
      )

      console.log('👁️ Watch started, ID:', watchId)

      // Fallback: Use getCurrentPosition in parallel as backup
      setTimeout(() => {
        if (!hasResolved && !bestPosition) {
          console.log('🔄 Trying getCurrentPosition as backup...')
          navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (err) => console.warn('Backup getCurrentPosition failed:', err),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 10000
            }
          )
        }
      }, 3000)

      // Ultimate fallback: Accept any position we got
      timeoutId = setTimeout(() => {
        if (hasResolved) return

        if (bestPosition) {
          console.log('⏱️ Max wait time reached, using best position')
          resolveWithPosition(bestPosition)
        } else {
          console.error('⏱️ No position obtained within time limit')
          rejectWithError(
            'Could not get location.\n\nPlease:\n• Ensure GPS is enabled\n• Grant location permission\n• Move to an area with clear sky\n• Try again'
          )
        }
      }, maxWaitTime)

    } catch (err) {
      console.error('❌ Failed to start location watch:', err)
      rejectWithError('Failed to access location. Please check permissions.')
    }
  })
}

// ---------------- VALIDATE LOCATION ACCURACY ----------------
export function validateLocationAccuracy(accuracy, maxAccuracy = 300) {
  // More lenient: accept up to 300m
  if (accuracy > maxAccuracy) {
    return {
      valid: false,
      message: `Location accuracy is ${Math.round(accuracy)}m.\n\nFor better accuracy:\n• Move outdoors to open area\n• Wait 10-15 seconds\n• Ensure GPS is enabled\n\nCurrent accuracy may affect distance calculation.`
    }
  }
  
  if (accuracy > 150) {
    return {
      valid: true,
      warning: `Moderate accuracy: ${Math.round(accuracy)}m. Distance readings may vary.`
    }
  }
  
  return { valid: true }
}

// ---------------- CHECK GEOLOCATION SUPPORT ----------------
export function checkGeolocationSupport() {
  const isSupported = 'geolocation' in navigator
  const isSecureContext = typeof window !== 'undefined' && 
    (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  
  return {
    supported: isSupported,
    secureContext: isSecureContext,
    available: isSupported && isSecureContext
  }
}