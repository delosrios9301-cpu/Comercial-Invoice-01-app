"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileDown, Plus, Trash2, LogOut, Settings, CalendarIcon, Users } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const FIXED_TOTAL_VALUE = 5
const FIXED_PACKAGES = 1
const FIXED_WEIGHT = 20

interface SampleRow {
  description: string
  qty: number
}

interface Study {
  id: string
  name: string
  protocol: string
  shipper_address: string
  consignee_address: string | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  sede_id: string
  is_admin: boolean
  can_edit: boolean
}

// Meses en espanol para el PDF
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

export default function CommercialInvoiceForm() {
  const router = useRouter()
  const supabase = createClient()
  
  // User and sede state
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Data from database
  const [studies, setStudies] = useState<Study[]>([])
  const [sampleDescriptions, setSampleDescriptions] = useState<string[]>([])
  
  // Selected items
  const [selectedStudyId, setSelectedStudyId] = useState<string>("")
  
  // Date states with Calendar
  const [exportDate, setExportDate] = useState<Date>(new Date())
  const [signDate, setSignDate] = useState<Date>(new Date())

  const [formData, setFormData] = useState({
    awb: "",
    shipper: "",
    consignee: "",
    destination: "USA",
    protocol: "",
    marks: "1",
    shippername: "",
    shipmentTemp: "dryice" as "ambient" | "dryice",
  })

  const [samples, setSamples] = useState<SampleRow[]>([
    { description: "HUMAN BLOOD", qty: 0 },
  ])

  // Fetch user profile and data
  const fetchUserAndData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push("/auth/login")
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (profile) {
        setUser(profile)
        setFormData(prev => ({ ...prev, shippername: profile.full_name || "" }))

        // Get user's assigned sedes
        const { data: userSedes } = await supabase
          .from("user_sedes")
          .select("sede_id")
          .eq("user_id", authUser.id)

        const sedeIds = userSedes?.map(us => us.sede_id) || []

        // If admin, fetch all studies; otherwise fetch from assigned sedes
        let studiesQuery = supabase.from("studies").select("*")
        
        if (!profile.is_admin && sedeIds.length > 0) {
          studiesQuery = studiesQuery.in("sede_id", sedeIds)
        }

        const { data: studiesData } = await studiesQuery

        if (studiesData && studiesData.length > 0) {
          setStudies(studiesData)
          setSelectedStudyId(studiesData[0].id)
          setFormData(prev => ({
            ...prev,
            shipper: studiesData[0].shipper_address,
            consignee: studiesData[0].consignee_address || "",
            protocol: studiesData[0].protocol,
          }))
        }

        // Fetch sample descriptions from assigned sedes
        let samplesQuery = supabase.from("sample_descriptions").select("description")
        
        if (!profile.is_admin && sedeIds.length > 0) {
          samplesQuery = samplesQuery.in("sede_id", sedeIds)
        }

        const { data: samplesData } = await samplesQuery

        if (samplesData && samplesData.length > 0) {
          const descriptions = [...new Set(samplesData.map(s => s.description))]
          setSampleDescriptions(descriptions)
          setSamples([{ description: descriptions[0], qty: 0 }])
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchUserAndData()
  }, [fetchUserAndData])

  // Format date for PDF (DD MMM YYYY)
  const formatDateForPDF = (date: Date) => {
    const day = date.getDate()
    const month = MONTHS[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  // Handle study change - auto update shipper, consignee and protocol
  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId)
    const study = studies.find(s => s.id === studyId)
    if (study) {
      setFormData(prev => ({
        ...prev,
        shipper: study.shipper_address,
        consignee: study.consignee_address || "",
        protocol: study.protocol,
      }))
    }
  }

  // Calculate ML/gm for a single row - SWAB/HISOPADO multiplies by 3
  const calculateMl = (sample: SampleRow): number => {
    const name = sample.description.toLowerCase()
    if (name.includes("nasal") || name.includes("swab") || name.includes("hisopado")) {
      return sample.qty * 3
    }
    return sample.qty
  }

  // Calculate totals
  const totalQty = samples.reduce((acc, item) => acc + Number(item.qty), 0)
  const totalMl = samples.reduce((acc, item) => acc + calculateMl(item), 0)
  const unitValue = totalQty > 0 ? FIXED_TOTAL_VALUE / totalQty : 0

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleTempChange = (value: "ambient" | "dryice") => {
    setFormData({
      ...formData,
      shipmentTemp: value,
    })
  }

  const updateSample = (index: number, field: keyof SampleRow, value: string | number) => {
    const newSamples = [...samples]
    if (field === "qty") {
      newSamples[index][field] = Number(value)
    } else {
      newSamples[index][field] = String(value)
    }
    setSamples(newSamples)
  }

  const addSample = () => {
    const defaultDesc = sampleDescriptions[0] || "NEW SAMPLE"
    setSamples([...samples, { description: defaultDesc, qty: 0 }])
  }

  const removeSample = (index: number) => {
    if (samples.length > 1) {
      setSamples(samples.filter((_, i) => i !== index))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    })

    const pageWidth = 215.9
    const margin = 10
    const contentWidth = pageWidth - margin * 2

    const get = (field: keyof typeof formData) => formData[field] || ""
    
    // Get formatted dates
    const exportDateStr = formatDateForPDF(exportDate)
    const signDateStr = formatDateForPDF(signDate)

    const selectedStudy = studies.find(s => s.id === selectedStudyId)

    doc.setFont("courier", "normal")
    doc.setFontSize(8)
    doc.setLineWidth(0.2)

    // Date and AWB labels
    doc.text("Date of Exportation:", margin, 12)
    doc.text("Air Way Bill No:", margin + contentWidth / 2, 12)

    // Date and AWB values
    doc.text(exportDateStr, margin, 18)
    doc.text(String(get("awb")), margin + contentWidth / 2, 18)

    // Shipper and Consignee boxes
    const boxTop = 22
    const boxHeight = 42
    const halfWidth = contentWidth / 2 - 2

    doc.rect(margin, boxTop, halfWidth, boxHeight)
    doc.rect(margin + halfWidth + 4, boxTop, halfWidth, boxHeight)

    doc.setFont("courier", "bold")
    doc.setFontSize(7)
    doc.text("Shipper/Exporter:", margin + 2, boxTop + 5)
    doc.text("CONSIGNEE:", margin + halfWidth + 6, boxTop + 5)

    doc.setFont("courier", "normal")
    doc.setFontSize(7)

    const shipperLines = doc.splitTextToSize(String(get("shipper")), halfWidth - 4)
    const consigneeLines = doc.splitTextToSize(String(get("consignee")), halfWidth - 4)

    doc.text(shipperLines, margin + 2, boxTop + 11)
    doc.text(consigneeLines, margin + halfWidth + 6, boxTop + 11)

    // Destination and Protocol boxes
    const destTop = boxTop + boxHeight
    const destHeight = 12

    doc.rect(margin, destTop, halfWidth, destHeight)
    doc.rect(margin + halfWidth + 4, destTop, halfWidth, destHeight)

    doc.setFont("courier", "bold")
    doc.text("COUNTRY OF FINAL DESTINATION:", margin + 2, destTop + 5)
    doc.text("EXPORT REFERENCES/PROTOCOL:", margin + halfWidth + 6, destTop + 5)

    doc.setFont("courier", "normal")
    doc.text(String(get("destination")), margin + 2, destTop + 10)
    doc.text(String(get("protocol")), margin + halfWidth + 6, destTop + 10)

    // Main description table
    const tableTop = destTop + destHeight
    const tableHeight = 108

    doc.rect(margin, tableTop, contentWidth, tableHeight)

    // Column positions
    const col1 = margin
    const col2 = margin + 12
    const col3 = margin + 28
    const col4 = margin + 125
    const col5 = margin + 145
    const col6 = margin + 160
    const col7 = margin + 178

    // Vertical lines
    doc.line(col2, tableTop, col2, tableTop + tableHeight)
    doc.line(col3, tableTop, col3, tableTop + tableHeight)
    doc.line(col4, tableTop, col4, tableTop + tableHeight)
    doc.line(col5, tableTop, col5, tableTop + tableHeight)
    doc.line(col6, tableTop, col6, tableTop + tableHeight)
    doc.line(col7, tableTop, col7, tableTop + tableHeight)

    // Header row line
    const headerRowHeight = 12
    doc.line(margin, tableTop + headerRowHeight, margin + contentWidth, tableTop + headerRowHeight)

    // Header texts
    doc.setFont("courier", "bold")
    doc.setFontSize(6)

    doc.text("MARKS & # OF", col1 + 1, tableTop + 4)
    doc.text("Numbers", col1 + 1, tableTop + 8)
    doc.text("PAKGS", col2 + 2, tableTop + 6)
    doc.text("COMPLETE DESCRIPTION OF GOODS", col3 + 20, tableTop + 6)
    doc.text("WEIGHT", col4 + 3, tableTop + 4)
    doc.text("LBS", col4 + 5, tableTop + 8)
    doc.text("QTY", col5 + 3, tableTop + 6)
    doc.text("UNIT VALUE", col6 + 1, tableTop + 4)
    doc.text("(USD)", col6 + 4, tableTop + 8)
    doc.text("TOTAL VALUE", col7 + 1, tableTop + 4)
    doc.text("(USD)", col7 + 4, tableTop + 8)

    // Content area
    doc.setFont("courier", "normal")
    doc.setFontSize(7)

    const contentY = tableTop + headerRowHeight + 6

    // Marks and Packages (FIXED values)
    doc.text(String(get("marks")), col1 + 3, contentY)
    doc.text(String(FIXED_PACKAGES), col2 + 3, contentY)

    // Description content
    let descY = contentY

    // Shipment type line with checkboxes
    doc.setFont("courier", "bold")
    doc.text("URGENT LABORATORY SPECIMEN SHIPMENT", col3 + 2, descY)
    descY += 5

    // Shipment Temperature
    doc.setFont("courier", "normal")
    doc.text("Shipment Temperature:", col3 + 2, descY)
    descY += 4

    const ambientX = col3 + 2
    const dryIceX = col3 + 35

    doc.text("Ambient", ambientX, descY)
    doc.rect(ambientX + 18, descY - 3, 4, 4)
    if (formData.shipmentTemp === "ambient") {
      doc.text("X", ambientX + 19, descY)
    }

    doc.text("DRY ICE", dryIceX, descY)
    doc.rect(dryIceX + 18, descY - 3, 4, 4)
    if (formData.shipmentTemp === "dryice") {
      doc.text("X", dryIceX + 19, descY)
    }

    descY += 6

    // Sample types table header
    doc.setFont("courier", "bold")
    doc.setFontSize(6)
    doc.text("SAMPLE DESCRIPTION", col3 + 2, descY)
    doc.text("QTY", col3 + 55, descY)
    doc.text("TOTAL QTY in ML/gm", col3 + 70, descY)

    descY += 4

    // Sample rows
    doc.setFont("courier", "normal")
    samples.forEach((sample) => {
      const mlValue = calculateMl(sample)
      doc.text(sample.description, col3 + 2, descY)
      doc.text(String(sample.qty), col3 + 57, descY)
      doc.text(String(mlValue), col3 + 78, descY)
      descY += 4
    })

    descY += 4

    // Disclaimer text
    doc.setFontSize(6)
    const disclaimerLines = [
      "This substances listed are of human origin containing no animal material and not",
      "of tissue culture origin. Human material that was neither inoculated with, nor exposed to",
      "infectious agents of agricultural concern, including zoonotic agents. No further processing.",
      "Lab testing only of investigational drug levels. Of No commercial value.",
      "Please expedite customs clearance of this package. Not for resale.",
    ]

    disclaimerLines.forEach((line) => {
      doc.text(line, col3 + 2, descY)
      descY += 3.5
    })

    // Values column - FIXED weight
    doc.setFontSize(7)
    doc.text(String(FIXED_WEIGHT), col4 + 3, contentY)
    doc.text(String(totalQty), col5 + 3, contentY)
    doc.text(unitValue.toFixed(2), col6 + 3, contentY)
    doc.text(FIXED_TOTAL_VALUE.toFixed(2), col7 + 3, contentY)

    // Totals row
    const totalsTop = tableTop + tableHeight - 20
    doc.line(margin, totalsTop, margin + contentWidth, totalsTop)

    doc.setFont("courier", "bold")
    doc.setFontSize(6)

    doc.text("Totals:", col1 + 2, totalsTop + 5)
    doc.text("TOTAL QTY:", col3 + 2, totalsTop + 5)
    doc.text("TOTAL ML/gm:", col3 + 35, totalsTop + 5)
    doc.text("WEIGHT LBS", col4 + 1, totalsTop + 5)
    doc.text("UNIT VALUE", col5 + 1, totalsTop + 5)
    doc.text("(USD)", col5 + 4, totalsTop + 9)
    doc.text("TOTAL VALUE", col7 + 1, totalsTop + 5)
    doc.text("(USD)", col7 + 4, totalsTop + 9)

    doc.setFont("courier", "normal")
    doc.text(String(totalQty), col3 + 12, totalsTop + 12)
    doc.text(String(totalMl), col3 + 50, totalsTop + 12)
    doc.text(String(FIXED_WEIGHT), col4 + 5, totalsTop + 12)
    doc.text(unitValue.toFixed(2), col5 + 8, totalsTop + 12)
    doc.text(FIXED_TOTAL_VALUE.toFixed(2), col7 + 8, totalsTop + 12)

    // Declaration box
    const declTop = tableTop + tableHeight
    const declHeight = 28

    doc.rect(margin, declTop, contentWidth, declHeight)

    doc.setFont("courier", "bold")
    doc.setFontSize(7)
    doc.text(
      "I DECLARE THAT ALL INFORMATION IN THIS INVOICE IS TRUE AND CORRECT",
      margin + 15,
      declTop + 8
    )

    doc.setFont("courier", "normal")
    doc.setFontSize(6)
    doc.text("Shipper Signature/Exporter Name", margin + 2, declTop + 15)
    doc.text("Signature Date", margin + 80, declTop + 15)

    doc.setFontSize(8)
    doc.text(String(get("shippername")), margin + 2, declTop + 22)
    doc.text(signDateStr, margin + 80, declTop + 22)

    doc.save(`Commercial_Invoice_${selectedStudy?.name || "Invoice"}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                Commercial Invoice Generator
              </CardTitle>
              <p className="text-muted-foreground">
                {user?.full_name} - {user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              {user?.is_admin && (
                <Link href="/users">
                  <Button variant="outline" size="sm">
                    <Users className="mr-1 h-4 w-4" />
                    Usuarios
                  </Button>
                </Link>
              )}
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="mr-1 h-4 w-4" />
                  Configuracion
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" />
                Cerrar Sesion
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Study Selector */}
          {studies.length > 0 && (
            <div className="space-y-2">
              <Label>Seleccionar Estudio</Label>
              <Select value={selectedStudyId} onValueChange={handleStudyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estudio" />
                </SelectTrigger>
                <SelectContent>
                  {studies.map((study) => (
                    <SelectItem key={study.id} value={study.id}>
                      {study.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date and AWB */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of Exportation</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exportDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportDate ? format(exportDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={exportDate}
                    onSelect={(date) => date && setExportDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="awb">Air Way Bill No.</Label>
              <Input
                id="awb"
                name="awb"
                value={formData.awb}
                onChange={handleChange}
                placeholder="M7782877"
              />
            </div>
          </div>

          {/* Shipper */}
          <div className="space-y-2">
            <Label htmlFor="shipper">Shipper / Exporter</Label>
            <Textarea
              id="shipper"
              name="shipper"
              value={formData.shipper}
              onChange={handleChange}
              rows={4}
              placeholder="Direccion del remitente..."
            />
          </div>

          {/* Consignee */}
          <div className="space-y-2">
            <Label htmlFor="consignee">Consignee</Label>
            <Textarea
              id="consignee"
              name="consignee"
              value={formData.consignee}
              onChange={handleChange}
              rows={4}
              placeholder="Direccion del destinatario..."
            />
          </div>

          {/* Destination and Protocol */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="destination">Country of Final Destination</Label>
              <Input
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protocol">Export References / Protocol</Label>
              <Input
                id="protocol"
                name="protocol"
                value={formData.protocol}
                onChange={handleChange}
                placeholder="PR:MDRN0067..."
              />
            </div>
          </div>

          {/* Marks - FIXED values shown but disabled */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="marks">Marks & Numbers</Label>
              <Input
                id="marks"
                name="marks"
                value={formData.marks}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label># of Packages</Label>
              <Input
                value={FIXED_PACKAGES}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (LBS)</Label>
              <Input
                value={FIXED_WEIGHT}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Shipment Temperature */}
          <div className="space-y-2">
            <Label>Shipment Temperature</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shipmentTemp"
                  checked={formData.shipmentTemp === "ambient"}
                  onChange={() => handleTempChange("ambient")}
                  className="h-4 w-4"
                />
                <span>Ambient</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shipmentTemp"
                  checked={formData.shipmentTemp === "dryice"}
                  onChange={() => handleTempChange("dryice")}
                  className="h-4 w-4"
                />
                <span>DRY ICE</span>
              </label>
            </div>
          </div>

          {/* Sample Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Sample Description</Label>
              <Button variant="outline" size="sm" onClick={addSample}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar Muestra
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">SAMPLE DESCRIPTION</th>
                    <th className="px-4 py-2 text-center text-sm font-medium w-24">QTY</th>
                    <th className="px-4 py-2 text-center text-sm font-medium w-32">ML/gm</th>
                    <th className="px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">
                        <Select
                          value={sample.description}
                          onValueChange={(value) => updateSample(index, "description", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sampleDescriptions.map((desc) => (
                              <SelectItem key={desc} value={desc}>
                                {desc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={sample.qty}
                          onChange={(e) => updateSample(index, "qty", e.target.value)}
                          className="text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center font-medium">
                        {calculateMl(sample)}
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSample(index)}
                          disabled={samples.length === 1}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-3 text-center">
                <p className="text-sm text-muted-foreground">Total QTY</p>
                <p className="text-2xl font-bold">{totalQty}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-sm text-muted-foreground">Total ML/gm</p>
                <p className="text-2xl font-bold">{totalMl}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-sm text-muted-foreground">Unit Value (USD)</p>
                <p className="text-2xl font-bold">{unitValue.toFixed(2)}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-sm text-muted-foreground">Total Value (USD)</p>
                <p className="text-2xl font-bold">{FIXED_TOTAL_VALUE.toFixed(2)}</p>
              </Card>
            </div>
          </div>

          {/* Signature section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shippername">Shipper Signature / Exporter Name</Label>
              <Input
                id="shippername"
                name="shippername"
                value={formData.shippername}
                onChange={handleChange}
                placeholder="Nombre del exportador"
              />
            </div>
            <div className="space-y-2">
              <Label>Signature Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !signDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {signDate ? format(signDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={signDate}
                    onSelect={(date) => date && setSignDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Generate PDF Button */}
          <Button className="w-full" size="lg" onClick={generatePDF}>
            <FileDown className="mr-2 h-5 w-5" />
            Descargar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
