"use client"

import React, { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { ProtectedRoute } from "../../../components/auth/protected-route"
import Link from "next/link"
import { MapPin, Building2, Users, ChevronRight, ChevronDown, Edit2, Save, X, Plus, Settings, Trash2, User, Mail, Phone, QrCode, ArrowUpDown, ArrowUp, ArrowDown, Filter, Eye, EyeOff } from "lucide-react"

interface Distributor {
  id: string
  name: string
  isActive: boolean
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
  }
  _count: {
    locations: number
  }
}

interface DistributorDetails {
  id: string
  name: string
  isActive: boolean
  contactPerson?: string
  email?: string
  telephone?: string
  notes?: string
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
  }
  locations: {
    id: string
    name: string
    isActive: boolean
    createdAt: string
    contactPerson: string | null
    email: string | null
    telephone: string | null
    notes: string | null
    user: {
      id: string
      name: string | null
      email: string | null
      isActive: boolean
      createdAt: string
    } | null
    _count: {
      sellers: number
    }
    sellers: {
      id: string
      name: string | null
      email: string | null
      isActive: boolean
      role: string
      createdAt: string
      sellerConfigs: {
        sendMethod: string
        defaultGuests: number
        defaultDays: number
        fixedPrice: number
      } | null
    }[]
  }[]
  _count: {
    locations: number
  }
}

const getNavItems = (userRole: string) => {
  if (userRole === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard", icon: Building2 },
      { href: "/admin/distributors", label: "Distributors", icon: Users },
      { href: "/admin/locations", label: "Locations", icon: MapPin },
      { href: "/admin/sellers", label: "Sellers", icon: Users },
      { href: "/admin/qr-config", label: "QR Config", icon: QrCode },
    ]
  }
  return []
}

