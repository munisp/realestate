# Document Testing Execution Plan

Detailed execution plan for collecting real Nigerian documents and running comprehensive OCR accuracy tests before pilot launch.

## Executive Summary

This plan outlines a **3-week sprint** to collect 90+ real Nigerian identity documents, create verified ground truth data, and validate OCR accuracy to meet the **>85% accuracy threshold** required for pilot launch. The plan includes recruitment strategies, collection logistics, testing procedures, and success criteria.

### Timeline Overview

| Week | Focus | Deliverables | Target Samples |
|------|-------|--------------|----------------|
| **Week 1** | Setup & Initial Collection | Consent forms, collection tools, 15-20 samples | 20 |
| **Week 2** | Scaled Collection & Testing | 40-50 samples, initial test results | 50 |
| **Week 3** | Final Collection & Validation | 20-30 samples, final accuracy report | 30 |
| **Total** | | **90-100 samples, validated OCR system** | **100** |

## Week 1: Setup and Initial Collection

### Day 1-2: Preparation

**Objective**: Prepare all materials and tools for document collection.

**Tasks**:

1. **Print Consent Forms** (50 copies)
   - Review and finalize consent form language
   - Print on company letterhead
   - Prepare digital version for email distribution

2. **Set Up Collection Station**
   - White backdrop (poster board or fabric)
   - LED panel light or natural light area
   - Smartphone tripod or scanner
   - Laptop for immediate quality checks

3. **Create Collection Spreadsheet**
   - Open `collection_tracker.csv`
   - Set up formulas for progress tracking
   - Share with collection team

4. **Brief Collection Team**
   - Train 2-3 team members on collection procedures
   - Practice document photography
   - Review consent process and privacy protocols

**Deliverables**:
- ✅ 50 printed consent forms
- ✅ Collection station set up
- ✅ Team trained and ready
- ✅ Collection tools tested

### Day 3-5: Internal Recruitment

**Objective**: Collect 10-15 samples from internal team and immediate network.

**Recruitment Strategy**:

1. **Company Employees** (Target: 8-10 samples)
   - Send company-wide email explaining project
   - Offer ₦3,000 compensation per sample
   - Schedule 30-minute collection sessions
   - Emphasize privacy and data protection

2. **Friends and Family** (Target: 5-7 samples)
   - Personal outreach via WhatsApp/phone
   - Explain purpose and compensation
   - Arrange convenient collection times

**Collection Procedure**:

```
1. Welcome participant and explain process (5 min)
2. Review and sign consent form (5 min)
3. Photograph document (10 min)
   - Take 3 photos with different angles/lighting
   - Review quality on laptop
   - Retake if needed
4. Extract face photo (5 min)
5. Create ground truth JSON (10 min)
   - Participant verifies accuracy
6. Add to dataset using collection tool (3 min)
7. Pay compensation and thank participant (2 min)

Total time per participant: ~40 minutes
```

**Daily Targets**:
- Day 3: 3-4 samples
- Day 4: 4-5 samples
- Day 5: 3-4 samples
- **Total**: 10-15 samples

### Day 6-7: Quality Assurance and Initial Testing

**Objective**: Validate collected samples and run initial OCR tests.

**Tasks**:

1. **Quality Audit** (Day 6)
   - Review all 10-15 samples
   - Verify image quality meets standards
   - Check ground truth accuracy (double-entry)
   - Fix any issues or errors

2. **Initial OCR Testing** (Day 7)
   - Deploy OCR service (if not already running)
   - Run `continuous_monitor.py` on collected samples
   - Analyze accuracy by document type and field
   - Identify problematic fields or document types

**Success Criteria**:
- ✅ 10-15 high-quality samples collected
- ✅ All consent forms signed and filed
- ✅ Ground truth verified for accuracy
- ✅ Initial OCR accuracy baseline established

## Week 2: Scaled Collection and Testing

### Day 8-10: University Partnership

**Objective**: Collect 20-25 samples from university students.

**Partnership Strategy**:

1. **Identify Partner Universities**
   - University of Lagos (UNILAG)
   - Lagos State University (LASU)
   - Yaba College of Technology (YABATECH)

2. **Recruit Campus Ambassadors**
   - Hire 2-3 students as ambassadors (₦20,000 each)
   - Provide collection kits and training
   - Set target of 10 samples per ambassador

3. **On-Campus Collection Sessions**
   - Set up collection booth in high-traffic areas
   - Offer ₦3,000 compensation per sample
   - Run 2-3 hour sessions over 3 days

**Daily Targets**:
- Day 8: 6-8 samples
- Day 9: 7-9 samples
- Day 10: 7-8 samples
- **Total**: 20-25 samples

### Day 11-13: Community Outreach

**Objective**: Collect 15-20 samples from community organizations and tech hubs.

