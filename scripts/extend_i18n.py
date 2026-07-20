#!/usr/bin/env python3
"""
Extend i18n locale files with new keys for:
  - Agent CRM (leads, showings, commissions, follow-ups)
  - AI Chat (session, intent, language selector)
  - Trust & Verification (badges, KYC, diaspora)
  - Data Quality (listing scores, pipeline status)

Adds new keys to all 7 locale files (en, yo, ig, ha, sw, fr, ar).
Existing keys are preserved.
"""

import json
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'client', 'src', 'i18n', 'locales')

NEW_KEYS = {
    "en": {
        "crm": {
            "pipeline": "Lead Pipeline",
            "leads": "Leads",
            "addLead": "Add Lead",
            "leadScore": "Lead Score",
            "stage": "Stage",
            "new": "New",
            "contacted": "Contacted",
            "qualified": "Qualified",
            "showingScheduled": "Showing Scheduled",
            "offerMade": "Offer Made",
            "underContract": "Under Contract",
            "closed": "Closed",
            "lost": "Lost",
            "followUp": "Follow Up",
            "nextFollowUp": "Next Follow-up",
            "budget": "Budget",
            "source": "Source",
            "showings": "Showings",
            "scheduleShowing": "Schedule Showing",
            "upcomingShowings": "Upcoming Showings",
            "commission": "Commission",
            "commissionEarned": "Commission Earned",
            "commissionPending": "Commission Pending",
            "performanceDashboard": "Performance Dashboard",
            "conversionRate": "Conversion Rate",
            "avgDaysOnMarket": "Avg Days on Market",
            "hotLeads": "Hot Leads",
            "pipelineValue": "Pipeline Value",
            "todayTasks": "Today's Tasks",
            "callLead": "Call Lead",
            "whatsappLead": "WhatsApp Lead",
            "emailLead": "Email Lead",
            "advanceStage": "Advance Stage",
            "eSignature": "E-Signature",
            "requestSignature": "Request Signature",
            "signatureStatus": "Signature Status",
            "allSigned": "All Signed",
            "pendingSignatures": "Pending Signatures"
        },
        "aiChat": {
            "title": "AI Assistant",
            "subtitle": "Nigerian Real Estate Expert",
            "newConversation": "New Conversation",
            "clearConversation": "Clear Conversation",
            "typeMessage": "Ask about Nigerian property...",
            "send": "Send",
            "thinking": "Thinking...",
            "suggestedActions": "Suggested Actions",
            "detectedSearch": "Detected Search",
            "tapToSearch": "Tap to search",
            "propertySearch": "Property Search",
            "valuation": "Valuation",
            "legal": "Legal",
            "financing": "Financing",
            "investment": "Investment",
            "findAgent": "Find Agent",
            "sessionMemory": "Session Memory",
            "conversationHistory": "Conversation History",
            "quickPrompts": "Try asking:",
            "aiUnavailable": "AI assistant is temporarily unavailable. Please try again.",
            "poweredByOllama": "Powered by Ollama (local AI)"
        },
        "trust": {
            "verified": "Verified",
            "unverified": "Unverified",
            "premium": "Premium",
            "verificationBadge": "Verification Badge",
            "listingVerified": "Listing Verified",
            "agentVerified": "Agent Verified",
            "titleVerified": "Title Verified",
            "photosVerified": "Photos Verified",
            "priceVerified": "Price Verified",
            "verifyListing": "Verify Listing",
            "kycStatus": "KYC Status",
            "ninVerified": "NIN Verified",
            "bvnVerified": "BVN Verified",
            "diasporaPortal": "Diaspora Portal",
            "diasporaBuyer": "Diaspora Buyer",
            "overseasInvestor": "Overseas Investor",
            "escrowEnabled": "Escrow Enabled",
            "remoteTransaction": "Remote Transaction",
            "titleCheck": "Title Check",
            "cOfO": "C of O",
            "governorsConsent": "Governor's Consent",
            "deedOfAssignment": "Deed of Assignment",
            "surveyPlan": "Survey Plan",
            "nisvRegistered": "NIESV Registered",
            "dataQualityScore": "Data Quality Score",
            "listingCompleteness": "Listing Completeness",
            "marketPriceAlignment": "Market Price Alignment"
        }
    },
    "yo": {
        "crm": {
            "pipeline": "Ọ̀nà Oníbàárà",
            "leads": "Àwọn Oníbàárà",
            "addLead": "Ṣàfikún Oníbàárà",
            "leadScore": "Ìdínwọ̀n Oníbàárà",
            "stage": "Ìpele",
            "new": "Tuntun",
            "contacted": "Ti Kànsí",
            "qualified": "Tó Yẹ",
            "showingScheduled": "Ìbẹ̀wò Tí A Ṣètò",
            "offerMade": "Ìfúnni Ti Ṣe",
            "underContract": "Nínú Àdéhùn",
            "closed": "Parí",
            "lost": "Pàdánù",
            "followUp": "Tẹ̀léé",
            "nextFollowUp": "Ìtẹ̀léé Tó Ń Bọ̀",
            "budget": "Owó Tí A Ṣètò",
            "source": "Orísun",
            "showings": "Àwọn Ìbẹ̀wò",
            "scheduleShowing": "Ṣètò Ìbẹ̀wò",
            "upcomingShowings": "Àwọn Ìbẹ̀wò Tó Ń Bọ̀",
            "commission": "Ẹ̀san",
            "commissionEarned": "Ẹ̀san Tí A Jèrè",
            "commissionPending": "Ẹ̀san Tó Ń Dúró",
            "performanceDashboard": "Pánẹ̀lì Ìṣẹ́dá",
            "conversionRate": "Ìpele Ìyípadà",
            "avgDaysOnMarket": "Àpẹẹrẹ Ọjọ́ Lójà",
            "hotLeads": "Àwọn Oníbàárà Gbígbóná",
            "pipelineValue": "Iye Ọ̀nà",
            "todayTasks": "Àwọn Iṣẹ́ Òní",
            "callLead": "Pe Oníbàárà",
            "whatsappLead": "WhatsApp Oníbàárà",
            "emailLead": "Ìmèéèlì Oníbàárà",
            "advanceStage": "Gòkè Ìpele",
            "eSignature": "Àbọwọ́sí Ẹ̀lẹ́ktrọ́nìkì",
            "requestSignature": "Béèrè Àbọwọ́sí",
            "signatureStatus": "Ipò Àbọwọ́sí",
            "allSigned": "Gbogbo Ti Fọwọ́sí",
            "pendingSignatures": "Àwọn Àbọwọ́sí Tó Ń Dúró"
        },
        "aiChat": {
            "title": "Olùrànlọ́wọ́ AI",
            "subtitle": "Àkọ̀wé Ohun Ìní Níjíríà",
            "newConversation": "Ìjíròrò Tuntun",
            "clearConversation": "Mọ́ Ìjíròrò",
            "typeMessage": "Béèrè nípa ohun ìní Níjíríà...",
            "send": "Firanṣẹ́",
            "thinking": "Ń Rò...",
            "suggestedActions": "Àwọn Ìgbéṣẹ̀ Tí A Dábàá",
            "detectedSearch": "Ìwádìí Tí A Rí",
            "tapToSearch": "Tẹ láti wádìí",
            "propertySearch": "Ìwádìí Ohun Ìní",
            "valuation": "Ìfojúsùn Iye",
            "legal": "Òfin",
            "financing": "Ìgbowó",
            "investment": "Ìdókòwò",
            "findAgent": "Wá Agẹ̀ntì",
            "sessionMemory": "Ìrántí Ìpàdé",
            "conversationHistory": "Ìtàn Ìjíròrò",
            "quickPrompts": "Gbìyànjú béèrè:",
            "aiUnavailable": "Olùrànlọ́wọ́ AI kò sí fún ìgbà díẹ̀. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí.",
            "poweredByOllama": "Agbára Ollama (AI Àdáni)"
        },
        "trust": {
            "verified": "Jẹ́rìísí",
            "unverified": "Kò Jẹ́rìísí",
            "premium": "Gíga",
            "verificationBadge": "Àmì Ìjẹ́rìísí",
            "listingVerified": "Àkọsílẹ̀ Jẹ́rìísí",
            "agentVerified": "Agẹ̀ntì Jẹ́rìísí",
            "titleVerified": "Àkọlé Jẹ́rìísí",
            "photosVerified": "Àwọn Àwòrán Jẹ́rìísí",
            "priceVerified": "Iye Jẹ́rìísí",
            "verifyListing": "Jẹ́rìísí Àkọsílẹ̀",
            "kycStatus": "Ipò KYC",
            "ninVerified": "NIN Jẹ́rìísí",
            "bvnVerified": "BVN Jẹ́rìísí",
            "diasporaPortal": "Ẹ̀bùn Àwọn Tó Wà Níta",
            "diasporaBuyer": "Oníbàárà Tó Wà Níta",
            "overseasInvestor": "Olùdókòwò Òkèeré",
            "escrowEnabled": "Escrow Ṣiṣẹ́",
            "remoteTransaction": "Ìdúnàádúrà Jíjìn",
            "titleCheck": "Ìṣàyẹ̀wò Àkọlé",
            "cOfO": "C of O",
            "governorsConsent": "Àṣẹ Gómìnà",
            "deedOfAssignment": "Ìwé Ìfúnni",
            "surveyPlan": "Ètò Ìwọ̀n Ilẹ̀",
            "nisvRegistered": "Forúkọsílẹ̀ NIESV",
            "dataQualityScore": "Ìdínwọ̀n Ìdára Dátà",
            "listingCompleteness": "Ìpéye Àkọsílẹ̀",
            "marketPriceAlignment": "Ìbámu Iye Ọjà"
        }
    },
    "ha": {
        "crm": {
            "pipeline": "Hanyar Abokin Ciniki",
            "leads": "Abokan Ciniki",
            "addLead": "Ƙara Abokin Ciniki",
            "leadScore": "Maki na Abokin Ciniki",
            "stage": "Mataki",
            "new": "Sabon",
            "contacted": "An Tuntuba",
            "qualified": "Ya Cancanta",
            "showingScheduled": "An Shirya Nuni",
            "offerMade": "An Bayar da Tayin",
            "underContract": "A Ƙarƙashin Kwantiragin",
            "closed": "An Rufe",
            "lost": "An Rasa",
            "followUp": "Bi Didau",
            "nextFollowUp": "Bi Didau Na Gaba",
            "budget": "Kasafin Kuɗi",
            "source": "Asali",
            "showings": "Nuna Gidaje",
            "scheduleShowing": "Shirya Nuni",
            "upcomingShowings": "Nuni Na Gaba",
            "commission": "Kuɗin Aiki",
            "commissionEarned": "Kuɗin Aiki Da Aka Samu",
            "commissionPending": "Kuɗin Aiki Da Ake Jira",
            "performanceDashboard": "Allon Aikin",
            "conversionRate": "Ƙimar Canjin",
            "avgDaysOnMarket": "Matsakaicin Kwanaki A Kasuwa",
            "hotLeads": "Abokan Ciniki Masu Zafi",
            "pipelineValue": "Ƙimar Hanya",
            "todayTasks": "Ayyukan Yau",
            "callLead": "Kira Abokin Ciniki",
            "whatsappLead": "WhatsApp Abokin Ciniki",
            "emailLead": "Imel Abokin Ciniki",
            "advanceStage": "Ci Gaba da Mataki",
            "eSignature": "Sa Hannu na Lantarki",
            "requestSignature": "Nemi Sa Hannu",
            "signatureStatus": "Matsayin Sa Hannu",
            "allSigned": "Duka Sun Sa Hannu",
            "pendingSignatures": "Sa Hannun Da Ake Jira"
        },
        "aiChat": {
            "title": "Mataimaki na AI",
            "subtitle": "Ƙwararren Gidaje na Najeriya",
            "newConversation": "Sabuwar Tattaunawa",
            "clearConversation": "Share Tattaunawa",
            "typeMessage": "Tambayi game da gidaje na Najeriya...",
            "send": "Aika",
            "thinking": "Yana Tunani...",
            "suggestedActions": "Ayyukan Da Aka Ba da Shawarar",
            "detectedSearch": "Bincike Da Aka Gano",
            "tapToSearch": "Taɓa don bincika",
            "propertySearch": "Binciken Gida",
            "valuation": "Ƙimar Gida",
            "legal": "Shari'a",
            "financing": "Kuɗin Sayen Gida",
            "investment": "Zuba Jari",
            "findAgent": "Nemi Wakili",
            "sessionMemory": "Ƙwaƙwalwar Zama",
            "conversationHistory": "Tarihin Tattaunawa",
            "quickPrompts": "Gwada tambaya:",
            "aiUnavailable": "Mataimaki na AI ba ya nan yanzu. Da fatan za a sake gwadawa.",
            "poweredByOllama": "Ƙarfin Ollama (AI na Gida)"
        },
        "trust": {
            "verified": "An Tabbatar",
            "unverified": "Ba'a Tabbatar Ba",
            "premium": "Mafi Kyau",
            "verificationBadge": "Alamar Tabbatarwa",
            "listingVerified": "An Tabbatar da Jerin",
            "agentVerified": "An Tabbatar da Wakili",
            "titleVerified": "An Tabbatar da Takardar Mallaka",
            "photosVerified": "An Tabbatar da Hotuna",
            "priceVerified": "An Tabbatar da Farashi",
            "verifyListing": "Tabbatar da Jerin",
            "kycStatus": "Matsayin KYC",
            "ninVerified": "An Tabbatar da NIN",
            "bvnVerified": "An Tabbatar da BVN",
            "diasporaPortal": "Tashar Diaspora",
            "diasporaBuyer": "Mai Siye na Diaspora",
            "overseasInvestor": "Mai Zuba Jari na Waje",
            "escrowEnabled": "Escrow Yana Aiki",
            "remoteTransaction": "Ma'amala ta Nesa",
            "titleCheck": "Duba Takardar Mallaka",
            "cOfO": "C of O",
            "governorsConsent": "Izinin Gwamna",
            "deedOfAssignment": "Takardar Canja Wurin",
            "surveyPlan": "Shirin Binciken Ƙasa",
            "nisvRegistered": "An Yi Rajista NIESV",
            "dataQualityScore": "Maki na Ingancin Bayanan",
            "listingCompleteness": "Cikakkiyar Jerin",
            "marketPriceAlignment": "Daidaituwar Farashi na Kasuwa"
        }
    },
    "ig": {
        "crm": {
            "pipeline": "Ụzọ Ndị Ahịa",
            "leads": "Ndị Ahịa",
            "addLead": "Tinye Onye Ahịa",
            "leadScore": "Akara Onye Ahịa",
            "stage": "Ọkwa",
            "new": "Ọhụrụ",
            "contacted": "Akpọtụrụ",
            "qualified": "Dabara",
            "showingScheduled": "Edewo Oge Ngosi",
            "offerMade": "Emere Ntụnye",
            "underContract": "N'ime Nkwekọrịta",
            "closed": "Mechiri",
            "lost": "Furu Efu",
            "followUp": "Soro",
            "nextFollowUp": "Nsoroihe Ọzọ",
            "budget": "Ego Edere",
            "source": "Isi Mmalite",
            "showings": "Ngosi Ụlọ",
            "scheduleShowing": "Dezie Oge Ngosi",
            "upcomingShowings": "Ngosi Ụlọ Ndị Na-abịa",
            "commission": "Ụgwọ Ọrụ",
            "commissionEarned": "Ụgwọ Ọrụ Enwetara",
            "commissionPending": "Ụgwọ Ọrụ Na-atọ Ụzọ",
            "performanceDashboard": "Ọnọdụ Ọrụ",
            "conversionRate": "Ọnụ Ọgụgụ Ntụgharị",
            "avgDaysOnMarket": "Ọnụ Ọgụgụ Ụbọchị N'ahịa",
            "hotLeads": "Ndị Ahịa Dị Ọkụ",
            "pipelineValue": "Ọnụahịa Ụzọ",
            "todayTasks": "Ọrụ Taa",
            "callLead": "Kpọọ Onye Ahịa Ekwentị",
            "whatsappLead": "WhatsApp Onye Ahịa",
            "emailLead": "Imel Onye Ahịa",
            "advanceStage": "Gaa N'ihu N'ọkwa",
            "eSignature": "Mbinye Aka Eletrik",
            "requestSignature": "Rịọ Mbinye Aka",
            "signatureStatus": "Ọnọdụ Mbinye Aka",
            "allSigned": "Ndị Nile Binyelara Aka",
            "pendingSignatures": "Mbinye Aka Na-atọ Ụzọ"
        },
        "aiChat": {
            "title": "Onye Enyemaka AI",
            "subtitle": "Ọkachamara Ụlọ Naịjirịa",
            "newConversation": "Mkparịta Ụka Ọhụrụ",
            "clearConversation": "Hichapụ Mkparịta Ụka",
            "typeMessage": "Jụọ maka ụlọ Naịjirịa...",
            "send": "Zipu",
            "thinking": "Na-echeche...",
            "suggestedActions": "Omume A Na-atụ Aro",
            "detectedSearch": "Nchọ Achọtara",
            "tapToSearch": "Pịa iji chọọ",
            "propertySearch": "Nchọ Ụlọ",
            "valuation": "Ọnụahịa Ụlọ",
            "legal": "Iwu",
            "financing": "Ego Ụlọ",
            "investment": "Itinye Ego",
            "findAgent": "Chọọ Onye Nnọchite",
            "sessionMemory": "Ọchịchọ Oge Nzukọ",
            "conversationHistory": "Akụkọ Mkparịta Ụka",
            "quickPrompts": "Nwaa ịjụ:",
            "aiUnavailable": "Onye enyemaka AI adịghị ugbu a. Biko nwaa ọzọ.",
            "poweredByOllama": "Ike Ollama (AI Nke Ụlọ)"
        },
        "trust": {
            "verified": "Nwetara Nkwenye",
            "unverified": "Enweghị Nkwenye",
            "premium": "Dị Elu",
            "verificationBadge": "Akara Nkwenye",
            "listingVerified": "Ndepụta Nwetara Nkwenye",
            "agentVerified": "Onye Nnọchite Nwetara Nkwenye",
            "titleVerified": "Akwụkwọ Ụlọ Nwetara Nkwenye",
            "photosVerified": "Foto Nwetara Nkwenye",
            "priceVerified": "Ọnụahịa Nwetara Nkwenye",
            "verifyListing": "Nweta Nkwenye Ndepụta",
            "kycStatus": "Ọnọdụ KYC",
            "ninVerified": "NIN Nwetara Nkwenye",
            "bvnVerified": "BVN Nwetara Nkwenye",
            "diasporaPortal": "Ọnụ Ụzọ Diaspora",
            "diasporaBuyer": "Onye Ịzụ Ahịa Diaspora",
            "overseasInvestor": "Onye Itinye Ego Mba Ọzọ",
            "escrowEnabled": "Escrow Na-arụ Ọrụ",
            "remoteTransaction": "Azụmahịa Site N'ebe Ọzọ",
            "titleCheck": "Nyochaa Akwụkwọ Ụlọ",
            "cOfO": "C of O",
            "governorsConsent": "Nkwenye Gọvanọ",
            "deedOfAssignment": "Akwụkwọ Nnyefe",
            "surveyPlan": "Atụmatụ Nleba Ala",
            "nisvRegistered": "Edebanyere Aha NIESV",
            "dataQualityScore": "Akara Ọdịmma Data",
            "listingCompleteness": "Ọpụpụ Ndepụta",
            "marketPriceAlignment": "Ịdị N'otu Ọnụahịa Ahịa"
        }
    }
}

