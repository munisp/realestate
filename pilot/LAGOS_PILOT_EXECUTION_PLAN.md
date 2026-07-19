# Lagos Pilot Launch Execution Plan

## Executive Summary

This document outlines the comprehensive execution plan for launching the shortlet booking platform pilot in Lagos, Nigeria. The pilot targets **10 beta hosts** in premium areas (Lekki, Victoria Island, Ikoyi) with a goal of achieving **50 bookings** in the first 30 days.

## Pilot Objectives

The Lagos pilot serves three critical objectives that will validate our platform's market fit and operational readiness before full-scale launch.

**Primary Objectives:**

1. **Validate Platform Functionality** - Test the complete booking flow from property listing to guest check-out, including payment processing, calendar synchronization, and automated messaging systems
2. **Measure Verification Accuracy** - Validate the multi-tier KYC system with real Nigerian documents (NIN, BVN, passports) and achieve >85% OCR accuracy and >90% face matching accuracy
3. **Gather User Feedback** - Collect qualitative feedback from hosts and guests to identify usability issues, feature gaps, and improvement opportunities

**Success Metrics:**

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Host Onboarding | 10 hosts | Application form submissions |
| Property Listings | 15 properties | Active listings in system |
| Booking Volume | 50 bookings | Completed transactions |
| Verification Success Rate | >85% | OCR + face match accuracy |
| Payment Success Rate | >95% | Paystack/Flutterwave transactions |
| Host Satisfaction | >4.0/5.0 | Post-pilot survey |
| Guest Satisfaction | >4.0/5.0 | Post-stay survey |
| Platform Uptime | >99.5% | Monitoring dashboard |

## Timeline

The pilot follows a structured 8-week timeline from preparation through evaluation.

### Week 1-2: Preparation Phase

**Infrastructure Setup** (Days 1-5):
- Deploy staging environment to Kubernetes cluster
- Configure GPU nodes for OCR service (2x Tesla T4)
- Set up monitoring dashboards (Grafana, Prometheus)
- Configure alert channels (Slack, email, PagerDuty)
- Run smoke tests and E2E validation

**Host Recruitment** (Days 1-14):
- Launch recruitment campaign via social media
- Send direct outreach emails to property owners
- Screen applications using selection criteria
- Conduct phone interviews with shortlisted candidates
- Select final 10 beta hosts

**Host Onboarding** (Days 8-14):
- Schedule onboarding sessions (1-on-1 or group)
- Provide platform training and documentation
- Assist with property listing creation
- Upload property photos and descriptions
- Set pricing and availability calendars
- Test booking flow with each host

### Week 3-4: Soft Launch

**Platform Activation** (Day 15):
- Enable guest booking functionality
- Activate payment processing (Paystack/Flutterwave)
- Launch WhatsApp messaging automation
- Begin social media promotion
- Send launch announcement to email list

**Guest Acquisition** (Days 15-28):
- Run targeted Facebook/Instagram ads (Lagos audience)
- Promote on Twitter and LinkedIn
- Offer early-bird discounts (10% off first booking)
- Encourage hosts to share with their networks
- Monitor booking conversion rates daily

**Daily Operations** (Days 15-28):
- Monitor platform performance and errors
- Respond to host and guest support requests
- Track verification success rates
- Review booking confirmations and payments
- Collect feedback via in-app surveys

### Week 5-6: Optimization Phase

**Performance Tuning** (Days 29-42):
- Analyze verification accuracy data
- Tune OCR and face match confidence thresholds
- Optimize payment flow based on success rates
- Improve messaging templates based on feedback
- Fix bugs and usability issues

**Marketing Iteration** (Days 29-42):
- Analyze ad performance and adjust targeting
- Test different messaging and creative
- Increase budget for high-performing channels
- Launch referral program for guests
- Encourage hosts to collect reviews

### Week 7-8: Evaluation Phase

**Data Analysis** (Days 43-56):
- Compile booking and revenue data
- Calculate verification accuracy metrics
- Analyze payment success rates
- Review host and guest satisfaction scores
- Identify top-performing properties

