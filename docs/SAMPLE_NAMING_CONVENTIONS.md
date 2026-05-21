# Sample Naming Conventions Guide

## Overview

This document describes the naming conventions for laboratory samples and how they affect the multiplier calculations in the Commercial Invoice Generator.

## Multiplier Rules

Sample multipliers are applied based on the sample description and study name. All matching is case-insensitive and partial (e.g., "Nasal Swab" will match the "nasal" pattern).

### Rule 1: Human Serum from VYF04 Study

**Multiplier:** 1.5x  
**Sample Pattern:** `human serum` (case-insensitive)  
**Study Pattern:** `VYF04` (case-insensitive)

**Valid Examples:**
- "Human Serum"
- "HUMAN SERUM"
- "human serum"
- "Human Serum (Aliquot)"
- "Human Serum - Study VYF04"

**Invalid Examples:**
- "Serum" (missing "human")
- "Human Serum" with study "VYF03" (wrong study)
- "Plasma" (wrong sample type)

**Calculation Example:**
```
Quantity: 10
Multiplier: 1.5
ML/gm: 10 × 1.5 = 15
```

### Rule 2: Nasal Samples

**Multiplier:** 3x  
**Sample Pattern:** `nasal` (case-insensitive)  
**Study Pattern:** None (applies to any study)

**Valid Examples:**
- "Nasal"
- "Nasal Swab"
- "NASAL SWAB (MORNING)"
- "nasal specimen"

**Calculation Example:**
```
Quantity: 5
Multiplier: 3
ML/gm: 5 × 3 = 15
```

### Rule 3: Swab Samples

**Multiplier:** 3x  
**Sample Pattern:** `swab` (case-insensitive)  
**Study Pattern:** None (applies to any study)

**Valid Examples:**
- "Swab"
- "Oral Swab"
- "SWAB (SAMPLE 1)"
- "Buccal Swab"

**Note:** If a sample contains both "swab" and "nasal", the first matching rule applies (nasal rule comes first in configuration).

### Rule 4: Hisopado Samples

**Multiplier:** 3x  
**Sample Pattern:** `hisopado` (case-insensitive)  
**Study Pattern:** None (applies to any study)

**Valid Examples:**
- "Hisopado"
- "HISOPADO"
- "hisopado nasal"

### Rule 5: Default (No Multiplier)

**Multiplier:** 1x  
**Applies when:** No rules above match

**Examples:**
- "Blood"
- "Plasma"
- "Urine"
- "Saliva"

## Best Practices

### When Adding Samples

1. **Use consistent naming conventions** across your organization
2. **Include key identifiers** in the sample name (e.g., "Human Serum" not just "Serum")
3. **Avoid ambiguous names** that could match multiple rules
4. **Follow the exact patterns** shown in examples above

### Naming Template

Recommended format for clarity:
```
[Sample Type] [Sample Source] [Additional Info]
```

Examples:
- "Human Serum (VYF04)"
- "Nasal Swab (Morning Collection)"
- "Buccal Swab (Sample 1)"
- "Hisopado (Respiratory)"

## Troubleshooting

### Problem: Multiplier Not Applied

**Check:**
1. Sample description matches one of the patterns exactly (case-insensitive)
2. For VYF04 rule: study name contains "VYF04"
3. Sample is not misspelled (e.g., "Humman Serum" won't match)
4. No leading/trailing spaces causing issues

**Example:**
- ❌ "Serum" alone won't trigger multiplier (needs "Human")
- ✅ "Human Serum" will trigger 1.5x for VYF04

### Problem: Wrong Multiplier Applied

**Check:**
1. Study name is correctly selected
2. Sample description matches intended pattern
3. Rule priority (first match wins)

**Note:** Patterns are checked in this order:
1. Human Serum + VYF04 → 1.5x
2. Nasal → 3x
3. Swab → 3x
4. Hisopado → 3x
5. Default → 1x

## Adding New Rules

To add a new multiplier rule, edit `lib/multipliers.ts`:

```typescript
export const MULTIPLIER_RULES: MultiplierRule[] = [
  // ... existing rules ...
  {
    samplePattern: "your_pattern",
    studyPattern: "optional_study_pattern",  // omit if applies to all studies
    multiplier: 2.0,
    description: "Description of your rule",
  },
]
```

Then:
1. Add corresponding test case in `lib/__tests__/multipliers.test.ts`
2. Update this document
3. Submit PR for review

## Audit Logging

Every sample's multiplier calculation is logged for audit purposes with:
- Sample description
- Quantity entered
- Applied multiplier
- Calculated ML/gm
- Reason rule was applied

View audit logs in the "Historial" section of the application.

## Questions?

If samples aren't multiplying as expected:
1. Check the browser console for warnings
2. Review audit logs for the specific sample
3. Contact your administrator

---

**Last Updated:** 2026-05-20  
**Version:** 1.0
