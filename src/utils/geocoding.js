/**
 * Fetches the postal code (Código Postal) from coordinates using OpenStreetMap Nominatim reverse geocoding API.
 * @param {number|string} lat - Latitude
 * @param {number|string} lng - Longitude
 * @returns {Promise<string>} - The 5-digit postal code, or empty string if not found/error.
 */
export async function getPostcodeFromCoords(lat, lng) {
  if (!lat || !lng) return ''
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'AcaenDgo-App'
      }
    })
    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`)
    }
    const data = await response.json()
    if (data && data.address) {
      const postcode = data.address.postcode || ''
      // Ensure it's clean and matches standard MX format if possible (usually 5 digits, sometimes contains suffix or is shorter)
      const match = postcode.match(/\d{5}/)
      return match ? match[0] : postcode
    }
  } catch (err) {
    console.error('Error fetching reverse geocoding:', err)
  }
  return ''
}