**Feedback Collection** (Days 43-56):
- Conduct host exit interviews
- Send guest satisfaction surveys
- Collect qualitative feedback on pain points
- Document feature requests and bugs
- Prepare improvement recommendations

**Final Report** (Days 50-56):
- Write comprehensive pilot evaluation report
- Present findings to stakeholders
- Make go/no-go decision for full launch
- Plan next steps based on results

## Host Recruitment Strategy

### Target Profile

We seek property owners who meet specific criteria to ensure pilot success and minimize operational complexity during the initial phase.

**Ideal Host Characteristics:**
- Owns 1-3 properties in Lekki, Victoria Island, or Ikoyi
- Property value: ₦50M - ₦200M ($60K - $240K USD)
- Tech-savvy with smartphone and internet access
- Responsive communication (replies within 2 hours)
- Willing to provide feedback and iterate
- Available for weekly check-in calls

**Property Requirements:**
- Fully furnished and move-in ready
- Minimum 1 bedroom, 1 bathroom
- Reliable WiFi and utilities
- Professional photos or willingness to hire photographer
- Clean and well-maintained condition
- Legal compliance (C of O, building approvals)

### Recruitment Channels

**Direct Outreach** (Primary channel):
- LinkedIn messages to property owners in Lagos
- Email campaigns to real estate investor groups
- WhatsApp messages to property management companies
- Referrals from existing network

**Social Media** (Secondary channel):
- Facebook groups: Lagos Property Owners, Real Estate Investors Nigeria
- Instagram: Sponsored posts targeting Lagos property owners
- Twitter: Threads about passive income from shortlets
- LinkedIn: Articles about property investment trends

**Partnerships** (Tertiary channel):
- Collaborate with property management companies
- Partner with real estate agencies in target areas
- Work with co-working spaces (WeCo, Venia, etc.)
- Engage with hospitality associations

### Selection Criteria

Applications are scored on a 100-point scale across five dimensions:

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| Property Quality | 30% | Photos, location, amenities |
| Host Responsiveness | 25% | Response time, communication quality |
| Tech Proficiency | 20% | Smartphone usage, platform familiarity |
| Commitment Level | 15% | Availability, willingness to iterate |
| Network Effect | 10% | Social media following, referral potential |

**Minimum qualifying score**: 70/100

## Host Onboarding Process

### Onboarding Session Agenda (90 minutes)

**Introduction** (10 minutes):
- Welcome and pilot overview
- Success metrics and expectations
- Timeline and key milestones

**Platform Training** (40 minutes):
- Host dashboard walkthrough
- Creating property listings
- Setting pricing and availability
- Managing bookings and calendar
- Processing payouts
- Using messaging system

**Property Listing Setup** (30 minutes):
- Upload property photos (minimum 10)
- Write compelling description
- Set amenities and house rules
- Configure pricing (base rate, weekend premium, cleaning fee)
- Set availability calendar
- Link external calendars (Airbnb, Booking.com)

**Q&A and Support** (10 minutes):
- Address questions and concerns
- Provide contact information for support
- Schedule follow-up check-in call

### Onboarding Materials

**Host Welcome Pack**:
- Platform user guide (PDF, 20 pages)
- Video tutorials (5 videos, 3-5 minutes each)
- Pricing strategy guide
- Photography tips and best practices
- Sample property descriptions
- House rules template
- Emergency contact list

**Technical Setup**:
- Host dashboard login credentials
- Mobile app download links (iOS/Android)
- WhatsApp Business integration setup
- Payment account connection (Paystack/Flutterwave)
- Calendar sync instructions (iCal)

## Guest Acquisition Strategy

### Target Audience

**Primary Segments**:

1. **Business Travelers** (40% of bookings):
   - Professionals visiting Lagos for work
   - Age: 28-45
   - Income: ₦500K+ monthly
   - Booking duration: 2-7 days
   - Price sensitivity: Low to medium

