"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileDown } from "lucide-react"

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
    qty: "1",
    unitvalue: "5",
    totalvalue: "5",
    shippername: "Miguel De Los Ríos",
    signdate: "26 DIC 2025",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    })

    const get = (field: keyof typeof formData) => formData[field] || ""

    doc.setFont("courier", "normal")
    doc.setFontSize(8)
    doc.setLineWidth(0.2)

    doc.text("Date of Exportation:", 10, 12)
    doc.text("Air Way Bill No:", 110, 12)

    doc.text(get("date"), 10, 18)
    doc.text(get("awb"), 110, 18)

    doc.rect(10, 22, 95, 42)
    doc.rect(105, 22, 95, 42)

    doc.setFont("courier", "bold")
    doc.text("Shipper/Exporter: (Complete name, address, country)", 12, 27)
    doc.text("CONSIGNEE:", 107, 27)

    doc.setFont("courier", "normal")
    doc.setFontSize(7)

    doc.text(doc.splitTextToSize(get("shipper"), 88), 12, 33)
    doc.text(doc.splitTextToSize(get("consignee"), 88), 107, 33)

    doc.rect(10, 64, 95, 12)
    doc.rect(105, 64, 95, 12)

    doc.setFont("courier", "bold")
    doc.text("COUNTRY OF FINAL DESTINATION:", 12, 69)
    doc.text("EXPORT REFERENCES/PROTOCOL:", 107, 69)

    doc.setFont("courier", "normal")
    doc.text(get("destination"), 12, 74)
    doc.text(get("protocol"), 107, 74)

    doc.rect(10, 76, 190, 108)

    doc.line(22, 76, 22, 184)
    doc.line(40, 76, 40, 184)
    doc.line(135, 76, 135, 184)
    doc.line(155, 76, 155, 184)
    doc.line(170, 76, 170, 184)
    doc.line(185, 76, 185, 184)

    doc.line(10, 88, 200, 88)

    doc.setFont("courier", "bold")
    doc.setFontSize(7)

    doc.text("MARKS & # OF", 11, 81)
    doc.text("Numbers", 12, 85)
    doc.text("PAKGS", 25, 84)
    doc.text("COMPLETE DESCRIPTION OF GOODS", 50, 84)
    doc.text("WEIGHT", 138, 81)
    doc.text("LBS", 141, 85)
    doc.text("QTY", 159, 84)
    doc.text("UNIT VALUE", 171, 81)
    doc.text("(USD)", 173, 85)
    doc.text("TOTAL VALUE", 185, 81)
    doc.text("(USD)", 188, 85)

    doc.setFont("courier", "normal")
    doc.setFontSize(8)

    doc.text(get("marks"), 13, 96)
    doc.text(get("packages"), 28, 96)

    const descriptionLines = [
      "URGENT LABORATORY SPECIMEN SHIPMENT",
      "Ambient DRY ICE X",
      "",
      "HUMAN BLOOD ml",
      "HUMAN SWAB ml",
      "HUMAN PBMC ml",
      "HUMAN PLASMA ml",
      "HUMAN SERUM ml",
      "",
      "This substances listed are of human origin containing no animal material and not",
      "of tissue culture origin. Human material that was neither inoculated with, nor exposed to",
      "infectious agents of agricultural concern, including zoonotic agents. No further processing.",
      "Lab testing only of investigational drug levels. Of No commercial value.",
      "Please expedite customs clearance of this package. Not for resale.",
    ]

    doc.text(descriptionLines, 43, 96)

    doc.text(get("weight"), 140, 96)
    doc.text(get("qty"), 160, 96)
    doc.text(get("unitvalue"), 173, 96)
    doc.text(get("totalvalue"), 188, 96)

    doc.line(10, 164, 200, 164)

    doc.setFont("courier", "bold")
    doc.text("Totals:", 12, 170)
    doc.text("# OF PACKAGES", 42, 170)
    doc.text("WEIGHT LBS", 92, 170)
    doc.text("QTY", 132, 170)
    doc.text("UNIT VALUE (USD)", 148, 170)
    doc.text("TOTAL VALUE (USD)", 177, 170)

    doc.setFont("courier", "normal")

    doc.text(get("packages"), 65, 176)
    doc.text(get("weight"), 102, 176)
    doc.text(get("qty"), 135, 176)
    doc.text(get("unitvalue"), 158, 176)
    doc.text(get("totalvalue"), 185, 176)

    doc.rect(10, 184, 190, 28)

    doc.setFont("courier", "bold")
    doc.text(
      "I DECLARE THAT ALL INFORMATION IN THIS INVOICE IS TRUE AND CORRECT",
      18,
      193
    )

    doc.setFont("courier", "normal")
    doc.text("Shipper's signature/ Exporter Name and title", 12, 204)
    doc.text("Date", 165, 204)

    doc.text(get("shippername"), 12, 210)
    doc.text(get("signdate"), 165, 210)

    doc.setFontSize(7)
    doc.text("Sample Type Qty of tubes Total Qty in ML/gm", 128, 220)

    doc.save("Commercial_Invoice_Exact_Format.pdf")
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
              <Label htmlFor="shipper">Shipper / Exporter (Complete name, address, country)</Label>
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

          {/* Weight, Qty, Unit Value, Total Value Row */}
          <div className="grid gap-4 md:grid-cols-4">
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
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitvalue">Unit Value (USD)</Label>
              <Input
                id="unitvalue"
                name="unitvalue"
                value={formData.unitvalue}
                onChange={handleChange}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalvalue">Total Value (USD)</Label>
              <Input
                id="totalvalue"
                name="totalvalue"
                value={formData.totalvalue}
                onChange={handleChange}
                placeholder="5"
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
            Generar PDF Exacto
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