export default function DistributorsPage() {
  const { data: session } = useSession()
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedDistributor, setExpandedDistributor] = useState<string | null>(null)
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null)
  const [distributorDetails, setDistributorDetails] = useState<{ [key: string]: DistributorDetails }>({})
  const [loadingDetails, setLoadingDetails] = useState<{ [key: string]: boolean }>({})
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc') // Default A to Z
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all') // Default show all
  
  // Edit mode states
  const [editingDistributor, setEditingDistributor] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    password: "",
    alternativeEmail: "",
    telephone: "",
    notes: ""
  })
  const [locationEditFormData, setLocationEditFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    telephone: "",
    notes: ""
  })
  const [isUpdating, setIsUpdating] = useState(false)

  // Modal states for adding locations and sellers
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showSellerModal, setShowSellerModal] = useState(false)
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  
  // Location form data
  const [locationFormData, setLocationFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    password: "",
    telephone: "",
    notes: ""
  })
  
  // Seller form data
  const [sellerFormData, setSellerFormData] = useState({
    name: "",
    email: "",
    password: "",
    // QR Configuration
    sendMethod: "URL",
    landingPageRequired: true,
    allowCustomGuestsDays: false,
    defaultGuests: 2,
    defaultDays: 3,
    pricingType: "FIXED",
    fixedPrice: 0,
    sendRebuyEmail: false
  })
  
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)
  const [isCreatingSeller, setIsCreatingSeller] = useState(false)

  const navItems = getNavItems(session?.user?.role || "")

  useEffect(() => {
    fetchDistributors()
  }, [])

  const fetchDistributors = async () => {
    try {
      const response = await fetch("/api/admin/distributors")
      if (response.ok) {
        const data = await response.json()
        setDistributors(data)
      } else {
        setError("Failed to fetch distributors")
      }
    } catch (error) {
      setError("Error fetching distributors")
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributorDetails = async (distributorId: string, forceRefresh: boolean = false) => {
    if (distributorDetails[distributorId] && !forceRefresh) return // Already fetched, unless forcing refresh

    setLoadingDetails(prev => ({ ...prev, [distributorId]: true }))
    try {
      const response = await fetch(`/api/admin/distributors/${distributorId}`)
      if (response.ok) {
        const data = await response.json()
        setDistributorDetails(prev => ({ ...prev, [distributorId]: data }))
      } else {
        setError("Failed to fetch distributor details")
      }
    } catch (error) {
      setError("Error fetching distributor details")
    } finally {
      setLoadingDetails(prev => ({ ...prev, [distributorId]: false }))
    }
  }

  const handleDistributorClick = async (distributorId: string) => {
    if (expandedDistributor === distributorId) {
      setExpandedDistributor(null)
      setExpandedLocation(null)
      setSelectedSeller(null)
    } else {
      setExpandedDistributor(distributorId)
      setExpandedLocation(null)
      setSelectedSeller(null)
      if (!distributorDetails[distributorId]) {
        await fetchDistributorDetails(distributorId)
      }
    }
  }

  const handleLocationClick = (locationId: string) => {
    if (expandedLocation === locationId) {
      setExpandedLocation(null)
      setSelectedSeller(null)
    } else {
      setExpandedLocation(locationId)
      setSelectedSeller(null)
    }
  }

  const handleSellerClick = (sellerId: string) => {
    if (selectedSeller === sellerId) {
      setSelectedSeller(null)
    } else {
      setSelectedSeller(sellerId)
    }
  }

  const handleEditClick = (distributor: Distributor, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingDistributor(distributor.id)
    
    // Pre-populate form with current distributor data
    const details = distributorDetails[distributor.id]
    setEditFormData({
      name: distributor.name,
      contactPerson: details?.contactPerson || "",
      email: distributor.user.email,
      password: "",  // Always start with empty password
      alternativeEmail: details?.email || "",
      telephone: details?.telephone || "",
      notes: details?.notes || ""
    })
  }

  const handleCancelEdit = () => {
    setEditingDistributor(null)
    setEditFormData({
      name: "",
      contactPerson: "",
      email: "",
      password: "",
      alternativeEmail: "",
      telephone: "",
      notes: ""
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDistributor) return

    setIsUpdating(true)
    try {
      const updateData = {
        ...editFormData,
        // Only include password if it's not empty
        ...(editFormData.password ? { password: editFormData.password } : {})
      }

      const response = await fetch(`/api/admin/distributors/${editingDistributor}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        // Refresh the distributors list and details
        await fetchDistributors()
        await fetchDistributorDetails(editingDistributor)
        setEditingDistributor(null)
        setError("")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update distributor")
      }
    } catch (error) {
      setError("Error updating distributor")
    } finally {
      setIsUpdating(false)
    }
  }

  // Location edit handlers
  const handleEditLocationClick = (location: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLocation(location.id)
    
    // Pre-populate form with current location data
    setLocationEditFormData({
      name: location.name,
      contactPerson: location.contactPerson || location.user?.name || "",
      email: location.email || location.user?.email || "",
      telephone: location.telephone || "",
      notes: location.notes || ""
    })
  }

  const handleCancelLocationEdit = () => {
    setEditingLocation(null)
    setLocationEditFormData({
      name: "",
      contactPerson: "",
      email: "",
      telephone: "",
      notes: ""
    })
  }

  const handleSaveLocationEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLocation) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/locations/${editingLocation}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationEditFormData),
      })

      if (response.ok) {
        // Refresh the distributors list and details
        await fetchDistributors()
        // Refresh the specific distributor details that contains this location
        const distributorId = Object.keys(distributorDetails).find(distId => 
          distributorDetails[distId]?.locations?.some(loc => loc.id === editingLocation)
        )
        if (distributorId) {
          await fetchDistributorDetails(distributorId)
        }
        setEditingLocation(null)
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error updating location:", error)
      alert("Failed to update location")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDistributorId) return

    setIsCreatingLocation(true)
    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...locationFormData,
          distributorId: selectedDistributorId
        })
      })

      if (response.ok) {
        // Reset form and close modal
        setLocationFormData({ name: "", contactPerson: "", email: "", password: "", telephone: "", notes: "" })
        setShowLocationModal(false)
        setSelectedDistributorId(null)
        
        // Refresh both the distributors list and details
        await fetchDistributors()
        if (expandedDistributor) {
          await fetchDistributorDetails(expandedDistributor)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to create location")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setIsCreatingLocation(false)
    }
  }

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocationId) return

    setIsCreatingSeller(true)
    try {
      const response = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sellerFormData,
          locationId: selectedLocationId
        })
      })

      if (response.ok) {
        // Reset form and close modal
        setSellerFormData({ name: "", email: "", password: "", sendMethod: "URL", landingPageRequired: true, allowCustomGuestsDays: false, defaultGuests: 2, defaultDays: 3, pricingType: "FIXED", fixedPrice: 0, sendRebuyEmail: false })
        setShowSellerModal(false)
        setSelectedLocationId(null)
        setSelectedDistributorId(null)
        
        // Refresh distributor details and main list
        await fetchDistributors()
        if (expandedDistributor) {
          await fetchDistributorDetails(expandedDistributor)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to create seller")
      }
    } catch (error) {
      setError("Network error occurred")
    } finally {
      setIsCreatingSeller(false)
    }
  }

  // Status toggle handlers
  const toggleDistributorStatus = async (distributorId: string, e: React.MouseEvent) => {
    console.log("🔥 DISTRIBUTOR TOGGLE CLICKED:", distributorId)
    e.stopPropagation()
    try {
      console.log("🚀 Making API call to:", `/api/admin/distributors/${distributorId}/toggle-status`)
      const response = await fetch(`/api/admin/distributors/${distributorId}/toggle-status`, {
        method: "PATCH",
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Distributor toggle response OK - New status:", result.isActive)
        
        // Force immediate refresh of all data
        console.log("🔄 Refreshing distributors list...")
        await fetchDistributors()
        
        // Force refresh the specific distributor details (bypass cache)
        console.log("🔄 Refreshing distributor details for:", distributorId)
        await fetchDistributorDetails(distributorId, true)
        
        // Also refresh all other expanded distributors to ensure UI consistency
        const expandedIds = Object.keys(distributorDetails)
        for (const id of expandedIds) {
          if (id !== distributorId) {
            console.log("🔄 Refreshing additional distributor:", id)
            await fetchDistributorDetails(id, true)
          }
        }
        
        console.log("✅ All distributor data refreshed successfully")
      } else {
        const errorData = await response.json()
        console.error("❌ Distributor toggle failed:", errorData)
        setError(`Failed to toggle distributor status: ${errorData.error}`)
      }
    } catch (error) {
      console.error("💥 Distributor toggle error:", error)
      setError("Error toggling distributor status")
    }
  }

  const toggleLocationStatus = async (locationId: string, e: React.MouseEvent) => {
    console.log("🔥 LOCATION TOGGLE CLICKED:", locationId)
    e.stopPropagation()
    
    // Find the distributor that contains this location
    const distributorId = Object.keys(distributorDetails).find(distId => 
      distributorDetails[distId]?.locations?.some(loc => loc.id === locationId)
    )
    
    if (distributorId) {
      const distributor = distributors.find(d => d.id === distributorId)
      const location = distributorDetails[distributorId]?.locations?.find(loc => loc.id === locationId)
      
      // 🔒 HIERARCHICAL LOCK: If distributor is inactive, can't activate location
      if (distributor && !distributor.isActive && location && !location.isActive) {
        console.log("🔒 BLOCKED: Cannot activate location - distributor is inactive")
        setError("Cannot activate location: distributor must be active first")
        return
      }
    }
    
    try {
      console.log("🚀 Making API call to:", `/api/admin/locations/${locationId}/toggle-status`)
      const response = await fetch(`/api/admin/locations/${locationId}/toggle-status`, {
        method: "PATCH",
      })

      if (response.ok) {
        console.log("✅ Location toggle response OK")
        const result = await response.json()
        console.log("✅ Location toggle response OK - New status:", result.isActive)
        
        // Force immediate refresh of all data
        console.log("🔄 Refreshing distributors list...")
        await fetchDistributors()
        
        // Find and refresh the specific distributor details that contains this location
        const distributorId = Object.keys(distributorDetails).find(distId => 
          distributorDetails[distId]?.locations?.some(loc => loc.id === locationId)
        )
        
        if (distributorId) {
          console.log("🔄 Refreshing distributor details for:", distributorId)
          await fetchDistributorDetails(distributorId, true)
        }
        
        // Also refresh all expanded distributors to ensure UI consistency
        const expandedIds = Object.keys(distributorDetails)
        for (const id of expandedIds) {
          if (id !== distributorId) {
            console.log("🔄 Refreshing additional distributor:", id)
            await fetchDistributorDetails(id, true)
          }
        }
        
        console.log("✅ All data refreshed successfully")
      } else {
        const errorData = await response.json()
        console.error("❌ Location toggle failed:", errorData)
        setError(`Failed to toggle location status: ${errorData.error}`)
      }
    } catch (error) {
      console.error("💥 Location toggle error:", error)
      setError("Error toggling location status")
    }
  }

  const toggleSellerStatus = async (sellerId: string, e: React.MouseEvent) => {
    console.log("🔥 SELLER TOGGLE CLICKED:", sellerId)
    e.stopPropagation()
    
    // Find the distributor and location that contains this seller
    let distributorId: string | undefined
    let locationId: string | undefined
    let distributor: any
    let location: any
    let seller: any
    
    for (const distId of Object.keys(distributorDetails)) {
      const distDetails = distributorDetails[distId]
      if (distDetails?.locations) {
        for (const loc of distDetails.locations) {
          const foundSeller = loc.sellers.find(s => s.id === sellerId)
          if (foundSeller) {
            distributorId = distId
            locationId = loc.id
            distributor = distributors.find(d => d.id === distId)
            location = loc
            seller = foundSeller
            break
          }
        }
        if (distributorId) break
      }
    }
    
    if (distributorId && locationId && distributor && location && seller) {
      // 🔒 HIERARCHICAL LOCK: If distributor is inactive, can't activate seller
      if (!distributor.isActive && !seller.isActive) {
        console.log("🔒 BLOCKED: Cannot activate seller - distributor is inactive")
        setError("Cannot activate seller: distributor must be active first")
        return
      }
      
      // 🔒 HIERARCHICAL LOCK: If location is inactive, can't activate seller
      if (!location.isActive && !seller.isActive) {
        console.log("🔒 BLOCKED: Cannot activate seller - location is inactive")
        setError("Cannot activate seller: location must be active first")
        return
      }
    }
    
    try {
      console.log("🚀 Making API call to:", `/api/admin/sellers/${sellerId}/toggle-status`)
      const response = await fetch(`/api/admin/sellers/${sellerId}/toggle-status`, {
        method: "PATCH",
      })

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Seller toggle response OK - New status:", result.isActive)
        
        // Force immediate refresh of all data
        console.log("🔄 Refreshing distributors list...")
        await fetchDistributors()
        
        // Find and force refresh the specific distributor details that contains this seller's location
        const distributorId = Object.keys(distributorDetails).find(distId => 
          distributorDetails[distId]?.locations?.some(loc => 
            loc.sellers.some(seller => seller.id === sellerId)
          )
        )
        
        if (distributorId) {
          console.log("🔄 Force refreshing distributor details for:", distributorId)
          await fetchDistributorDetails(distributorId, true)
        }
        
        // Also refresh all other expanded distributors to ensure UI consistency
        const expandedIds = Object.keys(distributorDetails)
        for (const id of expandedIds) {
          if (id !== distributorId) {
            console.log("🔄 Refreshing additional distributor:", id)
            await fetchDistributorDetails(id, true)
          }
        }
        
        console.log("✅ All seller data refreshed successfully")
      } else {
        const errorData = await response.json()
        console.error("❌ Seller toggle failed:", errorData)
        setError(`Failed to toggle seller status: ${errorData.error}`)
      }
    } catch (error) {
      console.error("💥 Seller toggle error:", error)
      setError("Error toggling seller status")
    }
  }

  // Sorting functions
  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handleStatusFilter = () => {
    if (statusFilter === 'all') {
      setStatusFilter('active')
    } else if (statusFilter === 'active') {
      setStatusFilter('inactive')
    } else {
      setStatusFilter('all')
    }
  }

  const sortedDistributors = [...distributors].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.name.localeCompare(b.name)
    } else {
      return b.name.localeCompare(a.name)
    }
  })

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-orange-400 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
                <div className="flex space-x-4">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-orange-100 hover:text-white hover:bg-orange-500"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-orange-100">Welcome, {session?.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Distributor Management</h2>
                <Link
                  href="/admin/distributors/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Add New Distributor
                </Link>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {/* Distributors Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-4 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Distributors</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button 
                            onClick={handleSort}
                            className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                          >
                            <span>Distributor Name</span>
                            {sortOrder === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Person
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telephone
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Locations
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button 
                            onClick={handleStatusFilter}
                            className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                          >
                            <span>Status</span>
                            {statusFilter === 'all' ? (
                              <Filter className="h-3 w-3" />
                            ) : statusFilter === 'active' ? (
                              <Eye className="h-3 w-3 text-green-600" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-red-600" />
                            )}
                            <span className="text-xs ml-1">
                              ({statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Inactive'})
                            </span>
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedDistributors.filter(distributor => {
                        if (statusFilter === 'all') return true
                        if (statusFilter === 'active') return distributor.isActive
                        if (statusFilter === 'inactive') return !distributor.isActive
                        return true
                      }).map((distributor, index) => (
                        <React.Fragment key={distributor.id}>
                          <tr 
                            key={distributor.id} 
                            className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            onClick={() => handleDistributorClick(distributor.id)}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Building2 className="h-4 w-4" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{distributor.name}</div>
                                  <div className="text-sm text-gray-500">ID: {distributor.id.slice(-8)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {distributorDetails[distributor.id]?.contactPerson || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{distributor.user.email}</div>
                              <div className="text-sm text-gray-500">
                                {distributorDetails[distributor.id]?.email && 
                                  `Alt: ${distributorDetails[distributor.id]?.email}`
                                }
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {distributorDetails[distributor.id]?.telephone || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                  {distributorDetails[distributor.id]?._count?.locations} location{distributorDetails[distributor.id]?._count?.locations !== 1 ? 's' : ''}
                                </span>
                                <div className="text-blue-600 hover:text-blue-800">
                                  {expandedDistributor === distributor.id ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <button 
                                onClick={(e) => toggleDistributorStatus(distributor.id, e)}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${distributor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                              >
                                <div className={`w-1.5 h-1.5 ${distributor.isActive ? 'bg-green-600' : 'bg-red-600'} rounded-full mr-1.5`}></div>
                                {distributor.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => handleEditClick(distributor, e)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => toggleDistributorStatus(distributor.id, e)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <span className="sr-only">Toggle Status</span>
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Edit Row */}
                          {editingDistributor === distributor.id && (
                            <tr>
                              <td colSpan={8} className="px-0 py-0">
                                <div className="bg-blue-50 border-l-4 border-blue-400">
                                  <form onSubmit={handleSaveEdit} className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-md font-semibold text-gray-900">Edit Distributor</h4>
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <X className="w-5 h-5" />
                                      </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Distributor Name *
                                        </label>
                                        <input
                                          type="text"
                                          value={editFormData.name}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          required
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Contact Person
                                        </label>
                                        <input
                                          type="text"
                                          value={editFormData.contactPerson}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Primary Email *
                                        </label>
                                        <input
                                          type="email"
                                          value={editFormData.email}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          required
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Alternative Email
                                        </label>
                                        <input
                                          type="email"
                                          value={editFormData.alternativeEmail}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, alternativeEmail: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Telephone
                                        </label>
                                        <input
                                          type="tel"
                                          value={editFormData.telephone}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, telephone: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          placeholder="Phone number"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Password (optional)
                                        </label>
                                        <input
                                          type="password"
                                          value={editFormData.password}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          placeholder="New password"
                                        />
                                      </div>

                                      <div className="md:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Notes
                                        </label>
                                        <textarea
                                          value={editFormData.notes}
                                          onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                                          rows={2}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                          placeholder="Additional notes..."
                                        />
                                      </div>
                                    </div>

                                    <div className="flex justify-end space-x-3 mt-4">
                                      <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                      >
                                        {isUpdating ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Saving...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-4 h-4" />
                                            <span>Save</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Locations Dropdown */}
                          {expandedDistributor === distributor.id && (
                            <tr>
                              <td colSpan={8} className="bg-orange-50 border-t">
                                <div className="px-4 py-3">
                                  {loadingDetails[distributor.id] ? (
                                    <div className="text-center py-6">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                                      <p className="text-sm text-gray-500 mt-2">Loading locations...</p>
                                    </div>
                                  ) : distributorDetails[distributor.id] ? (
                                    <>
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                                          <Building2 className="w-4 h-4 text-orange-600 mr-2" />
                                          Locations ({distributorDetails[distributor.id]?._count?.locations || 0})
                                        </h4>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDistributorId(distributor.id);
                                            setShowLocationModal(true);
                                          }}
                                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-orange-600 hover:bg-orange-700"
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Add Location
                                        </button>
                                      </div>
                                      
                                      {distributorDetails[distributor.id].locations && distributorDetails[distributor.id].locations.length > 0 ? (
                                        <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
                                          <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-orange-100">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location Name</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telephone</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sellers</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                              {distributorDetails[distributor.id].locations.map((location) => (
                                                <React.Fragment key={location.id}>
                                                  <tr 
                                                    className="hover:bg-orange-50 cursor-pointer"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleLocationClick(location.id);
                                                    }}
                                                  >
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                      <div className="flex items-center">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                                                          <span className="text-sm font-medium text-orange-600">
                                                            {location.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                          </span>
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-900">{location.name}</div>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                      {location.contactPerson || location.user?.name || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                      {location.email || location.user?.email || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                      {location.telephone || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {location._count.sellers} seller{location._count.sellers !== 1 ? 's' : ''}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                      <button 
                                                        onClick={(e) => {
                                                          console.log("🔥 LOCATION BUTTON CLICKED! ID:", location.id, "Current Status:", location.isActive)
                                                          toggleLocationStatus(location.id, e)
                                                        }}
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${location.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                      >
                                                        <div className={`w-1.5 h-1.5 ${location.isActive ? 'bg-green-600' : 'bg-red-600'} rounded-full mr-1.5`}></div>
                                                        {location.isActive ? 'Active' : 'Inactive'}
                                                      </button>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                      <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditLocationClick(location, e);
                                                          }}
                                                          className="text-orange-600 hover:text-orange-800 p-1"
                                                          title="Edit Location"
                                                        >
                                                          <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLocationClick(location.id);
                                                          }}
                                                          className="text-orange-600 hover:text-orange-800 p-1"
                                                          title="View Sellers"
                                                        >
                                                          {expandedLocation === location.id ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                          ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                          )}
                                                        </button>
                                                        <button
                                                          onClick={(e) => toggleLocationStatus(location.id, e)}
                                                          className="text-gray-400 hover:text-gray-600"
                                                        >
                                                          <span className="sr-only">Toggle Status</span>
                                                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                          </svg>
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>

                                                  {/* Location Edit Form */}
                                                  {editingLocation === location.id && (
                                                    <tr>
                                                      <td colSpan={7} className="px-0 py-0">
                                                        <div className="bg-orange-50 border-l-4 border-orange-400">
                                                          <form onSubmit={handleSaveLocationEdit} className="p-6">
                                                            <div className="flex items-center justify-between mb-4">
                                                              <h4 className="text-md font-semibold text-gray-900">Edit Location</h4>
                                                              <button
                                                                type="button"
                                                                onClick={handleCancelLocationEdit}
                                                                className="text-gray-400 hover:text-gray-600"
                                                              >
                                                                <X className="w-5 h-5" />
                                                              </button>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                              <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                  Location Name *
                                                                </label>
                                                                <input
                                                                  type="text"
                                                                  value={locationEditFormData.name}
                                                                  onChange={(e) => setLocationEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                                  required
                                                                />
                                                              </div>

                                                              <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                  Contact Person
                                                                </label>
                                                                <input
                                                                  type="text"
                                                                  value={locationEditFormData.contactPerson}
                                                                  onChange={(e) => setLocationEditFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                                                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                                />
                                                              </div>

                                                              <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                  Email
                                                                </label>
                                                                <input
                                                                  type="email"
                                                                  value={locationEditFormData.email}
                                                                  onChange={(e) => setLocationEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                                />
                                                              </div>

                                                              <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                  Telephone
                                                                </label>
                                                                <input
                                                                  type="tel"
                                                                  value={locationEditFormData.telephone}
                                                                  onChange={(e) => setLocationEditFormData(prev => ({ ...prev, telephone: e.target.value }))}
                                                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                                />
                                                              </div>
                                                            </div>

                                                            <div className="mt-4">
                                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Notes
                                                              </label>
                                                              <textarea
                                                                value={locationEditFormData.notes}
                                                                onChange={(e) => setLocationEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                                rows={3}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                                                placeholder="Additional notes..."
                                                              />
                                                            </div>

                                                            <div className="flex justify-end space-x-3 mt-6">
                                                              <button
                                                                type="button"
                                                                onClick={handleCancelLocationEdit}
                                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                                              >
                                                                Cancel
                                                              </button>
                                                              <button
                                                                type="submit"
                                                                disabled={isUpdating}
                                                                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50"
                                                              >
                                                                {isUpdating ? "Updating..." : "Update Location"}
                                                              </button>
                                                            </div>
                                                          </form>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}

                                                  {/* Sellers Dropdown */}
                                                  {expandedLocation === location.id && (
                                                    <tr>
                                                      <td colSpan={7} className="bg-green-50 border-t">
                                                        <div className="px-4 py-3">
                                                          <div className="flex items-center justify-between mb-3">
                                                            <h5 className="text-sm font-semibold text-gray-900 flex items-center">
                                                              <Users className="w-4 h-4 text-green-600 mr-2" />
                                                              Sellers ({location.sellers.length})
                                                            </h5>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedLocationId(location.id);
                                                                setShowSellerModal(true);
                                                              }}
                                                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                                                            >
                                                              <Plus className="w-3 h-3 mr-1" />
                                                              Add Seller
                                                            </button>
                                                          </div>
                                                          
                                                          {location.sellers.length > 0 ? (
                                                            <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                                                              <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-green-100">
                                                                  <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seller Name</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telephone</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Config</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200">
                                                                  {location.sellers.map((seller) => (
                                                                    <tr key={seller.id} className="hover:bg-green-50">
                                                                      <td className="px-4 py-3 whitespace-nowrap">
                                                                        <div className="flex items-center">
                                                                          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                                                            <span className="text-sm font-medium text-green-600">
                                                                              {seller.name ? seller.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'S'}
                                                                            </span>
                                                                          </div>
                                                                          <div className="text-sm font-medium text-gray-900">{seller.name || 'Unnamed Seller'}</div>
                                                                        </div>
                                                                      </td>
                                                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                        {seller.name}
                                                                      </td>
                                                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                        {seller.email}
                                                                      </td>
                                                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                        —
                                                                      </td>
                                                                      <td className="px-4 py-3 whitespace-nowrap">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                          seller.sellerConfigs 
                                                                            ? 'bg-blue-100 text-blue-800' 
                                                                            : 'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                          {seller.sellerConfigs ? 'Configured' : 'Pending Setup'}
                                                                        </span>
                                                                      </td>
                                                                      <td className="px-4 py-3 whitespace-nowrap">
                                                                        <button 
                                                                          onClick={(e) => toggleSellerStatus(seller.id, e)}
                                                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${seller.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                                        >
                                                                          <div className={`w-1.5 h-1.5 ${seller.isActive ? 'bg-green-600' : 'bg-red-600'} rounded-full mr-1.5`}></div>
                                                                          {seller.isActive ? 'Active' : 'Inactive'}
                                                                        </button>
                                                                      </td>
                                                                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                                        <div className="flex items-center justify-end space-x-2">
                                                                          <button
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              console.log('Edit seller:', seller.id);
                                                                            }}
                                                                            className="text-green-600 hover:text-green-800 p-1"
                                                                            title="Edit Seller"
                                                                          >
                                                                            <Edit2 className="w-4 h-4" />
                                                                          </button>
                                                                          <button
                                                                            onClick={(e) => {
                                                                              e.stopPropagation();
                                                                              console.log('Configure seller:', seller.id);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-800 p-1"
                                                                            title="Configure Seller"
                                                                          >
                                                                            <Settings className="w-4 h-4" />
                                                                          </button>
                                                                          <button
                                                                            onClick={(e) => toggleSellerStatus(seller.id, e)}
                                                                            className="text-gray-400 hover:text-gray-600"
                                                                          >
                                                                            <span className="sr-only">Toggle Status</span>
                                                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                            </svg>
                                                                          </button>
                                                                        </div>
                                                                      </td>
                                                                    </tr>
                                                                  ))}
                                                                </tbody>
                                                              </table>
                                                            </div>
                                                          ) : (
                                                            <div className="text-center py-4 text-gray-500 text-sm">
                                                              No sellers found for this location.
                                                            </div>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                          No locations found for this distributor.
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-red-500 text-sm">Failed to load details</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {distributors.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No distributors</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new distributor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateLocation}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center mb-4">
                    <MapPin className="w-6 h-6 text-orange-600 mr-3" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Location</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Name *
                      </label>
                      <input
                        type="text"
                        value={locationFormData.name}
                        onChange={(e) => setLocationFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                        placeholder="Enter location name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={locationFormData.contactPerson}
                        onChange={(e) => setLocationFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Contact person name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={locationFormData.email}
                        onChange={(e) => setLocationFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                        placeholder="location@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telephone
                      </label>
                      <input
                        type="tel"
                        value={locationFormData.telephone}
                        onChange={(e) => setLocationFormData(prev => ({ ...prev, telephone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={locationFormData.password}
                        onChange={(e) => setLocationFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                        placeholder="Password for location account"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={locationFormData.notes}
                        onChange={(e) => setLocationFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isCreatingLocation}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Location'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationModal(false)
                      setSelectedDistributorId(null)
                      setLocationFormData({ name: "", contactPerson: "", email: "", password: "", telephone: "", notes: "" })
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Seller Modal */}
      {showSellerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateSeller}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center mb-4">
                    <Users className="w-6 h-6 text-green-600 mr-3" />
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Seller</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Seller Details Section */}
                    <div className="border-b border-gray-200 pb-4">
                      <div className="text-md font-semibold text-gray-800 mb-3">👤 Seller Details</div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seller Name *
                          </label>
                          <input
                            type="text"
                            value={sellerFormData.name}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                            placeholder="Enter seller name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={sellerFormData.email}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                            placeholder="seller@example.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password *
                          </label>
                          <input
                            type="password"
                            value={sellerFormData.password}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                            placeholder="Password for seller account"
                          />
                        </div>
                      </div>
                    </div>

                    {/* QR Configuration Section */}
                    <div>
                      <div className="text-md font-semibold text-gray-800 mb-3">⚙️ QR Configuration</div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Send Method *
                          </label>
                          <select
                            value={sellerFormData.sendMethod}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, sendMethod: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="URL">URL</option>
                            <option value="QR Code">QR Code</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Landing Page Required *
                          </label>
                          <select
                            value={sellerFormData.landingPageRequired.toString()}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, landingPageRequired: e.target.value === 'true' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Allow Custom Guests Days *
                          </label>
                          <select
                            value={sellerFormData.allowCustomGuestsDays.toString()}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, allowCustomGuestsDays: e.target.value === 'true' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Guests *
                          </label>
                          <input
                            type="number"
                            value={sellerFormData.defaultGuests}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, defaultGuests: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Days *
                          </label>
                          <input
                            type="number"
                            value={sellerFormData.defaultDays}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, defaultDays: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pricing Type *
                          </label>
                          <select
                            value={sellerFormData.pricingType}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, pricingType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="FIXED">Fixed</option>
                            <option value="PER_GUEST">Per Guest</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fixed Price *
                          </label>
                          <input
                            type="number"
                            value={sellerFormData.fixedPrice}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, fixedPrice: parseFloat(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Send Rebuy Email *
                          </label>
                          <select
                            value={sellerFormData.sendRebuyEmail.toString()}
                            onChange={(e) => setSellerFormData(prev => ({ ...prev, sendRebuyEmail: e.target.value === 'true' }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isCreatingSeller}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingSeller ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Seller'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSellerModal(false)
                      setSelectedLocationId(null)
                      setSelectedDistributorId(null)
                      setSellerFormData({ name: "", email: "", password: "", sendMethod: "URL", landingPageRequired: true, allowCustomGuestsDays: false, defaultGuests: 2, defaultDays: 3, pricingType: "FIXED", fixedPrice: 0, sendRebuyEmail: false })
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
