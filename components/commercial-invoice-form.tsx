"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileDown, Plus, Trash2 } from "lucide-react"

const FIXED_TOTAL_VALUE = 5

interface SampleRow {
  description: string
  qty: number
}

export default function CommercialInvoiceForm() {
  const [formData, setFormData] = useState({
    date: "26 DIC 2025",
    awb: "M7782877",
    shipper: `CENTRO VACUNATORIO INTL.SA CEVAXIN
XIMENA NORERO
AVE. MEXICO CALLE 33 LOCAL #4
PANAMA CITY, PANAMA`,
    consignee: `PPD GLOBAL CENTRAL LAB
DEBBIE KADLER LOGISTICS COORDINATOR
2 TESSENEER
HIGHLAND HEIGHTS ZIP CODE: 41076
USA`,
    destination: "USA",
    protocol: "PR:MDRN0067 MRNA-1365-P101 SITE#PAN03",
    marks: "1",
    packages: "20",
    weight: "5.00",
    shippername: "Miguel De Los Ríos",
    signdate: "26 DIC 2025",
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
    setSamples([...samples, { description: "NEW SAMPLE", qty: 0 }])
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

    doc.setFont("courier", "normal")
    doc.setFontSize(8)
    doc.setLineWidth(0.2)

    // Date and AWB labels
    doc.text("Date of Exportation:", margin, 12)
    doc.text("Air Way Bill No:", margin + contentWidth / 2, 12)

    // Date and AWB values
    doc.text(String(get("date")), margin, 18)
    doc.text(String(get("awb")), margin + contentWidth / 2, 18)

    // Shipper and Consignee boxes
    const boxTop = 22
    const boxHeight = 42
    const halfWidth = contentWidth / 2 - 2

    doc.rect(margin, boxTop, halfWidth, boxHeight)
    doc.rect(margin + halfWidth + 4, boxTop, halfWidth, boxHeight)

    doc.setFont("courier", "bold")
    doc.setFontSize(7)
    doc.text("Shipper/Exporter: (Complete name, address, country)", margin + 2, boxTop + 5)
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
    doc.text("UNIT VALUE (USD)", col5 + 1, totalsTop + 5)
    doc.text("TOTAL VALUE (USD)", col7 + 1, totalsTop + 5)

    doc.setFont("courier", "normal")
    doc.text(String(totalQty), col3 + 20, totalsTop + 12)
    doc.text(String(totalMl), col3 + 55, totalsTop + 12)
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
    doc.text(String(get("signdate")), margin + 50, declTop + 22)

    doc.save("Commercial_Invoice_mRNA-1365-P101.pdf")
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
          {/* Date and AWB Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date of Exportation</Label>
              <Input
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                placeholder="26 DIC 2025"
              />
            </div>
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

          {/* Sample Types Table - Enterprise Clean Version */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sample Types</Label>
              <Button variant="outline" size="sm" onClick={addSample}>
                <Plus className="mr-1 h-4 w-4" />
                Add Sample
              </Button>
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
                          <Input
                            value={sample.description}
                            onChange={(e) => updateSample(index, "description", e.target.value)}
                            className="h-8"
                          />
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
              <Label htmlFor="signdate">Signature Date</Label>
              <Input
                id="signdate"
                name="signdate"
                value={formData.signdate}
                onChange={handleChange}
                placeholder="26 DIC 2025"
              />
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
