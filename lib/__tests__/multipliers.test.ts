import { describe, it, expect } from "vitest"
import {
  getMultiplier,
  getMultiplierInfo,
  getSampleMultiplierInfo,
  MULTIPLIER_RULES,
} from "../multipliers"

describe("Multiplier Configuration", () => {
  describe("MULTIPLIER_RULES", () => {
    it("should have defined rules", () => {
      expect(MULTIPLIER_RULES.length).toBeGreaterThan(0)
    })

    it("should have VYF04 rule", () => {
      const vyf04Rule = MULTIPLIER_RULES.find(
        (r) => r.studyPattern === "VYF04" && r.samplePattern === "human serum"
      )
      expect(vyf04Rule).toBeDefined()
      expect(vyf04Rule?.multiplier).toBe(1.5)
    })
  })

  describe("getMultiplier", () => {
    it("should handle case-insensitive sample descriptions", () => {
      expect(getMultiplier("HUMAN SERUM", "VYF04")).toBe(1.5)
      expect(getMultiplier("human serum", "VYF04")).toBe(1.5)
      expect(getMultiplier("Human Serum", "VYF04")).toBe(1.5)
    })

    it("should handle case-insensitive study names", () => {
      expect(getMultiplier("HUMAN SERUM", "VYF04")).toBe(1.5)
      expect(getMultiplier("HUMAN SERUM", "vyf04")).toBe(1.5)
      expect(getMultiplier("HUMAN SERUM", "Vyf04")).toBe(1.5)
    })

    it("should handle whitespace in descriptions", () => {
      expect(getMultiplier("  HUMAN SERUM  ", "VYF04")).toBe(1.5)
      expect(getMultiplier("HUMAN SERUM\n", "VYF04")).toBe(1.5)
    })

    it("should apply multiplier for nasal samples", () => {
      expect(getMultiplier("Nasal Swab", "STUDY-001")).toBe(3)
      expect(getMultiplier("NASAL", "STUDY-001")).toBe(3)
    })

    it("should apply multiplier for swab samples", () => {
      expect(getMultiplier("Swab (Sample 1)", "STUDY-001")).toBe(3)
      expect(getMultiplier("SWAB", "STUDY-001")).toBe(3)
    })

    it("should apply multiplier for hisopado samples", () => {
      expect(getMultiplier("Hisopado", "STUDY-001")).toBe(3)
      expect(getMultiplier("HISOPADO", "STUDY-001")).toBe(3)
    })

    it("should return 1 for samples without multiplier rules", () => {
      expect(getMultiplier("Blood", "STUDY-001")).toBe(1)
      expect(getMultiplier("Serum", "STUDY-001")).toBe(1)
      expect(getMultiplier("Plasma", "STUDY-001")).toBe(1)
    })

    it("should require both sample and study pattern for study-specific rules", () => {
      // Human serum without VYF04 should not get 1.5 multiplier
      expect(getMultiplier("HUMAN SERUM", "OTHER-STUDY")).toBe(1)
    })

    it("should handle partial matching", () => {
      expect(getMultiplier("Human Serum (Aliquot)", "VYF04")).toBe(1.5)
      expect(getMultiplier("Nasal Swab (Morning)", "STUDY-001")).toBe(3)
    })
  })

  describe("getMultiplierInfo", () => {
    it("should return multiplier and reason", () => {
      const info = getMultiplierInfo("HUMAN SERUM", "VYF04")
      expect(info.multiplier).toBe(1.5)
      expect(info.appliedReason).toContain("Rule")
    })

    it("should provide descriptive reason for default case", () => {
      const info = getMultiplierInfo("Blood", "STUDY-001")
      expect(info.multiplier).toBe(1)
      expect(info.appliedReason).toContain("Default")
    })
  })

  describe("getSampleMultiplierInfo", () => {
    it("should calculate ML correctly", () => {
      const sample = { description: "HUMAN SERUM", qty: 10 }
      const info = getSampleMultiplierInfo(sample, "VYF04")
      expect(info.calculated_ml).toBe(15) // 10 * 1.5
      expect(info.multiplier).toBe(1.5)
    })

    it("should include all audit information", () => {
      const sample = { description: "Nasal", qty: 5 }
      const info = getSampleMultiplierInfo(sample, "STUDY-001")
      expect(info.description).toBe("Nasal")
      expect(info.qty).toBe(5)
      expect(info.calculated_ml).toBe(15) // 5 * 3
      expect(info.multiplier).toBe(3)
      expect(info.appliedReason).toBeDefined()
    })
  })
})