2. **Diaspora Visitors** (30% of bookings):
   - Nigerians living abroad visiting family
   - Age: 25-50
   - Income: $50K+ annually
   - Booking duration: 7-30 days
   - Price sensitivity: Medium

3. **Leisure Travelers** (30% of bookings):
   - Domestic tourists and event attendees
   - Age: 22-40
   - Income: ₦300K+ monthly
   - Booking duration: 1-3 days
   - Price sensitivity: High

### Marketing Channels

**Paid Advertising** (₦500K budget):
- Facebook/Instagram ads: ₦300K (60%)
- Google Search ads: ₦100K (20%)
- Twitter promoted tweets: ₦50K (10%)
- LinkedIn sponsored content: ₦50K (10%)

**Organic Marketing**:
- SEO-optimized blog content
- Social media posts (daily)
- Email newsletter (weekly)
- WhatsApp broadcast lists
- Referral program

**Partnerships**:
- Corporate travel managers
- Event organizers
- Tourism boards
- Co-working spaces
- Airlines and travel agencies

### Launch Promotions

**Early Bird Discount**:
- 10% off first booking
- Valid for first 100 guests
- Promo code: LAGOS2025

**Referral Program**:
- ₦5,000 credit for referrer
- ₦5,000 discount for referee
- Unlimited referrals

**Host Incentives**:
- Waive platform fee for first 3 bookings
- Bonus ₦10,000 for 5+ bookings in first month
- Featured listing for top performers

## Verification Flow

### Multi-Tier KYC System

The platform implements a risk-based verification system with four tiers, each designed for different user segments and risk profiles.

**Tier 1: Full Verification** (Nigerian Residents):
- Documents required: NIN card + BVN verification
- Face matching: Selfie vs. NIN photo
- Background check: NIBSS credit check
- Booking limit: Unlimited
- Processing time: 24-48 hours
- Success rate target: >90%

**Tier 2: International Verification** (Diaspora/Expats):
- Documents required: International passport + Onfido verification
- Face matching: Selfie vs. passport photo
- Background check: Onfido identity verification
- Booking limit: ₦500,000 per transaction
- Processing time: 12-24 hours
- Success rate target: >85%

**Tier 3: Basic Verification** (Low-Risk Users):
- Documents required: Any government-issued ID
- Face matching: Selfie vs. ID photo
- Background check: None
- Booking limit: ₦200,000 per transaction
- Processing time: 2-6 hours
- Success rate target: >80%

**Tier 4: Social Verification** (OAuth Only):
- Documents required: None
- Face matching: None
- Background check: Social profile verification
- Booking limit: ₦50,000 per transaction
- Processing time: Instant
- Success rate target: 100%

### Verification Workflow

1. **Guest initiates booking** → System checks verification status
2. **If not verified** → Redirect to verification flow
3. **Guest selects tier** → Based on documents available
4. **Upload documents** → OCR extracts data (DeepSeek-OCR + PaddleOCR)
5. **Take selfie** → Face matching against document photo
6. **Background check** → NIN/BVN or Onfido verification
7. **Risk scoring** → Calculate risk score (0-100)
8. **Approval decision** → Auto-approve if score >70, manual review if 50-70, reject if <50
9. **Notification** → WhatsApp + email confirmation
10. **Booking enabled** → Guest can complete booking

### Monitoring and Tuning

**Daily Metrics**:
- Verification attempts by tier
- Success rate by document type
- OCR accuracy (passport, NIN, international ID)
- Face match accuracy
- Average processing time
- Manual review rate

**Weekly Tuning**:
- Adjust confidence thresholds based on accuracy data
- Review failed verifications and identify patterns
- Update OCR models with new training data
- Optimize face matching algorithm
- Refine risk scoring rules

## Operations and Support

### Support Structure

**Support Channels**:
- **WhatsApp Business**: Primary channel for quick questions (9 AM - 9 PM WAT)
- **Email**: support@platform.com (24-hour response time)
- **Phone**: +234-XXX-XXXX-XXX (Emergency only, 24/7)
- **In-app Chat**: Real-time messaging (9 AM - 6 PM WAT)

