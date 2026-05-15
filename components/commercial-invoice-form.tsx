"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FileDown, Plus, Trash2, Settings, Edit2 } from "lucide-react"

const FIXED_TOTAL_VALUE = 5

interface SampleRow {
  description: string
  qty: number
}

interface StudyConfig {
  id: string
  name: string
  protocol: string
  shipper: string
}

// Meses en espanol para el selector de fecha
const MONTHS = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
]

// Generar dias del 1 al 31
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// Generar anos (2024-2030)
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i)

// Configuracion inicial de estudios
const DEFAULT_STUDIES: StudyConfig[] = [
  {
    id: "1",
    name: "mRNA-1365-P101",
    protocol: "PR:MDRN0067 MRNA-1365-P101 SITE#PAN03",
    shipper: `CENTRO VACUNATORIO INTL.SA CEVAXIN
XIMENA NORERO
AVE. MEXICO CALLE 33 LOCAL #4
PANAMA CITY, PANAMA`,
  },
  {
    id: "2",
    name: "Study 002",
    protocol: "PR:STUDY002 SITE#001",
    shipper: `LABORATORIO CENTRAL
DIRECCION DEL ESTUDIO 002
CIUDAD, PAIS`,
  },
]

// Configuracion inicial de descripciones de muestras
const DEFAULT_SAMPLE_DESCRIPTIONS = [
  "HUMAN BLOOD",
  "HUMAN NASAL SWAB",
  "HUMAN PBMC",
  "HUMAN PLASMA",
  "HUMAN SERUM",
]