def extend_locale(locale_code: str, new_sections: dict, existing: dict) -> dict:
    """Merge new sections into existing locale, preserving all existing keys."""
    result = dict(existing)
    for section, keys in new_sections.items():
        if section not in result:
            result[section] = {}
        for key, value in keys.items():
            if key not in result[section]:
                result[section][key] = value
    return result


def main():
    # Load English new keys for reference
    en_new = NEW_KEYS["en"]

    for locale_file in os.listdir(LOCALES_DIR):
        if not locale_file.endswith('.json'):
            continue

        locale_code = locale_file.replace('.json', '')
        filepath = os.path.join(LOCALES_DIR, locale_file)

        with open(filepath, 'r', encoding='utf-8') as f:
            existing = json.load(f)

        # Get locale-specific new keys, fall back to English
        new_sections = NEW_KEYS.get(locale_code, en_new)

        # For languages without specific translations, use English keys
        # (better than missing keys — can be translated later)
        if locale_code not in NEW_KEYS:
            new_sections = en_new

        updated = extend_locale(locale_code, new_sections, existing)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(updated, f, ensure_ascii=False, indent=2)

        old_count = sum(len(v) if isinstance(v, dict) else 1 for v in existing.values())
        new_count = sum(len(v) if isinstance(v, dict) else 1 for v in updated.values())
        print(f"  {locale_code}: {old_count} → {new_count} keys (+{new_count - old_count})")

    print("\nDone! All locale files extended.")


if __name__ == '__main__':
    print("Extending i18n locale files...")
    main()
