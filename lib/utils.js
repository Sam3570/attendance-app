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

// ---------------- LOCATION WITH COMPREHENSIVE ERROR HANDLING ----------------
export function getCurrentLocation(minAccuracy = 100, maxWaitTime = 15000) {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari.'))
      return
    }

    // Check if we're in a secure context (HTTPS or localhost)
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn('⚠️ Geolocation requires HTTPS. Current protocol:', window.location.protocol)
    }

    let attempts = 0
    let bestPosition = null
    let watchId = null
    let timeoutId = null
    let hasResolved = false

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

    const checkPosition = (position) => {
      if (hasResolved) return
      
      attempts++
      const accuracy = position.coords.accuracy

      console.log(`📍 Location attempt ${attempts}:`, {
        lat: position.coords.latitude.toFixed(6),
        lon: position.coords.longitude.toFixed(6),
        accuracy: Math.round(accuracy) + 'm',
        timestamp: new Date(position.timestamp).toLocaleTimeString()
      })

      // Keep the best position
      if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
        bestPosition = position
        console.log(`🎯 New best accuracy: ${Math.round(accuracy)}m`)
      }

      // If we have excellent accuracy, resolve immediately
      if (accuracy <= minAccuracy) {
        console.log('✅ Excellent accuracy achieved:', Math.round(accuracy), 'm')
        resolveWithPosition(position)
        return
      }

      // After 3 attempts with reasonable accuracy, use best available
      if (attempts >= 3 && bestPosition && bestPosition.coords.accuracy < 500) {
        console.log('⚠️ Using best available after 3 attempts:', Math.round(bestPosition.coords.accuracy), 'm')
        resolveWithPosition(bestPosition)
      }
    }

    const handleError = (error) => {
      if (hasResolved) return
      
      console.error('❌ Geolocation error:', {
        code: error?.code,
        message: error?.message,
        type: typeof error,
        error: error
      })
      
      let errorMessage = 'Unable to get your location. '

      // Handle error codes
      if (error && error.code) {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location permission denied.\n\nPlease:\n• Allow location access when prompted\n• Check browser settings\n• Enable location services on your device'
            break
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location unavailable.\n\nPlease:\n• Enable GPS/Location Services\n• Move to an open area\n• Check network connection\n• Try again in a few moments'
            break
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out.\n\nPlease:\n• Ensure GPS is enabled\n• Move to an area with clear sky view\n• Wait a moment and try again'
            break
          default:
            errorMessage = 'Unknown location error occurred.\n\nPlease:\n• Check browser permissions\n• Enable location services\n• Try again'
        }
      } else {
        // No error code - might be a different issue
        errorMessage = 'Location service error.\n\nPlease:\n• Grant location permission\n• Enable GPS/Location Services\n• Use HTTPS connection\n• Try a different browser'
      }

      rejectWithError(errorMessage)
    }

    console.log('🚀 Starting location watch with options:', {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000
    })

    try {
      // Use watchPosition for continuous updates
      watchId = navigator.geolocation.watchPosition(
        checkPosition,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 2000
        }
      )

      console.log('👁️ Watch ID:', watchId)

      // Absolute maximum timeout
      timeoutId = setTimeout(() => {
        if (hasResolved) return

        if (bestPosition) {
          const finalAccuracy = Math.round(bestPosition.coords.accuracy)
          console.log(`⏱️ Max timeout (${maxWaitTime}ms) reached. Using best position: ${finalAccuracy}m`)
          resolveWithPosition(bestPosition)
        } else {
          console.error('⏱️ Timeout with no position data')
          rejectWithError(
            'Could not get location within time limit.\n\nPlease:\n• Ensure location services are enabled\n• Grant high-accuracy permission\n• Move to an open area\n• Wait 10-15 seconds and try again'
          )
        }
      }, maxWaitTime)

    } catch (err) {
      console.error('❌ Exception in getCurrentLocation:', err)
      rejectWithError('Failed to start location service. Please check browser permissions and try again.')
    }
  })
}

// ---------------- VALIDATE LOCATION ACCURACY ----------------
export function validateLocationAccuracy(accuracy, maxAccuracy = 200) {
  if (accuracy > maxAccuracy) {
    return {
      valid: false,
      message: `Location accuracy is ${Math.round(accuracy)}m (requires <${maxAccuracy}m).\n\nTo improve accuracy:\n• Move to an open outdoor area\n• Wait 10-15 seconds for GPS lock\n• Enable High-Accuracy mode\n• Ensure GPS is enabled on device`
    }
  }
  return { valid: true }
}

// ---------------- CHECK GEOLOCATION SUPPORT ----------------
export function checkGeolocationSupport() {
  const isSupported = 'geolocation' in navigator
  const isSecureContext = typeof window !== 'undefined' && 
    (window.isSecureContext || window.location.hostname === 'localhost')
  
  return {
    supported: isSupported,
    secureContext: isSecureContext,
    available: isSupported && isSecureContext
  }
}