**Outreach Channels**:

1. **Tech Hubs and Coworking Spaces**
   - CcHub, Zone Tech Park, Wennovation Hub
   - Post flyers and social media announcements
   - Schedule collection sessions

2. **Professional Associations**
   - Nigerian Institute of Management
   - Computer Professionals Registration Council
   - Reach out via email and LinkedIn

3. **Social Media Campaign**
   - Post on Twitter, LinkedIn, Facebook
   - Explain purpose and compensation
   - Provide Google Form for sign-ups

**Daily Targets**:
- Day 11: 5-6 samples
- Day 12: 5-7 samples
- Day 13: 5-7 samples
- **Total**: 15-20 samples

### Day 14: Mid-Sprint Testing and Analysis

**Objective**: Run comprehensive tests on 45-50 collected samples.

**Testing Procedure**:

1. **Run Full Test Suite**
   ```bash
   cd /home/ubuntu/realestate-platform/testing/ocr-validation
   
   # Run continuous monitoring
   ./continuous_monitor.py \
     --url http://ocr-service:8000 \
     --test-data ../document-collection/test-data
   
   # Generate accuracy report
   python3 << 'EOFPY'
   import json
   from pathlib import Path
   
   results_dir = Path("./monitoring-results")
   latest_result = sorted(results_dir.glob("results_*.json"))[-1]
   
   with open(latest_result) as f:
       data = json.load(f)
   
   print(f"Overall Accuracy: {data['overall_accuracy']:.2%}")
   for doc_type, metrics in data['results_by_type'].items():
       print(f"{doc_type}: {metrics['average_accuracy']:.2%}")
   EOFPY
   ```

2. **Analyze Results**
   - Overall accuracy by document type
   - Field-level accuracy breakdown
   - Identify low-performing fields
   - Document edge cases and failures

3. **Tune Confidence Thresholds**
   ```bash
   ./tune_thresholds.py \
     --results-dir ./monitoring-results \
     --target-accuracy 0.90 \
     --output threshold-config.json
   ```

4. **Generate Mid-Sprint Report**
   - Current sample count and quality
   - OCR accuracy metrics
   - Identified issues and remediation plan
   - Adjusted collection strategy for Week 3

**Success Criteria**:
- ✅ 45-50 samples collected
- ✅ Comprehensive test results generated
- ✅ Accuracy baseline established
- ✅ Threshold recommendations created

## Week 3: Final Collection and Validation

### Day 15-18: Targeted Collection

**Objective**: Collect 20-30 additional samples to fill gaps and improve accuracy.

**Targeted Recruitment**:

Based on Week 2 analysis, focus on:

1. **Document Types with Low Accuracy**
   - If passport accuracy < 85%, collect 10 more passport samples
   - If NIN accuracy < 85%, collect 10 more NIN samples

2. **Problematic Document Conditions**
   - Worn or damaged documents
   - Low-light or poor-quality photos
   - Unusual formats or variations

3. **Demographic Gaps**
   - Ensure age diversity (18-25, 26-40, 41-60, 60+)
   - Gender balance (aim for 40-60% female)
   - Document age variety (new vs. old documents)

**Daily Targets**:
- Day 15: 5-7 samples
- Day 16: 5-7 samples
- Day 17: 5-8 samples
- Day 18: 5-8 samples
- **Total**: 20-30 samples

### Day 19-20: Final Testing and Validation

**Objective**: Run final comprehensive tests and generate launch readiness report.

**Tasks**:

1. **Final Quality Audit** (Day 19 Morning)
   - Review all 90-100 samples
   - Verify ground truth accuracy
   - Fix any remaining issues

2. **Comprehensive Testing** (Day 19 Afternoon)
   - Run full test suite on complete dataset
   - Test with updated confidence thresholds
   - Validate >85% overall accuracy

3. **Generate Final Report** (Day 20)
   - Executive summary
   - Sample collection statistics
   - OCR accuracy by document type and field
   - Confidence threshold recommendations
   - Edge cases and failure analysis
   - Launch readiness assessment

**Success Criteria**:
- ✅ 90-100 high-quality samples collected
- ✅ Overall OCR accuracy >85%
- ✅ Passport accuracy >90%
- ✅ NIN accuracy >88%
- ✅ Final report delivered

### Day 21: Stakeholder Presentation

**Objective**: Present results to stakeholders and get launch approval.

**Presentation Outline**:

1. **Project Overview** (5 min)
   - Objectives and timeline
   - Collection methodology

2. **Sample Collection Results** (10 min)
   - Total samples collected (by type, quality, demographics)
   - Collection challenges and solutions
   - Participant feedback

3. **OCR Accuracy Results** (15 min)
   - Overall accuracy metrics
   - Accuracy by document type
   - Field-level accuracy breakdown
   - Comparison to industry benchmarks

