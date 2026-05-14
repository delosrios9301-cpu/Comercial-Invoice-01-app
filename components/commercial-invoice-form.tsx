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
    date: "26 DEC 2025",
    awb: "M7782877",
    shipper: "CENTRO VACUNATORIO INTL.SA CEVAXIN",
    consignee: "PPD GLOBAL CENTRAL LAB",
    destination: "USA",
    protocol: "MRNA-1365-P101",
    packages: "20",
    weight: "5.00",
    qty: "1",
    unitvalue: "5",
    totalvalue: "5",
    shippername: "Miguel De Los Ríos",
    signdate: "26 DEC 2025",
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

    doc.text("COMMERCIAL INVOICE", 75, 10)

    doc.text("Date of Exportation:", 10, 18)
    doc.text("Air Way Bill No:", 110, 18)

    doc.text(get("date"), 10, 24)
    doc.text(get("awb"), 110, 24)

    doc.rect(10, 28, 95, 42)
    doc.rect(105, 28, 95, 42)

    doc.setFont("courier", "bold")
    doc.text("SHIPPER / EXPORTER", 12, 34)
    doc.text("CONSIGNEE", 107, 34)

    doc.setFont("courier", "normal")
    doc.text(get("shipper"), 12, 42)
    doc.text(get("consignee"), 107, 42)

    doc.rect(10, 70, 95, 12)
    doc.rect(105, 70, 95, 12)

    doc.setFont("courier", "bold")
    doc.text("COUNTRY OF FINAL DESTINATION", 12, 76)
    doc.text("EXPORT REFERENCES / PROTOCOL", 107, 76)

    doc.setFont("courier", "normal")
    doc.text(get("destination"), 12, 82)
    doc.text(get("protocol"), 107, 82)

    doc.rect(10, 82, 190, 90)

    doc.line(10, 94, 200, 94)
    doc.line(40, 82, 40, 172)
    doc.line(135, 82, 135, 172)
    doc.line(160, 82, 160, 172)
    doc.line(180, 82, 180, 172)

    doc.setFont("courier", "bold")
    doc.text("DESCRIPTION OF GOODS", 60, 90)
    doc.text("WEIGHT", 140, 90)
    doc.text("QTY", 165, 90)
    doc.text("VALUE", 184, 90)

    doc.setFont("courier", "normal")

    const description = [
      "URGENT LABORATORY SPECIMEN SHIPMENT",
      "HUMAN BLOOD",
      "HUMAN SWAB",
      "HUMAN SERUM",
      "NOT FOR RESALE",
      "NO COMMERCIAL VALUE",
    ]

    doc.text(description, 45, 104)

    doc.text(get("weight"), 142, 104)
    doc.text(get("qty"), 166, 104)
    doc.text(get("totalvalue"), 184, 104)

    doc.rect(10, 172, 190, 28)

    doc.text(
      "I DECLARE THAT ALL INFORMATION IN THIS INVOICE IS TRUE AND CORRECT",
      20,
      182
    )

    doc.text("Shipper's Signature", 12, 194)
    doc.text("Date", 165, 194)

    doc.text(get("shippername"), 12, 199)
    doc.text(get("signdate"), 165, 199)

    doc.save("Commercial_Invoice.pdf")
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
                placeholder="26 DEC 2025"
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
                placeholder="Company name and address"
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consignee">Consignee</Label>
              <Textarea
                id="consignee"
                name="consignee"
                value={formData.consignee}
                onChange={handleChange}
                placeholder="Recipient name and address"
                className="min-h-[100px] resize-none"
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
                placeholder="MRNA-1365-P101"
              />
            </div>
          </div>

          {/* Weight, Qty, Value Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
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
              <Label htmlFor="shippername">{"Shipper's Signature Name"}</Label>
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
                placeholder="26 DEC 2025"
              />
            </div>
          </div>

          {/* Download Button */}
          <Button onClick={generatePDF} size="lg" className="w-full md:w-auto">
            <FileDown className="mr-2 h-5 w-5" />
            Download PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