export default function CommercialInvoiceForm() {
  // Studies management
  const [studies, setStudies] = useState<StudyConfig[]>(DEFAULT_STUDIES)
  const [selectedStudyId, setSelectedStudyId] = useState(DEFAULT_STUDIES[0].id)
  const [studyDialogOpen, setStudyDialogOpen] = useState(false)
  const [editingStudy, setEditingStudy] = useState<StudyConfig | null>(null)
  const [newStudy, setNewStudy] = useState<Omit<StudyConfig, "id">>({
    name: "",
    protocol: "",
    shipper: "",
  })

  // Sample descriptions management
  const [sampleDescriptions, setSampleDescriptions] = useState<string[]>(DEFAULT_SAMPLE_DESCRIPTIONS)
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false)
  const [newSampleDescription, setNewSampleDescription] = useState("")
  const [editingSampleIndex, setEditingSampleIndex] = useState<number | null>(null)
  const [editingSampleValue, setEditingSampleValue] = useState("")
  
  // Date of Exportation state
  const [exportDay, setExportDay] = useState(26)
  const [exportMonth, setExportMonth] = useState("DIC")
  const [exportYear, setExportYear] = useState(2025)
  
  // Signature Date state
  const [signDay, setSignDay] = useState(26)
  const [signMonth, setSignMonth] = useState("DIC")
  const [signYear, setSignYear] = useState(2025)

  const selectedStudy = studies.find(s => s.id === selectedStudyId) || studies[0]

  const [formData, setFormData] = useState({
    awb: "M7782877",
    shipper: selectedStudy?.shipper || "",
    consignee: `PPD GLOBAL CENTRAL LAB
DEBBIE KADLER LOGISTICS COORDINATOR
2 TESSENEER
HIGHLAND HEIGHTS ZIP CODE: 41076
USA`,
    destination: "USA",
    protocol: selectedStudy?.protocol || "",
    marks: "1",
    packages: "20",
    weight: "5.00",
    shippername: "Miguel De Los Rios",
    ambientChecked: false,
    dryIceChecked: true,
  })

  const [samples, setSamples] = useState<SampleRow[]>([
    { description: "HUMAN BLOOD", qty: 11 },
    { description: "HUMAN NASAL SWAB", qty: 0 },
    { description: "HUMAN PBMC", qty: 0 },
    { description: "HUMAN PLASMA", qty: 0 },
    { description: "HUMAN SERUM", qty: 0 },
  ])

  // Format date for display
  const formatDate = (day: number, month: string, year: number) => {
    return `${day} ${month} ${year}`
  }

  // Handle study change - auto update shipper and protocol
  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId)
    const study = studies.find(s => s.id === studyId)
    if (study) {
      setFormData(prev => ({
        ...prev,
        shipper: study.shipper,
        protocol: study.protocol,
      }))
    }
  }

  // Study management functions
  const addStudy = () => {
    if (newStudy.name && newStudy.protocol && newStudy.shipper) {
      const id = Date.now().toString()
      setStudies([...studies, { ...newStudy, id }])
      setNewStudy({ name: "", protocol: "", shipper: "" })
    }
  }

  const updateStudy = () => {
    if (editingStudy) {
      setStudies(studies.map(s => s.id === editingStudy.id ? editingStudy : s))
      // Update form data if the edited study is currently selected
      if (editingStudy.id === selectedStudyId) {
        setFormData(prev => ({
          ...prev,
          shipper: editingStudy.shipper,
          protocol: editingStudy.protocol,
        }))
      }
      setEditingStudy(null)
    }
  }

  const deleteStudy = (id: string) => {
    if (studies.length > 1) {
      const newStudies = studies.filter(s => s.id !== id)
      setStudies(newStudies)
      if (selectedStudyId === id) {
        setSelectedStudyId(newStudies[0].id)
        setFormData(prev => ({
          ...prev,
          shipper: newStudies[0].shipper,
          protocol: newStudies[0].protocol,
        }))
      }
    }
  }

  // Sample description management functions
  const addSampleDescription = () => {
    if (newSampleDescription.trim()) {
      setSampleDescriptions([...sampleDescriptions, newSampleDescription.trim().toUpperCase()])
      setNewSampleDescription("")
    }
  }

  const updateSampleDescription = () => {
    if (editingSampleIndex !== null && editingSampleValue.trim()) {
      const newDescriptions = [...sampleDescriptions]
      const oldValue = newDescriptions[editingSampleIndex]
      newDescriptions[editingSampleIndex] = editingSampleValue.trim().toUpperCase()
      setSampleDescriptions(newDescriptions)
      
      // Update any samples using this description
      setSamples(samples.map(sample => 
        sample.description === oldValue 
          ? { ...sample, description: newDescriptions[editingSampleIndex] }
          : sample
      ))
      
      setEditingSampleIndex(null)
      setEditingSampleValue("")
    }
  }

  const deleteSampleDescription = (index: number) => {
    if (sampleDescriptions.length > 1) {
      const newDescriptions = sampleDescriptions.filter((_, i) => i !== index)
      setSampleDescriptions(newDescriptions)
    }
  }

  // Calculate ML/gm for a single row
  const calculateMl = (sample: SampleRow): number => {
    const name = sample.description.toLowerCase()
    if (name.includes("nasal")) {
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.checked,
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
    setSamples([...samples, { description: sampleDescriptions[0] || "NEW SAMPLE", qty: 0 }])
  }

  const removeSample = (index: number) => {
    if (samples.length > 1) {
      setSamples(samples.filter((_, i) => i !== index))
    }
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
    const exportDate = formatDate(exportDay, exportMonth, exportYear)
    const signDate = formatDate(signDay, signMonth, signYear)

    doc.setFont("courier", "normal")
    doc.setFontSize(8)
    doc.setLineWidth(0.2)

    // Date and AWB labels
    doc.text("Date of Exportation:", margin, 12)
    doc.text("Air Way Bill No:", margin + contentWidth / 2, 12)

    // Date and AWB values
    doc.text(exportDate, margin, 18)
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

    // Marks and Packages
    doc.text(String(get("marks")), col1 + 3, contentY)
    doc.text(String(get("packages")), col2 + 3, contentY)

    // Description content
    let descY = contentY

    // Shipment type line with checkboxes
    doc.setFont("courier", "bold")
    doc.text("URGENT LABORATORY SPECIMEN SHIPMENT", col3 + 2, descY)
    descY += 5

    // Temperature indicators
    doc.setFont("courier", "normal")
    const ambientX = col3 + 2
    const dryIceX = col3 + 35

    doc.text("Ambient", ambientX, descY)
    doc.rect(ambientX + 18, descY - 3, 4, 4)
    if (formData.ambientChecked) {
      doc.text("X", ambientX + 19, descY)
    }

    doc.text("DRY ICE", dryIceX, descY)
    doc.rect(dryIceX + 18, descY - 3, 4, 4)
    if (formData.dryIceChecked) {
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

    // Values column - only show weight, other values shown in totals
    doc.setFontSize(7)
    doc.text(String(get("weight")), col4 + 3, contentY)
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
    doc.text(String(get("weight")), col4 + 5, totalsTop + 12)
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
    doc.text("Shipper's signature/ Exporter", margin + 2, declTop + 15)
    doc.text("Date", margin + 50, declTop + 15)
    doc.text("Name and title", margin + 75, declTop + 15)

    doc.setFontSize(8)
    doc.text(String(get("shippername")), margin + 2, declTop + 22)
    doc.text(signDate, margin + 50, declTop + 22)

    doc.save(`Commercial_Invoice_${selectedStudy?.name || "Invoice"}.pdf`)
  }

  return (
    <div className="min-h-screen bg-muted/50 p-4 md:p-8">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Commercial Invoice Generator
          </CardTitle>
          <p className="text-muted-foreground">
            Fill in the details below to generate a commercial invoice PDF
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Study Selector with Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Seleccionar Estudio</Label>
              <Dialog open={studyDialogOpen} onOpenChange={setStudyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="mr-1 h-4 w-4" />
                    Gestionar Estudios
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gestionar Estudios</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Existing Studies */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Estudios Existentes</Label>
                      {studies.map((study) => (
                        <Card key={study.id} className="p-3">
                          {editingStudy?.id === study.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingStudy.name}
                                onChange={(e) => setEditingStudy({ ...editingStudy, name: e.target.value })}
                                placeholder="Nombre del estudio"
                              />
                              <Input
                                value={editingStudy.protocol}
                                onChange={(e) => setEditingStudy({ ...editingStudy, protocol: e.target.value })}
                                placeholder="Protocolo"
                              />
                              <Textarea
                                value={editingStudy.shipper}
                                onChange={(e) => setEditingStudy({ ...editingStudy, shipper: e.target.value })}
                                placeholder="Direccion del Shipper"
                                className="min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={updateStudy}>Guardar</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingStudy(null)}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{study.name}</p>
                                <p className="text-xs text-muted-foreground">{study.protocol}</p>
                                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{study.shipper}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingStudy(study)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteStudy(study.id)}
                                  disabled={studies.length <= 1}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>

                    {/* Add New Study */}
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-sm font-medium">Agregar Nuevo Estudio</Label>
                      <Input
                        value={newStudy.name}
                        onChange={(e) => setNewStudy({ ...newStudy, name: e.target.value })}
                        placeholder="Nombre del estudio"
                      />
                      <Input
                        value={newStudy.protocol}
                        onChange={(e) => setNewStudy({ ...newStudy, protocol: e.target.value })}
                        placeholder="Protocolo (ej: PR:STUDY001 SITE#001)"
                      />
                      <Textarea
                        value={newStudy.shipper}
                        onChange={(e) => setNewStudy({ ...newStudy, shipper: e.target.value })}
                        placeholder="Direccion del Shipper (nombre, direccion, ciudad, pais)"
                        className="min-h-[80px]"
                      />
                      <Button onClick={addStudy} disabled={!newStudy.name || !newStudy.protocol || !newStudy.shipper}>
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar Estudio
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
            <p className="text-xs text-muted-foreground">
              Al cambiar el estudio se actualizara automaticamente el Shipper y Protocolo
            </p>
          </div>

          {/* Date of Exportation with selectors */}
          <div className="space-y-2">
            <Label>Date of Exportation</Label>
            <div className="flex gap-2">
              <Select value={String(exportDay)} onValueChange={(v) => setExportDay(Number(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={exportMonth} onValueChange={setExportMonth}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(exportYear)} onValueChange={(v) => setExportYear(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AWB */}
          <div className="space-y-2">
            <Label htmlFor="awb">Air Way Bill No</Label>
            <Input
              id="awb"
              name="awb"
              value={formData.awb}
              onChange={handleChange}
              placeholder="M7782877"
            />
          </div>

          {/* Shipper and Consignee Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shipper">Shipper / Exporter</Label>
              <Textarea
                id="shipper"
                name="shipper"
                value={formData.shipper}
                onChange={handleChange}
                placeholder="Company name and full address"
                className="min-h-[120px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consignee">Consignee</Label>
              <Textarea
                id="consignee"
                name="consignee"
                value={formData.consignee}
                onChange={handleChange}
                placeholder="Recipient name and full address"
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>

          {/* Destination and Protocol Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="destination">Country of Final Destination</Label>
              <Input
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="USA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protocol">Export References / Protocol</Label>
              <Input
                id="protocol"
                name="protocol"
                value={formData.protocol}
                onChange={handleChange}
                placeholder="PR:MDRN0067 MRNA-1365-P101 SITE#PAN03"
              />
            </div>
          </div>

          {/* Temperature Type */}
          <div className="space-y-2">
            <Label>Shipment Temperature</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="ambientChecked"
                  checked={formData.ambientChecked}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4"
                />
                Ambient
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="dryIceChecked"
                  checked={formData.dryIceChecked}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4"
                />
                DRY ICE
              </label>
            </div>
          </div>

          {/* Sample Types Table with Description Dropdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sample Types</Label>
              <div className="flex gap-2">
                <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-1 h-4 w-4" />
                      Gestionar Descripciones
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Gestionar Descripciones de Muestras</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Existing Descriptions */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Descripciones Existentes</Label>
                        {sampleDescriptions.map((desc, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {editingSampleIndex === index ? (
                              <>
                                <Input
                                  value={editingSampleValue}
                                  onChange={(e) => setEditingSampleValue(e.target.value)}
                                  className="flex-1"
                                />
                                <Button size="sm" onClick={updateSampleDescription}>Guardar</Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setEditingSampleIndex(null)
                                  setEditingSampleValue("")
                                }}>Cancelar</Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm">{desc}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSampleIndex(index)
                                    setEditingSampleValue(desc)
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSampleDescription(index)}
                                  disabled={sampleDescriptions.length <= 1}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add New Description */}
                      <div className="space-y-2 border-t pt-4">
                        <Label className="text-sm font-medium">Agregar Nueva Descripcion</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newSampleDescription}
                            onChange={(e) => setNewSampleDescription(e.target.value)}
                            placeholder="Nueva descripcion de muestra"
                            className="flex-1"
                          />
                          <Button onClick={addSampleDescription} disabled={!newSampleDescription.trim()}>
                            <Plus className="mr-1 h-4 w-4" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={addSample}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Sample
                </Button>
              </div>
            </div>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium">SAMPLE DESCRIPTION</th>
                    <th className="w-28 p-2 text-left font-medium">QTY (Tubes)</th>
                    <th className="w-36 p-2 text-left font-medium">TOTAL QTY in ML/gm</th>
                    <th className="w-16 p-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample, index) => {
                    const totalMlPerRow = calculateMl(sample)
                    return (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Select
                            value={sample.description}
                            onValueChange={(value) => updateSample(index, "description", value)}
                          >
                            <SelectTrigger className="h-8">
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
                        <td className="p-2">
                          <Input
                            type="number"
                            value={sample.qty}
                            onChange={(e) => updateSample(index, "qty", e.target.value)}
                            className="h-8"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={totalMlPerRow}
                            readOnly
                            className="h-8 bg-muted"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSample(index)}
                            disabled={samples.length <= 1}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">TOTAL QTY (Tubes)</p>
                <p className="text-2xl font-bold">{totalQty}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">TOTAL QTY in ML/gm</p>
                <p className="text-2xl font-bold">{totalMl}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">UNIT VALUE (USD)</p>
                <p className="text-2xl font-bold">{unitValue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">= 5 / {totalQty || 1}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-medium text-muted-foreground">TOTAL VALUE (USD)</p>
                <p className="text-2xl font-bold">{FIXED_TOTAL_VALUE.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Fixed Value</p>
              </CardContent>
            </Card>
          </div>

          {/* Marks and Packages Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marks">Marks & Numbers</Label>
              <Input
                id="marks"
                name="marks"
                value={formData.marks}
                onChange={handleChange}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packages"># of Packages</Label>
              <Input
                id="packages"
                name="packages"
                value={formData.packages}
                onChange={handleChange}
                placeholder="20"
              />
            </div>
          </div>

          {/* Weight Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (LBS)</Label>
              <Input
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="5.00"
              />
            </div>
          </div>

          {/* Signature Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shippername">{"Shipper's Signature / Exporter Name"}</Label>
              <Input
                id="shippername"
                name="shippername"
                value={formData.shippername}
                onChange={handleChange}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Signature Date</Label>
              <div className="flex gap-2">
                <Select value={String(signDay)} onValueChange={(v) => setSignDay(Number(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={signMonth} onValueChange={setSignMonth}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(signYear)} onValueChange={(v) => setSignYear(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <Button onClick={generatePDF} size="lg" className="w-full md:w-auto">
            <FileDown className="mr-2 h-5 w-5" />
            Generar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