**Support Team**:
- **Pilot Manager** (1 FTE): Overall coordination and escalation
- **Host Success Manager** (0.5 FTE): Host onboarding and support
- **Guest Support Agent** (0.5 FTE): Guest inquiries and booking issues
- **Technical Support** (On-call): Platform bugs and technical issues

### Incident Response

**Severity Levels**:

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| P0 - Critical | Platform down, payment failures | 15 minutes | Database outage, payment gateway down |
| P1 - High | Major feature broken, data loss | 1 hour | Booking flow broken, verification service down |
| P2 - Medium | Minor feature broken, degraded performance | 4 hours | Slow page load, calendar sync delay |
| P3 - Low | Cosmetic issues, feature requests | 24 hours | UI bugs, minor text errors |

**Escalation Path**:
1. Support agent attempts resolution (15 minutes)
2. Escalate to pilot manager (30 minutes)
3. Escalate to technical team (1 hour)
4. Escalate to CTO (2 hours)

### Daily Operations Checklist

**Morning** (9 AM - 12 PM):
- [ ] Review overnight bookings and payments
- [ ] Check verification queue and approve/reject
- [ ] Monitor platform health dashboard
- [ ] Respond to urgent support tickets
- [ ] Post daily social media content

**Afternoon** (12 PM - 5 PM):
- [ ] Follow up with pending verifications
- [ ] Conduct host check-in calls (2-3 per day)
- [ ] Analyze booking conversion funnel
- [ ] Review and respond to guest feedback
- [ ] Update marketing campaigns

**Evening** (5 PM - 9 PM):
- [ ] Process payout requests
- [ ] Send booking reminders (check-in tomorrow)
- [ ] Monitor evening booking activity
- [ ] Prepare daily summary report
- [ ] Plan next day activities

## Risk Management

### Identified Risks

**Technical Risks**:

1. **GPU Cluster Downtime** (High Impact, Medium Probability):
   - Mitigation: Deploy redundant GPU nodes, implement automatic failover
   - Contingency: Fall back to CPU processing (slower but functional)

2. **Payment Gateway Failures** (High Impact, Low Probability):
   - Mitigation: Integrate both Paystack and Flutterwave for redundancy
   - Contingency: Manual payment processing via bank transfer

3. **Verification Service Errors** (Medium Impact, Medium Probability):
   - Mitigation: Implement manual review queue, set conservative thresholds
   - Contingency: Temporarily reduce verification requirements

**Operational Risks**:

1. **Low Host Adoption** (High Impact, Medium Probability):
   - Mitigation: Over-recruit (15 hosts for 10 target), offer incentives
   - Contingency: Extend recruitment period, adjust selection criteria

2. **Low Booking Volume** (High Impact, Medium Probability):
   - Mitigation: Aggressive marketing, early-bird discounts, referral program
   - Contingency: Increase ad budget, extend pilot duration

3. **Host Churn** (Medium Impact, Low Probability):
   - Mitigation: Weekly check-ins, responsive support, performance bonuses
   - Contingency: Recruit replacement hosts from waitlist

**Regulatory Risks**:

1. **Data Privacy Compliance** (High Impact, Low Probability):
   - Mitigation: GDPR-compliant data handling, encryption, consent forms
   - Contingency: Engage legal counsel, implement required changes

2. **Payment Licensing** (Medium Impact, Low Probability):
   - Mitigation: Use licensed payment processors (Paystack/Flutterwave)
   - Contingency: Adjust payment flow to comply with regulations

## Success Criteria and Go/No-Go Decision

### Minimum Viable Success

The pilot must achieve the following minimum thresholds to proceed to full launch:

**Quantitative Criteria**:
- ✅ **8+ hosts onboarded** (80% of target)
- ✅ **12+ properties listed** (80% of target)
- ✅ **40+ bookings completed** (80% of target)
- ✅ **>80% verification success rate**
- ✅ **>90% payment success rate**
- ✅ **>99% platform uptime**