4. **Confidence Threshold Recommendations** (10 min)
   - Tier 1 (Full Verification): Thresholds and expected pass rate
   - Tier 2 (International): Thresholds and expected pass rate
   - Tier 3 (Basic): Thresholds and expected pass rate

5. **Edge Cases and Failure Analysis** (10 min)
   - Common failure modes
   - Mitigation strategies
   - Manual review process

6. **Launch Readiness** (5 min)
   - Go/No-Go recommendation
   - Remaining risks
   - Post-launch monitoring plan

7. **Q&A** (15 min)

## Budget and Resources

### Personnel

| Role | Time Commitment | Compensation |
|------|----------------|--------------|
| Collection Lead | 3 weeks full-time | Existing staff |
| Collection Assistants (2) | 3 weeks part-time (50%) | ₦150,000 each |
| Campus Ambassadors (3) | 1 week part-time | ₦20,000 each |
| **Total Personnel** | | **₦360,000** |

### Participant Compensation

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Document samples | 100 | ₦3,000 | ₦300,000 |
| **Total Compensation** | | | **₦300,000** |

### Materials and Equipment

| Item | Cost |
|------|------|
| Consent form printing | ₦5,000 |
| Collection booth materials | ₦15,000 |
| LED lighting | ₦25,000 |
| Smartphone tripod | ₦10,000 |
| Miscellaneous supplies | ₦10,000 |
| **Total Materials** | **₦65,000** |

### Total Budget

| Category | Amount |
|----------|--------|
| Personnel | ₦360,000 |
| Participant Compensation | ₦300,000 |
| Materials | ₦65,000 |
| **Total** | **₦725,000** |

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Low participant turnout | Medium | High | Multiple recruitment channels, attractive compensation |
| Poor image quality | Medium | Medium | Training, quality checks, retakes |
| Privacy concerns | Low | High | Clear consent process, strong data protection |
| OCR accuracy < 85% | Medium | High | Targeted collection, threshold tuning, manual review fallback |
| Timeline delays | Medium | Medium | Buffer time, parallel workstreams |

### Contingency Plans

**If OCR accuracy < 85% after Week 2**:
1. Collect 20 additional high-quality samples
2. Fine-tune OCR model parameters
3. Implement preprocessing (deskew, denoise)
4. Increase manual review rate for pilot

**If participant recruitment is slow**:
1. Increase compensation to ₦5,000 per sample
2. Expand to additional universities
3. Leverage social media influencers
4. Extend timeline by 1 week

**If privacy concerns arise**:
1. Offer full anonymization option
2. Provide detailed data protection documentation
3. Allow participants to review their data
4. Implement immediate deletion upon request

## Success Metrics

### Collection Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total Samples Collected | 90-100 | Final count |
| Nigerian Passports | 40+ | By document type |
| NIN Cards | 40+ | By document type |
| Sample Quality (High) | >80% | Quality rating distribution |
| Consent Forms Signed | 100% | Compliance check |

### OCR Accuracy Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Overall Accuracy | >85% | Weighted average across all samples |
| Passport Accuracy | >90% | Nigerian passport samples only |
| NIN Accuracy | >88% | NIN card samples only |
| Document Number Accuracy | >95% | Critical field accuracy |
| Name Accuracy | >90% | Critical field accuracy |
| Date of Birth Accuracy | >92% | Critical field accuracy |

### Process Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Average Collection Time | <45 min/sample | Time tracking |
| Ground Truth Error Rate | <2% | Double-entry verification |
| Sample Rejection Rate | <10% | Quality audit results |
| Participant Satisfaction | >4.0/5.0 | Post-collection survey |

## Deliverables

### Week 1 Deliverables

- [ ] Consent forms (printed and digital)
- [ ] Collection tracking spreadsheet
- [ ] 10-15 collected samples with ground truth
- [ ] Initial OCR accuracy baseline report

### Week 2 Deliverables

- [ ] 45-50 total collected samples
- [ ] Mid-sprint testing report
- [ ] Confidence threshold recommendations
- [ ] Adjusted collection strategy

### Week 3 Deliverables

- [ ] 90-100 total collected samples
- [ ] Final OCR accuracy report
- [ ] Launch readiness assessment
- [ ] Stakeholder presentation deck

## Next Steps After Testing

1. **Deploy Updated Thresholds** - Implement recommended confidence thresholds in production
2. **Set Up Monitoring** - Configure continuous accuracy monitoring for pilot
3. **Train Support Team** - Prepare team to handle manual review cases
4. **Launch Pilot** - Begin accepting guest verifications with 10 pilot hosts
5. **Continuous Improvement** - Collect real-world data and iteratively improve accuracy

---

**Author**: Manus AI  
**Last Updated**: November 17, 2025  
**Version**: 1.0