**Qualitative Criteria**:
- ✅ **Host satisfaction >3.5/5.0** (acceptable)
- ✅ **Guest satisfaction >3.5/5.0** (acceptable)
- ✅ **No critical unresolved bugs**
- ✅ **Positive feedback on core features**

### Go/No-Go Decision Framework

**GO Decision** (Proceed to full launch):
- All minimum viable success criteria met
- No critical technical or operational blockers
- Positive unit economics (revenue > costs)
- Stakeholder confidence in scaling

**ITERATE Decision** (Extend pilot):
- 60-79% of success criteria met
- Identified issues with clear solutions
- Need more data to validate assumptions
- Extend pilot by 4 weeks with adjustments

**NO-GO Decision** (Pause or pivot):
- <60% of success criteria met
- Fundamental product-market fit issues
- Unsustainable unit economics
- Critical technical or regulatory blockers

## Budget

### Pilot Budget Breakdown

| Category | Item | Cost (₦) | Cost ($) |
|----------|------|----------|----------|
| **Infrastructure** | | | |
| | GPU cluster (2x T4, 8 weeks) | 1,200,000 | 1,500 |
| | Monitoring and logging | 200,000 | 250 |
| | Staging environment | 300,000 | 375 |
| **Marketing** | | | |
| | Facebook/Instagram ads | 300,000 | 375 |
| | Google Search ads | 100,000 | 125 |
| | Social media content creation | 150,000 | 188 |
| | Promotional discounts | 200,000 | 250 |
| **Operations** | | | |
| | Support team (8 weeks) | 800,000 | 1,000 |
| | Host incentives | 300,000 | 375 |
| | Photography for hosts | 200,000 | 250 |
| **Contingency** | | | |
| | 15% buffer | 525,000 | 656 |
| **Total** | | **4,275,000** | **5,344** |

### Revenue Projections

**Assumptions**:
- Average booking value: ₦80,000
- Platform fee: 3%
- 50 bookings in 8 weeks

**Projected Revenue**:
- Gross booking value: ₦4,000,000 ($5,000)
- Platform revenue (3%): ₦120,000 ($150)
- Host payouts (97%): ₦3,880,000 ($4,850)

**Net Pilot Cost**: ₦4,155,000 ($5,194)

*Note: Pilot is an investment in validation, not expected to be profitable*

## Next Steps After Pilot

### If GO Decision

1. **Scale Host Recruitment**:
   - Target 100 hosts in Lagos
   - Expand to Abuja and Port Harcourt
   - Develop host acquisition playbook

2. **Increase Marketing Budget**:
   - Scale ad spend to ₦5M/month
   - Launch brand awareness campaign
   - Build partnerships with corporate travel

3. **Enhance Platform Features**:
   - Implement priority feature requests
   - Build mobile app enhancements
   - Add advanced analytics for hosts

4. **Expand Verification Capacity**:
   - Scale GPU cluster to 10+ nodes
   - Optimize OCR models with pilot data
   - Reduce verification processing time

5. **Strengthen Operations**:
   - Hire full-time support team
   - Implement 24/7 support coverage
   - Build self-service help center

### If ITERATE Decision

1. **Analyze Failure Points**:
   - Identify specific areas underperforming
   - Conduct deep-dive user interviews
   - Review technical logs and metrics

2. **Implement Improvements**:
   - Fix identified bugs and issues
   - Enhance underperforming features
   - Adjust pricing or incentives

3. **Extend Pilot**:
   - Run for additional 4 weeks
   - Set revised success criteria
   - Monitor improvements closely

### If NO-GO Decision

1. **Conduct Post-Mortem**:
   - Document lessons learned
   - Identify root causes of failure
   - Share findings with stakeholders

2. **Evaluate Pivot Options**:
   - Consider alternative markets
   - Explore different business models
   - Assess technology reuse opportunities

3. **Plan Shutdown or Pivot**:
   - Communicate with hosts and guests
   - Process refunds if necessary
   - Archive data and learnings

---

*Prepared by: Platform Team*  
*Last updated: November 17, 2025*
